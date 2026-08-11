/**
 * StreamYard Helper — ретроактивне оновлення категорії відео.
 *
 * Винесено з `youtube/studio/studio_adapter.ts` (`retroactiveUpdateVideoComments`).
 * Раніше функція створювала `new StudioCommentAdapter(...)` всередині циклу,
 * щоб прочитати контекст — звідси циклічний імпорт модуля. Тепер використовує
 * чистий `getStudioCommentContext`, тому клас більше не імпортується.
 *
 * Поведінка збережена 1-в-1 (див. `tests/studio_adapter.test.js`).
 */

import { injectStudioCommentUI, updateStudioBadgeUI, updateStudioButtonsUI } from './studio_ui';
import { resolveCategoryForVideo } from './studio_category_matcher';
import { generateCommentKey } from './studio_comment_key';
import type { ChannelKey } from '../../modules/channel_config';
import type { StudioEventCaches } from './studio_state_helpers';
import { getStudioCommentContext } from './studio_adapter_context';

/**
 * Для кожної нитки `ytcp-comment`, що належить `targetVideoKey`: перераховує
 * категорію відео і оновлює бейдж/кнопки відповідно до стану кнопок.
 */
export function retroactiveUpdateVideoComments(
    targetVideoKey: string,
    channelKey: ChannelKey,
    caches: StudioEventCaches
): void {
    const threads = document.querySelectorAll<HTMLElement>('ytcp-comment');
    threads.forEach((threadEl) => {
        const ctx = getStudioCommentContext(threadEl);
        if (!ctx || ctx.videoId !== targetVideoKey) return;

        const ui = injectStudioCommentUI(threadEl);
        if (!ui) return;

        const categoryResult = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            channelKey,
            caches.videoSheetMap
        );
        const commentKey = threadEl.dataset.syhCommentKey || generateCommentKey(ctx.videoTitle || '', ctx.author, ctx.text);

        if (ui.badgeEl) {
            updateStudioBadgeUI(ui.badgeEl, categoryResult.sheetId, categoryResult.source);
        }
        if (ui.questionBtn && ui.prayerBtn) {
            updateStudioButtonsUI(ui, categoryResult.sheetId, caches.buttonStates[commentKey] || null);
        }
    });
}
