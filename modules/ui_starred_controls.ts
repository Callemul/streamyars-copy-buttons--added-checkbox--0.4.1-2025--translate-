// modules/ui_starred_controls.ts
//
// Винесено з `modules/ui_comments.ts`, щоб розплутати найскладнішу функцію
// проєкту за когнітивною складністю (`addStarredTabControls`, cog=26) та
// згрупувати логіку вкладки «Starred» в одному місці. Розмітка збережена
// байт-у-байт (див. tests/ui_comments_starred_controls.test.js), а всі три
// функції реекспортуються з `ui_comments.ts` 1-в-1 для зворотної сумісності.

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue } from './config';
import {
    bindFilterSearchControls,
    bindFilterDocClickHandler,
    updateFilterTabSelection,
    scrollToActiveItem
} from './ui_shared_utils';
import {
    buildSortedCommentTexts,
    filterCommentListItems,
    updateCommentTabCounts,
    renderCommentEmptyState
} from './ui_comments';
import { scrollToActiveComment } from './ui_shared_utils';

export function addStarredTabControls(starredHeaderNode: Element): void {
    if (starredHeaderNode && !starredHeaderNode.querySelector('.syh-starred-controls')) {
        const controlsHTML = `
            <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                <div class="syh-search-wrapper">
                    <input type="text" id="syh-starred-search" value="${SYH_UI_STATE.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." aria-label="Пошук по імені або тексту" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                    <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${SYH_UI_STATE.searchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук коментарів">✕</button>
                    <button id="syh-scroll-to-active-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до коментаря на екрані" aria-label="Повернутися до коментаря на екрані">🎯</button>
                </div>
                
                <div role="tablist" aria-label="Фільтри коментарів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                    <button role="tab" aria-selected="${SYH_UI_STATE.activeFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі коментарі" class="syh-filter-btn ${SYH_UI_STATE.activeFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-comment-filter-all">
                        <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI_STATE.activeFilter === 'question' ? 'true' : 'false'}" aria-label="Показати питання" class="syh-filter-btn ${SYH_UI_STATE.activeFilter === 'question' ? 'active' : ''}" data-filter="question" id="syh-comment-filter-question">
                        <span>❓</span><span class="tab-text">Питання</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI_STATE.activeFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитви" class="syh-filter-btn ${SYH_UI_STATE.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-comment-filter-prayer">
                        <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI_STATE.activeFilter === 'other' ? 'true' : 'false'}" aria-label="Показати інші коментарі" class="syh-filter-btn ${SYH_UI_STATE.activeFilter === 'other' ? 'active' : ''}" data-filter="other" id="syh-comment-filter-other" style="display: none;">
                        <span>📝</span><span class="tab-text">Інші</span><span class="tab-count"></span>
                    </button>
                </div>
            </div>
        `;

        starredHeaderNode.innerHTML = controlsHTML;

        const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;

        if (!document.querySelector('#syh-empty-state-msg')) {
            const starredList = queryBySelectorValue(selectors.starredList, document);
            if (starredList) {
                starredList.insertAdjacentHTML('afterend', `
                    <div id="syh-empty-state-msg" class="syh-empty-state">
                        <div id="syh-empty-query"></div>
                        <div id="syh-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                    </div>
                `);
            }
        }

        bindStarredControls();
        setTimeout(() => filterStarredComments(), 10);
    }
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
