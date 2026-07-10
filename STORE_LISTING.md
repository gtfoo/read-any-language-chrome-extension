# Chrome Web Store listing — Read Any Language

Reference copy for the Web Store submission form.

## Name
Read Any Language - Powered by ElevenLabs

## Summary (≤132 chars)
Highlight text in any language and hear it read aloud in a natural AI voice, powered by ElevenLabs text-to-speech.

## Description
Read Any Language turns any text on the web into natural-sounding speech. Highlight the text you want to hear, click the speaker button that appears, and listen — in the same language as the text.

Powered by ElevenLabs text-to-speech, it produces lifelike voices across dozens of languages and automatically matches the language of whatever you highlight. No copy-pasting, no switching apps.

HOW IT WORKS
1. Get a free ElevenLabs API key and paste it into the extension's settings.
2. Choose a voice and model — the built-in guide walks you through it.
3. Highlight any text on any page and click the speaker button to hear it.

FEATURES
• Reads highlighted text aloud in a natural AI voice
• Handles many languages automatically — the multilingual models detect the language for you
• Choose from your ElevenLabs voices and models, fetched live from your account
• Preview a voice before selecting it
• Stop playback any time; only one narration plays at once
• Set a per-selection character limit to control usage
• See your remaining ElevenLabs character quota in settings

GREAT FOR
• Language learners who want to hear correct pronunciation
• Reading articles, docs, or long posts hands-free
• Accessibility and reducing eye strain
• Proofreading your own writing by ear

PRIVACY
Your API key and settings are stored locally in your browser. The only data sent anywhere is the text you highlight and click to read, which goes directly to ElevenLabs to generate audio — nothing is ever sent to the developer, and there are no analytics or trackers.

Note: this extension requires your own ElevenLabs account and API key (a free tier is available).

## Category
Accessibility (or Productivity)

## Language
English (single language; the UI is not internationalised)

## Single purpose
Convert text that the user selects on a web page into spoken audio using the ElevenLabs text-to-speech API, so users can listen to it.

## Permission justifications

### storage
Saves the user's own ElevenLabs API key and preferences (voice, model, and per-selection character limit) locally via chrome.storage.sync so they persist between sessions. This data is not sent to the developer or to any server other than ElevenLabs (the API key is used only as the authentication header on the user's own requests).

### Host permission: https://api.elevenlabs.io/*
The extension calls the ElevenLabs API at api.elevenlabs.io to (a) convert the user's selected text into speech and (b) read the account's available voices, models, and remaining character quota shown in settings. This is the only external host the extension contacts, and requests are authenticated with the user's own API key.

### Host permission: <all_urls> (content_scripts match)
A content script runs on web pages so the extension can detect when the user selects text and show a small read-aloud button beside the selection. The broad match is required because users may want to read text on any website. The extension only accesses the specific text the user highlights, only sends it to ElevenLabs when the user clicks the button, and contacts no site other than ElevenLabs. It does not read, collect, or transmit other page content.

## Remote code
No, I am not using remote code. All JavaScript is bundled in the package. The extension only makes data requests via fetch to the ElevenLabs API and plays the returned audio as a data: URI. There are no external scripts or modules and no use of eval().

## Data usage — categories collected
- Authentication information — the user's ElevenLabs API key (stored locally, sent to ElevenLabs as the auth header).
- Website content — the text the user highlights (sent to ElevenLabs to generate audio).

All other categories: not collected.

## Data usage — certifications (all true)
- I do not sell or transfer user data to third parties, apart from the approved use cases. ✓
  (The only transfer is the user-initiated read-aloud request to ElevenLabs, which is a user-initiated action / service-provider use case.)
- I do not use or transfer user data for purposes unrelated to the item's single purpose. ✓
- I do not use or transfer user data to determine creditworthiness or for lending purposes. ✓

## Privacy policy URL
https://github.com/gtfoo/read-any-language-chrome-extension/blob/main/PRIVACY.md

## Store icon
icon128.png (128×128 PNG, square, fills the frame with transparent rounded corners).
