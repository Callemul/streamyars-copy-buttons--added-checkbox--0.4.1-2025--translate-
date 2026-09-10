// options/studio_log.ts
//
// Рендер і текстовий експорт журналу ручних корекцій категорій YouTube Studio.
// Винесено з `OptionsController` (`loadStudioLog` / `copyStudioLog`), щоб
// контролер лишався тонким: він тепер лише читає storage і делегує показ.
//
// Поведінка збережена 1-в-1 (див. `tests/options_settings.test.js`), включно
// з навмисною розбіжністю між таблицею і буфером обміну: у таблиці порожня
// назва відео підміняється тире, а в текстовому звіті — ні.

import type { StudioOverrideLogEntry } from '../modules/core/types';

const EMPTY_CELL = '—';
const UNDETECTED_LABEL = 'Не визначено';
const CELL_PADDING = '6px 8px';

export const EMPTY_LOG_ROW_HTML =
    '<tr><td colspan="5" style="padding: 12px; text-align: center; color: var(--text-muted);">Записи у лозі відсутні</td></tr>';

/** Локалізований час запису або тире, якщо мітки часу немає. */
export function formatLogTimestamp(entry: StudioOverrideLogEntry): string {
    return entry.timestamp ? new Date(entry.timestamp).toLocaleString('uk-UA') : EMPTY_CELL;
}

/** Людська назва каналу з фолбеком на технічний ключ. */
export function formatLogChannel(entry: StudioOverrideLogEntry): string {
    return entry.channelLabel || entry.channelKey || EMPTY_CELL;
}

/** Автоматично визначений аркуш або явна позначка «не визначено». */
export function formatLogAutoSheet(entry: StudioOverrideLogEntry): string {
    return entry.autoDetectedSheet ? entry.autoDetectedSheet : UNDETECTED_LABEL;
}

/** Аркуш, обраний вручну. */
export function formatLogAssignedSheet(entry: StudioOverrideLogEntry): string {
    return entry.assignedSheet || EMPTY_CELL;
}

function createCell(text: string, bold = false): HTMLTableCellElement {
    const td = document.createElement('td');
    td.style.padding = CELL_PADDING;
    if (bold) td.style.fontWeight = 'bold';
    td.textContent = text;
    return td;
}

function createLogRow(entry: StudioOverrideLogEntry): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';

    tr.appendChild(createCell(formatLogTimestamp(entry)));
    tr.appendChild(createCell(formatLogChannel(entry)));
    tr.appendChild(createCell(entry.videoTitle || EMPTY_CELL));
    tr.appendChild(createCell(formatLogAutoSheet(entry)));
    tr.appendChild(createCell(formatLogAssignedSheet(entry), true));

    return tr;
}

/**
 * Перемальовує тіло таблиці журналу. Найновіші записи — зверху.
 * Порожній журнал показує рядок-заглушку на всю ширину.
 */
export function renderStudioLogRows(tbody: HTMLElement, logs: StudioOverrideLogEntry[]): void {
    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = EMPTY_LOG_ROW_HTML;
        return;
    }

    logs.slice().reverse().forEach(entry => {
        tbody.appendChild(createLogRow(entry));
    });
}

/**
 * Текстовий звіт для буфера обміну.
 *
 * КВІРК 1-в-1: `videoTitle` підставляється без фолбека, тож для запису без
 * назви в тексті буде літеральне `"undefined"`. Порядок записів — прямий
 * (на відміну від таблиці, де він зворотний).
 */
export function buildStudioLogReport(logs: StudioOverrideLogEntry[]): string {
    const lines = logs.map(entry => {
        const time = formatLogTimestamp(entry);
        const channel = formatLogChannel(entry);
        const auto = formatLogAutoSheet(entry);
        const assigned = formatLogAssignedSheet(entry);
        return `[${time}] Канал: ${channel} | Відео: "${entry.videoTitle}" | Авто: ${auto} => Ручний вибір: ${assigned}`;
    });

    return `=== YouTube Studio Manual Override Log (${logs.length} записів) ===\n\n` + lines.join('\n');
}
