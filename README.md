# Read Any Language

Highlight text in any language on any web page and hear it read aloud in a
natural voice, using the ElevenLabs text-to-speech API.

## How it works

- **content.js** – detects a text selection and shows a floating 🔊 button.
- **background.js** (service worker) – calls the ElevenLabs API so your key
  never sits in the page context, and returns the audio to be played.
- **options.html/js** – where you enter your API key and pick a model + voice,
  with a live per-model language list and account-usage check.
- **popup.html/js** – toolbar status and a shortcut to settings.
- **i18n.js** + **_locales/** – localizes the UI based on the browser language.

## Install (unpacked, for development)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `read-any-language-chrome-extension`
   folder.
4. Click the extension's toolbar icon → **Open settings**.
5. Paste your ElevenLabs API key, pick a model and voice (use **Preview voice**
   to audition), then **Save**. The settings page has a built-in guide for
   getting a scoped API key.

After editing any file, return to `chrome://extensions` and click the reload
icon on the extension card.

## Usage

Select text on any page and click the 🔊 button that appears above it. Click it
again while playing to stop. A per-selection character limit (set in settings)
guards against surprise API usage.

## Supported UI languages

The settings and popup UI auto-select the user's language from the **browser's
display language**, falling back to English. (This is separate from the
languages the extension can *read aloud* — the ElevenLabs multilingual models
handle those regardless of UI language.)

30 locales are bundled under `_locales/`:

`en` English · `es` Spanish · `fr` French · `de` German · `zh_CN` Chinese
(Simplified) · `zh_TW` Chinese (Traditional) · `ja` Japanese · `pt` Portuguese ·
`ru` Russian · `it` Italian · `ar` Arabic · `hi` Hindi · `ko` Korean ·
`id` Indonesian · `tr` Turkish · `nl` Dutch · `pl` Polish · `vi` Vietnamese ·
`th` Thai · `bn` Bengali · `fa` Persian · `uk` Ukrainian · `fil` Filipino ·
`el` Greek · `sv` Swedish · `cs` Czech · `he` Hebrew · `ta` Tamil · `te` Telugu ·
`mr` Marathi

Arabic, Persian, and Hebrew render right-to-left automatically. Non-English
locales carry an AI-translation disclaimer, since the translations are
machine-generated and not yet natively reviewed.

### Adding another language

1. Copy `_locales/en/messages.json` to `_locales/<code>/messages.json`, using a
   Chrome-supported UI locale code (only languages Chrome can be *displayed* in
   will ever activate).
2. Translate each `message` value. Leave the `placeholders` blocks, HTML tags,
   URLs, and the ElevenLabs dashboard labels (`Text to Speech`, `Voices`,
   `Models`, `User`, `Access`, `Read`, `No Access`, `Create API Key`) unchanged.
3. Fill in `aiTranslatedNote` with a short disclaimer in that language.
4. Reload the extension and set Chrome to that language to test.

## Notes / next steps

- Models, voices, and each model's supported-language list are fetched live from
  the ElevenLabs API — nothing is hardcoded except a single fallback each.
- Ideas to extend: caching repeated text, and a keyboard shortcut via the
  `commands` API.
