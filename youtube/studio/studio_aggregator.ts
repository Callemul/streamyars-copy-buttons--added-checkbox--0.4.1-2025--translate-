// youtube/studio/studio_aggregator.ts
//
// Чиста (без побічних ефектів) агрегація зібраних коментарів і статистики
// заголовків із chrome.storage для набору sheetId.
//
// Винесена як ЄДИНЕ ДЖЕРЕЛО ІСТИНИ (Single Source of Truth), щоб дві копії
// логіки — у `StudioStorageController.loadStorageData` (studio_storage_handler.ts)
// та у `loadStorageData` (studio_init.ts) — більше не дублювалися. Сама логіка
// збережена 1-в-1 (у т.ч. звернення до ключів `syh:popup:collected:${sId}`),
// тому характеризаційні тести лишаються зеленими.

import type { StorageReadResult } from '../../modules/storage';
import { getSheetCollectedStorageKey } from '../../modules/storage_keys';
import { getAllSheetIds } from '../../modules/sheets';
import { countQuestionsInText } from '../../modules/telegram/telegram_parser';
import type { CommentPayload } from '../../modules/comments/comment_service';
import type { SheetHeaderStats } from './studio_header_counters';

export interface CollectedAggregation {
    collectedItems: CommentPayload[];
    sheetStatsMap: Record<string, SheetHeaderStats>;
}

/**
 * Агрегує зібрані коментарі та рахує питання/молитви для кожного sheetId.
 *
 * @param res           сирий результат `SYH_STORAGE.getAsync(...)`
 * @param sheetIds      перелік sheetId (за замовчуванням — усі відомі листи)
 */
export function buildCollectedAggregation(
    res: StorageReadResult,
    sheetIds: string[] = getAllSheetIds()
): CollectedAggregation {
    const collected: CommentPayload[] = [];
    const sheetStatsMap: Record<string, SheetHeaderStats> = {};

    sheetIds.forEach((sId) => {
        const list = res[getSheetCollectedStorageKey(sId)];
        let questions = 0;
        let prayers = 0;
        if (Array.isArray(list)) {
            collected.push(...list);
            list.forEach((item: any) => {
                if (item.type === 'question') {
                    questions += countQuestionsInText(item.text || '');
                } else if (item.type === 'prayer') {
                    prayers += 1;
                }
            });
        }
        sheetStatsMap[sId] = { questions, prayers };
    });

    return { collectedItems: collected, sheetStatsMap };
}
