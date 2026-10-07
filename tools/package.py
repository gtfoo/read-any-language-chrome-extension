#!/usr/bin/env python3
"""Build the Chrome Web Store upload zip.

    python3 tools/package.py

Two deliberate choices:

* The file list is an **allowlist**. A denylist would quietly ship whatever
  lands in the repo later — a stray key, a scratch file, someone's notes.
* manifest.json is written at the **root** of the archive. Zipping the folder
  itself produces an archive the store rejects for having no manifest.

Validation runs first, so a packaging step can't produce an upload with a
broken locale in it.
"""

import json
import os
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RUNTIME_FILES = [
    "manifest.json",
    "background.js",
    "content.js",
    "content.css",
    "i18n.js",
    "options.html",
    "options.js",
    "options.css",
    "popup.html",
    "popup.js",
    "popup.css",
    "icon16.png",
    "icon32.png",
    "icon48.png",
    "icon128.png",
]
RUNTIME_DIRS = ["_locales"]


def main():
    check = subprocess.run(
        [sys.executable, os.path.join(ROOT, "tools", "validate-locales.py")]
    )
    if check.returncode != 0:
        sys.exit("\nvalidation failed — not packaging")

    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        version = json.load(f)["version"]

    missing = [f for f in RUNTIME_FILES if not os.path.isfile(os.path.join(ROOT, f))]
    if missing:
        sys.exit(f"missing runtime files: {missing}")

    out_dir = os.path.join(ROOT, "web-store")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"read-any-language-{version}.zip")
    if os.path.exists(out):
        os.remove(out)

    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name in RUNTIME_FILES:
            z.write(os.path.join(ROOT, name), name)
            count += 1
        for directory in RUNTIME_DIRS:
            base = os.path.join(ROOT, directory)
            for dirpath, _, filenames in os.walk(base):
                for name in sorted(filenames):
                    full = os.path.join(dirpath, name)
                    z.write(full, os.path.relpath(full, ROOT))
                    count += 1

    size_kb = os.path.getsize(out) / 1024
    print(f"\nbuilt  web-store/read-any-language-{version}.zip")
    print(f"       {count} files, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
