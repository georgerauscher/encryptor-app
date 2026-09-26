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
// Test helpers: loads hash-wasm the same way the browser does and provides an
// independent format v3 reader built only on node:crypto, as a cross-check.
import nodeCrypto from 'node:crypto';

import '../src/vendor/hash-wasm-argon2-4.12.0.umd.min.js'; // UMD: sets globalThis.hashwasm, as in the browser

export const FAST = Object.freeze({ m: 8192, t: 1, p: 1 });
export const hex = (b) => Buffer.from(b).toString('hex');
export const unhex = (s) => new Uint8Array(Buffer.from(s, 'hex'));

export function referenceDecryptV3(password, data) {
  const b = Buffer.from(data);
  if (b.subarray(0, 4).toString('latin1') !== 'ENCR' || b[4] !== 3 || b[5] !== 1) throw new Error('header');
  const m = b.readUInt32BE(8), t = b.readUInt32BE(12), p = b.readUInt32BE(16);
  const salt = b.subarray(20, 36), fileNonce = b.subarray(36, 52), prefix = b.subarray(52, 59);
  const pk = nodeCrypto.argon2Sync('argon2id', { message: Buffer.from(password, 'utf8'), nonce: salt, parallelism: p, passes: t, memory: m, tagLength: 32 });
  const kek = Buffer.from(nodeCrypto.hkdfSync('sha512', pk, salt, 'encryptor v3 kek', 32));
  const dk = nodeCrypto.createDecipheriv('aes-256-gcm', kek, Buffer.alloc(12));
  dk.setAAD(b.subarray(0, 60));
  dk.setAuthTag(b.subarray(92, 108));
  const fk = Buffer.concat([dk.update(b.subarray(60, 92)), dk.final()]);
  const pl = Buffer.from(nodeCrypto.hkdfSync('sha512', fk, fileNonce, 'encryptor v3 payload', 32));
  const mk = Buffer.from(nodeCrypto.hkdfSync('sha512', fk, fileNonce, 'encryptor v3 header', 32));
  const mac = nodeCrypto.createHmac('sha512', mk).update(b.subarray(0, 108)).digest().subarray(0, 32);
  if (!nodeCrypto.timingSafeEqual(mac, b.subarray(108, 140))) throw new Error('mac');
  const payload = b.subarray(140);
  const n = Math.ceil(payload.length / 1048592);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const c = payload.subarray(i * 1048592, Math.min(payload.length, (i + 1) * 1048592));
    const iv = Buffer.concat([prefix, Buffer.from([(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255]), Buffer.from([i === n - 1 ? 1 : 0])]);
    const d = nodeCrypto.createDecipheriv('aes-256-gcm', pl, iv);
    d.setAuthTag(c.subarray(c.length - 16));
    parts.push(d.update(c.subarray(0, c.length - 16)), d.final());
  }
  const P = Buffer.concat(parts);
  const L = P.readUInt32BE(0);
  const meta = JSON.parse(P.subarray(4, 4 + L).toString('utf8'));
  return { meta, content: new Uint8Array(P.subarray(4 + L, 4 + L + meta.size)) };
}
