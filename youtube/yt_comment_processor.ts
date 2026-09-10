// youtube/yt_comment_processor.ts
//
// ПРИЗНАЧЕННЯ: обробка коментарів YouTube (кнопки, підсвітка, відновлення стану).
//
// СКЛАД (після декомпозиції CRAP-хотспота):
//   ./yt_state          — спільний кеш стану модуля
//   ./yt_observer       — володіння підпискою на DOM-спостерігач
//   ./yt_comment_rules  — чисті правила (нормалізація селекторів, передумови)
//
// Публічний API (processYTComment / processAllYTComments / startObserver)
// збережено без змін.

import { YT_SELECTORS } from './yt_selectors';
import { addButtonsToYTComment, extractCommentId, restoreButtonState, restoreCheckboxState } from './yt_ui';
import { bindYTEvents } from './yt_events';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant/index';
import { startCommentObserver } from './yt_observer';
import { stateCache } from './yt_state';
import { HIGHLIGHT_ERROR_PREFIX, canProcessComment, toSelectorString } from './yt_comment_rules';

/** Підсвітка тригерних слів не має ламати решту обробки коментаря. */
function highlightComment(commentNode: Element): void {
    try {
        SYH_COMMENT_ASSISTANT.processComment(commentNode);
    } catch (err) {
        console.warn(HIGHLIGHT_ERROR_PREFIX, err);
    }
}

/** Відновлює збережений стан кнопок і чекбокса коментаря. */
function restoreCommentState(commentNode: Element, commentId: string): void {
    restoreButtonState(commentNode, commentId, stateCache.buttonStates);
    restoreCheckboxState(commentNode, commentId, stateCache.checkboxStates);
}

/** Шапка автора — єдиний надійний якір для вставки панелі кнопок. */
function hasHeaderAuthor(commentNode: Element): boolean {
    return Boolean(commentNode.querySelector(toSelectorString(YT_SELECTORS.headerAuthor)));
}

/**
 * Обробка одного вузла коментаря YouTube
 */
export function processYTComment(commentNode: Element): void {
    if (!canProcessComment(commentNode, stateCache.youtubeEnabled, () => hasHeaderAuthor(commentNode))) return;

    addButtonsToYTComment(commentNode);

    const commentId = extractCommentId(commentNode);
    if (!commentId) return;

    highlightComment(commentNode);
    restoreCommentState(commentNode, commentId);
    bindYTEvents(commentNode, commentId, stateCache);
}

/**
 * Сканування та обробка всіх коментарів на сторінці
 */
export function processAllYTComments(): void {
    if (!stateCache.youtubeEnabled) return;
    const comments = document.querySelectorAll(toSelectorString(YT_SELECTORS.commentBlock));
    comments.forEach(processYTComment);
}

/**
 * Запуск спостерігача за DOM через централізований DomObserverService
 */
export function startObserver(): void {
    startCommentObserver(toSelectorString(YT_SELECTORS.commentBlock), processYTComment);
}
