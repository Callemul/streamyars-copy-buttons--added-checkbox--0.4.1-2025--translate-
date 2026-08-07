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
// СКЛАД (після декомпозиції):
//   ./studio_video_metadata — читання метаданих відео + MutationObserver
//   ./studio_binding_state  — recycling-очистка, актуальність прив'язки, інтеграції
//
// ПОШУК ПО ОЗНАКАХ:
//   Бейдж категорії відео    → updateStudioBadgeUI()  у studio_ui.ts
//   Визначення категорії     → resolveCategoryForVideo() у studio_category_matcher.ts
//   Збереження відеокарти    → setStudioVideoSheetOverride() у studio_video_map.ts
//   Ключі коментаря          → generateCommentKey() у studio_comment_key.ts
//   Селектори DOM            → studio_selectors.ts

import { CommentService } from '../../modules/comment_service';
import { CommentInjector } from '../../modules/comment_injector';
import { StudioCommentAdapter, retroactiveUpdateVideoComments } from './studio_adapter';
import type { StudioEventCaches } from './state_resolvers';
import type { SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import type { CommentContext } from '../../modules/comment_platform_adapter';
import { setupVideoMetadataObserver } from './studio_video_metadata';
import {
    cleanupRecycledStudioElement,
    isStudioBindingUpToDate,
    applyStudioCommentIntegrations
} from './studio_binding_state';

export type { StudioEventCaches };
export type { SyhObservedElement } from './studio_video_metadata';

export {
    findMetadataElement,
    readVideoTitleText,
    readVideoLinkHref,
    hasVideoMetadata,
    isVideoMetadataComplete,
    resolveVideoThreadContainer,
    disconnectVideoMetadataObserver,
    setupVideoMetadataObserver
} from './studio_video_metadata';

export {
    isStudioElementBound,
    isRecycledStudioElement,
    cleanupRecycledStudioElement,
    isStudioBindingUpToDate,
    hasStudioActionButtons,
    applyStudioCommentIntegrations
} from './studio_binding_state';

export { retroactiveUpdateVideoComments };

export function saveStudioCollectedItem(
    sheetId: SheetId,
    item: { id: string; author: string; text: string; type: 'question' | 'prayer'; timestamp: number; videoId: string; videoTitle: string }
): Promise<void> {
    return CommentService.saveCollectedComment(sheetId, item);
}

interface VideoIdentity {
    videoId: string;
    videoTitle: string;
}

function readVideoIdentity(ctx: CommentContext): VideoIdentity {
    return { videoId: ctx.videoId || '', videoTitle: ctx.videoTitle || '' };
}

export function bindStudioCommentEvents(
    threadEl: HTMLElement,
    channelKey: ChannelKey,
    channelLabel: string,
    caches: StudioEventCaches,
    forceUpdate: boolean = false
): void {
    const adapter = new StudioCommentAdapter(channelKey, channelLabel, caches);

    const ctx = adapter.getCommentContext(threadEl);
    if (!ctx) return;

    const commentKey = ctx.id;
    const { videoId, videoTitle } = readVideoIdentity(ctx);

    cleanupRecycledStudioElement(threadEl, threadEl.dataset.syhCommentKey, commentKey);

    threadEl.dataset.syhVideoKey = videoId;
    threadEl.dataset.syhCommentKey = commentKey;

    setupVideoMetadataObserver(threadEl, videoTitle, videoId, () => {
        bindStudioCommentEvents(threadEl, channelKey, channelLabel, caches, true);
    });

    if (isStudioBindingUpToDate(threadEl, adapter, commentKey, forceUpdate)) return;

    const injector = new CommentInjector(adapter, caches);
    applyStudioCommentIntegrations(threadEl, commentKey, adapter, injector, caches);
}
