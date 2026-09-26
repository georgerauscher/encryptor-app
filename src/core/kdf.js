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
// Argon2id comes from hash-wasm 4.12.0 (MIT), loaded as a classic script that
// provides globalThis.hashwasm. The Web Crypto API has no Argon2.
export const DEFAULT_PARAMS = Object.freeze({ m: 65536, t: 3, p: 4 });
export const LIMITS = Object.freeze({ mMin: 8192, mMax: 1048576, tMin: 1, tMax: 10, pMin: 1, pMax: 16 });

export async function argon2id(passwordBytes, salt, { m, t, p }) {
  const hw = globalThis.hashwasm;
  if (!hw || typeof hw.argon2id !== 'function') throw new Error('argon2-unavailable');
  return hw.argon2id({
    password: passwordBytes, salt, parallelism: p, iterations: t, memorySize: m, hashLength: 32, outputType: 'binary',
  });
}

const subtle = () => globalThis.crypto.subtle;

export async function hkdf(ikm, salt, info, length = 32) {
  const key = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-512', salt, info: new TextEncoder().encode(info) }, key, length * 8);
  return new Uint8Array(bits);
}

export async function hmac512(key, data) {
  const k = await subtle().importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return new Uint8Array(await subtle().sign('HMAC', k, data));
}

export async function aesKey(raw) {
  return subtle().importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function pbkdf2Sha256(passwordBytes, salt, iterations) {
  const k = await subtle().importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}
