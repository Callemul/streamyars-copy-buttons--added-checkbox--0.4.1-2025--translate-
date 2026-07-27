import { SYH_STORAGE } from "/modules/storage.ts.js";
import { SYH_STATE } from "/modules/state.ts.js";
import { SYH_CONFIG } from "/modules/config.ts.js";
import {
  addButtonsToComment,
  updateCommentVisuals,
  applySavedLabels,
  addStarredTabControls,
  bindStarredControls,
  filterStarredComments,
  scrollToActiveComment
} from "/modules/ui_comments.ts.js";
import {
  addButtonsToBanner,
  updateBannerVisuals,
  applySavedBannerLabels,
  addBannerHeaderControls,
  updateMasterCheckboxState,
  filterBanners,
  scrollToActiveBanner
} from "/modules/ui_banners.ts.js";
export function init(config, state) {
  try {
    SYH_UI.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
    SYH_UI.STATE = state || SYH_STATE;
    if (SYH_UI.STATE) {
      SYH_UI.STATE.onStateLoaded = () => SYH_UI.restoreDomCheckboxes();
    }
    SYH_UI.validateSelectorsSyntax();
    const storage = SYH_STORAGE || window.SYH_STORAGE;
    if (storage) {
      storage.get(["syh_prayers", "syh_banner_categories"], function(result) {
        SYH_UI.prayersCache = result.syh_prayers || [];
        SYH_UI.bannerCategoriesCache = result.syh_banner_categories || {};
      });
    } else {
      console.warn("[SYH] Сховище недоступне під час первинної ініціалізації кешу UI.");
    }
    if (storage && typeof storage.onChanged === "function") {
      storage.onChanged(function(changes) {
        try {
          if (changes.syh_prayers) {
            SYH_UI.prayersCache = changes.syh_prayers.newValue || [];
            if (typeof SYH_UI.filterStarredComments === "function") {
              SYH_UI.filterStarredComments();
            }
          }
          if (changes.syh_banner_categories) {
            SYH_UI.bannerCategoriesCache = changes.syh_banner_categories.newValue || {};
            if (typeof SYH_UI.filterBanners === "function") {
              SYH_UI.filterBanners();
            }
          }
        } catch (e) {
          console.error("[SYH] Помилка синхронізації сховища в UI:", e);
        }
      });
    }
  } catch (error) {
    console.error("[SYH] Критичний збій ініціалізації модуля UI Core. Запущено авто-відновлення:", error);
  }
}
export function validateSelectorsSyntax() {
  if (!SYH_UI.SELECTORS) return;
  console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");
  for (const key in SYH_UI.SELECTORS) {
    const selector = SYH_UI.SELECTORS[key];
    if (!selector) continue;
    try {
      document.querySelector(selector);
    } catch (e) {
      console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
    }
  }
}
export function restoreDomCheckboxes() {
  const selectors = SYH_UI.SELECTORS || (window.SYH_CONFIG ? window.SYH_CONFIG.SELECTORS : SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
  const itemStates = SYH_STATE ? SYH_STATE.itemStates : window.SYH_STATE ? window.SYH_STATE.itemStates : {};
  if (!selectors) {
    console.warn("[SYH_UI] Конфігурація SELECTORS ще не завантажена.");
    return;
  }
  console.log("[SYH_UI] Примусове відновлення стану чекбоксів у DOM для вирішення Race Condition.");
  $(".syh-checkbox").each(function() {
    const $checkbox = $(this);
    const type = $checkbox.data("type");
    let textKey = "";
    if (type === "comment") {
      const $commentBlock = $checkbox.closest(selectors.commentBlock || '[class*="PlatformComment__Wrap"]');
      textKey = $commentBlock.find(selectors.commentText || '[class*="PlatformCommentShell__ContentSpan"]').text();
    } else if (type === "banner") {
      const $bannerBlock = $checkbox.closest(selectors.bannerBlock || '[class*="Banner__LiWrap"]');
      textKey = $bannerBlock.find(selectors.bannerText || '[class*="Banner__BannerText"]').text();
    }
    if (textKey) {
      $checkbox.prop("checked", !!itemStates[textKey]);
    }
  });
}
export const SYH_UI = {
  SELECTORS: null,
  STATE: null,
  activeFilter: "all",
  searchQuery: "",
  prayersCache: [],
  bannerActiveFilter: "all",
  bannerSearchQuery: "",
  bannerCategoriesCache: {},
  _filterBannersTimeout: void 0,
  _filterCommentsTimeout: void 0,
  init,
  validateSelectorsSyntax,
  restoreDomCheckboxes,
  // Comments UI
  addButtonsToComment,
  updateCommentVisuals,
  applySavedLabels,
  addStarredTabControls,
  bindStarredControls,
  filterStarredComments,
  scrollToActiveComment,
  // Banner UI
  addButtonsToBanner,
  updateBannerVisuals,
  applySavedBannerLabels,
  addBannerHeaderControls,
  updateMasterCheckboxState,
  filterBanners,
  scrollToActiveBanner
};
if (typeof window !== "undefined") {
  window.SYH_UI = SYH_UI;
}
