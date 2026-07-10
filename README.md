# Read Any Language

Highlight text in any language on any web page and hear it read aloud in a
natural voice, using the ElevenLabs text-to-speech API.

## How it works

- **content.js** – detects a text selection and shows a floating 🔊 button.
- **background.js** (service worker) – calls the ElevenLabs API so your key
  never sits in the page context, and returns the audio to be played.
- **options.html/js** – where you enter your API key and pick a model + voice.
- **popup.html/js** – toolbar status and a shortcut to settings.

## Install (unpacked, for development)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `highlight-reader` folder.
4. Click the extension's toolbar icon → **Open settings**.
5. Paste your ElevenLabs API key, optionally click **Load my voices** to pick a
   voice, then **Save**.

After editing any file, return to `chrome://extensions` and click the reload
icon on the extension card.

## Usage

Select text on any page and click the 🔊 button that appears above it.

## Notes / next steps

- The multilingual model auto-detects language, so there's no language setting.
- Ideas to extend: a play/pause/stop control, caching repeated text, a character
  limit to avoid large bills, and a keyboard shortcut via the `commands` API.
