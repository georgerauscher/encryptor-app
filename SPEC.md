# encryptor file format, version 3

Status: final for encryptor 3.0 (web) and encryptor for Mac. Both implementations must pass the test vectors in `test/vectors-v3.json`.

All integers are unsigned and big endian unless stated otherwise. `||` means concatenation.

## 1. Primitives

| Purpose | Algorithm |
|---|---|
| Password hashing | Argon2id, RFC 9106, output 32 bytes |
| Key derivation | HKDF with SHA-512, RFC 5869 |
| Header authentication | HMAC-SHA-512, truncated to 32 bytes |
| Encryption | AES-256-GCM, 96-bit nonce, 128-bit tag, NIST SP 800-38D |
| Randomness | Cryptographically secure random generator of the platform |

## 2. Password

encryptor generates every password it uses for encryption. A generated password is 26 random symbols from the Crockford Base32 alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (130 bits), followed by 2 check symbols.

Check value: `c = (sum over i = 0..25 of (i + 1) * v_i) mod 1021`, where `v_i` is the value of symbol `i`. The check symbols are `c div 32` and `c mod 32`.

Canonical form: remove all whitespace and hyphen-minus characters (U+002D), convert to uppercase, and map `I` and `L` to `1` and `O` to `0`. If the result has 28 symbols and the check value matches, the canonical 28-symbol string is the password. If it has 28 symbols from the alphabet but the check value does not match, implementations must report a probable typo and must not attempt decryption. Any other input is used as typed after Unicode NFC normalization.

The password bytes are the UTF-8 encoding of the password.

Display: groups of four symbols separated by a space.

## 3. Binary layout

```
offset  size  field
0       4     magic "ENCR" (0x45 0x4E 0x43 0x52)
4       1     version = 3
5       1     suite = 1 (Argon2id, HKDF-SHA-512, HMAC-SHA-512, AES-256-GCM)
6       2     reserved = 0
8       4     argon2 memory in KiB (m)
12      4     argon2 passes (t)
16      4     argon2 lanes (p)
20      16    argon2 salt
36      16    file nonce (HKDF salt)
52      7     stream nonce prefix
59      1     chunk size exponent = 20 (1 MiB)
60      48    wrapped file key (32 bytes ciphertext || 16 bytes tag)
108     32    header MAC
140     ...   payload chunks
```

Readers must reject the file unless: magic matches, version is 3, suite is 1, reserved is 0, chunk size exponent is 20, 8192 <= m <= 1048576, 1 <= t <= 10, 1 <= p <= 16, and the payload is at least 16 bytes.

Default parameters for writers: m = 65536 (64 MiB), t = 3, p = 4.

## 4. Keys

1. `pk = Argon2id(password bytes, salt, m, t, p, length 32)`
2. `kek = HKDF-SHA-512(ikm = pk, salt = salt, info = "encryptor v3 kek", length 32)`
3. File key `fk`: 32 random bytes.
4. `wrapped = AES-256-GCM-Encrypt(key = kek, nonce = 12 zero bytes, aad = header[0..60), plaintext = fk)`. The zero nonce is safe because `kek` is used exactly once.
5. `pl = HKDF-SHA-512(ikm = fk, salt = file nonce, info = "encryptor v3 payload", length 32)`
6. `mk = HKDF-SHA-512(ikm = fk, salt = file nonce, info = "encryptor v3 header", length 32)`
7. `header MAC = first 32 bytes of HMAC-SHA-512(mk, header[0..108))`

Decryption unwraps `fk`, derives `mk`, and verifies the header MAC before any payload is processed. A failed unwrap or MAC means wrong password or damaged file; implementations must not tell these cases apart.

The header MAC commits the file key to the whole header, including all parameters.

## 5. Payload

The plaintext stream `P` is:

```
u32 metadata length L || metadata (L bytes, UTF-8 JSON) || content || zero padding
```

Metadata is a JSON object with these keys:

| Key | Type | Meaning |
|---|---|---|
| `kind` | string | `"file"` or `"text"` |
| `name` | string | original file name, empty for text |
| `size` | number | content length in bytes |
| `type` | string | media type, may be empty |
| `mtime` | number | last modified, milliseconds since 1970, 0 if unknown |

Writers serialize the metadata as compact JSON without whitespace, with exactly these keys in this order: `kind`, `name`, `size`, `type`, `mtime`. Integers are written in plain decimal notation. Strings are escaped as ECMAScript `JSON.stringify` does: only `"`, `\`, and characters below U+0020 are escaped (as `\b`, `\t`, `\n`, `\f`, `\r` where available, otherwise `\u00xx` in lowercase hex), and lone surrogates as `\udxxx`; `/` and all other characters are written literally as UTF-8. The test vectors depend on this exact byte sequence. Readers must accept any valid JSON object with these keys.

`L` must be at most 65536. Padding: let `n = 4 + L + size`. The total length of `P` is `padme(n)`, filled with zero bytes after the content.

`padme(n)`: if `n < 2`, return `n`. Otherwise `e = floor(log2(n))`, `s = floor(log2(e)) + 1`, `z = e - s`, `mask = 2^z - 1`, return `(n + mask) & ~mask`.

`P` is split into chunks of exactly 1048576 bytes, the last chunk holds the rest and may be shorter. If `P` is a multiple of 1048576 bytes, there is no additional empty chunk. `P` is never empty because it contains the metadata length.

Chunk `i` (starting at 0) is encrypted with key `pl`, nonce `prefix (7 bytes) || u32 i || f`, where `f = 1` for the last chunk and `0` otherwise, and empty additional data. Every encrypted chunk is its plaintext plus a 16-byte tag.

A reader derives the chunk boundaries from the file length: every chunk except the last occupies 1048592 bytes. It must fail if any chunk fails authentication, which also catches truncation, reordering, duplication, and a missing end marker. After decryption it must check that `L` is within limits, the metadata parses, `4 + L + size <= len(P)`, `len(P) = padme(4 + L + size)`, and all padding bytes are zero.

Implementations that stream plaintext before the last chunk is verified must discard the output if a later chunk fails.

## 6. Text

Encrypted text is the string `ENCR3.` followed by the unpadded Base64url encoding (RFC 4648 section 5) of a complete binary file as above, with `kind = "text"` and the UTF-8 message as content.

## 7. Version 2 (read only)

Files and texts written by encryptor 2.x have no magic. Readers identify them by exclusion: text not starting with `ENCR3.`, files not starting with `ENCR`.

Key: `PBKDF2-HMAC-SHA-256(password as typed, UTF-8, salt, 100000 iterations, 32 bytes)`, AES-256-GCM.

Text: `Base64(salt 16 || iv 12 || ciphertext || tag 16)`.

File, lengths as u32 little endian:

```
salt 16 || metadata length || metadata iv 12 || encrypted metadata JSON
then until end of file: chunk length || iv 12 || encrypted chunk (length bytes, includes tag)
```

Metadata JSON contains `originalName`, `originalSize`, `mimeType`, `encrypted`, `version`. Chunk sizes vary. Readers must cap each length at 268435456 bytes and must report an incomplete file when the sum of decrypted chunk lengths differs from `originalSize`. Version 2 does not bind chunks to their position; readers should state that the file uses the older format.
