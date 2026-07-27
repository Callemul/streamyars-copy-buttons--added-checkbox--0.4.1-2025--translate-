export const SYH_STORAGE = {
  /**
   * Перевірка доступності chrome.storage.local
   */
  isChromeStorageAvailable: function() {
    return typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local && !!chrome.runtime && !!chrome.runtime.id;
  },
  /**
   * Отримати значення за ключем або масивом ключів
   */
  /**
   * Отримати значення за ключем або масивом ключів
   */
  get: function(keys, cb) {
    if (this.isChromeStorageAvailable()) {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            console.warn("[SYH Storage] chrome.storage.local.get error:", chrome.runtime.lastError.message);
            const res2 = {};
            const arr2 = Array.isArray(keys) ? keys : [keys];
            arr2.forEach((k) => {
              try {
                const val = localStorage.getItem(k);
                res2[k] = val !== null ? JSON.parse(val) : void 0;
              } catch (e) {
                console.warn("[SYH Storage] localStorage.getItem error:", e?.message || e);
                res2[k] = void 0;
              }
            });
            if (cb) cb(res2);
            return;
          }
          if (cb) cb(result);
        });
        return;
      } catch (e) {
        console.warn("[SYH Storage] Fallback to localStorage (get):", e?.message || e);
      }
    }
    const res = {};
    const arr = Array.isArray(keys) ? keys : [keys];
    arr.forEach((k) => {
      try {
        const val = localStorage.getItem(k);
        res[k] = val !== null ? JSON.parse(val) : void 0;
      } catch (e) {
        console.warn("[SYH Storage] localStorage.getItem error:", e?.message || e);
        res[k] = void 0;
      }
    });
    if (cb) cb(res);
  },
  /**
   * Зберегти об'єкт пар ключ-значення
   */
  set: function(items, cb) {
    if (this.isChromeStorageAvailable()) {
      try {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            console.warn("[SYH Storage] chrome.storage.local.set error:", chrome.runtime.lastError.message);
          }
          if (cb) cb();
        });
        return;
      } catch (e) {
        console.warn("[SYH Storage] Fallback to localStorage (set):", e?.message || e);
      }
    }
    Object.keys(items).forEach((k) => {
      try {
        localStorage.setItem(k, JSON.stringify(items[k]));
      } catch (e) {
        console.warn("[SYH Storage] localStorage.setItem error:", e?.message || e);
      }
    });
    if (cb) cb();
  },
  /**
   * Видалити значення за ключем або масивом ключів
   */
  remove: function(keys, cb) {
    if (this.isChromeStorageAvailable()) {
      try {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            console.warn("[SYH Storage] chrome.storage.local.remove error:", chrome.runtime.lastError.message);
          }
          if (cb) cb();
        });
        return;
      } catch (e) {
        console.warn("[SYH Storage] Fallback to localStorage (remove):", e?.message || e);
      }
    }
    const arr = Array.isArray(keys) ? keys : [keys];
    arr.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn("[SYH Storage] localStorage.removeItem error:", e?.message || e);
      }
    });
    if (cb) cb();
  },
  /**
   * Підписка на зміни сховища (якщо доступно chrome.storage.onChanged)
   */
  onChanged: function(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      try {
        chrome.storage.onChanged.addListener(callback);
      } catch (e) {
        console.warn("[SYH Storage] Failed to add onChanged listener:", e?.message || e);
      }
    }
  }
};
if (typeof window !== "undefined") {
  window.SYH_STORAGE = SYH_STORAGE;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = SYH_STORAGE;
}
