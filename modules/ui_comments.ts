import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG } from './config';
import { SYH_UTILS } from './utils';
import { UiFactory } from './ui_factory';
import { CommentService } from './comment_service';
import type { PrayerItem } from './types';
import {
    updateTabCounts,
    renderSharedEmptyState,
    scrollToActiveItem
} from './ui_shared_utils';

export function addButtonsToComment(commentNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const targetContainer = commentNode.querySelector(selectors.commentButtonContainer);
    if (targetContainer && !targetContainer.querySelector('.syh-custom-buttons-comment')) {
        const container = document.createElement('div');
        container.className = 'syh-custom-buttons-comment';

        container.appendChild(UiFactory.createButton({
            type: 'comment',
            action: 'copy-comment',
            icon: '📄',
            title: 'Копіювати тільки коментар'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'comment',
            action: 'copy-author-comment',
            icon: '❓',
            title: 'Відмітити як Питання'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'comment',
            action: 'copy-prayer',
            icon: '🙏',
            title: 'ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️'
        }));

        const { wrapper: cbWrap } = UiFactory.createCheckbox(
            'comment',
            'Відмітити коментар як опрацьований'
        );
        container.appendChild(cbWrap);

        targetContainer.appendChild(container);
        
        const commentText = commentNode.querySelector(selectors.commentText)?.textContent || '';
        
        if (CommentService.getStreamYardCheckboxState(commentText)) {
            const checkbox = targetContainer.querySelector<HTMLInputElement>('.syh-checkbox');
            if (checkbox) checkbox.checked = true;
        }
        applySavedLabels(commentNode, commentText);
    }
}

export function updateCommentVisuals(commentWrap: Element, type: string): void {
    if (type === 'prayer') {
        commentWrap.setAttribute('data-syh-type', 'prayer');
    } else if (type === 'question') {
        commentWrap.setAttribute('data-syh-type', 'question');
    } else {
        commentWrap.removeAttribute('data-syh-type');
    }
}

export function applySavedLabels(commentNode: Element, text: string): void {
    if (!text || !text.trim()) return; 
    
    const found = SYH_UI_STATE.prayersCache.find((item: PrayerItem) => item.text === text);
    const type = found ? found.type : 'none';
    updateCommentVisuals(commentNode, type);
}

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
            const starredList = document.querySelector(selectors.starredList);
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

/**
 * Додає маленьку кнопку копіювання списків у правому кутку вкладки Starred
 */
export function addStarredTabCopyButton(starredTabNode: Element): void {
    if (!starredTabNode || starredTabNode.querySelector('.syh-starred-tab-copy-btn')) {
        return;
    }

    const tabEl = starredTabNode as HTMLElement;
    if (getComputedStyle(tabEl).position === 'static') {
        tabEl.style.position = 'relative';
    }
    tabEl.style.paddingRight = '28px';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'syh-starred-tab-copy-btn';
    copyBtn.title = 'Скопіює всі списки зі Starred';
    copyBtn.setAttribute('aria-label', 'Скопіює всі списки зі Starred');
    copyBtn.innerHTML = '<span class="syh-starred-copy-icon">📋</span>';

    copyBtn.addEventListener('click', async (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
        const commentList = document.querySelector<HTMLElement>(selectors.starredList);
        const commentsToCopy: { author: string; text: string }[] = [];

        if (commentList && commentList.children.length > 0) {
            Array.from(commentList.children).forEach((liChild) => {
                const li = liChild as HTMLElement;
                if (li.getAttribute('data-syh-deleted') === 'true') return;
                if (li.style.display === 'none') return;

                const commentWrap = li.querySelector(selectors.commentBlock) || li;
                const authorText = commentWrap.querySelector(selectors.commentAuthor)?.textContent || '';
                const originalText = commentWrap.querySelector(selectors.commentText)?.textContent || '';

                if (originalText.trim()) {
                    commentsToCopy.push({
                        author: authorText.trim(),
                        text: originalText.trim()
                    });
                }
            });
        }

        if (commentsToCopy.length === 0 && SYH_UI_STATE.prayersCache && SYH_UI_STATE.prayersCache.length > 0) {
            SYH_UI_STATE.prayersCache.forEach((p) => {
                if (p.text && p.text.trim()) {
                    commentsToCopy.push({ author: p.author || '', text: p.text.trim() });
                }
            });
        }

        if (commentsToCopy.length === 0) {
            SYH_UTILS.copyAndShowBanner('', 'Немає коментарів для копіювання');
            return;
        }

        const formattedText = commentsToCopy
            .map(c => CommentService.formatForClipboard(c.author, c.text))
            .join('\n\n');

        const success = await CommentService.copyToClipboard(formattedText);
        if (success) {
            SYH_UTILS.copyAndShowBanner(formattedText, `Скопійовано коментарів: ${commentsToCopy.length} 📋`);
        }

        const iconSpan = copyBtn.querySelector('.syh-starred-copy-icon');
        if (iconSpan) {
            iconSpan.textContent = '✅';
            copyBtn.classList.add('syh-copied-anim');
            setTimeout(() => {
                iconSpan.textContent = '📋';
                copyBtn.classList.remove('syh-copied-anim');
            }, 1800);
        }
    });

    tabEl.appendChild(copyBtn);
}

