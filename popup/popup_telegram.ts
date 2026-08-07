console.log("[SYH Debug] popup_telegram.ts top-level code executed");
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds, SHEET_REGISTRY } from '../modules/sheets';
import {
    countQuestionsInText,
    numberToEmoji,
    parseAndFilterOldList,
    collectTelegramSheetStateFromDOM,
    TelegramQuestionItem,
    TelegramSheetDOMState,
    parseAnsweredIds
} from '../modules/telegram_parser';
import { CommentService } from '../modules/comment_service';
import { batchRenderItems } from '../modules/render_utils';
import type { YTCollectedItem } from '../modules/types';
import { $, setTextContent, showElement, renderLogEmptyState, cancelBatchRender } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();
const activeBatchCancel: Record<string, () => void> = {};

export function clearFinalResult(sheetId: string): void {
    const frEl = $(`finalResultDiv__${sheetId}`);
    if (frEl) {
        frEl.innerHTML = '';
    }
    SheetStateService.saveSheetState(sheetId, {
        finalResultHtml: ''
    });
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

const syh_collected_by_sheet: Record<string, YTCollectedItem[]> = SHEET_REGISTRY.createSheetRecordMap(() => []);

export function getCollectedItemsForSheet(sheetId: string): YTCollectedItem[] {
    return syh_collected_by_sheet[sheetId] || [];
}

function createYTCollectedCard(item: YTCollectedItem, sheetId: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'yt-collected-item';
    if (item.type === 'question') card.classList.add('is-question');
    else card.classList.add('is-prayer');
    card.setAttribute('data-id', item.id);

    const typeLabel = item.type === 'question' ? '❓ Питання' : '🙏 Молитва';

    const header = document.createElement('div');
    header.className = 'yt-item-header';

    const author = document.createElement('span');
    author.className = 'yt-item-author';
    author.textContent = item.author || 'Анонім';

    const badge = document.createElement('span');
    badge.className = 'yt-item-type-badge';
    badge.textContent = typeLabel;

    const delBtn = document.createElement('button');
    delBtn.className = 'yt-item-del-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('title', 'Видалити');
    delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteYTCollectedItem(item.id, sheetId);
    });

    header.appendChild(author);
    header.appendChild(badge);
    header.appendChild(delBtn);

    const text = document.createElement('div');
    text.className = 'yt-item-text';
    text.textContent = item.text;

    card.appendChild(header);
    card.appendChild(text);
    return card;
}

export function loadYTCollected(sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;

    SYH_STORAGE.get([sheetKey], function(result: Record<string, any>) {
        const items: YTCollectedItem[] = result[sheetKey] || [];
        syh_collected_by_sheet[sheetId] = items;

        const list = $(`ytCollectedList__${sheetId}`);
        if (!list) return;

        const cancelKey = `ytCollected_${sheetId}`;
        if (activeBatchCancel[cancelKey]) {
            activeBatchCancel[cancelKey]();
            delete activeBatchCancel[cancelKey];
        }

        if (items.length === 0) {
            list.innerHTML = '';
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'yt-empty-msg';
            emptyDiv.textContent = 'Зібраних коментарів з YouTube немає';
            list.appendChild(emptyDiv);
        } else {
            activeBatchCancel[cancelKey] = batchRenderItems(
                list,
                items,
                (item: YTCollectedItem) => createYTCollectedCard(item, sheetId),
                { batchSize: 25, clearContainer: true }
            );
        }
        updateCombinedCounters(sheetId);
    });
}

