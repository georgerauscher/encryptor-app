/*!
 * encryptor 3.0 · https://encryptor.app
 *
 * George A. Rauscher:
 * "Unencrypted data talks. I listened for 25 years.
 *  Make yours silent."
 *
 * Copyright (c) 2026 George A. Rauscher, intelligent piXel GmbH
 * Free to use, study, and share under the MIT License.
 * Keep the credit, keep the link: https://github.com/georgerauscher/encryptor-app
 */
// Reads files and texts from encryptor.app 2.x (SPEC.md section 7).
// Decryption only, byte compatible with version 2.2.
import { te, td, readU32le, fromBase64 } from './bytes.js';
import { pbkdf2Sha256 } from './kdf.js';
import { FormatError } from './format-v3.js';

const ITER = 100000;
const CHUNK_MAX = 268435456;
const META_MAX = 1048576;

// Version 2 used the password without Unicode normalization. If that fails,
// the NFC form is tried as well (composed vs. decomposed accents).
function candidates(password) {
  const nfc = password.normalize('NFC');
  return nfc === password ? [password] : [password, nfc];
}

async function gcmDecrypt(key, iv, data) {
  return new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
}

export async function decryptTextV2(password, text) {
  let bin;
  try { bin = fromBase64(text.trim().replace(/\s+/g, '')); } catch (e) { throw new FormatError('unknown'); }
  if (bin.length < 16 + 12 + 16) throw new FormatError('unknown');
  for (const pw of candidates(password)) {
    const key = await pbkdf2Sha256(te.encode(pw), bin.subarray(0, 16), ITER);
    try {
      return td.decode(await gcmDecrypt(key, bin.subarray(16, 28), bin.subarray(28)));
    } catch (e) { /* try the next candidate */ }
  }
  throw new FormatError('auth');
}

/**
 * Version 2 file. Returns meta { name, size, type } and whether the file was
 * complete. Incomplete files are reported, never silently accepted.
 */
export async function decryptFileV2({ password, size, read, onMeta, onContent, onProgress, signal }) {
  if (size < 16 + 4 + 12 + 16) throw new FormatError('unknown');
  const head = await read(0, 32);
  const salt = head.subarray(0, 16);
  const metaLen = readU32le(head, 16);
  if (metaLen < 16 || metaLen > META_MAX || 32 + metaLen > size) throw new FormatError('unknown');
  const encMeta = await read(32, metaLen);

  let key = null, metaJson = null;
  for (const pw of candidates(password)) {
    const k = await pbkdf2Sha256(te.encode(pw), salt, ITER);
    try { metaJson = await gcmDecrypt(k, head.subarray(20, 32), encMeta); key = k; break; } catch (e) { /* try the next candidate */ }
  }
  if (!key) throw new FormatError('auth');
  let m;
  try { m = JSON.parse(td.decode(metaJson)); } catch (e) { throw new FormatError('corrupt'); }
  const meta = {
    kind: 'file', legacy: true,
    name: typeof m.originalName === 'string' ? m.originalName : '',
    size: Number.isSafeInteger(m.originalSize) && m.originalSize >= 0 ? m.originalSize : -1,
    type: typeof m.mimeType === 'string' ? m.mimeType : '',
  };
  if (onMeta) await onMeta(meta);

  let off = 32 + metaLen, done = 0;
  while (off < size) {
    if (signal && signal.aborted) throw new FormatError('aborted');
    if (off + 4 + 12 + 16 > size) throw new FormatError('corrupt');
    const hdr = await read(off, 16);
    const len = readU32le(hdr, 0);
    if (len < 16 || len > CHUNK_MAX || off + 16 + len > size) throw new FormatError('corrupt');
    let plain;
    try { plain = await gcmDecrypt(key, hdr.subarray(4, 16), await read(off + 16, len)); } catch (e) { throw new FormatError('auth'); }
    await onContent(plain);
    done += plain.length;
    off += 16 + len;
    if (onProgress) onProgress(done, meta.size);
  }
  return { meta, complete: meta.size === done };
}
