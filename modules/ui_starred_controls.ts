// modules/ui_starred_controls.ts
//
// Винесено з `modules/ui_comments.ts`, щоб розплутати найскладнішу функцію
// проєкту за когнітивною складністю (`addStarredTabControls`, cog=26) та
// згрупувати логіку вкладки «Starred» в одному місці. Розмітка збережена
// байт-у-байт (див. tests/ui_comments_starred_controls.test.js).
//
// Публічна точка входу — саме цей модуль: `ui_comments.ts` НЕ реекспортує ці
// три функції. Хелпери фільтрації беремо напряму з `ui_comments_filter.ts`
// (а не через фасад `ui_comments.ts`), щоб залежність лишалась однонапрямною.

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue } from './config';
import {
    bindFilterSearchControls,
    bindFilterDocClickHandler,
    updateFilterTabSelection,
    scrollToActiveComment
} from './ui_shared_utils';
import {
    buildSortedCommentTexts,
    filterCommentListItems,
    updateCommentTabCounts,
    renderCommentEmptyState
} from './ui_comments_filter';
import { buildStarredControlsMarkup, STARRED_EMPTY_STATE_MARKUP } from './ui_starred_markup';

/**
 * Вставляє блок порожнього стану одразу після списку Starred.
 * Ідемпотентна: якщо блок уже є в документі — нічого не робить.
 */
function ensureStarredEmptyState(): void {
    if (document.querySelector('#syh-empty-state-msg')) return;

    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const starredList = queryBySelectorValue(selectors.starredList, document);
    if (!starredList) return;

    starredList.insertAdjacentHTML('afterend', STARRED_EMPTY_STATE_MARKUP);
}

export function addStarredTabControls(starredHeaderNode: Element): void {
    if (!starredHeaderNode) return;
    if (starredHeaderNode.querySelector('.syh-starred-controls')) return;

    starredHeaderNode.innerHTML = buildStarredControlsMarkup(
        SYH_UI_STATE.activeFilter,
        SYH_UI_STATE.searchQuery
    );

    ensureStarredEmptyState();

    bindStarredControls();
    setTimeout(() => filterStarredComments(), 10);
}

export function bindStarredControls(): void {
    const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');

    bindFilterSearchControls({
        searchInputSelector: '#syh-starred-search',
        clearBtnSelector: '#syh-clear-search-btn',
        scrollBtnSelector: '#syh-scroll-to-active-btn',
        onSearch: (query) => {
            SYH_UI_STATE.searchQuery = query;
            filterStarredComments();
        },
        onClear: () => {
            SYH_UI_STATE.searchQuery = '';
            filterStarredComments();
        },
        onScroll: scrollToActiveComment
    });

    bindFilterDocClickHandler({
        searchInputSelector: '#syh-starred-search',
        clearBtnSelector: '#syh-clear-search-btn',
        clearLinkSelector: '#syh-empty-clear-link',
        filterBtnClass: '.syh-filter-btn',
        onClearAll: () => {
            SYH_UI_STATE.searchQuery = '';
            filterStarredComments();
        },
        onFilterSelect: (filterBtn) => {
            updateFilterTabSelection(filterBtn, '.syh-filter-btn');
            SYH_UI_STATE.activeFilter = filterBtn.dataset.filter || 'all';
            filterStarredComments();

            if (SYH_UI_STATE.searchQuery && searchInput) {
                searchInput.classList.remove('syh-search-pulse');
                void searchInput.offsetWidth;
                searchInput.classList.add('syh-search-pulse');
            }
        }
    });
}

export function filterStarredComments(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentList = queryBySelectorValue<HTMLElement>(selectors.starredList, document);
    if (!commentList) return;

    const activeFilter = SYH_UI_STATE.activeFilter;
    const searchQuery = SYH_UI_STATE.searchQuery;

    const sortedTexts = buildSortedCommentTexts(SYH_UI_STATE.prayersCache, activeFilter);

    if (commentList.style.display !== 'flex') {
        commentList.style.display = 'flex';
        commentList.style.flexDirection = 'column';
    }

    const { visibleCount, countAbsolute, countSearch } = filterCommentListItems(
        commentList,
        selectors,
        SYH_UI_STATE.prayersCache,
        activeFilter,
        searchQuery,
        sortedTexts
    );

    const otherTabBtn = document.querySelector<HTMLElement>('#syh-comment-filter-other');
    if (countAbsolute.other === 0) {
        if (otherTabBtn && otherTabBtn.style.display !== 'none') otherTabBtn.style.display = 'none';

        if (SYH_UI_STATE.activeFilter === 'other') {
            SYH_UI_STATE.activeFilter = 'all';
            document.querySelectorAll('.syh-filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('#syh-comment-filter-all')?.classList.add('active');
            return filterStarredComments();
        }
    } else {
        if (otherTabBtn && otherTabBtn.style.display === 'none') otherTabBtn.style.display = 'inline-flex';
    }

    updateCommentTabCounts(countAbsolute);
    renderCommentEmptyState(visibleCount, searchQuery, activeFilter, countSearch);
}
