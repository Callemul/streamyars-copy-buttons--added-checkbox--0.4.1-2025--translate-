// modules/config.js
window.SYH_CONFIG = {
    SELECTORS: {
        // Коментарі
        commentBlock: '[class*="PlatformComment__Wrap"]',
        commentButtonContainer: '[class*="PlatformComment__TopRightButtonGroup"]',
        commentAuthor: '[class*="PlatformCommentShell__NameText"]',
        commentText: '[class*="PlatformCommentShell__ContentSpan"]',
        starButton: '[class*="PlatformComment__StarButton"]',
        
        // Банери
        bannerBlock: '[class*="Banner__LiWrap"]',
        bannerWrap: '[class*="Banner__Wrap"]',
        bannerText: '[class*="Banner__BannerText"]',
        bannerHeader: '[class*="BannersHeader__Header"]',
        bannerDeleteButton: 'button svg path[d^="M6 19c0 1.1"]',

        // Форма створення банера
        // ЗМІНЕНО: Використовуємо більш надійний селектор, який не залежить від тексту
        createBannerButton: '[class*="BannerList__BottomRow"] button',
        createBannerForm: 'form[class*="CreateBannerForm__Form"]',
        bannerFormTextarea: 'form[class*="CreateBannerForm__Form"] textarea',
        bannerFormAddButton: 'form[class*="CreateBannerForm__Form"] button[type="submit"]',
    }
};