export function deleteYTCollectedItem(commentId: string, sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;

    SYH_STORAGE.get([sheetKey, STORAGE_KEYS.YT_BUTTON_STATES, STORAGE_KEYS.STUDIO_BUTTON_STATE], function(result: Record<string, any>) {
        let sheetItems: YTCollectedItem[] = result[sheetKey] || [];
        sheetItems = sheetItems.filter(item => item.id !== commentId);

        const ytBtnStates = result[STORAGE_KEYS.YT_BUTTON_STATES] || {};
        const studioBtnStates = result[STORAGE_KEYS.STUDIO_BUTTON_STATE] || {};

        if (ytBtnStates[commentId]) {
            delete ytBtnStates[commentId];
        }
        if (studioBtnStates[commentId]) {
            delete studioBtnStates[commentId];
        }

        SYH_STORAGE.set({
            [sheetKey]: sheetItems,
            [STORAGE_KEYS.YT_BUTTON_STATES]: ytBtnStates,
            [STORAGE_KEYS.STUDIO_BUTTON_STATE]: studioBtnStates
        }, function() {
            loadYTCollected(sheetId);
            clearFinalResult(sheetId);
        });
    });
}

export function clearAllYTCollected(sheetId: string = 'vp_ss'): void {
    if (confirm("Очистити всі зібрані коментарі з YouTube для цього аркуша?")) {
        CommentService.clearAllCollectedForSheet(sheetId).then(() => {
            loadYTCollected(sheetId);
            clearFinalResult(sheetId);
        });
    }
}

