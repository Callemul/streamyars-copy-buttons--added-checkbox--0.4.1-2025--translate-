export const SYH_I18N = {
  getMessage(key, fallback = "") {
    if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
      const msg = chrome.i18n.getMessage(key);
      if (msg) return msg;
    }
    return fallback;
  }
};
if (typeof window !== "undefined") {
  window.SYH_I18N = SYH_I18N;
}
