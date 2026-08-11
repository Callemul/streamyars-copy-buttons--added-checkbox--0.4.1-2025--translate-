// modules/ui_banners_header.ts
//
// Шапка списку банерів: кнопки керування, майстер-чекбокс, контейнер пошуку
// та прив'язка обробників фільтра. Виділено з `modules/ui_banners.ts`.
//
// Поведінка збережена 1-в-1 (див. tests/ui_banners.test.js).

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, resolveSelector, resolveSelectorAll } from './config';
import {
    buildHeaderControlsHTML,
    buildSearchFilterContainerHTML,
    buildEmptyStateHTML
} from './ui_banners_markup';
import {
    updateMasterCheckboxFromElements,
    updateFilterTabSelection,
    bindFilterSearchControls,
    bindFilterDocClickHandler
} from './ui_shared_utils';
import { filterBanners, scrollToActiveBanner } from './ui_banners_filter';

export function injectHeaderButtons(headerNode: Element): void {
    if (!headerNode.querySelector('.syh-banner-header-controls')) {
        headerNode.insertAdjacentHTML('beforeend', buildHeaderControlsHTML());
        updateMasterCheckboxState();
    }
}

export function updateMasterCheckboxState(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerBlocks = resolveSelectorAll(selectors.bannerBlock);
    const allBannerCheckboxes: HTMLInputElement[] = [];
    bannerBlocks.forEach(block => {
        const cb = block.querySelector<HTMLInputElement>('.syh-checkbox[data-type="banner"]');
        if (cb) allBannerCheckboxes.push(cb);
    });

    updateMasterCheckboxFromElements('.syh-master-checkbox', allBannerCheckboxes);
}

export function injectSearchAndFilterContainer(bannerList: Element): void {
    if (document.getElementById('syh-banner-search-container')) return;

    bannerList.insertAdjacentHTML('beforebegin', buildSearchFilterContainerHTML());

    if (!document.getElementById('syh-banner-empty-state-msg')) {
        bannerList.insertAdjacentHTML('afterend', buildEmptyStateHTML());
    }

    bindBannersFilterControls();
    setTimeout(() => filterBanners(), 10);
}

export function addBannerHeaderControls(headerNode: Element): void {
    if (headerNode) {
        injectHeaderButtons(headerNode);
    }

    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector(bannerListSelector);
    if (bannerList) {
        injectSearchAndFilterContainer(bannerList);
    }
}

let filterControlsBound = false;

export function bindBannersFilterControls(): void {
    bindFilterSearchControls({
        searchInputSelector: '#syh-banner-search',
        clearBtnSelector: '#syh-clear-banner-search-btn',
        scrollBtnSelector: '#syh-scroll-to-active-banner-btn',
        onSearch: (query) => {
            SYH_UI_STATE.bannerSearchQuery = query;
            filterBanners();
        },
        onClear: () => {
            SYH_UI_STATE.bannerSearchQuery = '';
            filterBanners();
        },
        onScroll: scrollToActiveBanner
    });

    if (filterControlsBound) return;
    filterControlsBound = true;

    bindFilterDocClickHandler({
        searchInputSelector: '#syh-banner-search',
        clearBtnSelector: '#syh-clear-banner-search-btn',
        clearLinkSelector: '#syh-banner-empty-clear-link',
        filterBtnClass: '.syh-banner-filter-btn',
        onClearAll: () => {
            SYH_UI_STATE.bannerSearchQuery = '';
            filterBanners();
        },
        onFilterSelect: (filterBtn) => {
            updateFilterTabSelection(filterBtn, '.syh-banner-filter-btn');
            SYH_UI_STATE.bannerActiveFilter = filterBtn.dataset.filter || 'all';
            filterBanners();
        }
    });
}
