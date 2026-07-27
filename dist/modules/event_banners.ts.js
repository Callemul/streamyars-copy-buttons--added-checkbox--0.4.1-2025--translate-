import { SYH_CONFIG } from "/modules/config.ts.js";
import { SYH_STATE } from "/modules/state.ts.js";
import { SYH_UTILS } from "/modules/utils.ts.js";
import { SYH_UI } from "/modules/ui_core.ts.js";
import { SYH_BANNER_CREATOR } from "/modules/banner_creator.ts.js";
export const SYH_EVENT_BANNERS = {
  SELECTORS: null,
  STATE: null,
  UTILS: null,
  UI: null,
  BANNER_CREATOR: null,
  init: function(config, state, utils, ui, bannerCreator) {
    this.SELECTORS = config ? config.SELECTORS : SYH_CONFIG ? SYH_CONFIG.SELECTORS : null;
    this.STATE = state || SYH_STATE;
    this.UTILS = utils || SYH_UTILS;
    this.UI = ui || SYH_UI;
    this.BANNER_CREATOR = bannerCreator || SYH_BANNER_CREATOR;
  },
  bindEvents: function() {
    const self = this;
    document.addEventListener("contextmenu", function(e) {
      const target = e.target;
      if (!target || !self.SELECTORS?.bannerBlock) return;
      const bannerBlock = target.closest(self.SELECTORS.bannerBlock);
      if (bannerBlock) {
        const isInputOrCustom = target.closest("input, textarea, .syh-button");
        const isSystemEditOrDelete = target.closest('button:has(svg.lucide-pencil), button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2), [class*="DesktopTopIconRow"] button');
        if (isInputOrCustom || isSystemEditOrDelete) return;
        e.preventDefault();
        e.stopPropagation();
        const checkbox = bannerBlock.querySelector('.syh-checkbox[data-type="banner"]');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          const textKey = bannerBlock.querySelector(self.SELECTORS.bannerText || "")?.textContent;
          if (self.STATE && textKey) {
            self.STATE.updateState(textKey, checkbox.checked);
            if (self.UI) {
              self.UI.updateMasterCheckboxState();
            }
          }
        }
      }
    }, true);
    $(document).on("mousedown", '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]', function(e) {
      const mouseEvent = e.originalEvent;
      if (mouseEvent && mouseEvent.button === 1) e.preventDefault();
    });
    $(document).on("mouseup", ".syh-button", function(e) {
      const $button = $(this);
      const action = $button.data("action");
      const type = $button.data("type");
      const mouseEvent = e.originalEvent;
      const buttonNum = mouseEvent ? mouseEvent.button : 0;
      if (type !== "banner" && action !== "create-from-text" && action !== "delete-selected-banners" && action !== "mark-stream" && action !== "mark-audience" && action !== "mark-prayer") return;
      e.preventDefault();
      e.stopPropagation();
      if (buttonNum !== 0) return;
      if (action === "create-from-text") {
        const text = prompt("Вставте список питань для створення банерів:", "");
        if (text && self.BANNER_CREATOR) self.BANNER_CREATOR.processAndCreateBanners(text);
        return;
      }
      if (action === "delete-selected-banners") {
        const $checkedBanners = $('.syh-checkbox[data-type="banner"]:checked');
        if ($checkedBanners.length === 0) return;
        const activeFilter = self.UI ? self.UI.bannerActiveFilter : "all";
        let proceed;
        if (activeFilter && activeFilter !== "all") {
          const filterNames = {
            "stream": "Ефір",
            "audience": "Глядачі",
            "prayer": "Молитви"
          };
          const tabName = filterNames[activeFilter] || activeFilter;
          let currentTabCount = 0;
          const counts = {
            all: $checkedBanners.length,
            stream: 0,
            audience: 0,
            prayer: 0
          };
          $checkedBanners.each(function() {
            const bannerBlock = $(this).closest(self.SELECTORS?.bannerBlock || "");
            const textKey = bannerBlock.find(self.SELECTORS?.bannerText || "").text();
            const commentType = self.UI && self.UI.bannerCategoriesCache ? self.UI.bannerCategoriesCache[textKey] || "none" : "none";
            if (commentType === activeFilter) {
              currentTabCount++;
            }
            if (commentType === "stream") {
              counts.stream++;
            } else if (commentType === "audience") {
              counts.audience++;
            } else if (commentType === "prayer") {
              counts.prayer++;
            }
          });
          let confirmMessage;
          if (currentTabCount > 0) {
            confirmMessage = `Ви впевнені, що хочете видалити ${currentTabCount} банер(ів) з вкладки "${tabName}"?

Зверніть увагу: ці банери будуть видалені не тільки з поточної вкладки, а й з усіх інших вкладок, і з вкладки "Всі" також.

Буде видалено:
- Всі: ${counts.all}
- Ефір: ${counts.stream}
- Глядачі: ${counts.audience}
- Молитви: ${counts.prayer}`;
          } else {
            confirmMessage = `Увага! На поточній вкладці "${tabName}" не вибрано жодного банера, але вибрано банери на інших вкладках.

Зверніть увагу: ці банери будуть видалені назавжди з усіх вкладок, і з вкладки "Всі" також.

Буде видалено:
- Всі: ${counts.all}
- Ефір: ${counts.stream}
- Глядачі: ${counts.audience}
- Молитви: ${counts.prayer}`;
          }
          proceed = confirm(confirmMessage);
        } else {
          proceed = confirm(`Ви впевнені, що хочете видалити ${$checkedBanners.length} банер(ів)?`);
        }
        if (proceed) {
          $checkedBanners.each(function() {
            const deleteButton = $(this).closest(self.SELECTORS?.bannerBlock || "").find(self.SELECTORS?.bannerDeleteButton || "")[0];
            if (deleteButton) deleteButton.click();
          });
        }
        return;
      }
      if (type === "banner" && action === "copy-banner") {
        const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || "");
        const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || "").text();
        if (self.UTILS) {
          self.UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
        } else if (window.SYH_UTILS) {
          window.SYH_UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
        }
        $bannerBlock.find(".syh-checkbox").prop("checked", true).trigger("change");
        return;
      }
      if (action === "mark-stream") {
        const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || "");
        const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || "").text();
        const currentType = self.UI && self.UI.bannerCategoriesCache[bannerText] === "stream" ? "none" : "stream";
        const saver = self.UTILS && self.UTILS.saveBannerCategory ? self.UTILS.saveBannerCategory : window.SYH_UTILS?.saveBannerCategory;
        if (saver) {
          saver.call(self.UTILS || window.SYH_UTILS, bannerText, currentType).then(() => {
            if (self.UI) {
              self.UI.bannerCategoriesCache[bannerText] = currentType;
              self.UI.filterBanners();
            }
          });
        }
        return;
      }
      if (action === "mark-audience") {
        const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || "");
        const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || "").text();
        const currentType = self.UI && self.UI.bannerCategoriesCache[bannerText] === "audience" ? "none" : "audience";
        const saver = self.UTILS && self.UTILS.saveBannerCategory ? self.UTILS.saveBannerCategory : window.SYH_UTILS?.saveBannerCategory;
        if (saver) {
          saver.call(self.UTILS || window.SYH_UTILS, bannerText, currentType).then(() => {
            if (self.UI) {
              self.UI.bannerCategoriesCache[bannerText] = currentType;
              self.UI.filterBanners();
            }
          });
        }
        return;
      }
      if (action === "mark-prayer") {
        const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || "");
        const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || "").text();
        const currentType = self.UI && self.UI.bannerCategoriesCache[bannerText] === "prayer" ? "none" : "prayer";
        const saver = self.UTILS && self.UTILS.saveBannerCategory ? self.UTILS.saveBannerCategory : window.SYH_UTILS?.saveBannerCategory;
        if (saver) {
          saver.call(self.UTILS || window.SYH_UTILS, bannerText, currentType).then(() => {
            if (self.UI) {
              self.UI.bannerCategoriesCache[bannerText] = currentType;
              self.UI.filterBanners();
            }
          });
        }
        return;
      }
    });
    $(document).on("change", '.syh-checkbox[data-type="banner"]', function() {
      const $checkbox = $(this);
      const textKey = $checkbox.closest(self.SELECTORS?.bannerBlock || "").find(self.SELECTORS?.bannerText || "").text();
      if (self.STATE) {
        self.STATE.updateState(textKey, $checkbox.is(":checked"));
      }
      if (self.UI) self.UI.updateMasterCheckboxState();
    });
    $(document).on("change", ".syh-master-checkbox", function() {
      const isChecked = $(this).is(":checked");
      $(this).prop("indeterminate", false);
      $(self.SELECTORS?.bannerBlock || "").find('.syh-checkbox[data-type="banner"]').prop("checked", isChecked).trigger("change");
    });
  },
  // Зв'язування подій текстового пошуку та кнопок фільтрації банерів
  bindBannersFilterControls: function() {
    const self = this;
    const $searchInput = $("#syh-banner-search");
    const $clearBtn = $("#syh-clear-banner-search-btn");
    $searchInput.off("input").on("input", function() {
      if (self.UI) {
        self.UI.bannerSearchQuery = $(this).val() ? $(this).val().toLowerCase() : "";
        $clearBtn.css("display", self.UI.bannerSearchQuery ? "flex" : "none");
        self.UI.filterBanners();
      }
    });
    $clearBtn.off("click").on("click", function() {
      $searchInput.val("");
      if (self.UI) {
        self.UI.bannerSearchQuery = "";
        $(this).hide();
        self.UI.filterBanners();
      }
    });
    $("#syh-scroll-to-active-banner-btn").off("click").on("click", function(e) {
      e.preventDefault();
      if (self.UI) self.UI.scrollToActiveBanner();
    });
    $(document).off("click", "#syh-banner-empty-clear-link").on("click", "#syh-banner-empty-clear-link", function(e) {
      e.preventDefault();
      $searchInput.val("");
      if (self.UI) {
        self.UI.bannerSearchQuery = "";
        $clearBtn.hide();
        self.UI.filterBanners();
      }
    });
    $(".syh-banner-filter-btn").off("click").on("click", function() {
      $(".syh-banner-filter-btn").css({ "background": "transparent", "font-weight": "normal", "box-shadow": "none", "color": "#666" }).removeClass("active").attr("aria-selected", "false");
      $(this).css({ "background": "#fff", "font-weight": "bold", "box-shadow": "0 1px 3px rgba(0,0,0,0.1)", "color": "#000" }).addClass("active").attr("aria-selected", "true");
      if (self.UI) {
        self.UI.bannerActiveFilter = $(this).data("filter");
        self.UI.filterBanners();
      }
      if (self.UI && self.UI.bannerSearchQuery) {
        $searchInput.removeClass("syh-banner-search-pulse");
        if ($searchInput[0]) {
          void $searchInput[0].offsetWidth;
        }
        $searchInput.addClass("syh-banner-search-pulse");
      }
    });
  }
};
if (typeof window !== "undefined") {
  window.SYH_EVENT_BANNERS = SYH_EVENT_BANNERS;
}
