// popup/popup_telegram_renderers.ts
//
// Рендер результатів обробки аркуша: фінальний список питань/молитов та
// журнали видалень і очищення.
//
// Виділено з `popup/popup_telegram.ts` (hotspot №1 за Fallow). Модуль залежить
// лише від `popup_telegram_state.ts` і спільних утиліт, тож не утворює циклів.

import { numberToEmoji } from '../modules/telegram/telegram_parser';
import type { TelegramQuestionItem } from '../modules/telegram/telegram_parser';
import type { CleaningLogEntry, DeletedLogEntry } from '../modules/core/types';
import { batchRenderItems } from './render_utils';
import { SheetStateService } from '../modules/sheets/sheet_state_service';
import { $, setTextContent, showElement } from './popup_dom_utils';
import { cancelActiveBatch, registerActiveBatch } from './popup_telegram_state';
import { localize } from '../modules/dom/localize';

const FINAL_RESULT_BATCH_KEY = 'telegramFinalResult';

/** Скидає блок фінального результату і фіксує це у збереженому стані аркуша. */
export function clearFinalResult(sheetId: string): void {
    const frEl = $(`finalResultDiv__${sheetId}`);
    if (frEl) {
        frEl.innerHTML = '';
    }
    SheetStateService.saveSheetState(sheetId, {
        finalResultHtml: ''
    });
}

type FinalItem =
    | { kind: 'header'; text: string }
    | { kind: 'question'; item: TelegramQuestionItem; index: number }
    | { kind: 'prayer'; item: TelegramQuestionItem; index: number };

/** Складає плаский список «заголовок + елементи» для пакетного рендеру. */
function buildFinalItems(questions: TelegramQuestionItem[], prayers: TelegramQuestionItem[]): FinalItem[] {
    const items: FinalItem[] = [];

    if (questions.length > 0) {
        items.push({ kind: 'header', text: "❓❓❓ВОПРОСЫ\n\n" });
        questions.forEach((q, idx) => items.push({ kind: 'question', item: q, index: idx }));
    }

    if (prayers.length > 0) {
        items.push({ kind: 'header', text: "🙏🙏🙏МОЛИТВЫ\n\n" });
        prayers.forEach((p, idx) => items.push({ kind: 'prayer', item: p, index: idx }));
    }

    return items;
}

function renderFinalEntry(entry: FinalItem): HTMLElement {
    if (entry.kind === 'header') {
        const header = document.createElement('div');
        header.textContent = entry.text;
        return header;
    }

    const emojiNum = numberToEmoji(entry.index + 1);
    const textBlock = emojiNum + '\n' + entry.item.author + '\n' + entry.item.text + '\n\n';
    const block = document.createElement('div');
    block.className = entry.kind === 'question' ? 'q-block q-' + entry.item.source : 'q-block q-pray';
    block.textContent = textBlock;
    return block;
}

export function renderTelegramFinalResult(
    outputDiv: HTMLElement | null,
    questions: TelegramQuestionItem[],
    prayers: TelegramQuestionItem[]
): void {
    if (!outputDiv) return;

    cancelActiveBatch(FINAL_RESULT_BATCH_KEY);

    const items = buildFinalItems(questions, prayers);

    if (items.length === 0) {
        outputDiv.innerHTML = '';
        return;
    }

    registerActiveBatch(FINAL_RESULT_BATCH_KEY, batchRenderItems(
        outputDiv,
        items,
        renderFinalEntry,
        { batchSize: 25, clearContainer: true }
    ));
}

function formatDeletedLogMessage(d: DeletedLogEntry): string {
    let msg = `№${d.originalId} (${d.author}): `;
    if (d.type === 'block') {
        msg += `Видалено повністю (${d.count} пит.)`;
    } else {
        msg += 'Видалено підпункт';
    }
    return msg;
}

/** Порожній стан журналу з підписом і сірим курсивом. */
function renderEmptyLogMessage(container: HTMLElement, className: string, message: string): void {
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = className;
    div.style.color = '#9ca3af';
    div.style.padding = '6px';
    div.style.fontStyle = 'italic';
    div.textContent = message;
    container.appendChild(div);
}

export function renderTelegramDeletedLog(
    deletedLogDiv: HTMLElement | null,
    delLog: DeletedLogEntry[],
    sheetId: string
): void {
    if (!deletedLogDiv) return;

    const cancelKey = `deletedLog_${sheetId}`;
    cancelActiveBatch(cancelKey);

    if (delLog.length > 0) {
        registerActiveBatch(cancelKey, batchRenderItems(
            deletedLogDiv,
            delLog,
            (d) => {
                const div = document.createElement('div');
                div.className = 'del-row';
                div.textContent = formatDeletedLogMessage(d);
                return div;
            },
            { batchSize: 25, clearContainer: true }
        ));
        setTextContent(`deletedLogCount__${sheetId}`, `(${delLog.length})`);
    } else {
        renderEmptyLogMessage(deletedLogDiv, 'del-empty-msg', 'Видалень немає');
        setTextContent(`deletedLogCount__${sheetId}`, '(0)');
    }
    showElement(`deletedLogDetails__${sheetId}`);
}

/** Шапка таблиці «до / після / що прибрано». */
function createCleanTable(): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'clean-table';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th data-i18n="popup_before_cleaning">До очищення</th><th data-i18n="popup_after_cleaning">Після очищення</th><th data-i18n="popup_removed_text">Що прибрано</th>';
    localize(headerRow);
    table.appendChild(headerRow);
    return table;
}

function createCleanRow(entry: CleaningLogEntry): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.className = 'clean-before'; td1.textContent = entry.before || '';
    const td2 = document.createElement('td'); td2.className = 'clean-after'; td2.textContent = entry.after || '';
    const td3 = document.createElement('td'); td3.className = 'clean-diff'; td3.textContent = entry.removed || '';
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    return tr;
}

export function renderTelegramCleanedLog(
    cleanedLogDiv: HTMLElement | null,
    cleaningLog: CleaningLogEntry[],
    sheetId: string
): void {
    if (!cleanedLogDiv) return;

    const cancelKey = `cleanedLog_${sheetId}`;
    cancelActiveBatch(cancelKey);

    if (cleaningLog.length > 0) {
        cleanedLogDiv.innerHTML = '';
        const table = createCleanTable();
        cleanedLogDiv.appendChild(table);

        registerActiveBatch(cancelKey, batchRenderItems(
            table,
            cleaningLog,
            createCleanRow,
            { batchSize: 25, clearContainer: false }
        ));
        setTextContent(`cleanedLogCount__${sheetId}`, `(${cleaningLog.length})`);
    } else {
        renderEmptyLogMessage(cleanedLogDiv, 'clean-empty-msg', 'Очищених фраз чи нікнеймів немає');
        setTextContent(`cleanedLogCount__${sheetId}`, '(0)');
    }
    showElement(`cleanedLogDetails__${sheetId}`);
}
