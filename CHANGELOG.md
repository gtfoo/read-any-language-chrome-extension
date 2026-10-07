# Changelog

English only, deliberately. The Chrome Web Store has no release-notes field —
update logs would have to live in the detailed description, which is written
per locale, so publishing release notes there would cost 31 translations every
version. This file and the GitHub releases carry that instead, and the store
listing just links here.

Versions are the `version` in `manifest.json`. The store requires it to
increase on every upload.

## 1.4.1

- Eleven v4 and v4 Turbo also ignore `voice_settings.speed`, so the speed
  control now disables itself for them as it did for v3. Established by
  comparing audio duration at 0.7× and 1.2× — neither the docs nor
  `/v1/models` say anything about speed support.
- Speed detection matches by model family prefix rather than exact id, so
  `eleven_v3_conversational` and future `eleven_v4_*` variants are covered
  without a release.
- The "model ignores this setting" note no longer names Eleven v3, since it was
  being shown verbatim for v4. Naming only the models that *do* support speed
  keeps it true as new families ship.
- v4 and v4 Turbo needed no other work: the model list is fetched live from
  `/v1/models`, so they appeared on their own.

## 1.4.0

- Added **generation speed** (0.7×–1.2×), sent as `voice_settings.speed` so the
  model genuinely speaks at that pace and the pitch stays natural. Defaults to
  1.0×. A local `playbackRate` control was tried and rejected: Web Audio
  resamples rather than time-stretches, so it shifts pitch.
- Models that ignore the setting now disable the control and explain why,
  rather than appearing to work.
- Fixed uncaught `TypeError`s from content scripts orphaned by an extension
  reload — `chrome.runtime.id` goes undefined and `chrome.i18n` then throws on
  every selection. i18n access is guarded and the selection handler bails out
  when the context is dead.

## 1.3.3

- **Fixed narration failing on sites with a restrictive `Content-Security-Policy`.**
  A content script inherits the page's CSP, so the `data:` URI given to
  `new Audio()` was refused, surfacing only as a bare `NotSupportedError`.
  Playback now goes through the Web Audio API: `decodeAudioData` takes an
  in-memory `ArrayBuffer`, so no resource URL is loaded and `media-src` has
  nothing to act on.
- The service worker now rejects a `200` carrying an empty or non-audio body
  and names what came back, instead of returning base64 that can only fail
  later as an opaque decode error.

## 1.3.2

- **Fixed Portuguese missing from the published listing.** Chrome only accepts
  `pt_BR` and `pt_PT`; bare `pt` is not a supported locale code, so Chrome
  ignored the folder silently with no upload error. Renamed to `pt_BR` and
  added `pt_PT`, adapted to European Portuguese rather than copied.
- Added `tools/validate-locales.py`, which would have caught this in a second,
  and wired it to a pre-commit hook and CI.

## 1.3.1

- Fully localized the product name. `extName` is now derived as
  `<appName> - <poweredBy>`, so the attribution is in the local language too,
  and the settings heading, tab title and popup heading no longer read
  "Read Any Language" in every locale.

## 1.3.0

- `manifest.json` uses `__MSG_extName__` / `__MSG_extDescription__`, so the
  extension name and store summary follow the browser and store language
  instead of always showing English.

## 1.2.0

- 12 more UI locales (31 total, 30 languages).
- Right-to-left locales flip the page automatically.

## 1.1.0

- 12 more UI locales.

## 1.0.0

- First store-ready release: privacy policy, store listing copy, icons.
- Highlight-to-play with a stop toggle, one narration at a time, live model and
  voice lists, voice preview, per-selection character cap, remaining-quota
  display, and a 30-locale UI.
