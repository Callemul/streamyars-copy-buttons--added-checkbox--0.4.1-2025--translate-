import { SYH_CONFIG } from "/modules/config.ts.js";
import { SYH_STORAGE } from "/modules/storage.ts.js";
import { SYH_STATE } from "/modules/state.ts.js";
import { SYH_UTILS } from "/modules/utils.ts.js";
import { SYH_UI } from "/modules/ui_core.ts.js";
import "/modules/ui_comments.ts.js";
import "/modules/ui_banners.ts.js";
import { SYH_PARSERS } from "/modules/parsers.ts.js";
import { SYH_BANNER_CREATOR } from "/modules/banner_creator.ts.js";
import { SYH_EVENT_COMMENTS } from "/modules/event_comments.ts.js";
import { SYH_EVENT_BANNERS } from "/modules/event_banners.ts.js";
import { SYH_I18N } from "/modules/i18n.ts.js";
import { SYH_ANTI_AFK } from "/modules/anti_afk.ts.js";
import { SYH_COMMENT_ASSISTANT } from "/modules/comment_assistant.ts.js";
(function(window2, $) {
  "use strict";
  if (window2.SYH_LOADED) {
    console.warn("[SYH] Розширення вже запущене на цій сторінці. Повторну ініціалізацію примусово зупинено.");
    return;
  }
  window2.SYH_LOADED = true;
  const syhVersion = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : "1.0.0";
  console.log(`StreamYard Helper v${syhVersion} [Anti-AFK & Stable] Loaded!`);
  const { SELECTORS, TIMINGS } = SYH_CONFIG;
  function startAntiAfk() {
    SYH_ANTI_AFK.startAntiAfk(SYH_CONFIG, SYH_STORAGE, SYH_I18N);
  }
  const MAX_PENDING_MUTATIONS = 500;
  let pendingMutations = [];
  let rafScheduled = false;
  function processMutations(mutationsList) {
    let bannerStateChanged = false;
    let commentStateChanged = false;
    for (const mutation of mutationsList) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== 1) continue;
        const element = node;
        if (element.matches(SELECTORS.commentBlock)) {
          SYH_UI.addButtonsToComment(element);
          SYH_COMMENT_ASSISTANT.processComment(element);
        } else if (element.querySelector(SELECTORS.commentBlock)) {
          element.querySelectorAll(SELECTORS.commentBlock).forEach((el) => {
            SYH_UI.addButtonsToComment(el);
            SYH_COMMENT_ASSISTANT.processComment(el);
          });
        }
        if (element.matches(SELECTORS.bannerBlock)) {
          SYH_UI.addButtonsToBanner(element);
          bannerStateChanged = true;
        } else if (element.querySelector(SELECTORS.bannerBlock)) {
          element.querySelectorAll(SELECTORS.bannerBlock).forEach((el) => {
            SYH_UI.addButtonsToBanner(el);
            bannerStateChanged = true;
          });
        }
        if (element.matches(SELECTORS.bannerHeader)) {
          SYH_UI.addBannerHeaderControls(element);
        } else if (element.querySelector(SELECTORS.bannerHeader)) {
          element.querySelectorAll(SELECTORS.bannerHeader).forEach((el) => SYH_UI.addBannerHeaderControls(el));
        }
        if (element.matches(SELECTORS.starredHeaderWrap)) {
          SYH_UI.addStarredTabControls(element);
        } else if (element.querySelector(SELECTORS.starredHeaderWrap)) {
          element.querySelectorAll(SELECTORS.starredHeaderWrap).forEach((el) => SYH_UI.addStarredTabControls(el));
        }
        if (element.matches(SELECTORS.starredItemWrap) || element.closest && element.closest(SELECTORS.starredList)) {
          commentStateChanged = true;
        }
      }
      for (const node of Array.from(mutation.removedNodes)) {
        if (node.nodeType === 1) {
          const element = node;
          if (element.matches(SELECTORS.bannerBlock) || element.querySelector(SELECTORS.bannerBlock)) {
            bannerStateChanged = true;
          }
          if (element.matches(SELECTORS.commentBlock) || element.querySelector(SELECTORS.commentBlock) || element.matches(SELECTORS.starredCommentItem)) {
            commentStateChanged = true;
          }
        }
      }
    }
    if (bannerStateChanged) {
      SYH_UI.updateMasterCheckboxState();
      if (window2.SYH_UI && typeof window2.SYH_UI.filterBanners === "function") {
        clearTimeout(window2.SYH_UI._filterBannersTimeout);
        window2.SYH_UI._filterBannersTimeout = setTimeout(() => window2.SYH_UI.filterBanners(), TIMINGS.FILTER_DEBOUNCE);
      }
    }
    if (commentStateChanged) {
      if (window2.SYH_UI && typeof window2.SYH_UI.filterStarredComments === "function") {
        clearTimeout(window2.SYH_UI._filterCommentsTimeout);
        window2.SYH_UI._filterCommentsTimeout = setTimeout(() => window2.SYH_UI.filterStarredComments(), TIMINGS.FILTER_DEBOUNCE);
      }
    }
  }
  function flushMutations() {
    const mutationsToProcess = pendingMutations;
    pendingMutations = [];
    rafScheduled = false;
    if (mutationsToProcess.length > 0) {
      processMutations(mutationsToProcess);
    }
  }
  let currentTargetContainer = null;
  function checkAndReattachObserver() {
    if (!currentTargetContainer || currentTargetContainer === document.body || !currentTargetContainer.isConnected) {
      const specificContainer = document.querySelector('[data-testid="chat-container"]') || document.querySelector(".chat-container") || document.querySelector("#app") || document.querySelector("#root");
      if (specificContainer && specificContainer !== currentTargetContainer) {
        console.log("[SYH] Чат-контейнер знайдено. Перепідключаю main MutationObserver з body до конкретного контейнера.");
        observer.disconnect();
        currentTargetContainer = specificContainer;
        observer.observe(currentTargetContainer, { childList: true, subtree: true });
      }
    }
  }
  const observer = new MutationObserver((mutationsList) => {
    checkAndReattachObserver();
    pendingMutations.push(...mutationsList);
    if (pendingMutations.length >= MAX_PENDING_MUTATIONS) {
      flushMutations();
      return;
    }
    if (!rafScheduled) {
      rafScheduled = true;
      if (document.hidden) {
        setTimeout(flushMutations, 200);
      } else {
        requestAnimationFrame(flushMutations);
      }
    }
  });
  function init() {
    console.log("Initializing SYH modules...");
    SYH_UTILS.init(SYH_CONFIG);
    SYH_UI.init(SYH_CONFIG, SYH_STATE);
    SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
    SYH_EVENT_COMMENTS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI);
    SYH_EVENT_BANNERS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_BANNER_CREATOR);
    SYH_COMMENT_ASSISTANT.init(SYH_CONFIG);
    SYH_COMMENT_ASSISTANT.processAllComments();
    if (window2.SYH_VIDEO_COPIER) window2.SYH_VIDEO_COPIER.init();
    if (window2.SYH_STATS_TRACKER) window2.SYH_STATS_TRACKER.init();
    SYH_EVENT_COMMENTS.bindEvents();
    SYH_EVENT_BANNERS.bindEvents();
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function(message, _sender, _sendResponse) {
        if (message && message.action === "unstar_comment") {
          const targetText = message.text ? message.text.trim() : "";
          if (!targetText) return;
          const commentBlocks = document.querySelectorAll(SELECTORS.commentBlock);
          for (const block of Array.from(commentBlocks)) {
            const textNode = block.querySelector(SELECTORS.commentText);
            if (textNode && textNode.textContent?.trim() === targetText) {
              const starBtnNode = block.querySelector(SELECTORS.starButton);
              if (starBtnNode && starBtnNode.getAttribute("aria-selected") === "true") {
                console.log("[SYH] Отримано сигнал від Попапу. Автоматично знімаю зірку з:", targetText);
                starBtnNode.click();
              }
              break;
            }
          }
        }
      });
    }
    startAntiAfk();
    $(SELECTORS.commentBlock).each((_i, el) => SYH_UI.addButtonsToComment(el));
    $(SELECTORS.bannerBlock).each((_i, el) => SYH_UI.addButtonsToBanner(el));
    $(SELECTORS.bannerHeader).each((_i, el) => SYH_UI.addBannerHeaderControls(el));
    if (SYH_STATE && typeof SYH_STATE.init === "function") SYH_STATE.init();
    const targetContainer = document.querySelector('[data-testid="chat-container"]') || document.querySelector(".chat-container") || document.querySelector("#app") || document.querySelector("#root") || document.body;
    observer.observe(targetContainer, { childList: true, subtree: true });
    console.log("SYH is running.");
  }
  init();
})(window, window.jQuery || window.$);
