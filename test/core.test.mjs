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
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import nodeCrypto from 'node:crypto';
import { FAST, referenceDecryptV3, hex, unhex } from './helpers.mjs';
import { encryptBytes, decryptBytes, encryptText, decryptText, padme, CHUNK, CT_CHUNK, HEADER_LEN, FormatError } from '../src/core/format-v3.js';
import { decryptTextV2, decryptFileV2 } from '../src/core/legacy-v2.js';
import { generatePassword, canonicalPassword, formatPassword, ALPHABET } from '../src/core/generator.js';
import { sanitizeFileName, riskOf } from '../src/core/sanitize.js';
import { detectText, detectFile } from '../src/core/detect.js';
import { crackYears } from '../src/core/crack-time.js';
import { DEFAULT_PARAMS } from '../src/core/kdf.js';

const PW = generatePassword();
const meta = (size) => ({ kind: 'file', name: 'Report Ärzte.pdf', type: 'application/pdf', mtime: 1790000000000, size });
const rnd = (n) => { const b = new Uint8Array(n); for (let i = 0; i < n; i += 65536) globalThis.crypto.getRandomValues(b.subarray(i, i + 65536)); return b; };
const rejects = (p, code) => assert.rejects(p, (e) => e instanceof FormatError && e.code === code);
// Structural tampering may end as 'auth' or 'corrupt'; both lead to the same message.
const rejectsTamper = (p) => assert.rejects(p, (e) => e instanceof FormatError && (e.code === 'auth' || e.code === 'corrupt'));

test('hash-wasm Argon2id matches node:crypto', async () => {
  const salt = unhex('000102030405060708090a0b0c0d0e0f');
  const a = await globalThis.hashwasm.argon2id({ password: new TextEncoder().encode('pw'), salt, parallelism: 4, iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'binary' });
  const b = nodeCrypto.argon2Sync('argon2id', { message: Buffer.from('pw'), nonce: salt, parallelism: 4, passes: 3, memory: 65536, tagLength: 32 });
  assert.equal(hex(a), hex(b));
});

test('padme', () => {
  assert.equal(padme(0), 0); assert.equal(padme(1), 1); assert.equal(padme(100), 104);
  for (const n of [5, 1000, 123456, 10 ** 9, 5 * 10 ** 12]) { const p = padme(n); assert.ok(p >= n && p - n <= n * 0.13); }
});

for (const size of [0, 1, 1000, CHUNK - 200, CHUNK, CHUNK + 1, 3 * CHUNK + 5]) {
  test(`v3 round trip, ${size} bytes, checked by the reference reader`, async () => {
    const content = rnd(size);
    const enc = await encryptBytes(PW, meta(size), content, { params: FAST });
    const dec = await decryptBytes(PW, enc);
    assert.equal(hex(dec.content), hex(content));
    assert.equal(dec.meta.name, 'Report Ärzte.pdf');
    const ref = referenceDecryptV3(PW, enc);
    assert.equal(hex(ref.content), hex(content));
  });
}

test('v3 with default parameters (64 MiB, t=3, p=4), 50 MB', async () => {
  const content = rnd(50 * 1024 * 1024);
  const enc = await encryptBytes(PW, meta(content.length), content);
  assert.equal(enc[11], 0); assert.equal(Buffer.from(enc).readUInt32BE(8), DEFAULT_PARAMS.m);
  const dec = await decryptBytes(PW, enc);
  assert.ok(Buffer.from(dec.content).equals(Buffer.from(content)));
});

test('v3 rejects every modification', async () => {
  const content = rnd(3 * CHUNK + 777);
  const enc = await encryptBytes(PW, meta(content.length), content, { params: FAST });
  const chunk = (i) => enc.slice(HEADER_LEN + i * CT_CHUNK, HEADER_LEN + (i + 1) * CT_CHUNK);
  const head = enc.slice(0, HEADER_LEN);
  const cat = (...a) => Buffer.concat(a.map((x) => Buffer.from(x)));
  const flip = (pos) => { const c = enc.slice(); c[pos] ^= 1; return c; };

  await rejects(decryptBytes(generatePassword(), enc), 'auth');
  await rejectsTamper(decryptBytes(PW, enc.slice(0, enc.length - 1)));                     // truncated
  await rejectsTamper(decryptBytes(PW, enc.slice(0, HEADER_LEN + 3 * CT_CHUNK)));          // last chunk missing
  await rejectsTamper(decryptBytes(PW, new Uint8Array(cat(head, chunk(1), chunk(0), enc.slice(HEADER_LEN + 2 * CT_CHUNK))))); // reordered
  await rejectsTamper(decryptBytes(PW, new Uint8Array(cat(head, chunk(0), chunk(0), enc.slice(HEADER_LEN + CT_CHUNK)))));    // duplicated
  await rejectsTamper(decryptBytes(PW, new Uint8Array(cat(enc, [0]))));                    // appended
  for (const pos of [25, 40, 55, 70, 100, 120, HEADER_LEN + 5, enc.length - 3]) await rejectsTamper(decryptBytes(PW, flip(pos)));
  // Parameters outside the limits are rejected before any computation.
  const big = enc.slice(); big.set([0x7f, 0, 0, 0], 8);
  await rejects(decryptBytes(PW, big), 'unsupported');
  const v4 = enc.slice(); v4[4] = 4;
  await rejects(decryptBytes(PW, v4), 'unsupported');
});

test('v3 header MAC detects changed parameters', async () => {
  const enc = await encryptBytes(PW, meta(10), rnd(10), { params: FAST });
  const c = enc.slice(); c[15] = 2; // t from 1 to 2
  await rejects(decryptBytes(PW, c), 'auth');
});

