// modules/config.ts
export interface SyhConfig {
    SELECTORS: Record<string, string>;
    TIMINGS: {
        ANTI_AFK_INTERVAL: number;
        AUTO_HEAL_POLLING: number;
        FILTER_DEBOUNCE: number;
        STATS_TRACKING_INTERVAL: number;
        REMINDER_DELAY: number;
    };
    LIMITS: {
        TEXT_TRUNCATION_LENGTH: number;
    };
}

export const SYH_CONFIG: SyhConfig = {
    SELECTORS: {
        // Коментарі
        commentBlock: '[class*="PlatformComment__Wrap"]',
        commentButtonContainer: '[class*="PlatformComment__TopRightButtonGroup"]',
        commentAuthor: '[class*="PlatformCommentShell__NameText"]',
        commentText: '[class*="PlatformCommentShell__ContentSpan"]',
        starButton: '[class*="PlatformComment__StarButton"]',
        starredHeaderWrap: '.StarredCommentList__HeaderWrap-sc-1qtlqu2-5',
        starredItemWrap: '.StarredCommentList__ItemWrap-sc-1qtlqu2-6',
        starredList: '.StarredCommentList__List-sc-1qtlqu2-1',
        starredCommentItem: 'li[class*="StarredCommentList"]',
        
        // Банери
        bannerBlock: '[class*="Banner__LiWrap"]',
        bannerWrap: '[class*="Banner__Wrap"]',
        bannerText: '[class*="Banner__BannerText"]',
        bannerHeader: '[class*="BannersHeader__Header"]',
        bannerButtonContainer: '[class*="Banner__DesktopTopIconRow"]',
        
        // ОНОВЛЕНИЙ ТОЧНИЙ СЕЛЕКТОР для кнопки видалення (корзини) - тепер шукає нову іконку lucide-trash2
        bannerDeleteButton: 'button:has(svg.lucide-trash2)',

        // Форма створення банера
        createBannerButton: '[class*="BannerList__BottomRow"] button',
        createBannerForm: 'form[class*="CreateBannerForm__Form"]',
        bannerFormTextarea: 'form[class*="CreateBannerForm__Form"] textarea',
        bannerFormAddButton: 'form[class*="CreateBannerForm__Form"] button[type="submit"]',

       // --- СЕЛЕКТОРИ ТАЙМЕРА (V4 - Smart Check) ---
        timerDropdownButton: '#banner-timer-dropdown-button', 
        timerOptionOffId: '#banner-timer-dropdown-option-null', 
        // Цей текст має співпадати з тим, що написано на кнопці, коли таймер вимкнено
        timerOffTextResult: (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage('timerOff')) || 'Timer off',
        
        // НОВІ СЕЛЕКТОРИ ДЛЯ НАГАДУВАННЯ
        streamStatusContainer: '[class*="Tags__Wrap"]', // Контейнер, де з'являється "Ended"
        reminderTargetContainer: '[data-testid="header-title-wrap"]' // Куди вставляти нагадування
    },

    TIMINGS: {
        ANTI_AFK_INTERVAL: 30000,        // 30 секунд — інтервал Anti-AFK кліків
        AUTO_HEAL_POLLING: 500,          // 500мс — DOM polling для Auto-Heal
        FILTER_DEBOUNCE: 150,            // 150мс — debounce для фільтру пошуку
        STATS_TRACKING_INTERVAL: 60000,  // 60 секунд — інтервал збору статистики
        REMINDER_DELAY: 2 * 60 * 1000,   // 2 хвилини — затримка нагадування
    },

    LIMITS: {
        TEXT_TRUNCATION_LENGTH: 195,     // Максимальна довжина тексту перед обрізанням
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_CONFIG = SYH_CONFIG;
}
