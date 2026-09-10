/**
 * StreamYard Helper — фільтрація, підрахунок і порожній стан списку коментарів.
 *
 * Винесено з `modules/ui_comments.ts`, щоб розплутати CRAP-хотспот — тіло циклу
 * `filterCommentListItems` (CRAP 49.5 / cyclomatic 13 за звітом Fallow 3.14).
 * Тепер один прохід списку читається як чотири незалежні кроки:
 * «прочитати рядок → визначити тип → зіставити з фільтром/пошуком → застосувати
 * видимість і порядок».
 *
 * Поведінка збережена 1-в-1 (див. `tests/ui_comments_copy_filter.test.js`).
 */

import { queryBySelectorValue, type SelectorValue } from '../../config';
import { SYH_UTILS } from '../../core/utils';
import type { PrayerItem } from '../../core/types';
import { resolveCommentType, updateCommentVisuals } from './ui_comment_labels';
import { updateTabCounts } from './ui_shared_utils';
import { renderSharedEmptyState } from './ui_empty_state';

/** `order`, який отримують приховані та невідсортовані елементи. */
const FALLBACK_ORDER = 9999;

/**
 * Лічильники вкладок коментарів. Набір категорій фіксований, тому це
 * іменований тип, а не безіменний `Record<string, number>`: інакше кожне
 * `counts.all` — потенційно `undefined`, а одруківка в назві категорії
 * проходить непоміченою.
 *
 * Саме псевдонім типу, а не інтерфейс: тільки псевдонім отримує неявну
 * індексну сигнатуру й лишається сумісним зі спільним рендерером порожнього
 * стану, який читає лічильник за динамічним ключем категорії.
 */
export type CommentTabCounts = {
    all: number;
    question: number;
    prayer: number;
    other: number;
};

export interface CommentFilterResult {
    visibleCount: number;
    countAbsolute: CommentTabCounts;
    countSearch: CommentTabCounts;
}

/** Розпізнаний рядок списку: сам блок коментаря плюс його тексти. */
interface CommentRow {
    commentWrap: Element;
    originalText: string;
    authorText: string;
}

/**
 * Групує тексти коментарів за автором (без префікса `@`), щоб однакові автори
 * трималися купкою. Фільтр `other` навмисно завжди дає порожній список.
 */
export function buildSortedCommentTexts(prayersCache: PrayerItem[], activeFilter: string): string[] {
    let sortedTexts: string[] = [];
    const grouped: Record<string, string[]> = {};

    prayersCache.forEach((p: PrayerItem) => {
        if (activeFilter === 'prayer' && p.type !== 'prayer') return;
        if (activeFilter === 'question' && p.type !== 'question') return;
        if (activeFilter === 'other') return;

        const cleanAuthor = p.author.replace(/^@+/, '');
        const authorTexts = grouped[cleanAuthor] ?? (grouped[cleanAuthor] = []);
        authorTexts.push(p.text);
    });

    for (const texts of Object.values(grouped)) {
        sortedTexts = sortedTexts.concat(texts);
    }
    return sortedTexts;
}

/** Чи проходить коментар обраний фільтр категорій. */
export function evalCategoryMatch(commentType: string, activeFilter: string): boolean {
    if (activeFilter === 'prayer' && commentType !== 'prayer') return false;
    if (activeFilter === 'question' && commentType !== 'question') return false;
    if (activeFilter === 'other' && commentType !== 'none') return false;
    return true;
}

/**
 * Застосовує видимість і flex-порядок до рядка списку.
 *
 * Присвоєння виконуються лише за фактичної зміни, щоб не смикати layout.
 * Побічний наслідок цієї оптимізації: `order === 0` ніколи не записується явно,
 * бо `parseInt('' || '0')` уже дорівнює 0 (CSS-дефолт той самий).
 */