test('v3 text with accents and emoji', async () => {
  const msg = 'Greetings from Starnberg. Grüße. 秘密 🔐\nline 2';
  const s = await encryptText(PW, msg, { params: FAST });
  assert.ok(s.startsWith('ENCR3.'));
  assert.equal(detectText(s), 'v3');
  assert.equal(await decryptText(PW, s), msg);
  assert.equal(await decryptText(PW, '  ' + s.slice(0, 40) + '\n' + s.slice(40) + ' '), msg);
  await rejects(decryptText(PW, s.slice(0, -4)), 'auth');
});

test('v3 test vectors are reproducible and readable by the reference reader', async () => {
  const vectors = JSON.parse(readFileSync(new URL('./vectors-v3.json', import.meta.url), 'utf8'));
  for (const v of vectors) {
    const content = unhex(v.content);
    const enc = await encryptBytes(v.password, v.meta, content, { params: v.params, _fixed: { salt: unhex(v.salt), fileNonce: unhex(v.fileNonce), prefix: unhex(v.prefix), fk: unhex(v.fk) } });
    assert.equal(nodeCrypto.createHash('sha256').update(enc).digest('hex'), v.sha256, v.name);
    assert.equal(hex(referenceDecryptV3(v.password, enc).content), v.content);
  }
});

test('generator: format, uniform distribution, check characters', () => {
  const p = generatePassword();
  assert.match(p, /^[0-9A-HJKMNP-TV-Z]{28}$/);
  assert.equal(canonicalPassword(p).kind, 'code');
  assert.equal(canonicalPassword(formatPassword(p).toLowerCase()).password, p);
  const counts = new Array(32).fill(0);
  for (let i = 0; i < 4000; i++) for (const ch of generatePassword().slice(0, 26)) counts[ALPHABET.indexOf(ch)]++;
  const exp = 4000 * 26 / 32;
  const chi = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0);
  assert.ok(chi < 70, 'chi² ' + chi); // 31 degrees of freedom; 70 is far above the 99.9 % quantile
  // Every single substitution and every swap of adjacent characters is detected.
  for (let i = 0; i < 28; i++) {
    for (const ch of ALPHABET) {
      if (ch === p[i]) continue;
      const q = p.slice(0, i) + ch + p.slice(i + 1);
      assert.equal(canonicalPassword(q).kind, 'typo');
    }
    if (i < 27 && p[i] !== p[i + 1]) assert.equal(canonicalPassword(p.slice(0, i) + p[i + 1] + p[i] + p.slice(i + 2)).kind, 'typo');
  }
  assert.equal(canonicalPassword('my old password').kind, 'free');
});

test('Crockford: I, L and O are mapped', () => {
  const p = generatePassword();
  const swapped = p.replace(/1/g, 'l').replace(/0/g, 'o');
  assert.equal(canonicalPassword(swapped).password, p);
});

const V2 = JSON.parse(readFileSync(new URL('./fixtures/v2-samples.json', import.meta.url), 'utf8'));

test('version 2 text from encryptor.app 2.2 decrypts', async () => {
  assert.equal(detectText(V2.ciphertext), 'v2');
  assert.equal(await decryptTextV2(V2.password, V2.ciphertext), V2.text);
  await rejects(decryptTextV2('wrong password', V2.ciphertext), 'auth');
});

test('version 2 file from encryptor.app 2.2 decrypts, truncation is detected', async () => {
  const data = new Uint8Array(readFileSync(new URL('./fixtures/' + V2.file.path, import.meta.url)));
  assert.equal(detectFile(data.subarray(0, 4), data.length), 'v2');
  const run = async (d, pw = V2.password) => {
    const parts = [];
    const r = await decryptFileV2({ password: pw, size: d.length, read: async (o, l) => d.subarray(o, o + l), onContent: async (x) => parts.push(x) });
    return { ...r, content: Buffer.concat(parts) };
  };
  const ok = await run(data);
  assert.equal(ok.complete, true);
  assert.equal(ok.meta.name, V2.file.name);
  assert.equal(ok.content.length, V2.file.size);
  assert.ok(ok.content.every((x, i) => x === ((i * 7 + 3) & 255)));
  const blocks = [];
  let off = 32 + Buffer.from(data).readUInt32LE(16);
  while (off < data.length) { blocks.push(off); off += 16 + Buffer.from(data).readUInt32LE(off); }
  const cut = await run(data.subarray(0, blocks[blocks.length - 1]));
  assert.equal(cut.complete, false);
  await rejects(run(data, 'wrong password'), 'auth');
});

test('file names are sanitized and risky extensions detected', () => {
  assert.deepEqual(sanitizeFileName('../../etc/passwd'), { name: '_.._etc_passwd', changed: true });
  assert.equal(sanitizeFileName('rechnung\u202efdp.exe').name, 'rechnungfdp.exe');
  assert.equal(sanitizeFileName('\u0000').name, 'decrypted-file');
  assert.equal(sanitizeFileName('Bericht.pdf').changed, false);
  assert.deepEqual(riskOf('invoice.pdf.exe'), { executable: true, doubleExtension: true });
  assert.deepEqual(riskOf('setup.dmg'), { executable: true, doubleExtension: false });
  assert.deepEqual(riskOf('foto.jpg'), { executable: false, doubleExtension: false });
});

test('crack time for 130 bits against 1 million RTX 5090 is about 7 × 10^21 years', () => {
  const y = crackYears(130);
  assert.ok(y > 6.5e21 && y < 7.5e21, String(y));
});
