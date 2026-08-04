import { SYH_STORAGE } from '../modules/storage';
import { getAllSheetIds, SHEET_REGISTRY } from '../modules/sheets';
import {
    countQuestionsInText,
    numberToEmoji,
    parseAndFilterOldList,
    TelegramQuestionItem
} from '../modules/telegram_parser';
import { CommentService } from '../modules/comment_service';
import type { YTCollectedItem } from '../modules/types';

const SHEET_IDS = getAllSheetIds();

function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function setTextContent(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showElement(id: string): void {
    const el = document.getElementById(id);
    if (el && el instanceof HTMLElement) el.style.display = '';
}

export function updateOldInputStats(sheetId: string = 'vp_ss'): void {
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const text = oldListEl?.value || '';
    if (!text) { setTextContent(`oldTotalCount__${sheetId}`, ''); return; }
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

const syh_collected_by_sheet: Record<string, YTCollectedItem[]> = SHEET_REGISTRY.createSheetRecordMap(() => []);

export function getCollectedItemsForSheet(sheetId: string): YTCollectedItem[] {
    return syh_collected_by_sheet[sheetId] || [];
}

export function loadYTCollected(sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;

    SYH_STORAGE.get([sheetKey], function(result: Record<string, any>) {
        const items: YTCollectedItem[] = result[sheetKey] || [];
        syh_collected_by_sheet[sheetId] = items;

        const list = $(`ytCollectedList__${sheetId}`);
        if (!list) return;
        list.innerHTML = '';

        if (items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'yt-empty-msg';
            emptyDiv.textContent = 'Зібраних коментарів з YouTube немає';
            list.appendChild(emptyDiv);
        } else {
            items.forEach((item: YTCollectedItem) => {
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
                list.appendChild(card);
            });
        }
        updateCombinedCounters(sheetId);
    });
}

export function deleteYTCollectedItem(commentId: string, sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;

    SYH_STORAGE.get([sheetKey], function(result: Record<string, any>) {
        let sheetItems: YTCollectedItem[] = result[sheetKey] || [];
        sheetItems = sheetItems.filter(item => item.id !== commentId);

        SYH_STORAGE.set({
            [sheetKey]: sheetItems
        }, function() {
            loadYTCollected(sheetId);
        });
    });
}

export function clearAllYTCollected(sheetId: string = 'vp_ss'): void {
    if (confirm("Очистити всі зібрані коментарі з YouTube для цього аркуша?")) {
        const sheetKey = `syh:popup:collected:${sheetId}`;
        SYH_STORAGE.set({ [sheetKey]: [] }, function() {
            loadYTCollected(sheetId);
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

export function updateCombinedCounters(sheetId: string = 'vp_ss'): void {
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;
    const text = newTgEl?.value || '';
    const ytItems = syh_collected_by_sheet[sheetId] || [];
    const stats = SheetStateService.computeSheetCounters(text, ytItems);

    const leftEl = $(`tgTotalCountLeft__${sheetId}`);
    if (stats.leftPeople > 0) {
        let leftStr = `${stats.leftPeople} люд. - ${stats.leftQuestions} пит.`;
        if (stats.leftPrayers > 0) leftStr += ` | Молитви: ${stats.leftPrayers}`;
        if (leftEl) { leftEl.textContent = leftStr; leftEl.style.display = ''; }
    } else {
        if (leftEl) { leftEl.textContent = ''; leftEl.style.display = 'none'; }
    }

    const rightEl = $(`tgTotalCountRight__${sheetId}`);
    if (stats.rightPeople > 0) {
        let rightStr = `${stats.rightPeople} люд. - ${stats.rightQuestions} пит.`;
        if (stats.rightPrayers > 0) rightStr += ` | Молитви: ${stats.rightPrayers}`;
        if (rightEl) { rightEl.textContent = rightStr; rightEl.style.display = ''; }
    } else {
        if (rightEl) { rightEl.textContent = ''; rightEl.style.display = 'none'; }
    }

    const allEl = $(`tgTotalCountAll__${sheetId}`);
    if (stats.totalPeople > 0) {
        let allStr = `Разом: ${stats.totalPeople} люд. - ${stats.totalQuestions} пит.`;
        if (stats.totalPrayers > 0) allStr += ` | Молитви: ${stats.totalPrayers}`;
        if (allEl) { allEl.textContent = `(${allStr})`; allEl.style.display = ''; }
    } else {
        if (allEl) { allEl.textContent = ''; allEl.style.display = 'none'; }
    }

    // Update real-time stats bar counters to stay in sync
    // 1. New Left ("Нові з лівої")
    let newLeftText = `${stats.leftPeople} люд. - ${stats.leftQuestions} пит.`;
    if (stats.leftPrayers > 0) newLeftText += ` | Молитви: ${stats.leftPrayers}`;
    setTextContent(`countNewLeft__${sheetId}`, newLeftText);

    // 2. New YT ("Нові з YouTube")
    let newYTText = `${stats.rightPeople} люд. - ${stats.rightQuestions} пит.`;
    if (stats.rightPrayers > 0) newYTText += ` | Молитви: ${stats.rightPrayers}`;
    setTextContent(`countNewYT__${sheetId}`, newYTText);

    // 3. Old list stats and Total stats
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const oldListText = oldListEl?.value || '';
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const answeredInput = answeredEl?.value || '';
    const answeredIds = answeredInput
        .split(/[\s,]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
    
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

    let totalText = `${totalPeople} люд. - ${totalQuestions} пит.`;
    if (totalPrayers > 0) totalText += ` | Молитви: ${totalPrayers}`;
    setTextContent(`countTotal__${sheetId}`, totalText);
}

export function updateNewInputStats(sheetId: string = 'vp_ss'): void {
    updateCombinedCounters(sheetId);
}

export function ensureStatsBarRows(sheetId: string = 'vp_ss'): void {
    const bar = $(`statsBar__${sheetId}`);
    if (!bar || !(bar instanceof HTMLElement)) return;
    if (bar.querySelector('.stats-row')) return;

    const stats = {
        old: bar.querySelector('.stat-item.old') as HTMLElement | null,
        del: bar.querySelector('.stat-item.del') as HTMLElement | null,
        newLeft: bar.querySelector('.stat-item.new') as HTMLElement | null,
        total: bar.querySelector('.stat-item.total') as HTMLElement | null
    };

    let newYT = bar.querySelector('.stat-item.new-yt') as HTMLElement | null;
    if (!newYT) {
        newYT = document.createElement('div');
        newYT.className = 'stat-item new-yt';
        newYT.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
    }

    const row1 = document.createElement('div');
    row1.className = 'stats-row';
    if (stats.old) row1.appendChild(stats.old);
    if (stats.del) row1.appendChild(stats.del);

    const row2 = document.createElement('div');
    row2.className = 'stats-row new-row';
    if (stats.newLeft) row2.appendChild(stats.newLeft);
    if (newYT) row2.appendChild(newYT);

    const row3 = document.createElement('div');
    row3.className = 'stats-row total-row';
    if (stats.total) row3.appendChild(stats.total);

    bar.innerHTML = '';
    bar.appendChild(row1);
    bar.appendChild(row2);
    bar.appendChild(row3);
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

    setTextContent(`countOld__${sheetId}`, `${stats.oldPeople} люд. - ${stats.oldQuestionsTotal} пит.`);
    setTextContent(`countDel__${sheetId}`, `${stats.delPeople} люд. - ${stats.delQuestionsTotal} пит.`);

    let newLeftText = `${stats.newLeftPeople} люд. - ${stats.newLeftQuestionsTotal} пит.`;
    if (stats.newLeftPrayersTotal > 0) newLeftText += ` | Молитви: ${stats.newLeftPrayersTotal}`;
    setTextContent(`countNewLeft__${sheetId}`, newLeftText);

    const statsBar = $(`statsBar__${sheetId}`);
    const newYTCountEl = $(`countNewYT__${sheetId}`);
    if (statsBar && !newYTCountEl && statsBar.querySelector('.stats-row.new-row')) {
        const span = document.createElement('span');
        span.className = 'stat-item new-yt';
        span.innerHTML = `Нові з YouTube: <b id="countNewYT__${sheetId}">0</b>`;
        const newRow = statsBar.querySelector('.stats-row.new-row');
        if (newRow) newRow.appendChild(span);
    } else if (statsBar && !newYTCountEl) {
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

    let newYTText = `${stats.newYTPeople} люд. - ${stats.newYTQuestionsTotal} пит.`;
    if (stats.newYTPrayersTotal > 0) newYTText += ` | Молитви: ${stats.newYTPrayersTotal}`;
    setTextContent(`countNewYT__${sheetId}`, newYTText);

    let totalText = `${stats.totalPeople} люд. - ${stats.totalQuestions} пит.`;
    if (stats.totalPrayers > 0) totalText += ` | Молитви: ${stats.totalPrayers}`;
    setTextContent(`countTotal__${sheetId}`, totalText);

    showElement(`statsBar__${sheetId}`);
    updateCombinedCounters(sheetId);

    const outputDiv = $(`finalResultDiv__${sheetId}`);
    if (outputDiv) outputDiv.innerHTML = '';
    if (questions.length > 0) {
        const header = document.createElement('div');
        header.textContent = "❓❓❓ВОПРОСЫ\n\n";
        if (outputDiv) outputDiv.appendChild(header);
        questions.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = document.createElement('div');
            block.className = 'q-block q-' + item.source;
            block.textContent = textBlock;
            if (outputDiv) outputDiv.appendChild(block);
        });
    }
    if (prayers.length > 0) {
        const header = document.createElement('div');
        header.textContent = "🙏🙏🙏МОЛИТВЫ\n\n";
        if (outputDiv) outputDiv.appendChild(header);
        prayers.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = document.createElement('div');
            block.className = 'q-block q-pray';
            block.textContent = textBlock;
            if (outputDiv) outputDiv.appendChild(block);
        });
    }

    const deletedLogDiv = $(`deletedLog__${sheetId}`);
    if (deletedLogDiv) deletedLogDiv.innerHTML = '';
    if (delLog.length > 0) {
        delLog.forEach((d) => {
            let msg = '№' + d.originalId + ' (' + d.author + '): ';
            if (d.type === 'block') msg += 'Видалено повністю (' + d.count + ' пит.)';
            else msg += 'Видалено підпункт';
            const div = document.createElement('div');
            div.className = 'del-row';
            div.textContent = msg;
            if (deletedLogDiv) deletedLogDiv.appendChild(div);
        });
        setTextContent(`deletedLogCount__${sheetId}`, `(${delLog.length})`);
    } else {
        const div = document.createElement('div');
        div.className = 'del-empty-msg';
        div.style.color = '#9ca3af';
        div.style.padding = '6px';
        div.style.fontStyle = 'italic';
        div.textContent = 'Видалень немає';
        if (deletedLogDiv) deletedLogDiv.appendChild(div);
        setTextContent(`deletedLogCount__${sheetId}`, '(0)');
    }
    showElement(`deletedLogDetails__${sheetId}`);

    const cleanedLogDiv = $(`cleanedLog__${sheetId}`);
    if (cleanedLogDiv) cleanedLogDiv.innerHTML = '';
    if (cleaningLog.length > 0) {
        const table = document.createElement('table');
        table.className = 'clean-table';
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>До очищення</th><th>Після очищення</th><th>Що прибрано</th>';
        table.appendChild(headerRow);
        cleaningLog.forEach(entry => {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td'); td1.className = 'clean-before'; td1.textContent = entry.before || '';
            const td2 = document.createElement('td'); td2.className = 'clean-after'; td2.textContent = entry.after || '';
            const td3 = document.createElement('td'); td3.className = 'clean-diff'; td3.textContent = entry.removed || '';
            tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
            table.appendChild(tr);
        });
        if (cleanedLogDiv) cleanedLogDiv.appendChild(table);
        setTextContent(`cleanedLogCount__${sheetId}`, `(${cleaningLog.length})`);
    } else {
        const div = document.createElement('div');
        div.className = 'clean-empty-msg';
        div.style.color = '#9ca3af';
        div.style.padding = '6px';
        div.style.fontStyle = 'italic';
        div.textContent = 'Очищених фраз чи нікнеймів немає';
        if (cleanedLogDiv) cleanedLogDiv.appendChild(div);
        setTextContent(`cleanedLogCount__${sheetId}`, '(0)');
    }
    showElement(`cleanedLogDetails__${sheetId}`);

    SheetStateService.saveSheetState(sheetId, {
        finalResultHtml: outputDiv?.innerHTML || '',
        statsHtml: statsBar?.innerHTML || '',
        statsVisible: statsBar ? statsBar.style.display !== 'none' : false,
        deletedLogHtml: deletedLogDiv?.innerHTML || '',
        deletedLogCount: delLog.length,
        deletedLogDetailsVisible: true,
        deletedLogDetailsOpen: ($( `deletedLogDetails__${sheetId}`) as HTMLDetailsElement | null)?.open || false,
        cleanedLogHtml: cleanedLogDiv?.innerHTML || '',
        cleanedLogCount: cleaningLog.length,
        cleanedLogDetailsVisible: true,
        cleanedLogDetailsOpen: ($( `cleanedLogDetails__${sheetId}`) as HTMLDetailsElement | null)?.open || false
    });
}

function initPopupTelegram() {
    SYH_STORAGE.onChanged(function(changes: Record<string, any>, areaName: string) {
        if (areaName === 'local') {
            SHEET_IDS.forEach(sId => {
                if (changes[`syh:popup:collected:${sId}`] || changes[`syh_collected__${sId}`]) {
                    loadYTCollected(sId);
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopupTelegram);
} else {
    initPopupTelegram();
}
