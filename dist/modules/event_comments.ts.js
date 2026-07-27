import { SYH_CONFIG } from "/modules/config.ts.js";
import { SYH_STATE } from "/modules/state.ts.js";
import { SYH_UTILS } from "/modules/utils.ts.js";
import { SYH_UI } from "/modules/ui_core.ts.js";
import { SYH_STORAGE } from "/modules/storage.ts.js";
export const SYH_EVENT_COMMENTS = {
  SELECTORS: null,
  STATE: null,
  UTILS: null,
  UI: null,
  TIMINGS: null,
  isBound: false,
  init: function(config, state, utils, ui) {
    this.SELECTORS = config ? config.SELECTORS : SYH_CONFIG ? SYH_CONFIG.SELECTORS : null;
    this.TIMINGS = config ? config.TIMINGS : SYH_CONFIG ? SYH_CONFIG.TIMINGS : null;
    this.STATE = state || SYH_STATE;
    this.UTILS = utils || SYH_UTILS;
    this.UI = ui || SYH_UI;
  },
  bindEvents: function() {
    if (this.isBound) {
      return;
    }
    this.isBound = true;
    const self = this;
    const runAutoHeal = () => {
      if (typeof chrome !== "undefined" && chrome.runtime && !chrome.runtime.id) {
        if (self.autoHealObserver) {
          self.autoHealObserver.disconnect();
        }
        return;
      }
      const coverButtons = document.querySelectorAll('[data-testid="show-comment-button"]');
      coverButtons.forEach((btn) => {
        if (btn.textContent?.includes("Hide") || btn.querySelector(".lucide-circle-minus")) {
          const commentBlock = btn.closest(self.SELECTORS?.commentBlock || "");
          if (commentBlock) {
            const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
            if (checkbox && !checkbox.checked) {
              checkbox.checked = true;
              const textKey = commentBlock.querySelector(self.SELECTORS?.commentText || "")?.textContent;
              if (self.STATE && textKey) {
                self.STATE.updateState(textKey, true);
              }
              if (window.SYH_COMMENT_ASSISTANT) {
                window.SYH_COMMENT_ASSISTANT.processComment(commentBlock);
              }
            }
          }
        }
      });
      const syhComments = document.querySelectorAll('[data-syh-type="prayer"], [data-syh-type="question"]');
      syhComments.forEach((commentBlock) => {
        const starBtn = commentBlock.querySelector(self.SELECTORS?.starButton || "");
        if (starBtn && starBtn.getAttribute("aria-selected") === "false") {
          if (commentBlock.getAttribute("data-syh-just-added") !== "true") {
            const text = commentBlock.querySelector(self.SELECTORS?.commentText || "")?.textContent;
            if (text) {
              console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
              self.removeFromDatabase(text);
              if (self.UI) {
                self.UI.updateCommentVisuals($(commentBlock), "none");
                if (typeof self.UI.filterStarredComments === "function") {
                  setTimeout(() => self.UI.filterStarredComments(), 100);
                }
              }
            }
          }
        }
      });
    };
    const checkAndReattachAutoHeal = () => {
      if (!self.autoHealContainer || self.autoHealContainer === document.body || !self.autoHealContainer.isConnected) {
        const specificContainer = document.querySelector('[data-testid="chat-container"]') || document.querySelector(".chat-container");
        if (specificContainer && specificContainer !== self.autoHealContainer) {
          console.log("[SYH] Чат-контейнер знайдено. Перепідключаю autoHeal MutationObserver з body до конкретного контейнера.");
          if (self.autoHealObserver) self.autoHealObserver.disconnect();
          self.autoHealContainer = specificContainer;
          self.autoHealObserver.observe(self.autoHealContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["aria-selected", "class"]
          });
        }
      }
    };
    if (self.autoHealObserver) {
      self.autoHealObserver.disconnect();
    }
    let rafScheduled = false;
    self.autoHealObserver = new MutationObserver(() => {
      checkAndReattachAutoHeal();
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
          rafScheduled = false;
          runAutoHeal();
        });
      }
    });
    self.autoHealContainer = document.querySelector('[data-testid="chat-container"]') || document.querySelector(".chat-container") || document.body;
    self.autoHealObserver.observe(self.autoHealContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "class"]
    });
    runAutoHeal();
    document.addEventListener("click", function(e) {
      const target = e.target;
      if (!target || !self.SELECTORS?.starButton) return;
      const starBtn = target.closest(self.SELECTORS.starButton);
      if (starBtn) {
        if (starBtn.getAttribute("aria-selected") === "true") {
          const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);
          if (commentBlock) {
            const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
            if (text) {
              self.removeFromDatabase(text);
            }
            if (self.UI) {
              self.UI.updateCommentVisuals($(commentBlock), "none");
              $(commentBlock).closest("li").attr("data-syh-deleted", "true").hide();
              if (typeof self.UI.filterStarredComments === "function") {
                setTimeout(() => self.UI.filterStarredComments(), 50);
              }
            }
          }
        }
      }
    }, true);
    document.addEventListener("mousedown", function(e) {
      if (e.button === 1) {
        const target = e.target;
        if (!target || !self.SELECTORS?.commentBlock) return;
        if (target.closest(".syh-button")) return;
        const commentBlock = target.closest(self.SELECTORS.commentBlock);
        if (commentBlock) {
          e.preventDefault();
          e.stopPropagation();
          const starBtnNode = commentBlock.querySelector(self.SELECTORS.starButton || "");
          if (starBtnNode && starBtnNode.getAttribute("aria-selected") === "true") {
            starBtnNode.click();
          }
        }
      }
    }, true);
    document.addEventListener("contextmenu", function(e) {
      const target = e.target;
      if (!target || !self.SELECTORS?.commentBlock) return;
      const targetBtn = target.closest([
        '[data-testid="show-comment-button"]',
        '[class*="PlatformComment__CoverButton"]',
        '[aria-label="Comment actions"]',
        '[class*="DesktopMoreButton"]'
      ].join(","));
      if (targetBtn) {
        e.preventDefault();
        e.stopPropagation();
        const commentBlock = targetBtn.closest(self.SELECTORS.commentBlock);
        if (commentBlock) {
          const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            const textKey = commentBlock.querySelector(self.SELECTORS.commentText || "")?.textContent;
            if (self.STATE && textKey) {
              self.STATE.updateState(textKey, checkbox.checked);
            }
            if (window.SYH_COMMENT_ASSISTANT) {
              window.SYH_COMMENT_ASSISTANT.processComment(commentBlock);
            }
          }
        }
      }
    }, true);
    $(document).on("contextmenu", '.syh-button[data-action="copy-prayer"]', function(e) {
      e.preventDefault();
    });
    $(document).on("mousedown", '.syh-button[data-type="comment"]', function(e) {
      const mouseEvent = e.originalEvent;
      if (mouseEvent && mouseEvent.button === 1) e.preventDefault();
    });
    $(document).on("mouseup", '.syh-button[data-type="comment"]', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const $button = $(this);
      const action = $button.data("action");
      const mouseEvent = e.originalEvent;
      const buttonNum = mouseEvent ? mouseEvent.button : 0;
      if (buttonNum !== 0 && action !== "copy-prayer") return;
      const $commentBlock = $button.closest(self.SELECTORS?.commentBlock || "");
      let author = $commentBlock.find(self.SELECTORS?.commentAuthor || "").text().trim();
      while (author.startsWith("@")) author = author.substring(1);
      const commentText = $commentBlock.find(self.SELECTORS?.commentText || "").text();
      let textToCopy = "", header = "";
      if (action === "copy-author-comment" || action === "copy-prayer") {
        $commentBlock[0]?.setAttribute("data-syh-just-added", "true");
        setTimeout(() => {
          $commentBlock[0]?.removeAttribute("data-syh-just-added");
        }, 2e3);
      }
      if (action === "copy-comment") {
        header = "📄 Комент (без автора)";
        textToCopy = commentText;
      } else if (action === "copy-author-comment") {
        header = "📑 Автор і його ❓ питання";
        textToCopy = `@${author}

${commentText}`;
        self.saveToDatabase(author, commentText, "question", "❓");
        if (self.UI) self.UI.updateCommentVisuals($commentBlock, "question");
      } else if (action === "copy-prayer") {
        let prayerIcon = "🙏🙏🙏";
        if (buttonNum === 1) prayerIcon = "🙏❤️🙏";
        if (buttonNum === 2) prayerIcon = "❤️❤️❤️";
        header = `📑 Автор і його ${prayerIcon}`;
        textToCopy = `


${prayerIcon} @${author}

${commentText}`;
        self.saveToDatabase(author, commentText, "prayer", prayerIcon);
        if (self.UI) self.UI.updateCommentVisuals($commentBlock, "prayer");
        if (window.SYH_STATS_TRACKER && typeof window.SYH_STATS_TRACKER.registerPrayerMarker === "function") {
          window.SYH_STATS_TRACKER.registerPrayerMarker();
        }
      }
      if (textToCopy) {
        if (self.UTILS) {
          self.UTILS.copyAndShowBanner(textToCopy, header);
        } else if (window.SYH_UTILS) {
          window.SYH_UTILS.copyAndShowBanner(textToCopy, header);
        }
        const checkboxNode = $commentBlock.find('.syh-checkbox[data-type="comment"]')[0];
        if (checkboxNode) {
          checkboxNode.checked = true;
          checkboxNode.dispatchEvent(new Event("change", { bubbles: true }));
          if (self.STATE) {
            self.STATE.updateState(commentText, true);
          }
        }
        $commentBlock.find(".syh-checkbox").prop("checked", true);
        const starBtnNode = $commentBlock.find(self.SELECTORS?.starButton || "")[0];
        if (starBtnNode && starBtnNode.getAttribute("aria-selected") === "false") {
          starBtnNode.click();
        }
      }
    });
    $(document).on("change", '.syh-checkbox[data-type="comment"]', function() {
      const $checkbox = $(this);
      const $commentBlock = $checkbox.closest(self.SELECTORS?.commentBlock || "");
      const textKey = $commentBlock.find(self.SELECTORS?.commentText || "").text();
      if (self.STATE) {
        self.STATE.updateState(textKey, $checkbox.is(":checked"));
      }
      if (window.SYH_COMMENT_ASSISTANT && $commentBlock.length) {
        window.SYH_COMMENT_ASSISTANT.processComment($commentBlock[0]);
      }
    });
  },
  saveToDatabase: function(author, text, type, icon) {
    const storage = SYH_STORAGE || window.SYH_STORAGE || this.UTILS && this.UTILS.storage || window.SYH_UTILS && window.SYH_UTILS.storage;
    if (!storage) {
      console.error("SYH_EVENT_COMMENTS: Не знайдено адаптер сховища!");
      return;
    }
    const currentRoomId = window.location.pathname.replace(/\//g, "");
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1e3;
    storage.get(["syh_prayers"], function(result) {
      let list = result.syh_prayers || [];
      list = list.filter((item) => {
        if (!item.timestamp) return true;
        return now - item.timestamp < thirtyDaysMs;
      });
      list = list.filter((item) => item.text !== text);
      list.push({
        author,
        text,
        type,
        icon,
        roomId: currentRoomId,
        timestamp: now
      });
      storage.set({ "syh_prayers": list });
    });
  },
  removeFromDatabase: function(text) {
    if (this.UI && this.UI.prayersCache) {
      this.UI.prayersCache = this.UI.prayersCache.filter((item) => item.text !== text);
    }
    const storage = SYH_STORAGE || window.SYH_STORAGE || this.UTILS && this.UTILS.storage || window.SYH_UTILS && window.SYH_UTILS.storage;
    if (!storage) {
      console.error("SYH_EVENT_COMMENTS: Не знайдено адаптер сховища!");
      return;
    }
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1e3;
    storage.get(["syh_prayers"], function(result) {
      let list = result.syh_prayers || [];
      list = list.filter((item) => {
        if (item.text === text) return false;
        if (item.timestamp && now - item.timestamp > thirtyDaysMs) return false;
        return true;
      });
      storage.set({ "syh_prayers": list });
    });
  }
};
if (typeof window !== "undefined") {
  window.SYH_EVENT_COMMENTS = SYH_EVENT_COMMENTS;
}