export function updateRightColumnStats(sheetId: string = 'vp_ss'): { people: number; questions: number; prayers: number } {
    const items = syh_collected_by_sheet[sheetId] || [];
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

import { SheetStateService } from '../modules/sheet_state_service';

export function formatStatLabel(people: number, questions: number, prayers: number, prefix: string = ''): string {
    let str = `${prefix}${people} люд. - ${questions} пит.`;
    if (prayers > 0) str += ` | Молитви: ${prayers}`;
    return str;
}

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

function updateStep3Badges(sheetId: string, stats: any): void {
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

function updateStatsBarSection(sheetId: string, stats: any): void {
    // 1. New Left ("Нові з лівої")
    setTextContent(`countNewLeft__${sheetId}`, formatStatLabel(stats.leftPeople, stats.leftQuestions, stats.leftPrayers));

    // 2. New YT ("Нові з YouTube")
    setTextContent(`countNewYT__${sheetId}`, formatStatLabel(stats.rightPeople, stats.rightQuestions, stats.rightPrayers));

    // 3. Old list stats and Total stats
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const oldListText = oldListEl?.value || '';
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const answeredInput = answeredEl?.value || '';
    const answeredIds = parseAnsweredIds(answeredInput);
    
    const preservedData = parseAndFilterOldList(oldListText, answeredIds);
    const oldPeople = preservedData.questions.length;
    let oldQuestions = 0;
    preservedData.questions.forEach((q) => oldQuestions += countQuestionsInText(q.text));
    const oldPrayers = preservedData.prayers.length;

    let delPeople = 0;
    let delQuestions = 0;
    preservedData.deleted.forEach(d => {
        if (d.type === 'block') {
            delPeople++;
            delQuestions += d.count;
        } else if (d.type === 'sub') {
            delQuestions += d.count;
        }
    });

    setTextContent(`countOld__${sheetId}`, `${oldPeople} люд. - ${oldQuestions} пит.`);
    setTextContent(`countDel__${sheetId}`, `${delPeople} люд. - ${delQuestions} пит.`);

    const totalPeople = oldPeople + stats.leftPeople + stats.rightPeople;
    const totalQuestions = oldQuestions + stats.leftQuestions + stats.rightQuestions;
    const totalPrayers = oldPrayers + stats.leftPrayers + stats.rightPrayers;

    setTextContent(`countTotal__${sheetId}`, formatStatLabel(totalPeople, totalQuestions, totalPrayers));
}

export function updateCombinedCounters(sheetId: string = 'vp_ss'): void {
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;
    const text = newTgEl?.value || '';
    const ytItems = syh_collected_by_sheet[sheetId] || [];
    const stats = SheetStateService.computeSheetCounters(text, ytItems);

    updateStep3Badges(sheetId, stats);
    updateStatsBarSection(sheetId, stats);
}

export function updateNewInputStats(sheetId: string = 'vp_ss'): void {
    updateCombinedCounters(sheetId);
}

function createStatsRow(className: string, ...children: (HTMLElement | null)[]): HTMLElement {
    const row = document.createElement('div');
    row.className = `stats-row ${className}`.trim();
    children.forEach(child => {
        if (child) row.appendChild(child);
    });
    return row;
}

export function ensureStatsBarRows(sheetId: string = 'vp_ss'): void {
    const bar = $(`statsBar__${sheetId}`);
    if (!bar || !(bar instanceof HTMLElement) || bar.querySelector('.stats-row')) return;

    const oldItem = bar.querySelector('.stat-item.old') as HTMLElement | null;
    const delItem = bar.querySelector('.stat-item.del') as HTMLElement | null;
    const newLeftItem = bar.querySelector('.stat-item.new') as HTMLElement | null;
    const totalItem = bar.querySelector('.stat-item.total') as HTMLElement | null;

    let newYTItem = bar.querySelector('.stat-item.new-yt') as HTMLElement | null;
    if (!newYTItem) {
        newYTItem = document.createElement('div');
        newYTItem.className = 'stat-item new-yt';
        newYTItem.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
    }

    const row1 = createStatsRow('', oldItem, delItem);
    const row2 = createStatsRow('new-row', newLeftItem, newYTItem);
    const row3 = createStatsRow('total-row', totalItem);

    bar.innerHTML = '';
    bar.append(row1, row2, row3);
}

function ensureNewYTRow(statsBar: HTMLElement, sheetId: string): void {
    const newYTCountEl = $(`countNewYT__${sheetId}`);
    if (!newYTCountEl && statsBar.querySelector('.stats-row.new-row')) {
        const span = document.createElement('span');
        span.className = 'stat-item new-yt';
        span.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
        const newRow = statsBar.querySelector('.stats-row.new-row');
        if (newRow) newRow.appendChild(span);
    } else if (!newYTCountEl) {
        const row = document.createElement('div');
        row.className = 'stats-row new-row';
        const spanNew = document.createElement('span');
        spanNew.className = 'stat-item new';
        spanNew.innerHTML = `Нові з лівої: <b id="countNewLeft__${sheetId}">0</b>`;
        const spanYT = document.createElement('span');
        spanYT.className = 'stat-item new-yt';
        spanYT.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
        row.appendChild(spanNew);
        row.appendChild(spanYT);
        const totalRow = statsBar.querySelector('.total-row');
        if (totalRow) statsBar.insertBefore(row, totalRow);
    }
}

function updateTelegramStatsUI(sheetId: string, stats: any): void {
    setTextContent(`countOld__${sheetId}`, `${stats.oldPeople} люд. - ${stats.oldQuestionsTotal} пит.`);
    setTextContent(`countDel__${sheetId}`, `${stats.delPeople} люд. - ${stats.delQuestionsTotal} пит.`);

    let newLeftText = `${stats.newLeftPeople} люд. - ${stats.newLeftQuestionsTotal} пит.`;
    if (stats.newLeftPrayersTotal > 0) newLeftText += ` | Молитви: ${stats.newLeftPrayersTotal}`;
    setTextContent(`countNewLeft__${sheetId}`, newLeftText);

    const statsBar = $(`statsBar__${sheetId}`);
    if (statsBar) {
        ensureNewYTRow(statsBar, sheetId);
    }

    let newYTText = `${stats.newYTPeople} люд. - ${stats.newYTQuestionsTotal} пит.`;
    if (stats.newYTPrayersTotal > 0) newYTText += ` | Молитви: ${stats.newYTPrayersTotal}`;
    setTextContent(`countNewYT__${sheetId}`, newYTText);

    let totalText = `${stats.totalPeople} люд. - ${stats.totalQuestions} пит.`;
    if (stats.totalPrayers > 0) totalText += ` | Молитви: ${stats.totalPrayers}`;
    setTextContent(`countTotal__${sheetId}`, totalText);

    showElement(`statsBar__${sheetId}`);
    updateCombinedCounters(sheetId);
}

function renderTelegramFinalResult(outputDiv: HTMLElement | null, questions: any[], prayers: any[]): void {
    if (!outputDiv) return;

    if (activeBatchCancel['telegramFinalResult']) {
        activeBatchCancel['telegramFinalResult']();
        delete activeBatchCancel['telegramFinalResult'];
    }

    type FinalItem =
        | { kind: 'header'; text: string }
        | { kind: 'question'; item: any; index: number }
        | { kind: 'prayer'; item: any; index: number };

    const items: FinalItem[] = [];

    if (questions.length > 0) {
        items.push({ kind: 'header', text: "❓❓❓ВОПРОСЫ\n\n" });
        questions.forEach((q, idx) => items.push({ kind: 'question', item: q, index: idx }));
    }

    if (prayers.length > 0) {
        items.push({ kind: 'header', text: "🙏🙏🙏МОЛИТВЫ\n\n" });
        prayers.forEach((p, idx) => items.push({ kind: 'prayer', item: p, index: idx }));
    }

    if (items.length === 0) {
        outputDiv.innerHTML = '';
        return;
    }

    activeBatchCancel['telegramFinalResult'] = batchRenderItems(
        outputDiv,
        items,
        (entry) => {
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
        },
        { batchSize: 25, clearContainer: true }
    );
}

function formatDeletedLogMessage(d: any): string {
    let msg = `№${d.originalId} (${d.author}): `;
    if (d.type === 'block') {
        msg += `Видалено повністю (${d.count} пит.)`;
    } else {
        msg += 'Видалено підпункт';
    }
    return msg;
}

function renderTelegramDeletedLog(deletedLogDiv: HTMLElement | null, delLog: any[], sheetId: string): void {
    if (!deletedLogDiv) return;

    const cancelKey = `deletedLog_${sheetId}`;
    if (activeBatchCancel[cancelKey]) {
        activeBatchCancel[cancelKey]();
        delete activeBatchCancel[cancelKey];
    }

    if (delLog.length > 0) {
        activeBatchCancel[cancelKey] = batchRenderItems(
            deletedLogDiv,
            delLog,
            (d) => {
                const div = document.createElement('div');
                div.className = 'del-row';
                div.textContent = formatDeletedLogMessage(d);
                return div;
            },
            { batchSize: 25, clearContainer: true }
        );
        setTextContent(`deletedLogCount__${sheetId}`, `(${delLog.length})`);
    } else {
        deletedLogDiv.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'del-empty-msg';
        div.style.color = '#9ca3af';
        div.style.padding = '6px';
        div.style.fontStyle = 'italic';
        div.textContent = 'Видалень немає';
        deletedLogDiv.appendChild(div);
        setTextContent(`deletedLogCount__${sheetId}`, '(0)');
    }
    showElement(`deletedLogDetails__${sheetId}`);
}

function renderTelegramCleanedLog(cleanedLogDiv: HTMLElement | null, cleaningLog: any[], sheetId: string): void {
    if (!cleanedLogDiv) return;

    const cancelKey = `cleanedLog_${sheetId}`;
    if (activeBatchCancel[cancelKey]) {
        activeBatchCancel[cancelKey]();
        delete activeBatchCancel[cancelKey];
    }

    if (cleaningLog.length > 0) {
        cleanedLogDiv.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'clean-table';
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>До очищення</th><th>Після очищення</th><th>Що прибрано</th>';
        table.appendChild(headerRow);
        cleanedLogDiv.appendChild(table);

        activeBatchCancel[cancelKey] = batchRenderItems(
            table,
            cleaningLog,
            (entry) => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td'); td1.className = 'clean-before'; td1.textContent = entry.before || '';
                const td2 = document.createElement('td'); td2.className = 'clean-after'; td2.textContent = entry.after || '';
                const td3 = document.createElement('td'); td3.className = 'clean-diff'; td3.textContent = entry.removed || '';
                tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
                return tr;
            },
            { batchSize: 25, clearContainer: false }
        );
        setTextContent(`cleanedLogCount__${sheetId}`, `(${cleaningLog.length})`);
    } else {
        cleanedLogDiv.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'clean-empty-msg';
        div.style.color = '#9ca3af';
        div.style.padding = '6px';
        div.style.fontStyle = 'italic';
        div.textContent = 'Очищених фраз чи нікнеймів немає';
        cleanedLogDiv.appendChild(div);
        setTextContent(`cleanedLogCount__${sheetId}`, '(0)');
    }
    showElement(`cleanedLogDetails__${sheetId}`);
}

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

export function processTelegramData(sheetId: string = 'vp_ss'): void {
    ensureStatsBarRows(sheetId);
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;

    const oldListText = oldListEl?.value || '';
    const answeredInput = answeredEl?.value || '';
    const telegramText = newTgEl?.value || '';
    const ytItems = syh_collected_by_sheet[sheetId] || [];

    console.log(`[SYH Debug] processTelegramData for sheet: ${sheetId}`);
    console.log('[SYH Debug] Inputs:', {
        oldListTextLength: oldListText.length,
        answeredInput,
        telegramTextLength: telegramText.length,
        ytItemsCount: ytItems.length,
        ytItemsRaw: JSON.stringify(ytItems)
    });

    const result = SheetStateService.processSheetData({
        oldListText,
        answeredInput,
        telegramText,
        ytItems
    });

    const { questions, prayers, stats, deletedLog: delLog, cleaningLog } = result;

    console.log('[SYH Debug] Processed Result:', {
        questionsCount: questions.length,
        prayersCount: prayers.length,
        questions: JSON.stringify(questions),
        prayers: JSON.stringify(prayers),
        stats
    });

    const debugOutputDiv = $(`finalResultDiv__${sheetId}`);
    console.log('[SYH Debug] outputDiv found:', !!debugOutputDiv);

    // 1. Оновлення UI
    updateTelegramStatsUI(sheetId, stats);

    const outputDiv = $(`finalResultDiv__${sheetId}`);
    renderTelegramFinalResult(outputDiv, questions, prayers);

    const deletedLogDiv = $(`deletedLog__${sheetId}`);
    renderTelegramDeletedLog(deletedLogDiv, delLog, sheetId);

    const cleanedLogDiv = $(`cleanedLog__${sheetId}`);
    renderTelegramCleanedLog(cleanedLogDiv, cleaningLog, sheetId);

    // 2. Зчитування стану з DOM та 3. Збереження у сховище через SheetStateService
    const stateData = collectTelegramSheetStateFromDOM(sheetId, delLog.length, cleaningLog.length);
    saveTelegramSheetState(sheetId, stateData);
}

export function initPopupTelegramListeners() {
    SYH_STORAGE.onChanged(function(changes: Record<string, any>, areaName: string) {
        if (areaName === 'local') {
            SHEET_IDS.forEach(sId => {
                if (changes[`syh:popup:collected:${sId}`] || changes[`syh_collected__${sId}`]) {
                    loadYTCollected(sId);
                    clearFinalResult(sId);
                }
            });
        }
    });

    SHEET_IDS.forEach(sId => {
        const processBtn = $(`processTelegramBtn__${sId}`);
        if (processBtn) {
            processBtn.addEventListener('click', function() {
                try {
                    processTelegramData(sId);
                } catch (e: any) {
                    alert("❌ Помилка:\n" + e.message);
                    console.error(e);
                }
            });
        }

        const copyBtn = $(`copyResultBtn__${sId}`) as HTMLElement | null;
        if (copyBtn) {
            copyBtn.addEventListener('click', async function() {
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
    });
}
