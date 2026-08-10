// popup/popup_sheet_log_restorer.ts
//
// Відновлення блоків-журналів аркуша (`🗑 видалені` та `🧹 очищені`).
//
// Виділено з `popup_sheet_state_restorer.ts`: функція `restoreSheetLog` була
// єдиною продакшн-знахідкою складності у звіті Fallow 3.14
// (cyclomatic 10 / cognitive 16 при порозі 15). Уся складність походила від
// одного глибоко вкладеного `if (isVisible) { ... }`, всередині якого сиділи
// ще чотири умови. Тепер гілка «видимий» — окрема лінійна функція, а робота з
// `<details>` та лічильником винесена у власні кроки.
//
// Поведінка збережена 1-в-1, включно з квірками:
//   - `count === 0` (і `NaN`) НЕ перезаписує текст лічильника;
//   - `rawCount` приводиться через `Number()`, тож рядок "7" стає числом;
//   - кількість рядків рахується з DOM уже ПІСЛЯ підстановки html;
//   - невидимий журнал очищає лічильник у порожній рядок.

import { POPUP_SHEET_KEYS } from '../modules/storage';
import { $, setTextContent, setElementText } from './popup_dom_utils';
import { readSheetValue, type SheetKeyBuilder } from './popup_sheet_keys';

/** Обчислює кількість записів журналу, коли її не збережено явно. */
type LogCountResolver = (sheetId: string, html: string | undefined) => number;

interface LogRestoreConfig {
    /** Канонічні ключі storage. */
    visibleKey: SheetKeyBuilder;
    htmlKey: SheetKeyBuilder;
    countKey: SheetKeyBuilder;
    openKey: SheetKeyBuilder;
    /** Історичні префікси ключів (`tg_...__<sheetId>`). */
    legacyVisibleKey: string;
    legacyHtmlKey: string;
    legacyCountKey: string;
    legacyOpenKey: string;
    /** Префікси id елементів DOM. */
    targetHtmlId: string;
    targetCountId: string;
    targetDetailsId: string;
    /** Фолбек-підрахунок за DOM, коли лічильник не збережено. */
    countFromDom: LogCountResolver;
}

/**
 * Кількість записів: збережене значення має пріоритет над підрахунком із DOM.
 * `Number()` збережено 1-в-1 — рядок "7" дає 7, сміття дає `NaN`.
 */
function resolveLogCount(
    sheetId: string,
    html: string | undefined,
    rawCount: any,
    countFromDom: LogCountResolver
): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);
    }
    return countFromDom(sheetId, html);
}

/** Пише «(N)» лише для додатної кількості (`NaN` та 0 лишають текст як є). */
function applyLogCount(targetCountId: string, sheetId: string, count: number): void {
    if (count > 0) {
        setTextContent(`${targetCountId}${sheetId}`, `(${count})`);
    }
}

/** Синхронізує розкриття `<details>` і завжди повертає блоку видимість. */
function applyLogDetailsState(targetDetailsId: string, sheetId: string, isOpen: boolean): void {
    const detailsEl = $(`${targetDetailsId}${sheetId}`) as HTMLDetailsElement | null;
    if (!detailsEl) return;

    if (isOpen) detailsEl.setAttribute('open', 'open');
    else detailsEl.removeAttribute('open');
    detailsEl.style.display = '';
}

/** Гілка «журнал видимий»: html → лічильник → стан `<details>`. */
function restoreVisibleLog(sheetId: string, result: Record<string, any>, config: LogRestoreConfig): void {
    const html = readSheetValue(result, sheetId, config.htmlKey, config.legacyHtmlKey);
    if (html) setElementText(`${config.targetHtmlId}${sheetId}`, html);

    const rawCount = readSheetValue(result, sheetId, config.countKey, config.legacyCountKey);
    applyLogCount(config.targetCountId, sheetId, resolveLogCount(sheetId, html, rawCount, config.countFromDom));

    const isOpen = Boolean(readSheetValue(result, sheetId, config.openKey, config.legacyOpenKey));
    applyLogDetailsState(config.targetDetailsId, sheetId, isOpen);
}

function restoreSheetLog(sheetId: string, result: Record<string, any>, config: LogRestoreConfig): void {
    const isVisible = Boolean(readSheetValue(result, sheetId, config.visibleKey, config.legacyVisibleKey));

    if (isVisible) {
        restoreVisibleLog(sheetId, result, config);
    } else {
        setTextContent(`${config.targetCountId}${sheetId}`, '');
    }
}

/** Видалені записи — по одному `.del-row` на запис. */
function countDeletedRows(sheetId: string, delHtml: string | undefined): number {
    if (!delHtml) return 0;
    return $(`deletedLog__${sheetId}`)?.querySelectorAll('.del-row').length || 0;
}

/** Очищені записи — рядки `.clean-table` без рядка заголовка. */
function countCleanedRows(sheetId: string, cleanHtml: string | undefined): number {
    if (!cleanHtml) return 0;
    const rows = $(`cleanedLog__${sheetId}`)?.querySelectorAll('.clean-table tr').length;
    return rows ? Math.max(0, rows - 1) : 0;
}

const DELETED_LOG_CONFIG: LogRestoreConfig = {
    visibleKey: POPUP_SHEET_KEYS.deletedLogDetailsVisible,
    htmlKey: POPUP_SHEET_KEYS.deletedLogHtml,
    countKey: POPUP_SHEET_KEYS.deletedLogCount,
    openKey: POPUP_SHEET_KEYS.deletedLogDetailsOpen,
    legacyVisibleKey: 'tg_deletedLogDetailsVisible__',
    legacyHtmlKey: 'tg_deletedLogHtml__',
    legacyCountKey: 'tg_deletedLogCount__',
    legacyOpenKey: 'tg_deletedLogDetailsOpen__',
    targetHtmlId: 'deletedLog__',
    targetCountId: 'deletedLogCount__',
    targetDetailsId: 'deletedLogDetails__',
    countFromDom: countDeletedRows
};

const CLEANED_LOG_CONFIG: LogRestoreConfig = {
    visibleKey: POPUP_SHEET_KEYS.cleanedLogDetailsVisible,
    htmlKey: POPUP_SHEET_KEYS.cleanedLogHtml,
    countKey: POPUP_SHEET_KEYS.cleanedLogCount,
    openKey: POPUP_SHEET_KEYS.cleanedLogDetailsOpen,
    legacyVisibleKey: 'tg_cleanedLogDetailsVisible__',
    legacyHtmlKey: 'tg_cleanedLogHtml__',
    legacyCountKey: 'tg_cleanedLogCount__',
    legacyOpenKey: 'tg_cleanedLogDetailsOpen__',
    targetHtmlId: 'cleanedLog__',
    targetCountId: 'cleanedLogCount__',
    targetDetailsId: 'cleanedLogDetails__',
    countFromDom: countCleanedRows
};

export function restoreSheetDeletedLog(sheetId: string, result: Record<string, any>): void {
    restoreSheetLog(sheetId, result, DELETED_LOG_CONFIG);
}

export function restoreSheetCleanedLog(sheetId: string, result: Record<string, any>): void {
    restoreSheetLog(sheetId, result, CLEANED_LOG_CONFIG);
}
