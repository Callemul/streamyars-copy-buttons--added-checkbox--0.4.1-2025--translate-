// popup/popup_sheet_state_restorer.ts
//
// Оркестратор відновлення стану одного аркуша popup.
//
// Файл був CRAP-хотспотом звіту Fallow 3.14: `restoreSheetLog`
// (cyclomatic 10 / cognitive 16) — єдина продакшн-знахідка складності у
// проєкті. Реалізацію розділено за відповідальностями:
//   - `popup_sheet_keys.ts`          — читання значення з фолбеком на легасі-ключ;
//   - `popup_sheet_field_restorer.ts` — прості поля, статистика, роздільник;
//   - `popup_sheet_log_restorer.ts`   — журнали «видалені» та «очищені».
//
// Тут лишився тільки порядок кроків — він значущий: `loadYTCollected`
// виконується останнім і працює зі storage, а не з переданим `result`.

import { loadYTCollected } from './popup_telegram';
import {
    restoreSheetOldList,
    restoreSheetAnswered,
    restoreSheetNewTelegram,
    restoreSheetFinalHtml,
    restoreSheetStats,
    restoreSheetDividerPos
} from './popup_sheet_field_restorer';
import { restoreSheetDeletedLog, restoreSheetCleanedLog } from './popup_sheet_log_restorer';

export function restoreSingleSheetState(sId: string, result: Record<string, any>): void {
    restoreSheetOldList(sId, result);
    restoreSheetAnswered(sId, result);
    restoreSheetNewTelegram(sId, result);
    restoreSheetFinalHtml(sId, result);
    restoreSheetStats(sId, result);
    restoreSheetDeletedLog(sId, result);
    restoreSheetCleanedLog(sId, result);
    restoreSheetDividerPos(sId, result);
    loadYTCollected(sId);
}
