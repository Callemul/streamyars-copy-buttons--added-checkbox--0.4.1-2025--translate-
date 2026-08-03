import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_STATE, type SyhState } from './state';
import { SYH_CONFIG, type SyhConfig } from './config';
import { SYH_UI_STATE, type SyhUiState } from './ui_state';
import { 
    addButtonsToComment, 
    updateCommentVisuals, 
    applySavedLabels, 
    addStarredTabControls, 
    bindStarredControls, 
    filterStarredComments, 
    scrollToActiveComment 
} from './ui_comments';
import { 
    addButtonsToBanner, 
    updateBannerVisuals, 
    applySavedBannerLabels, 
    addBannerHeaderControls, 
    updateMasterCheckboxState, 
    filterBanners, 
    scrollToActiveBanner 
} from './ui_banners';

import type { PrayerItem } from './types';

export interface SyhUi extends SyhUiState {
    init(config?: SyhConfig, state?: SyhState): void;
    validateSelectorsSyntax(): void;
    restoreDomCheckboxes(): void;

    // Comments UI methods
    addButtonsToComment(commentNode: Element): void;
    updateCommentVisuals(commentWrap: Element, type: string): void;
    applySavedLabels(commentNode: Element, text: string): void;
    addStarredTabControls(starredHeaderNode: Element): void;
    bindStarredControls(): void;
    filterStarredComments(): void;
    scrollToActiveComment(): void;

    // Banner UI methods
    addButtonsToBanner(bannerNode: Element): void;
    updateBannerVisuals(bannerBlock: Element, type: string): void;
    applySavedBannerLabels(bannerNode: Element, text: string): void;
    addBannerHeaderControls(headerNode: Element): void;
    updateMasterCheckboxState(): void;
    filterBanners(): void;
    scrollToActiveBanner(): void;
}

import { SYH_BUS } from './event_bus';