export function updateListItemOrdering(li: HTMLElement, isVisible: boolean, orderIndex: number): void {
    if (isVisible) {
        if (li.style.display === 'none') li.style.display = '';
        const targetOrder = orderIndex !== -1 ? orderIndex : FALLBACK_ORDER;
        if (parseInt(li.style.order || '0', 10) !== targetOrder) li.style.order = String(targetOrder);
    } else {
        if (li.style.display !== 'none') li.style.display = 'none';
        if (parseInt(li.style.order || '0', 10) !== FALLBACK_ORDER) li.style.order = String(FALLBACK_ORDER);
    }
}

function incrementCommentCategoryCounts(
    counts: CommentTabCounts,
    commentType: string
): void {
    counts.all++;
    if (commentType === 'question') counts.question++;
    else if (commentType === 'prayer') counts.prayer++;
    else counts.other++;
}

function emptyCounts(): CommentTabCounts {
    return { all: 0, question: 0, prayer: 0, other: 0 };
}

/**
 * Читає рядок списку. Повертає `null` для записів, які треба повністю
 * проігнорувати: помічені як видалені або без блоку коментаря всередині.
 */
function readCommentRow(li: HTMLElement, selectors: Record<string, SelectorValue>): CommentRow | null {
    if (li.getAttribute('data-syh-deleted') === 'true') return null;

    const commentWrap = queryBySelectorValue(selectors.commentBlock, li);
    if (!commentWrap) return null;

    return {
        commentWrap,
        originalText: queryBySelectorValue(selectors.commentText, commentWrap)?.textContent || '',
        authorText: queryBySelectorValue(selectors.commentAuthor, commentWrap)?.textContent || ''
    };
}

/** Пошук ведеться одночасно по тексту коментаря і по імені автора. */
function matchesSearchQuery(searchQuery: string, row: CommentRow): boolean {
    return !searchQuery || SYH_UTILS.smartSearch(searchQuery, row.originalText + " " + row.authorText);
}

/**
 * Один прохід списку: оновлює мітки, рахує категорії (абсолютно і з урахуванням
 * пошуку) та застосовує видимість/порядок до кожного рядка.
 */
export function filterCommentListItems(
    commentList: HTMLElement,
    selectors: Record<string, SelectorValue>,
    prayersCache: PrayerItem[],
    activeFilter: string,
    searchQuery: string,
    sortedTexts: string[]
): CommentFilterResult {
    let visibleCount = 0;
    const countAbsolute = emptyCounts();
    const countSearch = emptyCounts();

    Array.from(commentList.children).forEach((liChild) => {
        const li = liChild as HTMLElement;
        const row = readCommentRow(li, selectors);
        if (!row) return;

        const commentType = resolveCommentType(prayersCache, row.originalText);
        updateCommentVisuals(row.commentWrap, commentType);
        incrementCommentCategoryCounts(countAbsolute, commentType);

        const matchesSearch = matchesSearchQuery(searchQuery, row);
        if (matchesSearch) {
            incrementCommentCategoryCounts(countSearch, commentType);
        }

        const isVisible = matchesSearch && evalCategoryMatch(commentType, activeFilter);
        updateListItemOrdering(li, isVisible, sortedTexts.indexOf(row.originalText));

        if (isVisible) {
            visibleCount++;
        }
    });

    return { visibleCount, countAbsolute, countSearch };
}

/** Проставляє лічильники у вкладки фільтрів коментарів. */
export function updateCommentTabCounts(countAbsolute: CommentTabCounts): void {
    updateTabCounts({
        '#syh-comment-filter-all .tab-count': ` (${countAbsolute.all})`,
        '#syh-comment-filter-question .tab-count': ` (${countAbsolute.question})`,
        '#syh-comment-filter-prayer .tab-count': ` (${countAbsolute.prayer})`,
        '#syh-comment-filter-other .tab-count': ` (${countAbsolute.other})`,
    });
}

/** Малює порожній стан списку коментарів поверх спільного рендерера. */
export function renderCommentEmptyState(
    visibleCount: number,
    searchQuery: string,
    activeFilter: string,
    countSearch: CommentTabCounts
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
