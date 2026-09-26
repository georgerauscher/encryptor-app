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
// Password generator, SPEC.md section 2.
import { random } from './bytes.js';

export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const DATA_SYMBOLS = 26;
export const BITS = DATA_SYMBOLS * 5;

function checkValue(values) {
  let c = 0;
  for (let i = 0; i < values.length; i++) c = (c + (i + 1) * values[i]) % 1021;
  return c;
}

// 256 is a multiple of 32, so the low 5 bits of a random byte are exactly
// uniform. No rejection sampling is needed.
export function generatePassword() {
  const bytes = random(DATA_SYMBOLS);
  const v = Array.from(bytes, (b) => b & 31);
  bytes.fill(0);
  const c = checkValue(v);
  v.push(Math.floor(c / 32), c % 32);
  return v.map((x) => ALPHABET[x]).join('');
}

export function formatPassword(p) {
  return p.replace(/(.{4})(?=.)/g, '$1 ');
}

// Returns { kind: 'code' | 'typo' | 'free', password }.
export function canonicalPassword(input) {
  const s = input.replace(/[\s-]/g, '').toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0');
  if (s.length === DATA_SYMBOLS + 2 && [...s].every((ch) => ALPHABET.includes(ch))) {
    const v = [...s].map((ch) => ALPHABET.indexOf(ch));
    const c = checkValue(v.slice(0, DATA_SYMBOLS));
    if (v[DATA_SYMBOLS] === Math.floor(c / 32) && v[DATA_SYMBOLS + 1] === c % 32) return { kind: 'code', password: s };
    return { kind: 'typo', password: null };
  }
  return { kind: 'free', password: input.normalize('NFC') };
}