export function init(config?: SyhConfig, state?: SyhState): void {
    try {
        SYH_UI_STATE.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
        SYH_UI_STATE.STATE = state || SYH_STATE;
        
        if (SYH_UI_STATE.STATE) {
            SYH_UI_STATE.STATE.onStateLoaded = () => restoreDomCheckboxes();
        }

        validateSelectorsSyntax();
        
        SYH_STORAGE.getAsync<{ [STORAGE_KEYS.PRAYERS]?: PrayerItem[]; [STORAGE_KEYS.CATEGORIES]?: Record<string, string> }>([STORAGE_KEYS.PRAYERS, STORAGE_KEYS.CATEGORIES])
            .then((result) => {
                SYH_UI_STATE.prayersCache = result[STORAGE_KEYS.PRAYERS] || [];
                SYH_UI_STATE.bannerCategoriesCache = result[STORAGE_KEYS.CATEGORIES] || {};
            })
            .catch(e => console.error("[SYH UI] Error loading initial storage cache:", e));

        SYH_STORAGE.onChanged((changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => {
            try {
                if (changes[STORAGE_KEYS.PRAYERS] && changes[STORAGE_KEYS.PRAYERS].newValue !== undefined) {
                    SYH_UI_STATE.prayersCache = (changes[STORAGE_KEYS.PRAYERS].newValue as PrayerItem[]) || [];
                    filterStarredComments();
                }
                if (changes[STORAGE_KEYS.CATEGORIES] && changes[STORAGE_KEYS.CATEGORIES].newValue !== undefined) {
                    SYH_UI_STATE.bannerCategoriesCache = (changes[STORAGE_KEYS.CATEGORIES].newValue as Record<string, string>) || {};
                    filterBanners();
                }
            } catch (e) {
                console.error("[SYH] Помилка синхронізації сховища в UI:", e);
            }
        });

        // Підписка на події від інших модулів через шину подій
        SYH_BUS.on('COMMENT_MARKED', (event) => {
            updateCommentVisuals(event.element, event.type);
        });

    } catch (error) {
        console.error("[SYH] Критичний збій ініціалізації модуля UI Core:", error);
    }
}

export function validateSelectorsSyntax(): void {
    if (!SYH_UI_STATE.SELECTORS) return;
    console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");
    for (const key in SYH_UI_STATE.SELECTORS) {
        const selector = SYH_UI_STATE.SELECTORS[key];
        if (!selector) continue;
        try {
            document.querySelector(selector);
        } catch (e) {
            console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
        }
    }
}

export function restoreDomCheckboxes(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const itemStates = SYH_UI_STATE.STATE?.itemStates || {};
    
    if (!selectors) {
        console.warn("[SYH_UI] Конфігурація SELECTORS ще не завантажена.");
        return;
    }

    console.log("[SYH_UI] Відновлення стану чекбоксів у DOM...");
    
    document.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach((checkbox) => {
        const type = checkbox.dataset.type;
        let textKey = "";

        const selCommentBlock = Array.isArray(selectors.commentBlock) ? selectors.commentBlock[0] : selectors.commentBlock;
        const selCommentText = Array.isArray(selectors.commentText) ? selectors.commentText[0] : selectors.commentText;
        const selBannerBlock = Array.isArray(selectors.bannerBlock) ? selectors.bannerBlock[0] : selectors.bannerBlock;
        const selBannerText = Array.isArray(selectors.bannerText) ? selectors.bannerText[0] : selectors.bannerText;

        if (type === 'comment') {
            const commentBlock = checkbox.closest(selCommentBlock || '[class*="PlatformComment__Wrap"]');
            textKey = commentBlock?.querySelector(selCommentText || '[class*="PlatformCommentShell__ContentSpan"]')?.textContent || "";
        } else if (type === 'banner') {
            const bannerBlock = checkbox.closest(selBannerBlock || '[class*="Banner__LiWrap"]');
            textKey = bannerBlock?.querySelector(selBannerText || '[class*="Banner__BannerText"]')?.textContent || "";
        }

        if (textKey) {
            checkbox.checked = !!itemStates[textKey];
        }
    });
}

export const SYH_UI: SyhUi = {
    get SELECTORS() { return SYH_UI_STATE.SELECTORS; },
    set SELECTORS(val) { SYH_UI_STATE.SELECTORS = val; },

    get STATE() { return SYH_UI_STATE.STATE; },
    set STATE(val) { SYH_UI_STATE.STATE = val; },

    get activeFilter() { return SYH_UI_STATE.activeFilter; },
    set activeFilter(val) { SYH_UI_STATE.activeFilter = val; },

    get searchQuery() { return SYH_UI_STATE.searchQuery; },
    set searchQuery(val) { SYH_UI_STATE.searchQuery = val; },

    get prayersCache() { return SYH_UI_STATE.prayersCache; },
    set prayersCache(val) { SYH_UI_STATE.prayersCache = val; },

    get bannerActiveFilter() { return SYH_UI_STATE.bannerActiveFilter; },
    set bannerActiveFilter(val) { SYH_UI_STATE.bannerActiveFilter = val; },

    get bannerSearchQuery() { return SYH_UI_STATE.bannerSearchQuery; },
    set bannerSearchQuery(val) { SYH_UI_STATE.bannerSearchQuery = val; },

    get bannerCategoriesCache() { return SYH_UI_STATE.bannerCategoriesCache; },
    set bannerCategoriesCache(val) { SYH_UI_STATE.bannerCategoriesCache = val; },

    get _filterBannersTimeout() { return SYH_UI_STATE._filterBannersTimeout; },
    set _filterBannersTimeout(val) { SYH_UI_STATE._filterBannersTimeout = val; },

    get _filterCommentsTimeout() { return SYH_UI_STATE._filterCommentsTimeout; },
    set _filterCommentsTimeout(val) { SYH_UI_STATE._filterCommentsTimeout = val; },

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


