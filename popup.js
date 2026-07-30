const msg = (key) => chrome.i18n.getMessage(key);

document.getElementById("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("state").textContent = msg("stateChecking");

chrome.storage.sync.get("apiKey").then(({ apiKey }) => {
  document.getElementById("state").textContent = apiKey
    ? msg("stateReady")
    : msg("stateNoKey");
});
