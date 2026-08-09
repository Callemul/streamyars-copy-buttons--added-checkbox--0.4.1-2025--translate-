/**
 * StreamYard Helper — фасад UI.
 *
 * Файл свідомо тонкий: він лише збирає `SYH_UI` з профільних модулів і проксіює
 * стан у єдине джерело правди `SYH_UI_STATE`. Логіка ініціалізації, валідації
 * селекторів і відновлення чекбоксів живе в `ui_init` / `ui_selector_validator`
 * / `ui_checkbox_restorer` відповідно.
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

// `SyhUi` живе в `./ui_state`, але історично споживачі імпортують його з фасаду
// `../ui` разом із самим `SYH_UI`. Реекспорт відновлює цей контракт.
export type { SyhUi } from './ui_state';

// Create the combined SYH_UI object
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
