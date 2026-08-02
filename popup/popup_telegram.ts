import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds, SHEET_REGISTRY } from '../modules/sheets';
import {
    countQuestionsInText,
    numberToEmoji,
    cleanAuthorName,
    cleanTelegramHeadersLogged,
    parseAndFilterOldList,
    parseTelegramExportLineByLine,
    TelegramQuestionItem,
    GroupedNewItem
} from '../modules/telegram_parser';
import type { YTCollectedItem, CleaningLogEntry, DeletedLogEntry } from '../modules/types';

const SHEET_IDS = getAllSheetIds();

export {
    countQuestionsInText,
    numberToEmoji,
    cleanAuthorName,
    cleanTelegramHeadersLogged,
    parseAndFilterOldList,
    parseTelegramExportLineByLine
};

export function updateOldInputStats(sheetId: string = 'vp_ss'): void {
    const text = ($(`#oldList__${sheetId}`).val() as string) || '';
    if (!text) { $(`#oldTotalCount__${sheetId}`).text(''); return; }
    const parsed = parseAndFilterOldList(text, []); 
    const qPeople = parsed.questions.length;
    let qQuestions = 0;
    parsed.questions.forEach((q: TelegramQuestionItem) => qQuestions += countQuestionsInText(q.text));
    const pCount = parsed.prayers.length;
    $(`#oldTotalCount__${sheetId}`).text(`(${qPeople} люд. - ${qQuestions} пит. | Молитви: ${pCount})`);
    $(`#oldTotalCount__${sheetId}`).css({ 'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px' });
}

export const syh_yt_collected: YTCollectedItem[] = [];
export const syh_collected_by_sheet: Record<string, YTCollectedItem[]> = SHEET_REGISTRY.createSheetRecordMap(() => []);

export function loadYTCollected(sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;
    const keysToGet = [sheetKey, STORAGE_KEYS.YT_COLLECTED];

    SYH_STORAGE.get(keysToGet, function(result: Record<string, any>) {
        let items: YTCollectedItem[] = result[sheetKey] || [];
        if (sheetId === 'vp_ss') {
            const oldItems: YTCollectedItem[] = result[STORAGE_KEYS.YT_COLLECTED] || [];
            syh_yt_collected.length = 0;
            syh_yt_collected.push(...oldItems);
            items = [...oldItems, ...items];
        }
        syh_collected_by_sheet[sheetId] = items;

        const $list = $(`#ytCollectedList__${sheetId}`);
        $list.empty();
        if (items.length === 0) {
            $list.append('<div class="yt-empty-msg">Зібраних коментарів з YouTube немає</div>');
        } else {
            items.forEach((item: YTCollectedItem) => {
                const $card = $('<div>')
                    .addClass('yt-collected-item')
                    .addClass(item.type === 'question' ? 'is-question' : 'is-prayer')
                    .attr('data-id', item.id);

                const typeLabel = item.type === 'question' ? '❓ Питання' : '🙏 Молитва';

                const $header = $('<div>').addClass('yt-item-header');
                const $author = $('<span>').addClass('yt-item-author').text(item.author || 'Анонім');
                const $badge = $('<span>').addClass('yt-item-type-badge').text(typeLabel);
                const $delBtn = $('<button>').addClass('yt-item-del-btn').text('✕').attr('title', 'Видалити');

                $delBtn.click(function(e) {
                    e.stopPropagation();
                    deleteYTCollectedItem(item.id, sheetId);
                });

                $header.append($author, $badge, $delBtn);
                const $text = $('<div>').addClass('yt-item-text').text(item.text);
                $card.append($header, $text);
                $list.append($card);
            });
        }
        updateCombinedCounters(sheetId);
    });
}

