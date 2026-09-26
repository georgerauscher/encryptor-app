# encryptor

Encrypt and decrypt files and text on your own device. No installation, no internet connection, no account.

**Download [`index.html`](https://github.com/georgerauscher/encryptor-app/releases/latest/download/index.html) from the latest release and open it.** That single file is the whole tool. It runs in current desktop browsers on Windows, macOS, and Linux, even without an internet connection. You can pass it along on a USB drive or through a messaging app.

The same tool runs online at [encryptor.app](https://encryptor.app).

Version 2.2, the former website edition, remains available under the tag [v2.2.0](https://github.com/georgerauscher/encryptor-app/tree/v2.2.0).

## Facts

| Property | Value |
|---|---|
| Encryption | AES-256-GCM (Web Crypto API) |
| Key derivation | Argon2id, m = 64 MiB, t = 3, p = 4 ([hash-wasm](https://github.com/Daninet/hash-wasm) 4.12.0, MIT) |
| Key hierarchy | Random file key, HKDF-SHA-512, header authenticated with HMAC-SHA-512 |
| File format | Version 3: 1 MiB chunks, each bound to its position and to the end of the file; see [SPEC.md](SPEC.md) |
| Passwords | Always generated: 26 Crockford Base32 characters (130 bits) plus 2 check characters that catch typing errors |
| Metadata | File name, size, and type are encrypted; padding follows the PADMÉ scheme |
| Version 2 | Files and text from encryptor 2.x can still be decrypted |
| Network | None. The Content Security Policy of `index.html` forbids all connections. |
| Dependencies | hash-wasm only, included; no CDN, no cookies, no analytics |
| Languages | English, German |

## Verify the file

Compare the checksum of your copy with `SHA256SUMS` in this repository:

```
shasum -a 256 index.html
```

On Linux: `sha256sum index.html`. On Windows: `certutil -hashfile index.html SHA256`.

## Build it yourself

`index.html` is generated from the readable source in `src/`. The build is reproducible: the result is byte-for-byte identical to the published file. Python 3.9 or later, no dependencies:

```
python3 tools/build.py
shasum -a 256 -c SHA256SUMS
```

On Linux, use `sha256sum -c SHA256SUMS` instead.

| Path | Content |
|---|---|
| `src/core/` | Cryptographic core without DOM access: format v3, version 2 reader, password generator |
| `src/app/` | User interface, styles, UI strings, page template |
| `src/vendor/` | hash-wasm 4.12.0 (Argon2id), unmodified, with its license |
| `tools/build.py` | Combines everything into `index.html` and computes the Content Security Policy hashes |
| `SPEC.md` | Format specification |
| `test/` | Tests, test vectors, version 2 samples |

## Tests

Node.js 24.7 or later, no dependencies:

```
node --test
```

`test/vectors-v3.json` contains fixed inputs and the expected SHA-256 hash of each output; any implementation of format v3 must reproduce these hashes. The round-trip outputs and all test vectors are also decrypted by a second, independent reader built only on `node:crypto`.

## About

> "Unencrypted data talks. I listened for 25 years. Make yours silent."
>
> George A. Rauscher, intelligent piXel GmbH

Free to use, study, and share under the MIT License. Keep the credit, keep the link.

## Third-party components

| Component | License | Full text |
|---|---|---|
| [hash-wasm](https://github.com/Daninet/hash-wasm) 4.12.0 by Dani Biró | MIT | [`src/vendor/hash-wasm-LICENSE.txt`](src/vendor/hash-wasm-LICENSE.txt) |
| Argon2 and BLAKE2b code inside hash-wasm, based on Go (The Go Authors) and the BLAKE2 reference implementation (Samuel Neves) | BSD-3-Clause, CC0 | [`src/vendor/hash-wasm-embedded-LICENSES.txt`](src/vendor/hash-wasm-embedded-LICENSES.txt) |
| [Lucide](https://lucide.dev) icons, some derived from Feather by Cole Bemis | ISC, MIT | [`src/vendor/lucide-LICENSE.txt`](src/vendor/lucide-LICENSE.txt) |

All license texts, including this project's own, are also embedded at the end of `index.html`, so every copy carries them.

## Contributing

This project does not accept pull requests. Please report bugs as issues, and report security issues as described in [SECURITY.md](SECURITY.md).

## Security

See [SECURITY.md](SECURITY.md). encryptor protects content, not metadata such as the approximate file size. It cannot protect a compromised device. Without the password, the data is lost; there is no recovery.

## License

MIT License; see [LICENSE](LICENSE). If you build on encryptor, please keep the credit and link back to this repository.

Copyright (c) 2026 George A. Rauscher, intelligent piXel GmbH, Germany.

## Disclaimer

encryptor is provided free of charge and without warranty. Liability is excluded to the extent permitted by law; this does not limit liability for intent, gross negligence, or injury to life, body, or health. You are responsible for your passwords and for keeping backups of your data.

## Legal notice

Published by intelligent piXel GmbH, Starnberg, Germany. Legal notice (Impressum): [encryptor.app/legal-notice](https://encryptor.app/legal-notice/); in German: [encryptor.app/de/impressum](https://encryptor.app/de/impressum/).
