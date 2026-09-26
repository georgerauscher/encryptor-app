# Changelog

## 3.0.0 (2026-09-26)

* Offline edition: `index.html` is the complete tool in a single file. Open it with a double-click; no installation, no server, no internet. English and German.
* Reproducible build: `tools/build.py` creates `index.html` from `src/`; the Content Security Policy allows only the page's own scripts by hash and no network connections.
* New file and text format v3, see [SPEC.md](SPEC.md): versioned and authenticated header, 1 MiB chunks bound to their position and to the end of the file, encrypted metadata, PADMÉ padding.
* Argon2id key derivation (m = 64 MiB, t = 3, p = 4) replaces PBKDF2.
* Passwords are always generated: 26 Crockford Base32 characters (130 bits) plus 2 check characters that detect typing errors.
* Files are processed in chunks. No size limit in Chrome and Edge; up to 2 GB in Safari and Firefox.
* Encrypted files get a neutral name with date and time; the original name is restored and sanitized on decryption.
* Files and text from version 2 can still be decrypted. Incomplete version 2 files are detected.
* Tests with fixed vectors and an independent reference reader.
* The repository now contains only the offline tool. The website files of version 2.2 (PHP pages, contact form, installation guide) are no longer included; they remain available under the tag [v2.2.0](https://github.com/georgerauscher/encryptor-app/tree/v2.2.0).
* License changed to the standard MIT License; see [LICENSE](LICENSE).

## 2.2.0 (2025-11-30)

* Client-side encryption of text and files with AES-256-GCM and PBKDF2-SHA-256.
