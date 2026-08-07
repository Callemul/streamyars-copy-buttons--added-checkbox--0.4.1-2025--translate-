// youtube/yt_comment_processor.ts
import { YT_SELECTORS } from './yt_selectors';
import { addButtonsToYTComment, extractCommentId, restoreButtonState, restoreCheckboxState } from './yt_ui';
import { bindYTEvents, YTCollectedItem } from './yt_events';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant';
import { SYH_DOM_OBSERVER } from '../modules/dom_observer';

export interface StateCache {
    buttonStates: Record<string, 'question' | 'prayer'>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
    collectedList: YTCollectedItem[];
    youtubeEnabled: boolean;
}

export const stateCache: StateCache = {
    buttonStates: {},
    checkboxStates: {},
    collectedList: [],
    youtubeEnabled: true
};

export let unregisterObserver: (() => void) | null = null;

/**
 * Обробка одного вузла коментаря YouTube
 */
export function processYTComment(commentNode: Element): void {
    if (!commentNode || !stateCache.youtubeEnabled) return;

    const headerAuthor = commentNode.querySelector(YT_SELECTORS.headerAuthor);
    if (!headerAuthor) return;

    addButtonsToYTComment(commentNode);

    const commentId = extractCommentId(commentNode);
    if (!commentId) return;

    try {
        SYH_COMMENT_ASSISTANT.processComment(commentNode);
    } catch (err) {
        console.warn('[SYH YT] Highlight error:', err);
    }

    restoreButtonState(commentNode, commentId, stateCache.buttonStates);
    restoreCheckboxState(commentNode, commentId, stateCache.checkboxStates);

    bindYTEvents(commentNode, commentId, stateCache);
}

/**
 * Сканування та обробка всіх коментарів на сторінці
 */
export function processAllYTComments(): void {
    if (!stateCache.youtubeEnabled) return;
    const comments = document.querySelectorAll(YT_SELECTORS.commentBlock);
    comments.forEach(processYTComment);
}

/**
 * Запуск спостерігача за DOM через централізований DomObserverService
 */
export function startObserver(): void {
    if (unregisterObserver) {
        unregisterObserver();
        unregisterObserver = null;
    }

    const selector = Array.isArray(YT_SELECTORS.commentBlock) 
        ? YT_SELECTORS.commentBlock.join(',') 
        : YT_SELECTORS.commentBlock;

    unregisterObserver = SYH_DOM_OBSERVER.register(selector, processYTComment);

    SYH_DOM_OBSERVER.start(document.body || document.documentElement);
}