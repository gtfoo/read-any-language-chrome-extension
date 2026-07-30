// Applies localized strings to any element carrying a data-i18n attribute.
// Chrome auto-selects the locale from the browser's language; missing keys fall
// back to the default_locale (en). Messages may contain simple inline HTML.

function applyI18n(root) {
  root = root || document;

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) {
      el.innerHTML = msg;
      el.hidden = false;
    } else {
      // Intentionally-empty messages (e.g. the AI-translation note in English)
      // hide the element so it takes no space.
      el.hidden = true;
    }
  });

  // Localize attributes via data-i18n-attr="placeholder:someKey;title:otherKey"
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      if (!attr || !key) return;
      const msg = chrome.i18n.getMessage(key.trim());
      if (msg) el.setAttribute(attr.trim(), msg);
    });
  });

  const title = chrome.i18n.getMessage("settingsTitle");
  if (title) document.title = title;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => applyI18n());
} else {
  applyI18n();
}
