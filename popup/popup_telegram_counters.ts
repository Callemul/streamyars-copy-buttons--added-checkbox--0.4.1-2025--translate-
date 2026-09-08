// popup/popup_telegram_counters.ts
//
// Усі лічильники вкладки Telegram: бейджі Кроку 3, панель статистики
// та похідні агрегати по зібраних з YouTube коментарях.
//
// Виділено з `popup/popup_telegram.ts` (hotspot №1 за Fallow). Залежить лише
// від стану (`popup_telegram_state`) і рендерерів (`popup_telegram_renderers`),
// тож напрямок імпортів однобічний і циклів не утворює.

import {
    countQuestionsInText,
    parseAndFilterOldList,
    parseAnsweredIds
} from '../modules/telegram_parser';
import type { TelegramQuestionItem } from '../modules/telegram_parser';
import { SheetStateService } from '../modules/sheet_state_service';
import type { SheetCounterStats, ProcessedSheetResult } from '../modules/sheet_state_service';
import { countDeletedEntries } from '../modules/sheet_processing';
import { $, setTextContent, showElement } from './popup_dom_utils';
import { getCollectedItemsForSheet } from './popup_telegram_state';
import { clearFinalResult } from './popup_telegram_renderers';

/** Стат-блок, який повертає `SheetStateService.processSheetData`. */
type ProcessedStats = ProcessedSheetResult['stats'];

export function formatStatLabel(people: number, questions: number, prayers: number, prefix: string = ''): string {
    let str = `${prefix}${people} люд. - ${questions} пит.`;
    if (prayers > 0) str += ` | Молитви: ${prayers}`;
    return str;
}

// ---------------------------------------------------------------------------
// Бейджі Кроку 3 (компактні підписи біля полів вводу)

function updateBadgeElement(el: HTMLElement | null, text: string, visible: boolean): void {
    if (!el) return;
    if (visible) {
        el.textContent = text;
        el.style.display = '';
    } else {
        el.textContent = '';
        el.style.display = 'none';
    }
}

function updateStep3Badges(sheetId: string, stats: SheetCounterStats): void {
    const leftEl = $(`tgTotalCountLeft__${sheetId}`);
    const leftStr = formatStatLabel(stats.leftPeople, stats.leftQuestions, stats.leftPrayers);
    updateBadgeElement(leftEl, leftStr, stats.leftPeople > 0);

    const rightEl = $(`tgTotalCountRight__${sheetId}`);
    const rightStr = formatStatLabel(stats.rightPeople, stats.rightQuestions, stats.rightPrayers);
    updateBadgeElement(rightEl, rightStr, stats.rightPeople > 0);

    const allEl = $(`tgTotalCountAll__${sheetId}`);
    const allStr = formatStatLabel(stats.totalPeople, stats.totalQuestions, stats.totalPrayers, 'Разом: ');
    updateBadgeElement(allEl, `(${allStr})`, stats.totalPeople > 0);
}

// ---------------------------------------------------------------------------
// Панель статистики (stats bar)

/** Агрегати «старого» списку з урахуванням уже відповіданих питань. */
function computeOldListTotals(sheetId: string) {
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const oldListText = oldListEl?.value || '';
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const answeredIds = parseAnsweredIds(answeredEl?.value || '');

    const preservedData = parseAndFilterOldList(oldListText, answeredIds);

    let oldQuestions = 0;
    preservedData.questions.forEach((q) => oldQuestions += countQuestionsInText(q.text));

    const { delPeople, delQuestionsTotal: delQuestions } = countDeletedEntries(preservedData.deleted);

    return {
        oldPeople: preservedData.questions.length,
        oldQuestions,
        oldPrayers: preservedData.prayers.length,
        delPeople,
        delQuestions
    };
}

