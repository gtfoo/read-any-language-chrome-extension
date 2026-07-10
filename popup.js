document.getElementById("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.sync.get("apiKey").then(({ apiKey }) => {
  document.getElementById("state").textContent = apiKey
    ? "✅ API key set — you're ready."
    : "⚠️ No API key yet. Open settings.";
});
