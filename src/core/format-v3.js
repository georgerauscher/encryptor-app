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
// encryptor format v3, see SPEC.md. Streams in 1 MiB chunks, so files larger
// than the available memory can be processed.
import { te, td, concat, u32be, readU32be, random, wipe, toBase64url, fromBase64url } from './bytes.js';
import { argon2id, hkdf, hmac512, aesKey, DEFAULT_PARAMS, LIMITS } from './kdf.js';

export const MAGIC = [0x45, 0x4e, 0x43, 0x52];
export const HEADER_LEN = 140;
export const CHUNK = 1048576;
export const TAG = 16;
export const CT_CHUNK = CHUNK + TAG;
export const META_MAX = 65536;
export const TEXT_PREFIX = 'ENCR3.';

export class FormatError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function padme(n) {
  if (n < 2) return n;
  const e = Math.floor(Math.log2(n));
  const s = Math.floor(Math.log2(e)) + 1;
  const step = 2 ** (e - s);
  return Math.ceil(n / step) * step;
}

function nonce(prefix, i, last) {
  return concat(prefix, u32be(i), new Uint8Array([last ? 1 : 0]));
}

async function payloadKeys(fk, fileNonce) {
  const pl = await hkdf(fk, fileNonce, 'encryptor v3 payload');
  const mk = await hkdf(fk, fileNonce, 'encryptor v3 header');
  return { pl, mk };
}

async function kekFor(passwordBytes, salt, params) {
  const pk = await argon2id(passwordBytes, salt, params);
  const kek = await hkdf(pk, salt, 'encryptor v3 kek');
  wipe(pk);
  return kek;
}

/**
 * Encrypts content. readContent(offset, length) returns content bytes,
 * write(bytes) receives the output in order. Returns the total output length.
 */
export async function encryptStream({ password, meta, readContent, write, onProgress, signal, params = DEFAULT_PARAMS, _fixed }) {
  const metaBytes = te.encode(JSON.stringify({
    kind: meta.kind, name: meta.name || '', size: meta.size, type: meta.type || '', mtime: meta.mtime || 0,
  }));
  if (metaBytes.length > META_MAX) throw new FormatError('meta-too-large');

  // _fixed is for test vectors only: fixed random values make the output reproducible.
  const salt = _fixed ? _fixed.salt : random(16);
  const fileNonce = _fixed ? _fixed.fileNonce : random(16);
  const prefix = _fixed ? _fixed.prefix : random(7);
  const fk = _fixed ? _fixed.fk : random(32);

  const head = new Uint8Array(HEADER_LEN);
  head.set(MAGIC, 0);
  head[4] = 3; head[5] = 1;
  head.set(u32be(params.m), 8); head.set(u32be(params.t), 12); head.set(u32be(params.p), 16);
  head.set(salt, 20); head.set(fileNonce, 36); head.set(prefix, 52); head[59] = 20;

  const kek = await kekFor(te.encode(password), salt, params);
  const wrapped = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12), additionalData: head.subarray(0, 60) }, await aesKey(kek), fk));
  wipe(kek);
  head.set(wrapped, 60);
  const { pl, mk } = await payloadKeys(fk, fileNonce);
  head.set((await hmac512(mk, head.subarray(0, 108))).subarray(0, 32), 108);
  wipe(mk);
  if (!_fixed) wipe(fk);
  await write(head);

  const prefixBytes = concat(u32be(metaBytes.length), metaBytes);
  const n = prefixBytes.length + meta.size;
  const total = padme(n);
  const chunks = Math.max(1, Math.ceil(total / CHUNK));
  const key = await aesKey(pl);
  wipe(pl);

  let out = HEADER_LEN;
  for (let i = 0; i < chunks; i++) {
    if (signal && signal.aborted) throw new FormatError('aborted');
    const start = i * CHUNK;
    const end = Math.min(total, start + CHUNK);
    const plain = new Uint8Array(end - start);
    // Assemble [start, end) of the plaintext stream from prefix, content and zero padding.
    if (start < prefixBytes.length) plain.set(prefixBytes.subarray(start, Math.min(end, prefixBytes.length)), 0);
    const cStart = Math.max(start, prefixBytes.length) - prefixBytes.length;
    const cEnd = Math.min(end, n) - prefixBytes.length;
    if (cEnd > cStart) {
      const piece = await readContent(cStart, cEnd - cStart);
      if (piece.length !== cEnd - cStart) throw new FormatError('read-short');
      plain.set(piece, cStart + prefixBytes.length - start);
    }
    const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce(prefix, i, i === chunks - 1) }, key, plain));
    wipe(plain);
    await write(ct);
    out += ct.length;
    if (onProgress) onProgress(Math.min(end, n) - prefixBytes.length > 0 ? Math.min(end, n) - prefixBytes.length : 0, meta.size);
  }
  return out;
}

export function isV3Header(first4) {
  return first4.length >= 4 && MAGIC.every((b, i) => first4[i] === b);
}

