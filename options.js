const $ = (id) => document.getElementById(id);
const msg = (key, subs) => chrome.i18n.getMessage(key, subs);

function setStatus(msg, isError) {
  const el = $("status");
  el.textContent = msg;
  el.style.color = isError ? "#b00020" : "#087f23";
}

function setUsage(msg, isError) {
  const el = $("usage");
  el.textContent = msg;
  el.style.color = isError ? "#b00020" : "#333";
}

let models = []; // TTS models fetched from the API
let savedModelId = null; // remembered so it survives dropdown repopulation
let voices = []; // free (premade) voices fetched from the API
let savedVoiceId = null;

function populateVoiceSelect() {
  const sel = $("voiceId");
  const want = savedVoiceId || sel.value;
  sel.innerHTML = "";
  for (const v of voices) sel.add(new Option(v.name, v.id));
  if (voices.some((v) => v.id === want)) sel.value = want;
}

async function loadVoices() {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return;
  const resp = await chrome.runtime.sendMessage({ type: "getVoices", apiKey });
  if (!resp || !resp.ok) return; // silently skip; keep the fallback option
  voices = resp.voices;
  if (voices.length) populateVoiceSelect();
}

function renderLanguages() {
  const el = $("languages");
  const m = models.find((x) => x.id === $("modelId").value);
  if (m && m.languages.length) {
    el.textContent = msg("langCount", [
      String(m.languages.length),
      m.languages.join(", "),
    ]);
  } else if (m) {
    el.textContent = msg("langAutoDetect");
  } else {
    el.textContent = "";
  }
}

function populateModelSelect() {
  const sel = $("modelId");
  const want = savedModelId || sel.value;
  sel.innerHTML = "";
  for (const m of models) sel.add(new Option(m.name, m.id));
  if (models.some((m) => m.id === want)) sel.value = want;
}

async function loadModels() {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return;
  const resp = await chrome.runtime.sendMessage({ type: "getModels", apiKey });
  if (!resp || !resp.ok) return; // silently skip; keep the fallback options
  models = resp.models.filter((m) => m.tts);
  if (models.length) populateModelSelect();
  renderLanguages();
}

async function restore() {
  const { apiKey, voiceId, modelId, maxChars } = await chrome.storage.sync.get([
    "apiKey",
    "voiceId",
    "modelId",
    "maxChars",
  ]);
  if (apiKey) $("apiKey").value = apiKey;
  savedModelId = modelId || null;
  if (modelId) $("modelId").value = modelId;
  if (maxChars) $("maxChars").value = maxChars;
  savedVoiceId = voiceId || null;
  if (voiceId) {
    // Make sure the saved voice is selectable even before the list is loaded.
    if (![...$("voiceId").options].some((o) => o.value === voiceId)) {
      $("voiceId").add(new Option(voiceId, voiceId));
    }
    $("voiceId").value = voiceId;
  }

  renderLanguages();
  loadModels();
  loadVoices();
}

$("modelId").addEventListener("change", renderLanguages);
$("apiKey").addEventListener("change", () => {
  loadModels(); // both fire on blur after editing the key
  loadVoices();
});

$("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    apiKey: $("apiKey").value.trim(),
    voiceId: $("voiceId").value,
    modelId: $("modelId").value,
    maxChars: Math.max(1, parseInt($("maxChars").value, 10) || 1000),
  });
  setStatus(msg("msgSaved"), false);
});

let previewAudio = null;

$("previewVoice").addEventListener("click", async () => {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return setStatus(msg("msgEnterKeyFirst"), true);

  const sel = $("voiceId");
  const voiceName = sel.options[sel.selectedIndex].text;
  const text = msg("previewText", [voiceName]);

  if (previewAudio) previewAudio.pause(); // don't overlap previews

  setStatus(msg("msgLoadingPreview"), false);
  const resp = await chrome.runtime.sendMessage({
    type: "preview",
    text,
    apiKey,
    voiceId: sel.value,
    modelId: $("modelId").value,
  });
  if (!resp || !resp.ok) {
    return setStatus(resp?.error || msg("msgNoResponse"), true);
  }

  previewAudio = new Audio(`data:audio/mpeg;base64,${resp.audioBase64}`);
  previewAudio.addEventListener("ended", () => setStatus("", false));
  await previewAudio.play();
  setStatus(msg("msgPreviewing", [voiceName]), false);
});

$("checkUsage").addEventListener("click", async () => {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return setUsage(msg("msgEnterKeyFirst"), true);

  setUsage(msg("msgChecking"), false);
  const resp = await chrome.runtime.sendMessage({ type: "getUsage", apiKey });
  if (!resp || !resp.ok) {
    return setUsage(resp?.error || msg("msgNoResponse"), true);
  }

  const { tier, used, limit, resetUnix } = resp.usage;
  const left = Math.max(0, limit - used);
  const reset = resetUnix
    ? new Date(resetUnix * 1000).toLocaleDateString()
    : "—";

  const el = $("usage");
  el.style.color = "#333";
  el.textContent =
    msg("usageLine", [
      tier,
      used.toLocaleString(),
      limit.toLocaleString(),
      left.toLocaleString(),
      reset,
    ]) + " · ";
  const link = document.createElement("a");
  link.href = "https://elevenlabs.io/app/usage";
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = msg("usageViewDetailed");
  el.appendChild(link);
});

restore();