function updateStatsBarSection(sheetId: string, stats: SheetCounterStats): void {
    // 1. New Left ("Нові з лівої")
    setTextContent(`countNewLeft__${sheetId}`, formatStatLabel(stats.leftPeople, stats.leftQuestions, stats.leftPrayers));

    // 2. New YT ("Нові з YouTube")
    setTextContent(`countNewYT__${sheetId}`, formatStatLabel(stats.rightPeople, stats.rightQuestions, stats.rightPrayers));

    // 3. Old list stats and Total stats
    const old = computeOldListTotals(sheetId);

    setTextContent(`countOld__${sheetId}`, `${old.oldPeople} люд. - ${old.oldQuestions} пит.`);
    setTextContent(`countDel__${sheetId}`, `${old.delPeople} люд. - ${old.delQuestions} пит.`);

    const totalPeople = old.oldPeople + stats.leftPeople + stats.rightPeople;
    const totalQuestions = old.oldQuestions + stats.leftQuestions + stats.rightQuestions;
    const totalPrayers = old.oldPrayers + stats.leftPrayers + stats.rightPrayers;

    setTextContent(`countTotal__${sheetId}`, formatStatLabel(totalPeople, totalQuestions, totalPrayers));
}

export function updateCombinedCounters(sheetId: string = 'vp_ss'): void {
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;
    const text = newTgEl?.value || '';
    const ytItems = getCollectedItemsForSheet(sheetId);
    const stats = SheetStateService.computeSheetCounters(text, ytItems);

    updateStep3Badges(sheetId, stats);
    updateStatsBarSection(sheetId, stats);
}

export function updateNewInputStats(sheetId: string = 'vp_ss'): void {
    updateCombinedCounters(sheetId);
}

export function updateOldInputStats(sheetId: string = 'vp_ss'): void {
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const text = oldListEl?.value || '';
    if (!text) {
        setTextContent(`oldTotalCount__${sheetId}`, '');
    } else {
        const parsed = parseAndFilterOldList(text, []);
        const qPeople = parsed.questions.length;
        let qQuestions = 0;
        parsed.questions.forEach((q: TelegramQuestionItem) => qQuestions += countQuestionsInText(q.text));
        const pCount = parsed.prayers.length;
        const countEl = $(`oldTotalCount__${sheetId}`);
        if (countEl) {
            countEl.textContent = `(${qPeople} люд. - ${qQuestions} пит. | Молитви: ${pCount})`;
            countEl.style.color = '#2b7de9';
            countEl.style.fontWeight = 'bold';
            countEl.style.fontSize = '12px';
        }
    }
    updateCombinedCounters(sheetId);
    clearFinalResult(sheetId);
}

/**
 * Агрегат по правій колонці (зібране з YouTube) для поточного аркуша.
 *
 * TODO(SSOT): Перевірено можливість делегування у `SheetStatsCalculator`:
 * 1) Метод `countYoutubeColumn` у `SheetStatsCalculator` є внутрішнім (не експортується).
 * 2) `SheetStatsCalculator` виконує дедуплікацію авторів (`countUniquePeople(ytItems)`),
 *    тоді як `updateRightColumnStats` за чинним контрактом (див. tests/popup_telegram_ui.test.js:24)
 *    повертає загальну кількість карток (`items.length`), а не кількість унікальних людей.
 * 3) Публічний метод `SheetStatsCalculator.computeSheetCounters` вимагає обов'язковий `telegramText`
 *    та повертає агреговані лічильники обох колонок (`SheetCounterStats`).
 * Для уніфікації знадобиться розширення API `SheetStatsCalculator` методом з підтримкою вибору
 * підрахунку (raw length vs unique people).
 */
export function updateRightColumnStats(sheetId: string = 'vp_ss'): { people: number; questions: number; prayers: number } {
    const items = getCollectedItemsForSheet(sheetId);
    let qCount = 0;
    let pCount = 0;
    items.forEach(item => {
        if (item.type === 'question') {
            qCount += countQuestionsInText(item.text);
        } else if (item.type === 'prayer') {
            pCount += 1;
        }
    });
    return { people: items.length, questions: qCount, prayers: pCount };
}

