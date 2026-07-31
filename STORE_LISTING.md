# Chrome Web Store listing — Read Any Language

Reference copy for the Web Store submission form. Current package: **v1.3.0**.

## What is automatic vs. manual

Since v1.3.0 the manifest uses `__MSG_extName__` / `__MSG_extDescription__`, so:

| Listing field | Source | Per-language work? |
| --- | --- | --- |
| Title | manifest `name` → `extName` in each locale | Automatic on upload |
| Summary | manifest `description` → `extDescription` | Automatic on upload |
| Detailed description | Dashboard field only | **Manual — paste per language** |
| Screenshots, category, privacy | Dashboard | Manual (one set) |

## Name

Localized automatically. English form:

    Read Any Language - Powered by ElevenLabs

Per-locale values live in `_locales/<code>/messages.json` → `extName`
(longest is 52 chars; manifest cap is 75).

## Summary (≤132 chars)

Localized automatically. English form:

    Text to speech: highlight text in any language and hear it read aloud in a natural voice. Powered by ElevenLabs.

Per-locale values live in `_locales/<code>/messages.json` → `extDescription`
(longest is 120 chars; cap is 132).

## Detailed description

Not part of the manifest — it must be pasted into the Dashboard for each
language. The English master and all 30 translations are in
[STORE_LISTING_TRANSLATIONS.md](STORE_LISTING_TRANSLATIONS.md).

## Category

Accessibility (or Productivity)

## Language

The listing's primary language is English. The package ships 30 locales, so the
store creates a localized listing for each one and fills in its title and
summary automatically — see the locale list in [README.md](README.md).

## Single purpose

Convert text that the user selects on a web page into spoken audio using the
ElevenLabs text-to-speech API, so users can listen to it.

## Permission justifications

### storage

Saves the user's own ElevenLabs API key and preferences (voice, model, and
per-selection character limit) locally via chrome.storage.sync so they persist
between sessions. This data is not sent to the developer or to any server other
than ElevenLabs (the API key is used only as the authentication header on the
user's own requests).

### Host permission: https://api.elevenlabs.io/*

The extension calls the ElevenLabs API at api.elevenlabs.io to (a) convert the
user's selected text into speech and (b) read the account's available voices,
models, and remaining character quota shown in settings. This is the only
external host the extension contacts, and requests are authenticated with the
user's own API key.

### Host permission: <all_urls> (content_scripts match)

A content script runs on web pages so the extension can detect when the user
selects text and show a small read-aloud button beside the selection. The broad
match is required because users may want to read text on any website. The
extension only accesses the specific text the user highlights, only sends it to
ElevenLabs when the user clicks the button, and contacts no site other than
ElevenLabs. It does not read, collect, or transmit other page content.
`activeTab` is not sufficient because the extension must react to a passive text
selection, which is not an extension-invoking user gesture.

## Remote code

No, I am not using remote code. All JavaScript is bundled in the package. The
extension only makes data requests via fetch to the ElevenLabs API and plays the
returned audio as a data: URI. There are no external scripts or modules and no
use of eval().

## Data usage — categories collected

- Authentication information — the user's ElevenLabs API key (stored locally,
  sent to ElevenLabs as the auth header).
- Website content — the text the user highlights (sent to ElevenLabs to generate
  audio).

All other categories: not collected.

## Data usage — certifications (all true)

- I do not sell or transfer user data to third parties, apart from the approved
  use cases. ✓
  (The only transfer is the user-initiated read-aloud request to ElevenLabs,
  which is a user-initiated action / service-provider use case.)
- I do not use or transfer user data for purposes unrelated to the item's single
  purpose. ✓
- I do not use or transfer user data to determine creditworthiness or for
  lending purposes. ✓

## Privacy policy URL

https://github.com/gtfoo/read-any-language-chrome-extension/blob/main/PRIVACY.md

## Store icon

icon128.png (128×128 PNG, square, fills the frame with transparent rounded
corners).
