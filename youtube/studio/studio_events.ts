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

export type { StudioEventCaches };

export function saveStudioCollectedItem(
    sheetId: SheetId,
    item: { id: string; author: string; text: string; type: 'question' | 'prayer'; timestamp: number; videoId: string; videoTitle: string }
): Promise<void> {
    return CommentService.saveCollectedComment(sheetId, item);
}

export { retroactiveUpdateVideoComments };

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

    threadEl.dataset.syhVideoKey = videoKey;
    threadEl.dataset.syhCommentKey = commentKey;

    const isAlreadyBound = threadEl.dataset.syhStudioEventsBound === 'true';
    const commentKeyChanged = isAlreadyBound && threadEl.dataset.syhCommentKey !== commentKey;

    if (isAlreadyBound && !forceUpdate && !commentKeyChanged) {
        return;
    }

    const buttons = adapter.getButtons(threadEl);
    if (!buttons.questionBtn && !buttons.prayerBtn && !buttons.copyBtn) {
        return;
    }

    adapter.restoreButtonState(threadEl, commentKey);
    adapter.restoreCheckboxState(threadEl, commentKey);

    if (commentKeyChanged && !forceUpdate) {
        threadEl.dataset.syhStudioEventsBound = 'true';
        return;
    }

    injector.bindCommentEvents(threadEl, commentKey);
    adapter.bindStudioSpecificEvents(threadEl, commentKey, caches);

    threadEl.dataset.syhStudioEventsBound = 'true';
}
