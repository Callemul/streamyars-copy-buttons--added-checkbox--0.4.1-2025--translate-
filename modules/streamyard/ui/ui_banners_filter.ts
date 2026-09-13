// modules/ui_banners_filter.ts
//
// Фільтрація/пошук списку банерів, лічильники вкладок і порожній стан.
// Виділено з `modules/ui_banners.ts`. Поведінка збережена 1-в-1
// (див. tests/ui_banners.test.js).

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, resolveSelector, resolveSelectorString } from '../../registry/config';
import { SYH_UTILS } from '../../core/utils';
import { updateBannerVisuals } from './ui_banners_inject';
import { updateTabCounts, scrollToActiveItem } from './ui_shared_utils';
import { renderSharedEmptyState } from './ui_empty_state';

/**
 * Лічильники вкладок банерів. Іменований тип із тієї ж причини, що й
 * `CommentTabCounts`: набір категорій фіксований.
 */
export type BannerTabCounts = {
    all: number;
    stream: number;
    audience: number;
    prayer: number;
};

function incrementCategoryCounts(
    counts: BannerTabCounts,
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
): { visibleCount: number; countAbsolute: BannerTabCounts; countSearch: BannerTabCounts } {
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

export function updateBannerTabCounts(countAbsolute: BannerTabCounts): void {
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
    countSearch: BannerTabCounts
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
    const bannerListSelector = resolveSelectorString(SYH_CONFIG.SELECTORS.bannerList);
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
    scrollToActiveItem(resolveSelectorString(SYH_CONFIG.SELECTORS.bannerList));
}
