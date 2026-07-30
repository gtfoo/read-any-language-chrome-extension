// Service worker: talks to the ElevenLabs API so the key never touches the page.

const DEFAULTS = {
  voiceId: "21m00Tcm4TlvDq8ikWAM", // "Rachel" — a built-in ElevenLabs voice
  modelId: "eleven_multilingual_v2",
  maxChars: 1000,
};

async function getConfig() {
  const { apiKey, voiceId, modelId, maxChars } = await chrome.storage.sync.get([
    "apiKey",
    "voiceId",
    "modelId",
    "maxChars",
  ]);
  return {
    apiKey,
    voiceId: voiceId || DEFAULTS.voiceId,
    modelId: modelId || DEFAULTS.modelId,
    maxChars: maxChars || DEFAULTS.maxChars,
  };
}

async function synthesize(text, overrides = {}) {
  const cfg = await getConfig();
  const apiKey = overrides.apiKey || cfg.apiKey;
  const voiceId = overrides.voiceId || cfg.voiceId;
  const modelId = overrides.modelId || cfg.modelId;
  if (!apiKey) throw new Error(chrome.i18n.getMessage("errNoKey"));
  if (text.length > cfg.maxChars) {
    // Backstop the content-script cap so we never spend quota on oversized text.
    throw new Error(
      chrome.i18n.getMessage("errTooLong", [
        String(text.length),
        String(cfg.maxChars),
      ])
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

// chrome.runtime messaging can't cleanly transfer an ArrayBuffer, so send base64.
function arrayBufferToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchVoices(apiKey) {
  const key = apiKey || (await getConfig()).apiKey;
  if (!key) throw new Error("No API key set.");

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  if (!res.ok) throw new Error(`Could not load voices (${res.status}).`);

  const data = await res.json();
  // "premade" voices are the ones free accounts can use via the API; professional,
  // cloned, generated, and shared-library voices require a paid plan.
  return data.voices
    .filter((v) => v.category === "premade")
    .map((v) => ({ id: v.voice_id, name: v.name }));
}

async function fetchModels(apiKey) {
  const key = apiKey || (await getConfig()).apiKey;
  if (!key) throw new Error("No API key set.");

  const res = await fetch("https://api.elevenlabs.io/v1/models", {
    headers: { "xi-api-key": key },
  });
  if (!res.ok) throw new Error(`Could not load models (${res.status}).`);

  const data = await res.json();
  return data.map((m) => ({
    id: m.model_id,
    name: m.name || m.model_id,
    tts: !!m.can_do_text_to_speech,
    languages: (m.languages || []).map((l) => l.name),
  }));
}

async function fetchUsage(apiKey) {
  const key = apiKey || (await getConfig()).apiKey;
  if (!key) throw new Error("No API key set.");

  const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": key },
  });
  if (res.status === 401) {
    throw new Error("Key lacks 'User' read access — enable it to see usage.");
  }
  if (!res.ok) throw new Error(`Could not load usage (${res.status}).`);

  const d = await res.json();
  return {
    tier: d.tier,
    used: d.character_count,
    limit: d.character_limit,
    resetUnix: d.next_character_count_reset_unix,
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "narrate") {
    synthesize(msg.text)
      .then((audioBase64) => sendResponse({ ok: true, audioBase64 }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep the channel open for the async response
  }
  if (msg.type === "preview") {
    synthesize(msg.text, {
      apiKey: msg.apiKey,
      voiceId: msg.voiceId,
      modelId: msg.modelId,
    })
      .then((audioBase64) => sendResponse({ ok: true, audioBase64 }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "getVoices") {
    fetchVoices(msg.apiKey)
      .then((voices) => sendResponse({ ok: true, voices }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "getModels") {
    fetchModels(msg.apiKey)
      .then((models) => sendResponse({ ok: true, models }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "getUsage") {
    fetchUsage(msg.apiKey)
      .then((usage) => sendResponse({ ok: true, usage }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
