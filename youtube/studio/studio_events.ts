// youtube/studio/studio_events.ts
//
// ПРИЗНАЧЕННЯ: Прив'язка подій та оновлення UI для кожного ytcp-comment у YouTube Studio.
//
// ТОЧКИ ВХОДУ:
//   bindStudioCommentEvents()  — головна функція, що обробляє один коментар через
//     спільний CommentInjector + StudioCommentAdapter.
//   retroactiveUpdateVideoComments() — масове оновлення Badge після зміни категорії вручну
//   saveStudioCollectedItem()        — збереження питань/молитов до storage за sheetId
//
// ПОШУК ПО ОЗНАКАХ:
//   Бейдж категорії відео    → updateStudioBadgeUI()  у studio_ui.ts
//   Визначення категорії     → resolveCategoryForVideo() у studio_category_matcher.ts
//   Збереження відеокарти    → setStudioVideoSheetOverride() у studio_video_map.ts
//   Ключі коментаря          → generateCommentKey() у studio_comment_key.ts
//   Селектори DOM            → studio_selectors.ts

import { CommentService } from '../../modules/comment_service';
import { CommentInjector } from '../../modules/comment_injector';
import { StudioCommentAdapter, type StudioEventCaches, retroactiveUpdateVideoComments } from './studio_adapter';
import type { SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import { STUDIO_SELECTORS } from './studio_selectors';
import { SYH_COMMENT_ASSISTANT } from '../../modules/comment_assistant';

export type { StudioEventCaches };

export function saveStudioCollectedItem(
    sheetId: SheetId,
    item: { id: string; author: string; text: string; type: 'question' | 'prayer'; timestamp: number; videoId: string; videoTitle: string }
): Promise<void> {
    return CommentService.saveCollectedComment(sheetId, item);
}

export { retroactiveUpdateVideoComments };

interface SyhObservedElement extends HTMLElement {
    _syhVideoObserver?: MutationObserver;
    _syhBound?: boolean;
}

function hasVideoMetadata(
    threadEl: HTMLElement,
    parentContainer: Element,
    titleSelector: string,
    linkSelector: string
): boolean {
    const titleEl = threadEl.querySelector<HTMLElement>(titleSelector) ||
                    parentContainer.querySelector<HTMLElement>(titleSelector);
    const linkEl = threadEl.querySelector<HTMLAnchorElement>(linkSelector) ||
                   parentContainer.querySelector<HTMLAnchorElement>(linkSelector);

    const currentTitle = (titleEl?.textContent || '').trim();
    const currentHref = linkEl?.getAttribute('href') || linkEl?.href || '';
    return Boolean(currentTitle || currentHref);
}

function setupVideoMetadataObserver(
    threadEl: HTMLElement,
    videoTitle: string,
    videoId: string,
    onLoaded: () => void
): void {
    const observedEl = threadEl as SyhObservedElement;
    if (observedEl._syhVideoObserver) {
        observedEl._syhVideoObserver.disconnect();
        delete observedEl._syhVideoObserver;
    }

    if (videoTitle && videoId) {
        return;
    }

    const titleSelector = STUDIO_SELECTORS.VIDEO_TITLE.join(',');
    const linkSelector = STUDIO_SELECTORS.VIDEO_LINK.join(',');

    const parentContainer = threadEl.closest('.ytcp-comment-thread') || threadEl;

    const observer = new MutationObserver(() => {
        if (hasVideoMetadata(threadEl, parentContainer, titleSelector, linkSelector)) {
            observer.disconnect();
            delete (threadEl as any)._syhVideoObserver;
            onLoaded();
        }
    });

    observer.observe(parentContainer, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href']
    });

    observedEl._syhVideoObserver = observer;
}

export function bindStudioCommentEvents(
    threadEl: HTMLElement,
    channelKey: ChannelKey,
    channelLabel: string,
    caches: StudioEventCaches,
    forceUpdate: boolean = false
): void {
    const adapter = new StudioCommentAdapter(channelKey, channelLabel, caches);
    const injector = new CommentInjector(adapter, caches);

    const ctx = adapter.getCommentContext(threadEl);
    if (!ctx) return;

    const commentKey = ctx.id;
    const videoKey = ctx.videoId || '';

    const previousCommentKey = threadEl.dataset.syhCommentKey;
    cleanupRecycledStudioElement(threadEl, previousCommentKey, commentKey);

    threadEl.dataset.syhVideoKey = videoKey;
    threadEl.dataset.syhCommentKey = commentKey;

    setupVideoMetadataObserver(threadEl, ctx.videoTitle || '', ctx.videoId || '', () => {
        bindStudioCommentEvents(threadEl, channelKey, channelLabel, caches, true);
    });

    if (isStudioBindingUpToDate(threadEl, adapter, commentKey, forceUpdate)) {
        return;
    }

    applyStudioCommentIntegrations(threadEl, commentKey, adapter, injector, caches);
}

/**
 * Очищає прив'язки та стани, якщо Polymer (iron-list) перевикористав DOM-елемент для іншого коментаря.
 */
function cleanupRecycledStudioElement(
    threadEl: HTMLElement,
    previousCommentKey: string | undefined,
    currentCommentKey: string
): void {
    const isAlreadyBound = threadEl.dataset.syhStudioEventsBound === 'true';
    const commentKeyChanged = isAlreadyBound && !!previousCommentKey && previousCommentKey !== currentCommentKey;

    if (commentKeyChanged) {
        threadEl.removeAttribute('data-syh-studio-events-bound');
        threadEl.removeAttribute('data-syh-bound');
        delete (threadEl as SyhObservedElement)._syhBound;
        const textNode = threadEl.querySelector('#content-text');
        if (textNode) {
            textNode.removeAttribute('data-syh-original-text');
        }
    }
}

/**
 * Перевіряє, чи є прив'язка подій та станів коментаря актуальною.
 */
function isStudioBindingUpToDate(
    threadEl: HTMLElement,
    adapter: StudioCommentAdapter,
    commentKey: string,
    forceUpdate: boolean
): boolean {
    const effectivelyBound = threadEl.dataset.syhStudioEventsBound === 'true';
    if (!effectivelyBound || forceUpdate) {
        return false;
    }
    const isCheckboxOutOfSync = adapter.isCheckboxOutOfSync(threadEl, commentKey);
    const isButtonOutOfSync = adapter.isButtonOutOfSync(threadEl, commentKey);
    return !isCheckboxOutOfSync && !isButtonOutOfSync;
}

/**
 * Відновлює стани кнопок/чекбоксів та підключає ін'єкційні обробники для коментаря Studio.
 */
function applyStudioCommentIntegrations(
    threadEl: HTMLElement,
    commentKey: string,
    adapter: StudioCommentAdapter,
    injector: CommentInjector,
    caches: StudioEventCaches
): void {
    const buttons = adapter.getButtons(threadEl);
    if (!buttons.questionBtn && !buttons.prayerBtn && !buttons.copyBtn) {
        return;
    }

    adapter.restoreButtonState(threadEl, commentKey);
    adapter.restoreCheckboxState(threadEl, commentKey);

    injector.bindCommentEvents(threadEl, commentKey);
    adapter.bindStudioSpecificEvents(threadEl, commentKey, caches);

    try {
        SYH_COMMENT_ASSISTANT.processComment(threadEl);
    } catch (err) {
        console.warn('[SYH Studio] Error highlighting comment triggers:', err);
    }

    threadEl.dataset.syhStudioEventsBound = 'true';
}