// ---------------------------------------------------------------------------
// Структура панелі статистики

function createStatsRow(className: string, ...children: (HTMLElement | null)[]): HTMLElement {
    const row = document.createElement('div');
    row.className = `stats-row ${className}`.trim();
    children.forEach(child => {
        if (child) row.appendChild(child);
    });
    return row;
}

function createNewYTItem(sheetId: string, tag: 'div' | 'span'): HTMLElement {
    const el = document.createElement(tag);
    el.className = 'stat-item new-yt';
    el.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
    return el;
}

export function ensureStatsBarRows(sheetId: string = 'vp_ss'): void {
    const bar = $(`statsBar__${sheetId}`);
    if (!bar || !(bar instanceof HTMLElement) || bar.querySelector('.stats-row')) return;

    const oldItem = bar.querySelector('.stat-item.old') as HTMLElement | null;
    const delItem = bar.querySelector('.stat-item.del') as HTMLElement | null;
    const newLeftItem = bar.querySelector('.stat-item.new') as HTMLElement | null;
    const totalItem = bar.querySelector('.stat-item.total') as HTMLElement | null;

    const newYTItem = (bar.querySelector('.stat-item.new-yt') as HTMLElement | null)
        || createNewYTItem(sheetId, 'div');

    const row1 = createStatsRow('', oldItem, delItem);
    const row2 = createStatsRow('new-row', newLeftItem, newYTItem);
    const row3 = createStatsRow('total-row', totalItem);

    bar.innerHTML = '';
    bar.append(row1, row2, row3);
}

/** Добудовує блок «Нові з YouTube», якщо розмітка прийшла зі старої версії. */
function ensureNewYTRow(statsBar: HTMLElement, sheetId: string): void {
    const newYTCountEl = $(`countNewYT__${sheetId}`);
    if (newYTCountEl) return;

    const existingNewRow = statsBar.querySelector('.stats-row.new-row');
    if (existingNewRow) {
        existingNewRow.appendChild(createNewYTItem(sheetId, 'span'));
        return;
    }

    const row = document.createElement('div');
    row.className = 'stats-row new-row';
    const spanNew = document.createElement('span');
    spanNew.className = 'stat-item new';
    spanNew.innerHTML = `Нові з лівої: <b id="countNewLeft__${sheetId}">0</b>`;
    row.appendChild(spanNew);
    row.appendChild(createNewYTItem(sheetId, 'span'));

    const totalRow = statsBar.querySelector('.total-row');
    if (totalRow) statsBar.insertBefore(row, totalRow);
}

/** Заповнює панель статистики результатом повної обробки аркуша. */
export function updateTelegramStatsUI(sheetId: string, stats: ProcessedStats): void {
    setTextContent(`countOld__${sheetId}`, `${stats.oldPeople} люд. - ${stats.oldQuestionsTotal} пит.`);
    setTextContent(`countDel__${sheetId}`, `${stats.delPeople} люд. - ${stats.delQuestionsTotal} пит.`);

    setTextContent(
        `countNewLeft__${sheetId}`,
        formatStatLabel(stats.newLeftPeople, stats.newLeftQuestionsTotal, stats.newLeftPrayersTotal)
    );

    const statsBar = $(`statsBar__${sheetId}`);
    if (statsBar) {
        ensureNewYTRow(statsBar, sheetId);
    }

    setTextContent(
        `countNewYT__${sheetId}`,
        formatStatLabel(stats.newYTPeople, stats.newYTQuestionsTotal, stats.newYTPrayersTotal)
    );

    setTextContent(
        `countTotal__${sheetId}`,
        formatStatLabel(stats.totalPeople, stats.totalQuestions, stats.totalPrayers)
    );

    showElement(`statsBar__${sheetId}`);
    updateCombinedCounters(sheetId);
}
