#!/usr/bin/env python3
# encryptor 3.0 · https://encryptor.app
#
# George A. Rauscher:
# "Unencrypted data talks. I listened for 25 years.
#  Make yours silent."
#
# Copyright (c) 2026 George A. Rauscher, intelligent piXel GmbH
# Free to use, study, and share under the MIT License.
# Keep the credit, keep the link: https://github.com/georgerauscher/encryptor-app
"""Builds index.html, the complete offline edition in a single file.

Reads only files from src/ and writes index.html. The output is byte-for-byte
reproducible: run this script and compare the SHA-256 with SHA256SUMS.

    python3 tools/build.py

Modules in src/core and src/app are plain ES modules (the tests import them
directly). Browsers refuse ES modules from file:// URLs, so this script turns
them into one classic script with a tiny module table. The Content Security
Policy allows exactly the inline scripts and styles of this page by hash.
"""
import base64
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

MODULE_ORDER = ["bytes", "kdf", "format-v3", "legacy-v2", "generator", "sanitize", "detect", "crack-time"]
HEADER = re.compile(r"/\*!.*?\*/\s*", re.S)
IMPORT = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$", re.M)
EXPORT = re.compile(r"^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)", re.M)


def module(name, path):
    code = HEADER.sub("", path.read_text(encoding="utf-8"), count=1)
    names = [m.group(2) for m in EXPORT.finditer(code)]
    code = EXPORT.sub(lambda m: m.group(1) + " " + m.group(2), code)

    def imp(m):
        dep = m.group(2).rsplit("/", 1)[-1].removesuffix(".js")
        return "const {%s} = __m[%s];" % (m.group(1).strip(), json.dumps(dep))

    code = IMPORT.sub(imp, code)
    body = "\n".join("  " + line if line else "" for line in code.strip("\n").split("\n"))
    return "__m[%s] = (() => {\n%s\n  return { %s };\n})();\n" % (json.dumps(name), body, ", ".join(names))


def bundle():
    parts = ["(() => {\n\"use strict\";\nconst __m = {};\n"]
    for name in MODULE_ORDER:
        parts.append(module(name, SRC / "core" / (name + ".js")))
    parts.append(module("app", SRC / "app" / "app.js"))
    parts.append("})();\n")
    return "".join(parts)


def inline_safe(text):
    # An inline script or style must never contain its own closing tag.
    return text.replace("</script", "<\\/script").replace("</style", "<\\/style")


def sha256_b64(text):
    return "'sha256-%s'" % base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode()


def notices():
    # The licenses require their full text in every copy, and index.html is
    # passed around on its own, so the texts travel inside it.
    parts = []
    for title, path in (("encryptor, LICENSE", ROOT / "LICENSE"),
                        ("hash-wasm 4.12.0 (Argon2id), src/vendor/hash-wasm-LICENSE.txt", SRC / "vendor" / "hash-wasm-LICENSE.txt"),
                        ("Argon2 and BLAKE2b inside hash-wasm, src/vendor/hash-wasm-embedded-LICENSES.txt", SRC / "vendor" / "hash-wasm-embedded-LICENSES.txt"),
                        ("Lucide icons, src/vendor/lucide-LICENSE.txt", SRC / "vendor" / "lucide-LICENSE.txt")):
        text = path.read_text(encoding="utf-8").strip()
        if "<!--" in text or "-->" in text:
            raise SystemExit("license text breaks the HTML comment: " + path.name)
        parts.append(title + "\n\n" + text)
    return "\n\n\n".join(parts)


def main():
    tpl = (SRC / "app" / "index.template.html").read_text(encoding="utf-8")
    # The page header already carries the credit block; the copies in the
    # bundled sources would only repeat it.
    style = inline_safe(HEADER.sub("", (SRC / "app" / "app.css").read_text(encoding="utf-8"), count=1))
    vendor = inline_safe((SRC / "vendor" / "hash-wasm-argon2-4.12.0.umd.min.js").read_text(encoding="utf-8"))
    app = inline_safe(bundle())
    i18n = json.dumps(json.loads((SRC / "app" / "i18n.json").read_text(encoding="utf-8")), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    sprite = (SRC / "app" / "icons.svg").read_text(encoding="utf-8").strip()
    favicon = "data:image/svg+xml;base64," + base64.b64encode((SRC / "app" / "favicon.svg").read_bytes()).decode()
    csp = "; ".join([
        "default-src 'none'",
        "script-src %s %s 'wasm-unsafe-eval'" % (sha256_b64(vendor), sha256_b64(app)),
        "style-src %s" % sha256_b64(style),
        "img-src data:",
        "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "require-trusted-types-for 'script'",
    ])
    out = tpl
    for key, value in (("CSP", csp), ("FAVICON", favicon), ("STYLE", style), ("SPRITE", sprite),
                       ("I18N", i18n), ("VENDOR", vendor), ("APP", app), ("NOTICES", notices())):
        if "{{%s}}" % key not in out:
            raise SystemExit("placeholder missing: " + key)
        out = out.replace("{{%s}}" % key, value, 1)
    (ROOT / "index.html").write_bytes(out.encode("utf-8"))
    digest = hashlib.sha256(out.encode("utf-8")).hexdigest()
    print("index.html  %d bytes  sha256 %s" % (len(out.encode("utf-8")), digest))


if __name__ == "__main__":
    main()
