/**
 * StreamYard Helper — фасад стану аркуша (Single Source of Truth для попапу).
 *
 * Рефакторинг (Fallow health): цей файл був God-класом на 307 рядків
 * (CC 52, cognitive 34), а `processSheetData` — функцією на 89 рядків.
 * Тепер він лише зв'язує спеціалізовані модулі:
 *   - `sheet_stats_calculator.ts` — чисті підрахунки (люди/питання/молитви);
 *   - `sheet_repository.ts`       — читання/запис/очищення у chrome.storage;
 *   - `sheet_processing.ts`       — конвеєр обробки даних аркуша.
 *
 * Реекспорти нижче навмисні: `popup_telegram.ts`, `popup_telegram_counters.ts`,
 * `popup_telegram_renderers.ts` та тести історично імпортують цей контракт
 * саме звідси. Поведінка збережена 1-в-1 (див. tests/sheet_state_api.test.js).
 */

import { SheetStatsCalculator } from './sheet_stats_calculator';
import { SheetRepository } from './sheet_repository';
import { processSheetData, type SheetProcessingInputs } from './sheet_processing';
import type { SheetCounterStats } from './sheet_stats_calculator';
import type { SheetStateData } from './sheet_repository';
import type { ProcessedSheetResult } from './sheet_processing';
import type { YTCollectedItem } from './types';

// --- Публічний фасад (історичний контракт імпортерів) ----------------------
export { SheetStatsCalculator, countUniquePeople } from './sheet_stats_calculator';
export { SheetRepository } from './sheet_repository';
export type { SheetCounterStats } from './sheet_stats_calculator';
export type { SheetStateData } from './sheet_repository';
export type { ProcessedSheetResult } from './sheet_processing';

export class SheetStateService {
    public static processSheetData(inputs: SheetProcessingInputs): ProcessedSheetResult {
        return processSheetData(inputs);
    }

    public static loadSheetState(sheetId: string): Promise<Partial<SheetStateData>> {
        return SheetRepository.loadSheetState(sheetId);
    }

    public static saveSheetState(sheetId: string, updates: Record<string, any>): Promise<void> {
        return SheetRepository.saveSheetState(sheetId, updates);
    }

    public static clearSheetState(sheetId: string): Promise<void> {
        return SheetRepository.clearSheetState(sheetId);
    }

    public static computeSheetCounters(telegramText: string, ytItems: YTCollectedItem[]): SheetCounterStats {
        return SheetStatsCalculator.computeSheetCounters(telegramText, ytItems);
    }
}
