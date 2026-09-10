/**
 * StreamYard Helper — конкретна збірка фасаду UI (`SYH_UI`).
 *
 * Модуль тримає єдиний експорт `SYH_UI` та проксіює стан у єдине джерело
 * правди `SYH_UI_STATE`. Фасад `./ui` лише перевидпускає його разом із
 * типом `SyhUi`, щоб не зламати історичних споживачів. Логіка ініціалізації,
 * валідації селекторів і відновлення чекбоксів живе в `ui_init` /
 * `ui_selector_validator` / `ui_checkbox_restorer` відповідно.
 */

import { SYH_UI_STATE, type SyhUi } from './ui_state';
import { initUiModule } from './ui_init';
import { validateSelectorsSyntax } from './ui_selector_validator';
import { restoreDomCheckboxes } from './ui_checkbox_restorer';
import {
    addButtonsToComment,
    updateCommentVisuals,
    applySavedLabels,
    addStarredTabCopyButton
} from './ui_comments';
import {
    addStarredTabControls,
    bindStarredControls,
    filterStarredComments
} from './ui_starred_controls';
import { scrollToActiveComment } from './ui_shared_utils';
import {
    addButtonsToBanner,
    updateBannerVisuals,
    applySavedBannerLabels,
    addBannerHeaderControls,
    updateMasterCheckboxState,
    filterBanners,
    scrollToActiveBanner
} from './ui_banners';

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

    init: initUiModule,
    validateSelectorsSyntax,
    restoreDomCheckboxes,

    // Comments UI
    addButtonsToComment,
    updateCommentVisuals,
    applySavedLabels,
    addStarredTabControls,
    addStarredTabCopyButton,
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
