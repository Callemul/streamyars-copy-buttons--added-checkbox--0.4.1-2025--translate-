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
// Поведінка лічильника (див.
// `audit_2026-08-10_KILO_sheet-log-counter-lost-on-restore.md`):
//   - «(N)» пишеться ЗАВЖДИ, бо `(0)` — теж валідний стан, який показує
//     живий рендер (`renderTelegramDeletedLog`);
//   - збережений лічильник вважається відсутнім, коли він `undefined`/`null`,
//     нечисловий (`NaN`) або `0` — у цих випадках рахуємо рядки з DOM;
//   - `Number()` збережено: рядок "7" стає числом 7;
//   - кількість рядків рахується з DOM уже ПІСЛЯ підстановки html;
//   - невидимий журнал очищає лічильник у порожній рядок.

import { $, setTextContent, setElementText } from './popup_dom_utils';
import { readSheetBinding } from './popup_sheet_keys';
import { getSheetStateBinding, type SheetStateBinding } from './popup_sheet_fields';
import type { StorageReadResult } from '../modules/storage/storage';

/** Обчислює кількість записів журналу, коли її не збережено явно. */
type LogCountResolver = (sheetId: string, html: string | undefined) => number;

interface LogRestoreConfig {
    /**
     * Прив'язки до сховища — з реєстру полів (`popup_sheet_fields.ts`, T8).
     * Кожна вже несе і канонічний ключ, і історичний префікс, тож легасі-форма
     * ключа журналу описана в проєкті рівно один раз.
     */
    visible: SheetStateBinding;
    html: SheetStateBinding;
    count: SheetStateBinding;
    open: SheetStateBinding;
    /** Префікси id елементів DOM. */
    targetHtmlId: string;
    targetCountId: string;
    targetDetailsId: string;
    /** Фолбек-підрахунок за DOM, коли лічильник не збережено. */
    countFromDom: LogCountResolver;
}

/**
 * Збережений лічильник як число, або `null`, якщо покладатися на нього не можна.
 *
 * `null` повертається для трьох випадків, які означають одне й те саме —
 * «значення не порахували»:
 *   - ключа немає у сховищі (`undefined`/`null`);
 *   - значення зіпсоване й `Number()` дає `NaN` (напр. рядок "abc");
 *   - значення дорівнює `0`, тоді як html журналу може містити реальні рядки
 *     (`collectTelegramSheetStateFromDOM` має дефолт `0` для обох лічильників).
 */
function readStoredCount(rawCount: unknown): number | null {
    if (rawCount === undefined || rawCount === null) return null;

    const parsed = Number(rawCount);
    if (!Number.isFinite(parsed) || parsed === 0) return null;

    return parsed;
}

/**
 * Кількість записів: валідне збережене значення має пріоритет,
 * інакше — підрахунок із щойно вставленого html.
 */
function resolveLogCount(
    sheetId: string,
    html: string | undefined,
    rawCount: any,
    countFromDom: LogCountResolver
): number {
    const stored = readStoredCount(rawCount);
    return stored ?? countFromDom(sheetId, html);
}

/** Пише «(N)» завжди: `0` — валідний стан, а не «лічильника немає». */
function applyLogCount(targetCountId: string, sheetId: string, count: number): void {
    setTextContent(`${targetCountId}${sheetId}`, `(${count})`);
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
function restoreVisibleLog(sheetId: string, result: StorageReadResult, config: LogRestoreConfig): void {
    const html = readSheetBinding(result, sheetId, config.html);
    if (html) setElementText(`${config.targetHtmlId}${sheetId}`, html);

    const rawCount = readSheetBinding(result, sheetId, config.count);
    applyLogCount(config.targetCountId, sheetId, resolveLogCount(sheetId, html, rawCount, config.countFromDom));

    const isOpen = Boolean(readSheetBinding(result, sheetId, config.open));
    applyLogDetailsState(config.targetDetailsId, sheetId, isOpen);
}

function restoreSheetLog(sheetId: string, result: StorageReadResult, config: LogRestoreConfig): void {
    const isVisible = Boolean(readSheetBinding(result, sheetId, config.visible));

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
    visible: getSheetStateBinding('deletedLogDetailsVisible'),
    html: getSheetStateBinding('deletedLogHtml'),
    count: getSheetStateBinding('deletedLogCount'),
    open: getSheetStateBinding('deletedLogDetailsOpen'),
    targetHtmlId: 'deletedLog__',
    targetCountId: 'deletedLogCount__',
    targetDetailsId: 'deletedLogDetails__',
    countFromDom: countDeletedRows
};

const CLEANED_LOG_CONFIG: LogRestoreConfig = {
    visible: getSheetStateBinding('cleanedLogDetailsVisible'),
    html: getSheetStateBinding('cleanedLogHtml'),
    count: getSheetStateBinding('cleanedLogCount'),
    open: getSheetStateBinding('cleanedLogDetailsOpen'),
    targetHtmlId: 'cleanedLog__',
    targetCountId: 'cleanedLogCount__',
    targetDetailsId: 'cleanedLogDetails__',
    countFromDom: countCleanedRows
};

export function restoreSheetDeletedLog(sheetId: string, result: StorageReadResult): void {
    restoreSheetLog(sheetId, result, DELETED_LOG_CONFIG);
}

export function restoreSheetCleanedLog(sheetId: string, result: StorageReadResult): void {
    restoreSheetLog(sheetId, result, CLEANED_LOG_CONFIG);
}
