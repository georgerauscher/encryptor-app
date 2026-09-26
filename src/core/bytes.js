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
// Byte helpers without dependencies, usable in browsers and in Node.

export const te = new TextEncoder();
export const td = new TextDecoder('utf-8', { fatal: true });

export function concat(...parts) {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function u32be(v) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v, false);
  return b;
}

export function readU32be(b, off) {
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(off, false);
}

export function readU32le(b, off) {
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(off, true);
}

export function random(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

// Base64 in blocks, because String.fromCharCode(...x) overflows the call
// stack for buffers of several megabytes.
export function toBase64(b) {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64url(b) {
  return toBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(s) {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('base64url');
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : s.length % 4 === 1 ? null : '';
  if (pad === null) throw new Error('base64url');
  return fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export function wipe(...bufs) {
  for (const b of bufs) if (b && b.fill) b.fill(0);
}
