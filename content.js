// Shows a floating button when the user selects text.
// Button cycles through: idle (🔊) -> loading (…) -> playing (⏹, click to stop).
// A request token guarantees only one narration is ever active, even on rapid
// double-clicks or new selections.

let button = null;
let currentAudio = null;
let requestSeq = 0; // bumped whenever we start/cancel; stale responses are ignored
let state = "idle"; // "idle" | "loading" | "playing"
let charCount = 0; // length of the current selection
let maxChars = 1000; // cap; kept in sync with settings below

chrome.storage.sync.get("maxChars").then(({ maxChars: m }) => {
  if (m) maxChars = m;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.maxChars) {
    maxChars = changes.maxChars.newValue || 1000;
  }
});

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
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
    button.title = over
      ? chrome.i18n.getMessage("btnTooLong", subs)
      : chrome.i18n.getMessage("btnReadAloud", subs);
  } else if (next === "loading") {
    button.textContent = "…";
    button.title = chrome.i18n.getMessage("btnLoading");
  } else if (next === "playing") {
    button.textContent = "⏹";
    button.title = chrome.i18n.getMessage("btnStop");
  }
}

document.addEventListener("mouseup", (e) => {
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
      throw new Error(resp?.error || chrome.i18n.getMessage("errUnknown"));
    }

    const audio = new Audio(`data:audio/mpeg;base64,${resp.audioBase64}`);
    currentAudio = audio;
    audio.addEventListener("ended", () => {
      if (myReq === requestSeq) setState("idle");
    });
    setState("playing");
    await audio.play();
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
