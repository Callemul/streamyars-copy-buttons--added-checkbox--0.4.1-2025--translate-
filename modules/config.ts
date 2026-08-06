// modules/config.ts
import { SYH_I18N } from './i18n';

export type SelectorValue = string | string[];

export interface SyhConfig {
    SELECTORS: Record<string, SelectorValue>;
    TIMINGS: {
        ANTI_AFK_INTERVAL: number;
        AUTO_HEAL_POLLING: number;
        FILTER_DEBOUNCE: number;
        STATS_TRACKING_INTERVAL: number;
    };
    LIMITS: {
        TEXT_TRUNCATION_LENGTH: number;
    };
    TRIGGER_WORDS: string[];
    TRIGGER_WORDS_QUESTION?: string[];
    TRIGGER_WORDS_PRAYER?: string[];
}

/**
 * Допоміжний резолвер селекторів з підтримкою масивів-фолбеків
 */
export function resolveSelector<T extends Element = Element>(
    selectorValue: SelectorValue | null | undefined, 
    root: ParentNode = document
): T | null {
    if (!selectorValue) return null;
    const selectors = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;

    for (const sel of selectors) {
        if (!sel) continue;
        try {
            const el = root.querySelector<T>(sel);
            if (el) return el;
        } catch (e) {
            console.warn(`[SYH Selector] Invalid CSS selector: "${sel}"`, e);
        }
    }
    return null;
}

export function resolveSelectorAll<T extends Element = Element>(
    selectorValue: SelectorValue | null | undefined, 
    root: ParentNode = document
): T[] {
    if (!selectorValue) return [];
    const selectors = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;

    for (const sel of selectors) {
        if (!sel) continue;
        try {
            const els = Array.from(root.querySelectorAll<T>(sel));
            if (els.length > 0) return els;
        } catch (e) {
            console.warn(`[SYH Selector] Invalid CSS selector in queryAll: "${sel}"`, e);
        }
    }
    return [];
}

export const SYH_CONFIG: SyhConfig = {
    SELECTORS: {
        // Коментарі (з фолбеками)
        commentBlock: ['[class*="PlatformComment__Wrap"]', '[data-testid="platform-comment"]'],
        commentButtonContainer: ['[class*="PlatformComment__TopRightButtonGroup"]', '[data-testid="comment-button-group"]'],
        commentAuthor: ['[class*="PlatformCommentShell__NameText"]', '[data-testid="comment-author"]'],
        commentText: ['[class*="PlatformCommentShell__ContentSpan"]', '[data-testid="comment-content"]'],
        starButton: ['[class*="PlatformComment__StarButton"]', '[aria-label*="star" i]'],
        starredHeaderWrap: '[class*="StarredCommentList__HeaderWrap"]',
        starredItemWrap: '[class*="StarredCommentList__ItemWrap"]',
        starredList: '[class*="StarredCommentList__List"]',
        starredCommentItem: 'li[class*="StarredCommentList"]',
        
        // Банери
        bannerBlock: '[class*="Banner__LiWrap"]',
        bannerWrap: '[class*="Banner__Wrap"]',
        bannerText: '[class*="Banner__BannerText"]',
        bannerHeader: '[class*="BannersHeader__Header"]',
        bannerButtonContainer: '[class*="Banner__DesktopTopIconRow"]',
        bannerDeleteButton: ['button:has(svg.lucide-trash2)', 'button:has(svg.lucide-trash-2)', '[data-testid="delete-banner-btn"]'],

        // Форма створення банера
        createBannerButton: '[class*="BannerList__BottomRow"] button',
        createBannerForm: 'form[class*="CreateBannerForm__Form"]',
        bannerFormTextarea: 'form[class*="CreateBannerForm__Form"] textarea',
        bannerFormAddButton: 'form[class*="CreateBannerForm__Form"] button[type="submit"]',

        // Таймер
        timerDropdownButton: '#banner-timer-dropdown-button', 
        timerOptionOffId: '#banner-timer-dropdown-option-null', 
        get timerOffTextResult(): string {
            return SYH_I18N.getMessage('timerOff', 'Timer off');
        }
    },

    TIMINGS: {
        ANTI_AFK_INTERVAL: 30000,        // 30 секунд — інтервал Anti-AFK кліків
        AUTO_HEAL_POLLING: 500,          // 500мс — DOM polling для Auto-Heal
        FILTER_DEBOUNCE: 150,            // 150мс — debounce для фільтру пошуку
        STATS_TRACKING_INTERVAL: 60000,  // 60 секунд — інтервал збору статистики
    },

    LIMITS: {
        TEXT_TRUNCATION_LENGTH: 195,     // Максимальна довжина тексту перед обрізанням
    },

    TRIGGER_WORDS_QUESTION: ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'],
    TRIGGER_WORDS_PRAYER: ['молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'],
    TRIGGER_WORDS: ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом', 'молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба']
};
