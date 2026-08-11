// youtube/studio/studio_category_resolution.ts
//
// Вузький модуль категорійної резолюції адаптера Studio.
//
// У `studio_adapter.ts` виклик `resolveCategoryForVideo(title, videoId, channelKey,
// videoSheetMap)` повторювався тричі (у `getSheetId`, `beforeAction`, `afterAction`)
// із однаковими аргументами `channelKey`/`videoSheetMap`. Цей модуль фіксує
// єдиний шлях резолюції, щоб не розходилися копії виклику.
//
// Поведінка збережена 1-в-1 (див. tests/studio_adapter.test.js).

import { resolveCategoryForVideo } from './studio_category_matcher';
import type { ChannelKey } from '../../modules/channel_config';
import type { StudioEventCaches } from './studio_state_helpers';

/** Результат резолюції категорії відео (той самий, що повертає `resolveCategoryForVideo`). */
export type ResolvedVideoCategory = ReturnType<typeof resolveCategoryForVideo>;

/**
 * Єдина точка резолюції sheetId/категорії для відео в адаптері Studio.
 *
 * @param videoTitle  заголовок відео (порожній рядок, якщо невідомий)
 * @param videoId     ідентифікатор відео
 * @param channelKey  ключ каналу (для ручних оверрайдів)
 * @param caches      кеші адаптера, звідки береться `videoSheetMap`
 */
export function resolveStudioVideoCategory(
    videoTitle: string | undefined,
    videoId: string,
    channelKey: ChannelKey,
    caches: StudioEventCaches
): ResolvedVideoCategory {
    return resolveCategoryForVideo(videoTitle || '', videoId, channelKey, caches.videoSheetMap);
}
