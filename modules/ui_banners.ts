// modules/ui_banners.ts
//
// Фасад для роботи з банерами StreamYard. Логіку рознесено по модулях:
//   - ui_banners_inject.ts  — кнопки банера + візуальний стан міток
//   - ui_banners_header.ts  — шапка, майстер-чекбокс, контейнер пошуку, обробники
//   - ui_banners_filter.ts  — фільтрація/пошук, лічильники, порожній стан
//
// Поведінка збережена 1-в-1 (див. tests/ui_banners.test.js).

export {
    addButtonsToBanner,
    updateBannerVisuals,
    applySavedBannerLabels
} from './ui_banners_inject';

export {
    injectHeaderButtons,
    updateMasterCheckboxState,
    injectSearchAndFilterContainer,
    addBannerHeaderControls,
    bindBannersFilterControls
} from './ui_banners_header';

export {
    filterBannerListItems,
    updateBannerTabCounts,
    renderBannerEmptyState,
    filterBanners,
    scrollToActiveBanner
} from './ui_banners_filter';
