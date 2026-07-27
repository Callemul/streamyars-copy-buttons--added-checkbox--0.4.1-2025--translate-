export function checkAndClickAntiAfk(docNode = typeof document !== "undefined" ? document : null, i18n) {
  if (!docNode) return false;
  const dialogSelectors = [
    'div[role="dialog"][aria-label="Are you still there?"]',
    'div[role="dialog"]',
    '[aria-modal="true"]',
    'div[class*="modal"]',
    'div[class*="Dialog"]'
  ];
  let modalButtons = [];
  for (const selector of dialogSelectors) {
    const modal = docNode.querySelector(selector);
    if (modal) {
      const buttons = Array.from(modal.querySelectorAll('button, [role="button"], a'));
      if (buttons.length > 0) {
        modalButtons = buttons;
        break;
      }
    }
  }
  const candidateButtons = modalButtons.length > 0 ? modalButtons : Array.from(docNode.querySelectorAll('button, [role="button"], div[tabindex="0"], a'));
  if (candidateButtons.length === 0) {
    return false;
  }
  const targetTexts = [
    "stay in the studio",
    "stay in studio",
    "stay in",
    "still there",
    "залишитися в студії",
    "остаться в студии"
  ];
  if (i18n && typeof i18n.getMessage === "function") {
    const localized = i18n.getMessage("stayInStudio");
    if (localized && localized.trim()) {
      targetTexts.push(localized.trim().toLowerCase());
    }
  } else if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
    try {
      const localized = chrome.i18n.getMessage("stayInStudio");
      if (localized && localized.trim()) {
        targetTexts.push(localized.trim().toLowerCase());
      }
    } catch {
    }
  }
  for (const btn of candidateButtons) {
    const text = (btn.textContent || "").trim().toLowerCase();
    const ariaLabel = (btn.getAttribute("aria-label") || "").trim().toLowerCase();
    const title = (btn.getAttribute("title") || "").trim().toLowerCase();
    const isMatch = targetTexts.some(
      (target) => text === target || text.includes(target) || ariaLabel === target || ariaLabel.includes(target) || title === target || title.includes(target)
    ) || /stay in (the )?studio/i.test(text) || /still there/i.test(text);
    if (isMatch) {
      try {
        console.log("[SYH Anti-AFK] AFK таймаут перехоплено! Натискаю 'Stay in the studio'.");
        btn.click();
        return true;
      } catch (err) {
        console.warn("[SYH Anti-AFK] Помилка при натисканні кнопки Stay in studio:", err);
      }
    }
  }
  return false;
}
export function simulateUserActivity() {
  if (typeof document === "undefined") return;
  try {
    const event = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: Math.floor(Math.random() * 100) + 10,
      clientY: Math.floor(Math.random() * 100) + 10
    });
    (document.body || document.documentElement || document).dispatchEvent(event);
    console.log("[SYH Anti-AFK] Імітація фонової активності користувача виконана.");
  } catch (err) {
  }
}
let activeAfkTimer = null;
let activeActivityTimer = null;
let activeAfkObserver = null;
export function stopAntiAfk() {
  if (activeAfkObserver !== null) {
    try {
      activeAfkObserver.disconnect();
    } catch {
    }
    activeAfkObserver = null;
  }
  if (activeAfkTimer !== null) {
    clearInterval(activeAfkTimer);
    activeAfkTimer = null;
  }
  if (activeActivityTimer !== null) {
    clearInterval(activeActivityTimer);
    activeActivityTimer = null;
  }
  console.log("[SYH Anti-AFK] Anti-AFK захист зупинено.");
}
export function startAntiAfk(config, storage, i18n, customTargetNode) {
  stopAntiAfk();
  const checkOptionsAndRun = (options) => {
    const enabled = options?.anti_afk_enabled !== false;
    if (!enabled) {
      console.log("[SYH Anti-AFK] Anti-AFK вимкнено у налаштуваннях.");
      stopAntiAfk();
      return;
    }
    const intervalSec = options?.anti_afk_interval_sec || (config?.TIMINGS?.ANTI_AFK_INTERVAL ? config.TIMINGS.ANTI_AFK_INTERVAL / 1e3 : 30);
    const intervalMs = Math.max(intervalSec * 1e3, 5e3);
    console.log(`[SYH Anti-AFK] Anti-AFK активовано (Превентивна активність + MutationObserver + Резервний таймер ${intervalSec}с).`);
    const rootNode = customTargetNode || (typeof document !== "undefined" ? document.body || document.documentElement : null);
    checkAndClickAntiAfk(typeof document !== "undefined" ? document : null, i18n);
    simulateUserActivity();
    activeActivityTimer = setInterval(simulateUserActivity, 15e4);
    if (rootNode && typeof MutationObserver !== "undefined") {
      try {
        activeAfkObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
              const clicked = checkAndClickAntiAfk(typeof document !== "undefined" ? document : null, i18n);
              if (clicked) break;
            }
          }
        });
        activeAfkObserver.observe(rootNode, { childList: true, subtree: true });
      } catch (err) {
        console.warn("[SYH Anti-AFK] Помилка старту MutationObserver:", err);
      }
    }
    activeAfkTimer = setInterval(() => {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && !chrome.runtime.id) {
          stopAntiAfk();
          return;
        }
      } catch {
        stopAntiAfk();
        return;
      }
      checkAndClickAntiAfk(typeof document !== "undefined" ? document : null, i18n);
    }, intervalMs);
  };
  if (storage && typeof storage.get === "function") {
    storage.get(["syh_options"], (data) => {
      checkOptionsAndRun(data?.syh_options);
    });
    if (typeof storage.onChanged === "function") {
      storage.onChanged((changes) => {
        if (changes.syh_options) {
          checkOptionsAndRun(changes.syh_options.newValue);
        }
      });
    }
  } else {
    checkOptionsAndRun();
  }
}
export const SYH_ANTI_AFK = {
  checkAndClickAntiAfk,
  simulateUserActivity,
  startAntiAfk,
  stopAntiAfk
};
if (typeof window !== "undefined") {
  window.SYH_ANTI_AFK = SYH_ANTI_AFK;
}
