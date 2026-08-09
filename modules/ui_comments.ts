import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue, type SelectorValue } from './config';
import { SYH_UTILS } from './utils';
import { UiFactory } from './ui_factory';
import { CommentService } from './comment_service';
import type { PrayerItem } from './types';
import {
    updateTabCounts,
    restoreCheckboxFromCache
} from './ui_shared_utils';
import { renderSharedEmptyState } from './ui_empty_state';

export function addButtonsToComment(commentNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const targetContainer = queryBySelectorValue(selectors.commentButtonContainer, commentNode);
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
        
        const commentText = queryBySelectorValue(selectors.commentText, commentNode)?.textContent || '';
        
        restoreCheckboxFromCache(targetContainer, commentText);
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
    // `PrayerItem.type` — необов'язкове поле; для DOM-мітки відсутній тип
    // еквівалентний 'none' (та сама гілка `else` в `updateCommentVisuals`).
    const type = found?.type ?? 'none';
    updateCommentVisuals(commentNode, type);
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
        const commentList = queryBySelectorValue<HTMLElement>(selectors.starredList, document);
        const commentsToCopy: { author: string; text: string }[] = [];

        if (commentList && commentList.children.length > 0) {
            Array.from(commentList.children).forEach((liChild) => {
                const li = liChild as HTMLElement;
                if (li.getAttribute('data-syh-deleted') === 'true') return;
                if (li.style.display === 'none') return;

                const commentWrap = queryBySelectorValue(selectors.commentBlock, li) || li;
                const authorText = queryBySelectorValue(selectors.commentAuthor, commentWrap)?.textContent || '';
                const originalText = queryBySelectorValue(selectors.commentText, commentWrap)?.textContent || '';

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

export function evalCategoryMatch(commentType: string, activeFilter: string): boolean {
    if (activeFilter === 'prayer' && commentType !== 'prayer') return false;
    if (activeFilter === 'question' && commentType !== 'question') return false;
    if (activeFilter === 'other' && commentType !== 'none') return false;
    return true;
}

export function updateListItemOrdering(li: HTMLElement, isVisible: boolean, orderIndex: number): void {
    if (isVisible) {
        if (li.style.display === 'none') li.style.display = '';
        const targetOrder = orderIndex !== -1 ? orderIndex : 9999;
        if (parseInt(li.style.order || '0', 10) !== targetOrder) li.style.order = String(targetOrder);
    } else {
        if (li.style.display !== 'none') li.style.display = 'none';
        if (parseInt(li.style.order || '0', 10) !== 9999) li.style.order = '9999';
    }
}

function incrementCommentCategoryCounts(
    counts: Record<string, number>,
    commentType: string
): void {
    counts.all++;
    if (commentType === 'question') counts.question++;
    else if (commentType === 'prayer') counts.prayer++;
    else counts.other++;
}

export function filterCommentListItems(
    commentList: HTMLElement,
    selectors: Record<string, SelectorValue>,
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

        const commentWrap = queryBySelectorValue(selectors.commentBlock, li);
        if (!commentWrap) return;

        const originalText = queryBySelectorValue(selectors.commentText, commentWrap)?.textContent || '';
        const authorText = queryBySelectorValue(selectors.commentAuthor, commentWrap)?.textContent || '';

        const foundInCache = prayersCache.find((item: PrayerItem) => item.text === originalText);
        const commentType = foundInCache?.type ?? 'none';

        updateCommentVisuals(commentWrap, commentType);
        incrementCommentCategoryCounts(countAbsolute, commentType);

        const matchesSearch = !searchQuery || SYH_UTILS.smartSearch(searchQuery, originalText + " " + authorText);
        if (matchesSearch) {
            incrementCommentCategoryCounts(countSearch, commentType);
        }

        const isVisible = matchesSearch && evalCategoryMatch(commentType, activeFilter);
        const exactOrder = sortedTexts.indexOf(originalText);
        updateListItemOrdering(li, isVisible, exactOrder);

        if (isVisible) {
            visibleCount++;
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
