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

export type { StudioEventCaches };

export function saveStudioCollectedItem(
    sheetId: SheetId,
    item: { id: string; author: string; text: string; type: 'question' | 'prayer'; timestamp: number; videoId: string; videoTitle: string }
): Promise<void> {
    return CommentService.saveCollectedComment(sheetId, item);
}

export { retroactiveUpdateVideoComments };

function setupVideoMetadataObserver(
    threadEl: HTMLElement,
    videoTitle: string,
    videoId: string,
    onLoaded: () => void
): void {
    if ((threadEl as any)._syhVideoObserver) {
        (threadEl as any)._syhVideoObserver.disconnect();
        delete (threadEl as any)._syhVideoObserver;
    }

    if (videoTitle && videoId) {
        return;
    }

    const titleSelector = STUDIO_SELECTORS.VIDEO_TITLE.join(',');
    const linkSelector = STUDIO_SELECTORS.VIDEO_LINK.join(',');

    const parentContainer = threadEl.closest('.ytcp-comment-thread') || threadEl;

    const observer = new MutationObserver(() => {
        const titleEl = threadEl.querySelector<HTMLElement>(titleSelector) ||
                        parentContainer.querySelector<HTMLElement>(titleSelector);
        const linkEl = threadEl.querySelector<HTMLAnchorElement>(linkSelector) ||
                       parentContainer.querySelector<HTMLAnchorElement>(linkSelector);

        const currentTitle = (titleEl?.textContent || '').trim();
        const currentHref = linkEl?.getAttribute('href') || linkEl?.href || '';
        if (currentTitle || currentHref) {
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

    (threadEl as any)._syhVideoObserver = observer;
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
    const isAlreadyBound = threadEl.dataset.syhStudioEventsBound === 'true';
    const commentKeyChanged = isAlreadyBound && !!previousCommentKey && previousCommentKey !== commentKey;

    if (commentKeyChanged) {
        threadEl.removeAttribute('data-syh-studio-events-bound');
        threadEl.removeAttribute('data-syh-bound');
        delete (threadEl as any)._syhBound;
    }

    threadEl.dataset.syhVideoKey = videoKey;
    threadEl.dataset.syhCommentKey = commentKey;

    setupVideoMetadataObserver(threadEl, ctx.videoTitle || '', ctx.videoId || '', () => {
        bindStudioCommentEvents(threadEl, channelKey, channelLabel, caches, true);
    });

    const effectivelyBound = threadEl.dataset.syhStudioEventsBound === 'true';

    const isCheckboxOutOfSync = adapter.isCheckboxOutOfSync(threadEl, commentKey);
    const isButtonOutOfSync = adapter.isButtonOutOfSync(threadEl, commentKey);

    if (effectivelyBound && !forceUpdate && !isCheckboxOutOfSync && !isButtonOutOfSync) {
        return;
    }

    const buttons = adapter.getButtons(threadEl);
    if (!buttons.questionBtn && !buttons.prayerBtn && !buttons.copyBtn) {
        return;
    }

    adapter.restoreButtonState(threadEl, commentKey);
    adapter.restoreCheckboxState(threadEl, commentKey);

    injector.bindCommentEvents(threadEl, commentKey);
    adapter.bindStudioSpecificEvents(threadEl, commentKey, caches);

    threadEl.dataset.syhStudioEventsBound = 'true';
}
