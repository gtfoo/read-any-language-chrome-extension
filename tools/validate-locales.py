#!/usr/bin/env python3
"""Pre-upload sanity check for the extension's i18n setup.

Run from anywhere:  python3 tools/validate-locales.py
Exits 0 if everything passes, 1 otherwise — so it also works in CI.

Catches, among other things, the failure that shipped a release without
Portuguese: Chrome silently ignores a _locales folder whose code isn't in its
supported-locale table, with no error at upload time.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALES = os.path.join(ROOT, "_locales")

# Codes Chrome accepts under _locales/.
# https://developer.chrome.com/docs/extensions/reference/api/i18n#locales
CHROME_LOCALES = {
    "am", "ar", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en_AU",
    "en_GB", "en_US", "es", "es_419", "et", "fa", "fi", "fil", "fr", "gu",
    "he", "hi", "hr", "hu", "id", "it", "ja", "kn", "ko", "lt", "lv", "ml",
    "mr", "ms", "nl", "no", "pl", "pt_BR", "pt_PT", "ro", "ru", "sk", "sl",
    "sr", "sv", "sw", "ta", "te", "th", "tr", "uk", "vi", "zh_CN", "zh_TW",
}

# Chrome Web Store caps on the manifest fields.
MAX_NAME = 75
MAX_DESCRIPTION = 132

HTML_FILES = ["options.html", "popup.html"]
JS_FILES = ["i18n.js", "options.js", "popup.js", "content.js", "background.js"]

PLACEHOLDER_RE = re.compile(r"\$([A-Za-z0-9_]+)\$")

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001 - report any parse failure verbatim
        err(f"{os.path.relpath(path, ROOT)}: invalid JSON — {e}")
        return None


def check_placeholders(locale, key, entry):
    """Every $name$ used in a message must be declared, and vice versa."""
    message = entry.get("message", "")
    declared = {k.lower() for k in entry.get("placeholders", {})}
    used = {m.lower() for m in PLACEHOLDER_RE.findall(message)}

    for name in sorted(used - declared):
        err(f"{locale}/{key}: uses ${name}$ but never declares it "
            f"— Chrome will render the literal text")
    for name in sorted(declared - used):
        warn(f"{locale}/{key}: declares placeholder '{name}' that no message uses")


def main():
    manifest = load_json(os.path.join(ROOT, "manifest.json"))
    if manifest is None:
        report()
        return

    default_locale = manifest.get("default_locale")
    if not default_locale:
        err("manifest.json: no default_locale set, but _locales/ is present")

    if not os.path.isdir(LOCALES):
        err("_locales/ directory not found")
        report()
        return

    locales = sorted(
        d for d in os.listdir(LOCALES)
        if os.path.isdir(os.path.join(LOCALES, d))
    )
    if not locales:
        err("_locales/ contains no locale folders")
        report()
        return

    # 1. Locale codes Chrome will actually honour.
    for code in locales:
        if code not in CHROME_LOCALES:
            err(f"_locales/{code}: not a Chrome-supported locale code — Chrome "
                f"ignores it silently and the language goes missing after "
                f"upload. Regional variants are a common trap (pt_BR/pt_PT, "
                f"en_GB, es_419).")

    if default_locale and default_locale not in locales:
        err(f"manifest.json: default_locale '{default_locale}' has no "
            f"_locales/{default_locale}/messages.json")

    # 2. Load every catalogue.
    catalogues = {}
    for code in locales:
        path = os.path.join(LOCALES, code, "messages.json")
        if not os.path.isfile(path):
            err(f"_locales/{code}: no messages.json")
            continue
        data = load_json(path)
        if data is not None:
            catalogues[code] = data

    base = catalogues.get(default_locale)
    if base is None:
        report()
        return
    base_keys = set(base)

    # 3. Per-locale checks.
    for code, data in sorted(catalogues.items()):
        keys = set(data)
        for key in sorted(base_keys - keys):
            err(f"{code}: missing key '{key}' (falls back to {default_locale})")
        for key in sorted(keys - base_keys):
            warn(f"{code}: has key '{key}' not present in {default_locale}")

        for key, entry in data.items():
            if not isinstance(entry, dict) or "message" not in entry:
                err(f"{code}/{key}: entry has no 'message' field")
                continue
            check_placeholders(code, key, entry)

        name = data.get("extName", {}).get("message", "")
        desc = data.get("extDescription", {}).get("message", "")
        if len(name) > MAX_NAME:
            err(f"{code}: extName is {len(name)} chars, over the {MAX_NAME} cap")
        if len(desc) > MAX_DESCRIPTION:
            err(f"{code}: extDescription is {len(desc)} chars, over the "
                f"{MAX_DESCRIPTION} cap")

        # Project convention: the store name is the app name plus the
        # localized attribution, so the two can never drift apart.
        app = data.get("appName", {}).get("message")
        powered = data.get("poweredBy", {}).get("message")
        if app and powered and name and name != f"{app} - {powered}":
            warn(f"{code}: extName is not '<appName> - <poweredBy>'\n"
                 f"      got  {name}\n"
                 f"      want {app} - {powered}")

    # 4. Manifest should localize its name and description.
    used_keys = set()
    for field, key in (("name", "extName"), ("description", "extDescription")):
        value = manifest.get(field, "")
        if value.startswith("__MSG_"):
            referenced = value[len("__MSG_"):-2]
            used_keys.add(referenced)
            if referenced not in base_keys:
                err(f"manifest.json: {field} references __MSG_{referenced}__ "
                    f"which {default_locale} does not define")
        else:
            warn(f"manifest.json: {field} is a literal string, so it stays "
                 f"English in every locale (use __MSG_{key}__ to localize it)")

    # 5. Keys referenced from HTML/JS must exist.
    for name in HTML_FILES:
        path = os.path.join(ROOT, name)
        if not os.path.isfile(path):
            continue
        html = open(path, encoding="utf-8").read()
        for key in re.findall(r'data-i18n="([^"]+)"', html):
            used_keys.add(key)
            if key not in base_keys:
                err(f"{name}: data-i18n=\"{key}\" is not defined in "
                    f"{default_locale} — the element will render empty")
        for attr_spec in re.findall(r'data-i18n-attr="([^"]+)"', html):
            for pair in attr_spec.split(";"):
                if ":" in pair:
                    key = pair.split(":", 1)[1].strip()
                    used_keys.add(key)
                    if key not in base_keys:
                        err(f"{name}: data-i18n-attr references undefined "
                            f"key '{key}'")

    for name in JS_FILES:
        path = os.path.join(ROOT, name)
        if not os.path.isfile(path):
            continue
        js = open(path, encoding="utf-8").read()
        for key in re.findall(r'(?:getMessage|\bmsg)\(\s*["\']([^"\']+)["\']', js):
            used_keys.add(key)
            if key not in base_keys and not key.startswith("@@"):
                err(f"{name}: getMessage(\"{key}\") is not defined in "
                    f"{default_locale}")

    for key in sorted(base_keys - used_keys):
        warn(f"{default_locale}: key '{key}' is never referenced from HTML or JS")

    report(locales, base_keys, manifest)


def report(locales=None, base_keys=None, manifest=None):
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for w in warnings:
            print(f"  ! {w}")
        print()
    if errors:
        print(f"{len(errors)} error(s):")
        for e in errors:
            print(f"  x {e}")
        print("\nFAILED")
        sys.exit(1)

    if locales is not None:
        print(f"version   {manifest.get('version')}")
        print(f"locales   {len(locales)}")
        print(f"keys      {len(base_keys)} per locale")
    print("OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
