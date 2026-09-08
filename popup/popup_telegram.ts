console.log("[SYH Debug] popup_telegram.ts top-level code executed");
// popup/popup_telegram.ts
//
// Оркестратор вкладки Telegram у попапі + стабільний публічний фасад.
//
// Рефакторинг (Fallow health): цей файл був хотспотом №1 усього проєкту
// (churn-score 51.2, 616 рядків, fan-in 6, `processTelegramData` — 56 LOC).
// Тепер він лише зв'язує спеціалізовані модулі:
//   - `popup_telegram_state.ts`      — спільний мутабельний стан (кеш + пакетні рендери);
//   - `popup_telegram_renderers.ts`  — фінальний результат і журнали;
//   - `popup_telegram_counters.ts`   — усі лічильники й панель статистики;
//   - `popup_telegram_collected.ts`  — список зібраного з YouTube.
//
// Реекспорти нижче навмисні: `popup_init.ts`, `popup_sheet_bindings.ts`,
// `popup_sheet_clear.ts`, `popup_sheet_field_restorer.ts` та
// `popup_sheet_state_restorer.ts` історично імпортують цей контракт саме звідси.
// Поведінка збережена 1-в-1 (див. tests/popup_telegram_ui.test.js).

import { SYH_STORAGE } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { collectTelegramSheetStateFromDOM } from './telegram_sheet_dom';
import type { TelegramSheetDOMState } from './telegram_sheet_dom';
import { SheetStateService } from '../modules/sheet_state_service';
import type { ProcessedSheetResult } from '../modules/sheet_state_service';
import type { YTCollectedItem } from '../modules/types';
import { CommentService } from '../modules/comment_service';
import { showBanner } from '../modules/utils_notify';
import { $ } from './popup_dom_utils';
import { getCollectedItemsForSheet } from './popup_telegram_state';
import {
    ensureStatsBarRows,
    updateTelegramStatsUI
} from './popup_telegram_counters';
import {
    clearFinalResult,
    renderTelegramFinalResult,
    renderTelegramDeletedLog,
    renderTelegramCleanedLog
} from './popup_telegram_renderers';
import { loadYTCollected } from './popup_telegram_collected';

const SHEET_IDS = getAllSheetIds();

// --- Публічний фасад (історичний контракт імпортерів) ----------------------
export { getCollectedItemsForSheet } from './popup_telegram_state';
export {
    formatStatLabel,
    ensureStatsBarRows,
    updateCombinedCounters,
    updateNewInputStats,
    updateOldInputStats,
    updateRightColumnStats
} from './popup_telegram_counters';
export { clearFinalResult } from './popup_telegram_renderers';
export {
    loadYTCollected,
    deleteYTCollectedItem,
    clearAllYTCollected
} from './popup_telegram_collected';
export type { TelegramSheetDOMState };
export { collectTelegramSheetStateFromDOM };

/**
 * 2. Storage Writer: Збереження стану шиту у сховище через Single Source of Truth (SheetStateService)
 */
export function saveTelegramSheetState(
    sheetId: string,
    stateData?: TelegramSheetDOMState
): void {
    const state = stateData || collectTelegramSheetStateFromDOM(sheetId);
    SheetStateService.saveSheetState(sheetId, state);
}

/** Зчитує сирі значення полів аркуша, які живлять обробку. */
function readSheetInputs(sheetId: string): {
    oldListText: string;
    answeredInput: string;
    telegramText: string;
    ytItems: YTCollectedItem[];
} {
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;

    return {
        oldListText: oldListEl?.value || '',
        answeredInput: answeredEl?.value || '',
        telegramText: newTgEl?.value || '',
        ytItems: getCollectedItemsForSheet(sheetId)
    };
}

/** Діагностичний вивід. Винесено окремо, щоб не роздувати основний потік. */
function logProcessDebug(
    sheetId: string,
    inputs: ReturnType<typeof readSheetInputs>,
    result: ProcessedSheetResult
): void {
    console.log(`[SYH Debug] processTelegramData for sheet: ${sheetId}`);
    console.log('[SYH Debug] Inputs:', {
        oldListTextLength: inputs.oldListText.length,
        answeredInput: inputs.answeredInput,
        telegramTextLength: inputs.telegramText.length,
        ytItemsCount: inputs.ytItems.length,
        ytItemsRaw: JSON.stringify(inputs.ytItems)
    });
    console.log('[SYH Debug] Processed Result:', {
        questionsCount: result.questions.length,
        prayersCount: result.prayers.length,
        questions: JSON.stringify(result.questions),
        prayers: JSON.stringify(result.prayers),
        stats: result.stats
    });
    console.log('[SYH Debug] outputDiv found:', !!$(`finalResultDiv__${sheetId}`));
}

/** Малює всі чотири області виводу аркуша. */
function renderProcessedSheet(sheetId: string, result: ProcessedSheetResult): void {
    updateTelegramStatsUI(sheetId, result.stats);
    renderTelegramFinalResult($(`finalResultDiv__${sheetId}`), result.questions, result.prayers);
    renderTelegramDeletedLog($(`deletedLog__${sheetId}`), result.deletedLog, sheetId);
    renderTelegramCleanedLog($(`cleanedLog__${sheetId}`), result.cleaningLog, sheetId);
}

export function processTelegramData(sheetId: string = 'vp_ss'): void {
    ensureStatsBarRows(sheetId);

    const inputs = readSheetInputs(sheetId);
    const result = SheetStateService.processSheetData(inputs);

    logProcessDebug(sheetId, inputs, result);

    // 1. Оновлення UI
    renderProcessedSheet(sheetId, result);

    // 2. Зчитування стану з DOM та 3. Збереження у сховище через SheetStateService
    const stateData = collectTelegramSheetStateFromDOM(sheetId, result.deletedLog.length, result.cleaningLog.length);
    saveTelegramSheetState(sheetId, stateData);
}

// ---------------------------------------------------------------------------
// Прив'язка слухачів попапу

/** Перемальовує аркуш, коли зібрані коментарі змінилися ззовні (з YouTube). */
function bindCollectedStorageSync(): void {
    SYH_STORAGE.onChanged(function (changes: Record<string, any>, areaName: string) {
        if (areaName === 'local') {
            SHEET_IDS.forEach(sId => {
                if (changes[`syh:popup:collected:${sId}`] || changes[`syh_collected__${sId}`]) {
                    loadYTCollected(sId);
                    clearFinalResult(sId);
                }
            });
        }
    });
}

function bindProcessButton(sId: string): void {
    const processBtn = $(`processTelegramBtn__${sId}`);
    if (!processBtn) return;

    processBtn.addEventListener('click', function () {
        try {
            processTelegramData(sId);
        } catch (e: any) {
            showBanner("❌ Помилка:\n" + e.message, 'error');
            console.error(e);
        }
    });
}

function bindCopyResultButton(sId: string): void {
    const copyBtn = $(`copyResultBtn__${sId}`) as HTMLElement | null;
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async function () {
        const outputDiv = $(`finalResultDiv__${sId}`);
        const plainText = outputDiv?.textContent || '';
        if (!plainText) return;

        const originalText = this.textContent || '';

        const success = await CommentService.copyToClipboard(plainText);
        if (success) {
            this.textContent = "Скопійовано! ✅";
        } else {
            this.textContent = "Помилка ❌";
        }
        setTimeout(() => { this.textContent = originalText; }, 2000);
    });
}

export function initPopupTelegramListeners() {
    bindCollectedStorageSync();

    SHEET_IDS.forEach(sId => {
        bindProcessButton(sId);
        bindCopyResultButton(sId);
    });
}