export function bindStarredControls(): void {
    const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');
    const clearBtn = document.querySelector<HTMLElement>('#syh-clear-search-btn');

    if (searchInput) {
        searchInput.oninput = function() {
            SYH_UI_STATE.searchQuery = searchInput.value.toLowerCase();
            if (clearBtn) clearBtn.style.display = SYH_UI_STATE.searchQuery ? 'flex' : 'none';
            filterStarredComments();
        };
    }

    if (clearBtn) {
        clearBtn.onclick = function() {
            if (searchInput) searchInput.value = '';
            SYH_UI_STATE.searchQuery = '';
            clearBtn.style.display = 'none';
            filterStarredComments();
        };
    }

    const scrollBtn = document.querySelector('#syh-scroll-to-active-btn');
    if (scrollBtn) {
        scrollBtn.onclick = function(e) {
            e.preventDefault();
            scrollToActiveComment();
        };
    }

    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest('#syh-empty-clear-link')) {
            e.preventDefault();
            if (searchInput) searchInput.value = '';
            SYH_UI_STATE.searchQuery = '';
            if (clearBtn) clearBtn.style.display = 'none';
            filterStarredComments();
            return;
        }

        const filterBtn = target?.closest('.syh-filter-btn') as HTMLElement | null;
        if (filterBtn) {
            document.querySelectorAll<HTMLElement>('.syh-filter-btn').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.fontWeight = 'normal';
                btn.style.boxShadow = 'none';
                btn.style.color = '#666';
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            filterBtn.style.background = '#fff';
            filterBtn.style.fontWeight = 'bold';
            filterBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            filterBtn.style.color = '#000';
            filterBtn.classList.add('active');
            filterBtn.setAttribute('aria-selected', 'true');
            
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

export function buildSortedCommentTexts(prayersCache: PrayerItem[], activeFilter: string): string[] {
    let sortedTexts: string[] = [];
    const grouped: Record<string, string[]> = {};
    
    prayersCache.forEach((p: PrayerItem) => {
        if (activeFilter === 'prayer' && p.type !== 'prayer') return;
        if (activeFilter === 'question' && p.type !== 'question') return;
        if (activeFilter === 'other') return; 
        
        const cleanAuthor = p.author.replace(/^@+/, '');
        if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
        grouped[cleanAuthor].push(p.text);
    });

    for (const author in grouped) {
        sortedTexts = sortedTexts.concat(grouped[author]);
    }
    return sortedTexts;
}

export function filterCommentListItems(
    commentList: HTMLElement,
    selectors: any,
    prayersCache: PrayerItem[],
    activeFilter: string,
    searchQuery: string,
    sortedTexts: string[]
): { visibleCount: number; countAbsolute: Record<string, number>; countSearch: Record<string, number> } {
    let visibleCount = 0;
    const countAbsolute = { all: 0, question: 0, prayer: 0, other: 0 };
    const countSearch = { all: 0, question: 0, prayer: 0, other: 0 };

    Array.from(commentList.children).forEach((liChild) => {
        const li = liChild as HTMLElement;
        if (li.getAttribute('data-syh-deleted') === 'true') return;

        const commentWrap = li.querySelector(selectors.commentBlock);
        if (!commentWrap) return;

        const originalText = commentWrap.querySelector(selectors.commentText)?.textContent || '';
        const authorText = commentWrap.querySelector(selectors.commentAuthor)?.textContent || '';
        
        const foundInCache = prayersCache.find((item: PrayerItem) => item.text === originalText);
        const commentType = foundInCache ? foundInCache.type : 'none';
        
        updateCommentVisuals(commentWrap, commentType);
        
        countAbsolute.all++;
        if (commentType === 'question') countAbsolute.question++;
        else if (commentType === 'prayer') countAbsolute.prayer++;
        else countAbsolute.other++;
        
        let matchesSearch = true;
        if (searchQuery) {
            const combinedTarget = originalText + " " + authorText;
            matchesSearch = SYH_UTILS.smartSearch(searchQuery, combinedTarget);
        }

        if (matchesSearch) {
            countSearch.all++;
            if (commentType === 'question') countSearch.question++;
            else if (commentType === 'prayer') countSearch.prayer++;
            else countSearch.other++;
        }

        let isVisible = matchesSearch;

        if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;
        if (activeFilter === 'question' && commentType !== 'question') isVisible = false;
        if (activeFilter === 'other' && commentType !== 'none') isVisible = false;

        if (isVisible) {
            if (li.style.display === 'none') li.style.display = '';
            const exactOrder = sortedTexts.indexOf(originalText);
            const targetOrder = exactOrder !== -1 ? exactOrder : 9999;
            if (parseInt(li.style.order || '0') !== targetOrder) li.style.order = String(targetOrder);
            visibleCount++;
        } else {
            if (li.style.display !== 'none') li.style.display = 'none';
            if (parseInt(li.style.order || '0') !== 9999) li.style.order = '9999'; 
        }
    });

    return { visibleCount, countAbsolute, countSearch };
}

export function updateCommentTabCounts(countAbsolute: Record<string, number>): void {
    updateTabCounts({
        '#syh-comment-filter-all .tab-count': ` (${countAbsolute.all})`,
        '#syh-comment-filter-question .tab-count': ` (${countAbsolute.question})`,
        '#syh-comment-filter-prayer .tab-count': ` (${countAbsolute.prayer})`,
        '#syh-comment-filter-other .tab-count': ` (${countAbsolute.other})`,
    });
}

export function renderCommentEmptyState(
    visibleCount: number,
    searchQuery: string,
    activeFilter: string,
    countSearch: Record<string, number>
): void {
    renderSharedEmptyState({
        emptyStateId: 'syh-empty-state-msg',
        emptyQueryId: 'syh-empty-query',
        emptySuggestionId: 'syh-empty-suggestion',
        clearLinkId: 'syh-empty-clear-link',
        switchTabClass: 'syh-switch-tab',
        filterBtnSelector: '.syh-filter-btn',
        visibleCount,
        searchQuery,
        activeFilter,
        countSearch,
        suggestions: [
            { key: 'question', label: 'Питання', icon: '❓' },
            { key: 'prayer', label: 'Молитви', icon: '🙏' },
            { key: 'other', label: 'Інші', icon: '📝' },
        ],
        filterNames: {
            'all': 'списку коментарів',
            'question': 'категорії "❓ Питання"',
            'prayer': 'категорії "🙏 Молитви"',
            'other': 'категорії "📝 Інші"'
        },
        entityNamePlural: 'коментарів',
        defaultFilterTargetName: 'списку коментарів'
    });
}

export function filterStarredComments(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentList = document.querySelector<HTMLElement>(selectors.starredList);
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

export function scrollToActiveComment(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    scrollToActiveItem(selectors.starredList);
}
