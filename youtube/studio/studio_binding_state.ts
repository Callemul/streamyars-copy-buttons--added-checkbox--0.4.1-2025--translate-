// youtube/studio/studio_binding_state.ts
//
// ПРИЗНАЧЕННЯ: Стан прив'язки коментаря Studio до наших обробників —
// виявлення перевикористаних Polymer-ом DOM-елементів (iron-list recycling),
// перевірка актуальності прив'язки та підключення інтеграцій.
//
// Виділено з youtube/studio/studio_events.ts (CRAP 30–90 на функцію).

import { CommentInjector } from '../../modules/comment_injector';
import type { PlatformButtons } from '../../modules/comment_platform_adapter';
import type { StudioCommentAdapter } from './studio_adapter';
import type { StudioEventCaches } from './state_resolvers';
import { SYH_COMMENT_ASSISTANT } from '../../modules/comment_assistant';
import type { SyhObservedElement } from './studio_video_metadata';

export const STUDIO_BOUND_FLAG = 'true';
export const STUDIO_TEXT_NODE_SELECTOR = '#content-text';

export function isStudioElementBound(threadEl: HTMLElement): boolean {
    return threadEl.dataset.syhStudioEventsBound === STUDIO_BOUND_FLAG;
}

/**
 * Polymer (iron-list) перевикористав DOM-вузол під ІНШИЙ коментар,
 * тому старі прив'язки та збережений текст більше не валідні.
 */
export function isRecycledStudioElement(
    threadEl: HTMLElement,
    previousCommentKey: string | undefined,
    currentCommentKey: string
): boolean {
    if (!isStudioElementBound(threadEl)) return false;
    if (!previousCommentKey) return false;
    return previousCommentKey !== currentCommentKey;
}

export function cleanupRecycledStudioElement(
    threadEl: HTMLElement,
    previousCommentKey: string | undefined,
    currentCommentKey: string
): void {
    if (!isRecycledStudioElement(threadEl, previousCommentKey, currentCommentKey)) return;

    CommentInjector.dispose(threadEl, 'data-syh-studio-events-bound');
    threadEl.removeAttribute('data-syh-bound');
    delete (threadEl as SyhObservedElement)._syhBound;

    const textNode = threadEl.querySelector(STUDIO_TEXT_NODE_SELECTOR);
    if (textNode) textNode.removeAttribute('data-syh-original-text');
}

/** Прив'язка актуальна: елемент помічений і стани кнопки/чекбокса синхронні. */
export function isStudioBindingUpToDate(
    threadEl: HTMLElement,
    adapter: StudioCommentAdapter,
    commentKey: string,
    forceUpdate: boolean
): boolean {
    if (forceUpdate) return false;
    if (!isStudioElementBound(threadEl)) return false;
    return !adapter.isCheckboxOutOfSync(threadEl, commentKey)
        && !adapter.isButtonOutOfSync(threadEl, commentKey);
}

export function hasStudioActionButtons(buttons: PlatformButtons): boolean {
    return Boolean(buttons.questionBtn || buttons.prayerBtn || buttons.copyBtn);
}

function runCommentAssistant(threadEl: HTMLElement): void {
    try {
        SYH_COMMENT_ASSISTANT.processComment(threadEl);
    } catch (err) {
        console.warn('[SYH Studio] Error highlighting comment triggers:', err);
    }
}

/** Відновлює стани та підключає ін'єкційні обробники для коментаря Studio. */
export function applyStudioCommentIntegrations(
    threadEl: HTMLElement,
    commentKey: string,
    adapter: StudioCommentAdapter,
    injector: CommentInjector,
    caches: StudioEventCaches
): void {
    const buttons = adapter.getButtons(threadEl);
    if (!hasStudioActionButtons(buttons)) return;

    adapter.restoreButtonState(threadEl, commentKey);
    adapter.restoreCheckboxState(threadEl, commentKey);

    injector.bindCommentEvents(threadEl, commentKey);
    adapter.bindStudioSpecificEvents(threadEl, commentKey, caches);

    runCommentAssistant(threadEl);

    threadEl.dataset.syhStudioEventsBound = STUDIO_BOUND_FLAG;
}
