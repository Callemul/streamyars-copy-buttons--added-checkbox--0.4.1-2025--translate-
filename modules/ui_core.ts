import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_STATE } from './state';
import { SYH_CONFIG } from './config';
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

export interface PrayerItem {
    text: string;
    type: string;
    author: string;
}

export interface SYH_UI_Core {
    SELECTORS: Record<string, string> | null;
    STATE: any;
    activeFilter: string;
    searchQuery: string;
    prayersCache: PrayerItem[];
    bannerActiveFilter: string;
    bannerSearchQuery: string;
    bannerCategoriesCache: Record<string, string>;
    _filterBannersTimeout?: ReturnType<typeof setTimeout> | number;
    _filterCommentsTimeout?: ReturnType<typeof setTimeout> | number;
}

export interface SyhUi extends SYH_UI_Core {
    init(config?: any, state?: any): void;
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

export function init(config?: any, state?: any): void {
    try {
        SYH_UI.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
        SYH_UI.STATE = state || SYH_STATE;
        
        if (SYH_UI.STATE) {
            SYH_UI.STATE.onStateLoaded = () => SYH_UI.restoreDomCheckboxes();
        }

        SYH_UI.validateSelectorsSyntax();
        
        const storage = SYH_STORAGE || (window as any).SYH_STORAGE;

        if (storage) {
            storage.get([STORAGE_KEYS.PRAYERS, STORAGE_KEYS.CATEGORIES], function(result: Record<string, any>) {
                SYH_UI.prayersCache = result[STORAGE_KEYS.PRAYERS] || [];
                SYH_UI.bannerCategoriesCache = result[STORAGE_KEYS.CATEGORIES] || {};
            });
        } else {
            console.warn("[SYH] Сховище недоступне під час первинної ініціалізації кешу UI.");
        }

        if (storage && typeof storage.onChanged === 'function') {
            storage.onChanged(function(changes: Record<string, any>) {
                try {
                    if (changes[STORAGE_KEYS.PRAYERS]) {
                        SYH_UI.prayersCache = changes[STORAGE_KEYS.PRAYERS].newValue || [];
                        if (typeof SYH_UI.filterStarredComments === 'function') {
                            SYH_UI.filterStarredComments(); 
                        }
                    }
                    if (changes[STORAGE_KEYS.CATEGORIES]) {
                        SYH_UI.bannerCategoriesCache = changes[STORAGE_KEYS.CATEGORIES].newValue || {};
                        if (typeof SYH_UI.filterBanners === 'function') {
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

export function validateSelectorsSyntax(): void {
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

export function restoreDomCheckboxes(): void {
    const selectors = SYH_UI.SELECTORS || ((window as any).SYH_CONFIG ? (window as any).SYH_CONFIG.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null));
    const itemStates = (SYH_STATE ? (SYH_STATE as any).itemStates : ((window as any).SYH_STATE ? (window as any).SYH_STATE.itemStates : {}));
    
    if (!selectors) {
        console.warn("[SYH_UI] Конфігурація SELECTORS ще не завантажена.");
        return;
    }

    console.log("[SYH_UI] Примусове відновлення стану чекбоксів у DOM для вирішення Race Condition.");
    
    document.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach((checkbox) => {
        const type = checkbox.dataset.type;
        let textKey = "";

        if (type === 'comment') {
            const commentBlock = checkbox.closest(selectors.commentBlock || '[class*="PlatformComment__Wrap"]');
            textKey = commentBlock?.querySelector(selectors.commentText || '[class*="PlatformCommentShell__ContentSpan"]')?.textContent || "";
        } else if (type === 'banner') {
            const bannerBlock = checkbox.closest(selectors.bannerBlock || '[class*="Banner__LiWrap"]');
            textKey = bannerBlock?.querySelector(selectors.bannerText || '[class*="Banner__BannerText"]')?.textContent || "";
        }

        if (textKey) {
            checkbox.checked = !!itemStates[textKey];
        }
    });
}

export const SYH_UI: SyhUi = {
    SELECTORS: null,
    STATE: null,
    activeFilter: 'all', 
    searchQuery: '',     
    prayersCache: [],

    bannerActiveFilter: 'all',
    bannerSearchQuery: '',
    bannerCategoriesCache: {},

    _filterBannersTimeout: undefined,
    _filterCommentsTimeout: undefined,

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

if (typeof window !== 'undefined') {
    (window as any).SYH_UI = SYH_UI;
}
