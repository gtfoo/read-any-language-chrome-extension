// Shows a floating button when the user selects text.
// Button cycles through: idle (🔊) -> loading (…) -> playing (⏹, click to stop).
// A request token guarantees only one narration is ever active, even on rapid
// double-clicks or new selections.

let button = null;
let audioCtx = null; // created lazily on first playback, then reused
let currentSource = null;
let requestSeq = 0; // bumped whenever we start/cancel; stale responses are ignored
let state = "idle"; // "idle" | "loading" | "playing"
let charCount = 0; // length of the current selection
let maxChars = 1000; // cap; kept in sync with settings below

// Reloading or updating the extension orphans the content scripts already
// running in open tabs: chrome.runtime.id goes undefined and the chrome.* APIs
// start throwing. Bail out quietly rather than spraying TypeErrors on every
// selection — reloading the page restores a live script.
function extensionAlive() {
  try {
    return Boolean(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function t(key, subs) {
  try {
    return chrome.i18n.getMessage(key, subs) || "";
  } catch {
    return "";
  }
}

chrome.storage.sync.get("maxChars").then(({ maxChars: m }) => {
  if (m) maxChars = m;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.maxChars) {
    maxChars = changes.maxChars.newValue || 1000;
  }
});

// Playback goes through the Web Audio API rather than an <audio> element.
// A content script inherits the host page's Content-Security-Policy, and plenty
// of sites block data: (and blob:) media. decodeAudioData takes an in-memory
// ArrayBuffer, so no resource URL is ever loaded and no CSP directive applies.
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function stopAudio() {
  if (currentSource) {
    currentSource.onended = null; // stopping must not fire the ended handler
    try {
      currentSource.stop();
    } catch {
      // stop() throws if the source already finished; nothing to do.
    }
    currentSource = null;
  }
  requestSeq++; // invalidate any in-flight request or pending "ended" handler
  state = "idle";
}

function removeButton() {
  stopAudio();
  if (button) {
    button.remove();
    button = null;
  }
}

function setState(next) {
  state = next;
  if (!button) return;
  button.classList.toggle("elr-loading", next === "loading");
  if (next === "idle") {
    const over = charCount > maxChars;
    button.classList.toggle("elr-over", over);
    button.textContent = over ? "⚠️" : "🔊";
    const subs = [String(charCount), String(maxChars)];
    button.title = over ? t("btnTooLong", subs) : t("btnReadAloud", subs);
  } else if (next === "loading") {
    button.textContent = "…";
    button.title = t("btnLoading");
  } else if (next === "playing") {
    button.textContent = "⏹";
    button.title = t("btnStop");
  }
}

document.addEventListener("mouseup", (e) => {
  if (!extensionAlive()) return; // orphaned script; wait for a page reload
  // A click on our own button is handled separately, not as a new selection.
  if (button && button.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection.toString().trim();

  removeButton(); // also stops any current speech — enforces one voice at a time
  if (!text) return;

  charCount = text.length;
  const rect = selection.getRangeAt(0).getBoundingClientRect();

  button = document.createElement("div");
  button.className = "elr-button";
  button.setAttribute("role", "button");
  button.style.top = `${window.scrollY + rect.top - 40}px`;
  button.style.left = `${window.scrollX + rect.left}px`;
  button.addEventListener("click", () => onClick(text));
  document.body.appendChild(button);

  setState("idle");
});

// Clicking elsewhere dismisses the button (and stops playback).
document.addEventListener("mousedown", (e) => {
  if (button && !button.contains(e.target)) removeButton();
});

function onClick(text) {
  if (state === "loading") return; // ignore extra clicks while fetching audio
  if (charCount > maxChars) return; // over cap — already flagged in the tooltip
  if (state === "playing") {
    stopAudio(); // toggle: stop current speech
    setState("idle");
    return;
  }
  narrate(text);
}

async function narrate(text) {
  stopAudio(); // cancel anything already going
  const myReq = ++requestSeq;
  setState("loading");

  try {
    const resp = await chrome.runtime.sendMessage({ type: "narrate", text });
    if (myReq !== requestSeq) return; // a newer click/selection superseded this one
    if (!resp || !resp.ok) {
      throw new Error(resp?.error || t("errUnknown") || "Unknown error");
    }

    const ctx = getAudioContext();
    // The context can start suspended under the autoplay policy; we are inside
    // a click handler, so resuming here settles immediately.
    if (ctx.state === "suspended") await ctx.resume();

    let buffer;
    try {
      buffer = await ctx.decodeAudioData(base64ToArrayBuffer(resp.audioBase64));
    } catch {
      const bytes = Math.floor((resp.audioBase64.length * 3) / 4);
      throw new Error(
        `Could not decode the ${bytes} bytes returned by ElevenLabs as audio.`
      );
    }
    if (myReq !== requestSeq) return; // superseded while decoding

    // Verbose-level only, so it costs normal users nothing. Duration is the
    // objective way to tell whether a model honoured voice_settings.speed:
    // same text at two speeds should give two different durations.
    console.debug(
      `[Read Any Language] ${buffer.duration.toFixed(2)}s of audio, ` +
        `${Math.floor((resp.audioBase64.length * 3) / 4)} bytes`
    );

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (myReq === requestSeq) setState("idle");
    };
    currentSource = source;
    setState("playing");
    source.start();
  } catch (err) {
    if (myReq !== requestSeq) return;
    setState("idle");
    if (button) {
      button.textContent = "⚠️";
      button.title = err.message;
    }
    console.error("[Read Any Language]", err);
  }
}