/** Validates the header and returns its parameters. Needs no password. */
export function parseHeader(head) {
  if (head.length < HEADER_LEN || !isV3Header(head)) throw new FormatError('not-v3');
  if (head[4] !== 3 || head[5] !== 1 || head[6] !== 0 || head[7] !== 0 || head[59] !== 20) throw new FormatError('unsupported');
  const m = readU32be(head, 8), t = readU32be(head, 12), p = readU32be(head, 16);
  if (m < LIMITS.mMin || m > LIMITS.mMax || t < LIMITS.tMin || t > LIMITS.tMax || p < LIMITS.pMin || p > LIMITS.pMax) throw new FormatError('unsupported');
  return {
    params: { m, t, p },
    salt: head.slice(20, 36), fileNonce: head.slice(36, 52), prefix: head.slice(52, 59), wrapped: head.slice(60, 108), mac: head.slice(108, 140),
  };
}

function constEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/**
 * Decrypts. read(offset, length) reads from the encrypted file of length size.
 * onMeta(meta) is called before any content, onContent(bytes) in order.
 * Throws 'auth' on a wrong password or any modification.
 */
export async function decryptStream({ password, size, read, onMeta, onContent, onProgress, signal }) {
  if (size < HEADER_LEN + TAG) throw new FormatError('not-v3');
  const head = await read(0, HEADER_LEN);
  const h = parseHeader(head);
  const kek = await kekFor(te.encode(password), h.salt, h.params);
  let fk;
  try {
    fk = new Uint8Array(await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12), additionalData: head.subarray(0, 60) }, await aesKey(kek), h.wrapped));
  } catch (e) {
    throw new FormatError('auth');
  } finally { wipe(kek); }
  const { pl, mk } = await payloadKeys(fk, h.fileNonce);
  wipe(fk);
  const mac = (await hmac512(mk, head.subarray(0, 108))).subarray(0, 32);
  wipe(mk);
  if (!constEq(mac, h.mac)) throw new FormatError('auth');
  const key = await aesKey(pl);
  wipe(pl);

  const payload = size - HEADER_LEN;
  const chunks = Math.ceil(payload / CT_CHUNK);
  const lastLen = payload - (chunks - 1) * CT_CHUNK;
  if (lastLen < TAG) throw new FormatError('auth');
  const plainTotal = payload - chunks * TAG;

  let pos = 0;            // position in the plaintext stream
  let metaLen = -1, meta = null, contentEnd = 0, metaBuf = null;
  for (let i = 0; i < chunks; i++) {
    if (signal && signal.aborted) throw new FormatError('aborted');
    const last = i === chunks - 1;
    const ct = await read(HEADER_LEN + i * CT_CHUNK, last ? lastLen : CT_CHUNK);
    let plain;
    try {
      plain = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce(h.prefix, i, last) }, key, ct));
    } catch (e) {
      throw new FormatError('auth');
    }
    let o = 0;
    if (!meta) {
      // Per SPEC, the metadata always fits into the first chunk.
      if (i !== 0 || plain.length < 4) throw new FormatError('corrupt');
      metaLen = readU32be(plain, 0);
      if (metaLen > META_MAX || 4 + metaLen > plain.length) throw new FormatError('corrupt');
      metaBuf = plain.subarray(4, 4 + metaLen);
      try { meta = JSON.parse(td.decode(metaBuf)); } catch (e) { throw new FormatError('corrupt'); }
      if (!meta || (meta.kind !== 'file' && meta.kind !== 'text') || !Number.isSafeInteger(meta.size) || meta.size < 0) throw new FormatError('corrupt');
      const n = 4 + metaLen + meta.size;
      if (n > plainTotal || padme(n) !== plainTotal) throw new FormatError('corrupt');
      contentEnd = n;
      o = 4 + metaLen;
      pos = o;
      if (onMeta) await onMeta(meta);
    }
    const base = i * CHUNK;
    const cEnd = Math.min(plain.length, contentEnd - base);
    if (cEnd > o) {
      await onContent(plain.slice(o, cEnd));
      pos = base + cEnd;
      o = cEnd;
    }
    for (let j = Math.max(o, 0); j < plain.length; j++) if (plain[j] !== 0) throw new FormatError('corrupt');
    wipe(plain);
    if (onProgress) onProgress(Math.max(0, Math.min(pos, contentEnd) - (4 + metaLen)), meta.size);
  }
  return meta;
}

// Convenience wrappers for data in memory (text, tests).
export async function encryptBytes(password, meta, content, opts = {}) {
  const parts = [];
  await encryptStream({ ...opts, password, meta: { ...meta, size: content.length },
    readContent: async (o, l) => content.subarray(o, o + l), write: async (b) => { parts.push(b); } });
  return concat(...parts);
}

export async function decryptBytes(password, data) {
  const parts = [];
  const meta = await decryptStream({ password, size: data.length, read: async (o, l) => data.subarray(o, o + l), onContent: async (b) => { parts.push(b); } });
  return { meta, content: concat(...parts) };
}

export async function encryptText(password, message, opts = {}) {
  const bin = await encryptBytes(password, { kind: 'text', name: '', type: 'text/plain; charset=utf-8', mtime: 0 }, te.encode(message), opts);
  return TEXT_PREFIX + toBase64url(bin);
}

export async function decryptText(password, text) {
  const s = text.trim();
  if (!s.startsWith(TEXT_PREFIX)) throw new FormatError('not-v3');
  let bin;
  try { bin = fromBase64url(s.slice(TEXT_PREFIX.length).replace(/\s+/g, '')); } catch (e) { throw new FormatError('corrupt'); }
  const { meta, content } = await decryptBytes(password, bin);
  if (meta.kind !== 'text') throw new FormatError('corrupt');
  try { return td.decode(content); } catch (e) { throw new FormatError('corrupt'); }
}