export function deleteYTCollectedItem(commentId: string, sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;
    const keysToGet = [sheetKey];
    if (sheetId === 'vp_ss') {
        keysToGet.push(STORAGE_KEYS.YT_COLLECTED);
    }

    SYH_STORAGE.get(keysToGet, function(result: Record<string, any>) {
        let sheetItems: any[] = result[sheetKey] || result[`syh_collected__${sheetId}`] || [];
        const foundInSheet = sheetItems.some(item => item.id === commentId);

        if (foundInSheet) {
            sheetItems = sheetItems.filter(item => item.id !== commentId);
            SYH_STORAGE.set({ [sheetKey]: sheetItems }, function() {
                loadYTCollected(sheetId);
            });
        } else if (sheetId === 'vp_ss') {
            let oldItems: any[] = result[STORAGE_KEYS.YT_COLLECTED] || result.syh_yt_collected || [];
            oldItems = oldItems.filter(item => item.id !== commentId);
            SYH_STORAGE.set({ [STORAGE_KEYS.YT_COLLECTED]: oldItems }, function() {
                loadYTCollected(sheetId);
            });
        }
    });
}

export function clearAllYTCollected(sheetId: string = 'vp_ss'): void {
    if (confirm("Очистити всі зібрані коментарі з YouTube для цього аркуша?")) {
        const sheetKey = `syh:popup:collected:${sheetId}`;
        const updateObj: Record<string, any> = { [sheetKey]: [] };
        if (sheetId === 'vp_ss') {
            updateObj[STORAGE_KEYS.YT_COLLECTED] = [];
        }
        SYH_STORAGE.set(updateObj, function() {
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
    const text = ($(`#newTelegram__${sheetId}`).val() as string) || '';
    const ytItems = syh_collected_by_sheet[sheetId] || [];
    const stats = SheetStateService.computeSheetCounters(text, ytItems);

    if (stats.leftPeople > 0) {
        let leftStr = `${stats.leftPeople} люд. - ${stats.leftQuestions} пит.`;
        if (stats.leftPrayers > 0) leftStr += ` | Молитви: ${stats.leftPrayers}`;
        $(`#tgTotalCountLeft__${sheetId}`).text(leftStr).show();
    } else {
        $(`#tgTotalCountLeft__${sheetId}`).text('').hide();
    }

    if (stats.rightPeople > 0) {
        let rightStr = `${stats.rightPeople} люд. - ${stats.rightQuestions} пит.`;
        if (stats.rightPrayers > 0) rightStr += ` | Молитви: ${stats.rightPrayers}`;
        $(`#tgTotalCountRight__${sheetId}`).text(rightStr).show();
    } else {
        $(`#tgTotalCountRight__${sheetId}`).text('').hide();
    }

    if (stats.totalPeople > 0) {
        let allStr = `Разом: ${stats.totalPeople} люд. - ${stats.totalQuestions} пит.`;
        if (stats.totalPrayers > 0) allStr += ` | Молитви: ${stats.totalPrayers}`;
        $(`#tgTotalCountAll__${sheetId}`).text(`(${allStr})`).show();
    } else {
        $(`#tgTotalCountAll__${sheetId}`).text('').hide();
    }
}

export function updateNewInputStats(sheetId: string = 'vp_ss'): void {
    updateCombinedCounters(sheetId);
}



export function ensureStatsBarRows(sheetId: string = 'vp_ss'): void {
    const $bar = $(`#statsBar__${sheetId}`);
    if ($bar.length === 0) return;
    if ($bar.find('.stats-row').length === 0) {
        const $old = $bar.find('.stat-item.old').detach();
        const $del = $bar.find('.stat-item.del').detach();
        const $newLeft = $bar.find('.stat-item.new').detach();
        let $newYT = $bar.find('.stat-item.new-yt').detach();
        const $total = $bar.find('.stat-item.total').detach();

        if ($newYT.length === 0) {
            $newYT = $(`<div class="stat-item new-yt">Нові з YouTube: <b id="countNewYT__${sheetId}">0</b></div>`);
        }

        $bar.empty().append(
            $('<div class="stats-row"></div>').append($old, $del),
            $('<div class="stats-row new-row"></div>').append($newLeft, $newYT),
            $('<div class="stats-row total-row"></div>').append($total)
        );
    }
}

export function processTelegramData(sheetId: string = 'vp_ss'): void {
    ensureStatsBarRows(sheetId);
    const oldListText = ($(`#oldList__${sheetId}`).val() as string) || '';
    const answeredInput = ($(`#answeredIds__${sheetId}`).val() as string) || '';
    const telegramText = ($(`#newTelegram__${sheetId}`).val() as string) || '';
    const ytItems = syh_collected_by_sheet[sheetId] || [];

    const result = SheetStateService.processSheetData({
        oldListText,
        answeredInput,
        telegramText,
        ytItems
    });

    const { questions, prayers, stats, deletedLog: delLog, cleaningLog } = result;

    $(`#statsBar__${sheetId} .stat-item.old`).html('Залишилось старих: <b>' + stats.oldPeople + ' люд. - ' + stats.oldQuestionsTotal + ' пит.</b>');
    $(`#countDel__${sheetId}`).text(stats.delPeople + ' люд. - ' + stats.delQuestionsTotal + ' пит.');

    let newLeftText = stats.newLeftPeople + ' люд. - ' + stats.newLeftQuestionsTotal + ' пит.';
    if (stats.newLeftPrayersTotal > 0) newLeftText += ' | Молитви: ' + stats.newLeftPrayersTotal;
    $(`#countNewLeft__${sheetId}`).html(newLeftText);

    if ($(`#countNewYT__${sheetId}`).length === 0 && $(`#statsBar__${sheetId}`).length > 0) {
        if ($(`#statsBar__${sheetId} .stats-row.new-row`).length > 0) {
            $(`#statsBar__${sheetId} .stats-row.new-row`).append(`<span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT__${sheetId}">0</b></span>`);
        } else {
            $(`<div class="stats-row new-row"><span class="stat-item new">Нові з лівої: <b id="countNewLeft__${sheetId}">0</b></span><span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT__${sheetId}">0</b></span></div>`).insertBefore(`#statsBar__${sheetId} .total-row`);
        }
    }

    let newYTText = stats.newYTPeople + ' люд. - ' + stats.newYTQuestionsTotal + ' пит.';
    if (stats.newYTPrayersTotal > 0) newYTText += ' | Молитви: ' + stats.newYTPrayersTotal;
    $(`#countNewYT__${sheetId}`).html(newYTText);

    let totalText = stats.totalPeople + ' люд. - ' + stats.totalQuestions + ' пит.';
    if (stats.totalPrayers > 0) totalText += ' | Молитви: ' + stats.totalPrayers;
    $(`#countTotal__${sheetId}`).text(totalText);

    $(`#statsBar__${sheetId}`).show();
    updateCombinedCounters(sheetId);

    const outputDiv = $(`#finalResultDiv__${sheetId}`);
    outputDiv.empty();
    if (questions.length > 0) {
        const header = $('<div>').text("❓❓❓ВОПРОСЫ\n\n");
        outputDiv.append(header);
        questions.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = $('<div>').addClass('q-block').addClass('q-' + item.source);
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    if (prayers.length > 0) {
        const header = $('<div>').text("🙏🙏🙏МОЛИТВЫ\n\n");
        outputDiv.append(header);
        prayers.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = $('<div>').addClass('q-block').addClass('q-pray');
            block.text(textBlock);
            outputDiv.append(block);
        });
    }

    const deletedLogDiv = $(`#deletedLog__${sheetId}`);
    deletedLogDiv.empty();
    if (delLog.length > 0) {
        delLog.forEach((d) => {
            let msg = '№' + d.originalId + ' (' + d.author + '): ';
            if (d.type === 'block') msg += 'Видалено повністю (' + d.count + ' пит.)';
            else msg += 'Видалено підпункт';
            deletedLogDiv.append($('<div>').addClass('del-row').text(msg));
        });
        $(`#deletedLogCount__${sheetId}`).text(`(${delLog.length})`);
    } else {
        deletedLogDiv.append($('<div>').addClass('del-empty-msg').css({ color: '#9ca3af', padding: '6px', 'font-style': 'italic' }).text('Видалень немає'));
        $(`#deletedLogCount__${sheetId}`).text('(0)');
    }
    $(`#deletedLogDetails__${sheetId}`).show();

    const cleanedLogDiv = $(`#cleanedLog__${sheetId}`);
    cleanedLogDiv.empty();
    if (cleaningLog.length > 0) {
        const table = $('<table>').addClass('clean-table');
        table.append(
            $('<tr>').append(
                $('<th>').text('До очищення'),
                $('<th>').text('Після очищення'),
                $('<th>').text('Що прибрано')
            )
        );
        cleaningLog.forEach(entry => {
            table.append(
                $('<tr>').append(
                    $('<td>').addClass('clean-before').text(entry.before),
                    $('<td>').addClass('clean-after').text(entry.after),
                    $('<td>').addClass('clean-diff').text(entry.removed)
                )
            );
        });
        cleanedLogDiv.append(table);
        $(`#cleanedLogCount__${sheetId}`).text(`(${cleaningLog.length})`);
    } else {
        cleanedLogDiv.append($('<div>').addClass('clean-empty-msg').css({ color: '#9ca3af', padding: '6px', 'font-style': 'italic' }).text('Очищених фраз чи нікнеймів немає'));
        $(`#cleanedLogCount__${sheetId}`).text('(0)');
    }
    $(`#cleanedLogDetails__${sheetId}`).show();

    // 30-денне очищення чекбоксів YouTube
    SYH_STORAGE.get([STORAGE_KEYS.YT_CHECKBOX_STATE], function(res: Record<string, any>) {
        const states = res[STORAGE_KEYS.YT_CHECKBOX_STATE] || res.syh_yt_checkbox_state;
        if (states && typeof states === 'object') {
            const now = Date.now();
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            let modified = false;
            for (const id in states) {
                if (states[id] && states[id].timestamp && (now - states[id].timestamp > thirtyDaysMs)) {
                    delete states[id];
                    modified = true;
                }
            }
            if (modified) {
                SYH_STORAGE.set({ [STORAGE_KEYS.YT_CHECKBOX_STATE]: states });
            }
        }
    });

    // Збереження результатів процесингу Telegram в сховище per sheetId за допомогою SheetStateService
    SheetStateService.saveSheetState(sheetId, {
        finalResultHtml: outputDiv.html(),
        statsHtml: $(`#statsBar__${sheetId}`).html(),
        statsVisible: $(`#statsBar__${sheetId}`).is(':visible'),
        deletedLogHtml: deletedLog.html(),
        deletedLogCount: preservedData.deleted.length,
        deletedLogDetailsVisible: $(`#deletedLogDetails__${sheetId}`).is(':visible'),
        deletedLogDetailsOpen: $(`#deletedLogDetails__${sheetId}`).attr('open') !== undefined,
        cleanedLogHtml: cleanedLog.html(),
        cleanedLogCount: cleaningLog.length,
        cleanedLogDetailsVisible: $(`#cleanedLogDetails__${sheetId}`).is(':visible'),
        cleanedLogDetailsOpen: $(`#cleanedLogDetails__${sheetId}`).attr('open') !== undefined
    });
}

$(document).ready(function() {
    // Реактивне оновлення правої колонки при зміні зібраних коментарів YouTube
    SYH_STORAGE.onChanged(function(changes: Record<string, any>, areaName: string) {
        if (areaName === 'local') {
            if (changes.syh_yt_collected) {
                loadYTCollected('vp_ss');
            }
            SHEET_IDS.forEach(sId => {
                if (changes[`syh_collected__${sId}`]) {
                    loadYTCollected(sId);
                }
            });
        }
    });

    // Обробники кліків для всіх 4 аркушів
    SHEET_IDS.forEach(sId => {
        $(`#processTelegramBtn__${sId}`).click(function() { 
            try { 
                processTelegramData(sId); 
            } catch (e: any) { 
                alert("❌ Помилка:\n" + e.message); 
                console.error(e); 
            } 
        });
        
        $(`#copyResultBtn__${sId}`).click(async function() {
            const plainText = ($(`#finalResultDiv__${sId}`).text() as string); 
            if (!plainText) return;

            const $btn = $(this);
            const originalText = $btn.text(); 

            const copyFallback = (txt: string) => {
                const $temp = $("<textarea>"); 
                $("body").append($temp); 
                $temp.val(txt).select(); 
                document.execCommand("copy"); 
                $temp.remove(); 
            };

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(plainText);
                } else {
                    copyFallback(plainText);
                }
            } catch (err) {
                console.warn("Clipboard API failed, using fallback:", err);
                copyFallback(plainText);
            }

            $btn.text("Скопійовано! ✅"); 
            setTimeout(() => $btn.text(originalText), 2000);
        });
    });
});

// Pure ESM Export — Window pollution removed