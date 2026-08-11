import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, resolveSelector, resolveSelectorAll } from './config';
import { SYH_UTILS } from './utils';
import { UiFactory } from './ui_factory';
import {
    updateMasterCheckboxFromElements,
    scrollToActiveItem,
    updateTabCounts,
    restoreCheckboxFromCache,
    updateFilterTabSelection,
    bindFilterSearchControls,
    bindFilterDocClickHandler
} from './ui_shared_utils';
import { renderSharedEmptyState } from './ui_empty_state';
import { buildHeaderControlsHTML, buildSearchFilterContainerHTML, buildEmptyStateHTML } from './ui_banners_markup';

export function addButtonsToBanner(bannerNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerWrap = resolveSelector(selectors.bannerWrap, bannerNode);
    if (bannerWrap && !bannerWrap.querySelector('.syh-banner-controls')) {
        const container = document.createElement('div');
        container.className = 'syh-banner-controls';

        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'copy-banner', icon: '📋', title: 'Копіювати текст банера'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-stream', icon: '📺', title: 'Відмітити як Питання ефіру'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-audience', icon: '❓', title: 'Відмітити як Питання глядачів'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-prayer', icon: '🙏', title: 'Відмітити як Молитовне'
        }));

        const { wrapper: cbWrap } = UiFactory.createCheckbox(
            'banner',
            'Відмітити банер як опрацьований'
        );
        container.appendChild(cbWrap);

        bannerWrap.appendChild(container);
        const bannerText = resolveSelector(selectors.bannerText, bannerNode)?.textContent || '';

        restoreCheckboxFromCache(bannerWrap, bannerText);

        applySavedBannerLabels(bannerWrap, bannerText);
    }
}

export function updateBannerVisuals(bannerBlock: Element, type: string): void {
    if (type === 'stream' || type === 'audience' || type === 'prayer') {
        bannerBlock.setAttribute('data-syh-banner-type', type);
    } else {
        bannerBlock.removeAttribute('data-syh-banner-type');
    }
}

export function applySavedBannerLabels(bannerNode: Element, text: string): void {
    if (!text || !text.trim()) return;
    const type = SYH_UI_STATE.bannerCategoriesCache[text] || 'none';
    updateBannerVisuals(bannerNode, type);
}

export function injectHeaderButtons(headerNode: Element): void {
    if (!headerNode.querySelector('.syh-banner-header-controls')) {
        headerNode.insertAdjacentHTML('beforeend', buildHeaderControlsHTML());
        updateMasterCheckboxState();
    }
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

function incrementCategoryCounts(
    counts: Record<string, number>,
    commentType: string
): void {
    counts.all++;
    if (commentType === 'stream') counts.stream++;
    else if (commentType === 'audience') counts.audience++;
    else if (commentType === 'prayer') counts.prayer++;
}

function matchesActiveFilter(commentType: string, activeFilter: string): boolean {
    if (activeFilter === 'stream' && commentType !== 'stream') return false;
    if (activeFilter === 'audience' && commentType !== 'audience') return false;
    if (activeFilter === 'prayer' && commentType !== 'prayer') return false;
    return true;
}

export function filterBannerListItems(
    bannerList: HTMLElement,
    selectors: any,
    categoriesCache: Record<string, string>,
    activeFilter: string,
    searchQuery: string
): { visibleCount: number; countAbsolute: Record<string, number>; countSearch: Record<string, number> } {
    let visibleCount = 0;
    const countAbsolute = { all: 0, stream: 0, audience: 0, prayer: 0 };
    const countSearch = { all: 0, stream: 0, audience: 0, prayer: 0 };

    Array.from(bannerList.children).forEach(liChild => {
        const li = liChild as HTMLElement;
        const bannerWrap = resolveSelector(selectors.bannerWrap, li);
        if (!bannerWrap) return;

        const originalText = resolveSelector(selectors.bannerText, bannerWrap)?.textContent || '';
        const commentType = categoriesCache[originalText] || 'none';

        updateBannerVisuals(bannerWrap, commentType);
        incrementCategoryCounts(countAbsolute, commentType);

        const matchesSearch = !searchQuery || SYH_UTILS.smartSearch(searchQuery, originalText);
        if (matchesSearch) {
            incrementCategoryCounts(countSearch, commentType);
        }

        const isVisible = matchesSearch && matchesActiveFilter(commentType, activeFilter);

        if (isVisible) {
            if (li.style.display === 'none') li.style.display = '';
            visibleCount++;
        } else {
            if (li.style.display !== 'none') li.style.display = 'none';
        }
    });

    return { visibleCount, countAbsolute, countSearch };
}

export function updateBannerTabCounts(countAbsolute: Record<string, number>): void {
    updateTabCounts({
        '#syh-banner-filter-all .tab-count': `(${countAbsolute.all || 0})`,
        '#syh-banner-filter-stream .tab-count': `(${countAbsolute.stream || 0})`,
        '#syh-banner-filter-audience .tab-count': `(${countAbsolute.audience || 0})`,
        '#syh-banner-filter-prayer .tab-count': `(${countAbsolute.prayer || 0})`,
    });
}

export function renderBannerEmptyState(
    visibleCount: number,
    searchQuery: string,
    activeFilter: string,
    countSearch: Record<string, number>
): void {
    renderSharedEmptyState({
        emptyStateId: 'syh-banner-empty-state-msg',
        emptyQueryId: 'syh-banner-empty-query',
        emptySuggestionId: 'syh-banner-empty-suggestion',
        clearLinkId: 'syh-banner-empty-clear-link',
        switchTabClass: 'syh-banner-switch-tab',
        filterBtnSelector: '.syh-banner-filter-btn',
        visibleCount,
        searchQuery,
        activeFilter,
        countSearch,
        suggestions: [
            { key: 'stream', label: 'Ефір', icon: '🎙️' },
            { key: 'audience', label: 'Глядачі', icon: '❓' },
            { key: 'prayer', label: 'Молитви', icon: '🙏' },
        ],
        filterNames: {
            'all': 'списку банерів',
            'stream': 'Ефір',
            'audience': 'Глядачі',
            'prayer': 'Молитви',
        },
        entityNamePlural: 'банерів',
        defaultFilterTargetName: activeFilter,
    });
}

export function filterBanners(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector<HTMLElement>(bannerListSelector);
    if (!bannerList) return;

    const activeFilter = SYH_UI_STATE.bannerActiveFilter || 'all';
    const searchQuery = SYH_UI_STATE.bannerSearchQuery || '';

    const { visibleCount, countAbsolute, countSearch } = filterBannerListItems(
        bannerList,
        selectors,
        SYH_UI_STATE.bannerCategoriesCache,
        activeFilter,
        searchQuery
    );

    updateBannerTabCounts(countAbsolute);
    renderBannerEmptyState(visibleCount, searchQuery, activeFilter, countSearch);
}

export function scrollToActiveBanner(): void {
    scrollToActiveItem('[class*="BannerList__ListWrap"], ul[class*="Banner"]');
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
