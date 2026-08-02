import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds, SHEET_REGISTRY } from '../modules/sheets';
import {
    countQuestionsInText,
    numberToEmoji,
    cleanAuthorName,
    cleanTelegramHeadersLogged,
    parseAndFilterOldList,
    parseTelegramExportLineByLine
} from '../modules/telegram_parser';

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
    parsed.questions.forEach((q: any) => qQuestions += countQuestionsInText(q.text));
    const pCount = parsed.prayers.length;
    $(`#oldTotalCount__${sheetId}`).text(`(${qPeople} люд. - ${qQuestions} пит. | Молитви: ${pCount})`);
    $(`#oldTotalCount__${sheetId}`).css({ 'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px' });
}

export const syh_yt_collected: any[] = [];
export const syh_collected_by_sheet: Record<string, any[]> = SHEET_REGISTRY.createSheetRecordMap(() => []);

export function loadYTCollected(sheetId: string = 'vp_ss'): void {
    const sheetKey = `syh:popup:collected:${sheetId}`;
    const keysToGet = [sheetKey, STORAGE_KEYS.YT_COLLECTED];

    SYH_STORAGE.get(keysToGet, function(result: Record<string, any>) {
        let items = result[sheetKey] || [];
        if (sheetId === 'vp_ss') {
            const oldItems = result[STORAGE_KEYS.YT_COLLECTED] || [];
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
            items.forEach((item: any) => {
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

export function updateCombinedCounters(sheetId: string = 'vp_ss'): void {
    // 1. Left column stats (Telegram)
    const text = ($(`#newTelegram__${sheetId}`).val() as string) || '';
    let leftPeople = 0;
    let leftQuestions = 0;
    let leftPrayers = 0;
    if (text.trim()) {
        if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(text)) {
            const parsed = parseAndFilterOldList(text, []);
            leftPeople = parsed.questions.length;
            parsed.questions.forEach((q: any) => leftQuestions += countQuestionsInText(q.text));
            leftPrayers = parsed.prayers.length;
        } else {
            const items = parseTelegramExportLineByLine(text);
            leftPeople = items.length;
            items.forEach((q: any) => leftQuestions += countQuestionsInText(q.text));
        }
    }

    // 2. Right column stats (YouTube)
    const rightStats = updateRightColumnStats(sheetId);

    // 3. Render Badges
    if (leftPeople > 0) {
        let leftStr = leftPeople + ' люд. - ' + leftQuestions + ' пит.';
        if (leftPrayers > 0) leftStr += ' | Молитви: ' + leftPrayers;
        $(`#tgTotalCountLeft__${sheetId}`).text(leftStr).show();
    } else {
        $(`#tgTotalCountLeft__${sheetId}`).text('').hide();
    }

    if (rightStats.people > 0) {
        let rightStr = rightStats.people + ' люд. - ' + rightStats.questions + ' пит.';
        if (rightStats.prayers > 0) rightStr += ' | Молитви: ' + rightStats.prayers;
        $(`#tgTotalCountRight__${sheetId}`).text(rightStr).show();
    } else {
        $(`#tgTotalCountRight__${sheetId}`).text('').hide();
    }

    const totalPeople = leftPeople + rightStats.people;
    const totalQuestions = leftQuestions + rightStats.questions;
    const totalPrayers = leftPrayers + rightStats.prayers;

    if (totalPeople > 0) {
        let allStr = 'Разом: ' + totalPeople + ' люд. - ' + totalQuestions + ' пит.';
        if (totalPrayers > 0) allStr += ' | Молитви: ' + totalPrayers;
        $(`#tgTotalCountAll__${sheetId}`).text('(' + allStr + ')').show();
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
    const answeredIds = answeredInput.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const cleaningLog: any[] = [];
    const preservedData = parseAndFilterOldList(oldListText, answeredIds, cleaningLog);
    
    let newQuestions: any[];
    let newPrayers: any[] = [];
    if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(telegramText)) {
        const parsedNew = parseAndFilterOldList(telegramText, [], cleaningLog);
        newQuestions = parsedNew.questions.map((q: any) => ({ ...q, source: 'new' }));
        newPrayers = parsedNew.prayers.map((p: any) => ({ ...p, source: 'pray' }));
    } else {
        newQuestions = parseTelegramExportLineByLine(telegramText, cleaningLog);
    }
    
    // YouTube new items
    const ytItems = syh_collected_by_sheet[sheetId] || [];
    const newYTQuestions: any[] = [];
    const newYTPrayers: any[] = [];

    ytItems.forEach(item => {
        if (item.type === 'question') {
            newYTQuestions.push({ author: item.author, text: item.text, source: 'yt' });
        } else if (item.type === 'prayer') {
            newYTPrayers.push({ author: item.author, text: item.text, source: 'pray' });
        }
    });

    const combinedQuestions = [...preservedData.questions, ...newQuestions, ...newYTQuestions];
    const combinedPrayers = [...preservedData.prayers, ...newPrayers, ...newYTPrayers];
    
    const oldPeople = preservedData.questions.length;
    let oldQuestionsTotal = 0;
    preservedData.questions.forEach((q: any) => oldQuestionsTotal += countQuestionsInText(q.text));
    
    const newLeftPeople = newQuestions.length;
    let newLeftQuestionsTotal = 0;
    newQuestions.forEach((q: any) => newLeftQuestionsTotal += countQuestionsInText(q.text));
    const newLeftPrayersTotal = newPrayers.length;
    
    const newYTPeople = ytItems.length;
    let newYTQuestionsTotal = 0;
    newYTQuestions.forEach((q: any) => newYTQuestionsTotal += countQuestionsInText(q.text));
    const newYTPrayersTotal = newYTPrayers.length;

    let delPeople = 0;
    let delQuestionsTotal = 0;
    preservedData.deleted.forEach((d: any) => {
        if (d.type === 'block') { delPeople++; delQuestionsTotal += d.count; } 
        else if (d.type === 'sub') { delQuestionsTotal += d.count; }
    });
    
    const totalPeople = oldPeople + newLeftPeople + newYTPeople;
    const totalQuestions = oldQuestionsTotal + newLeftQuestionsTotal + newYTQuestionsTotal;
    const totalPrayers = combinedPrayers.length;
    
    $(`#statsBar__${sheetId} .stat-item.old`).html('Залишилось старих: <b>' + oldPeople + ' люд. - ' + oldQuestionsTotal + ' пит.</b>');
    $(`#countDel__${sheetId}`).text(delPeople + ' люд. - ' + delQuestionsTotal + ' пит.');
    
    let newLeftText = newLeftPeople + ' люд. - ' + newLeftQuestionsTotal + ' пит.';
    if (newLeftPrayersTotal > 0) newLeftText += ' | Молитви: ' + newLeftPrayersTotal;
    $(`#countNewLeft__${sheetId}`).html(newLeftText);
    
    if ($(`#countNewYT__${sheetId}`).length === 0 && $(`#statsBar__${sheetId}`).length > 0) {
        if ($(`#statsBar__${sheetId} .stats-row.new-row`).length > 0) {
            $(`#statsBar__${sheetId} .stats-row.new-row`).append(`<span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT__${sheetId}">0</b></span>`);
        } else {
            $(`<div class="stats-row new-row"><span class="stat-item new">Нові з лівої: <b id="countNewLeft__${sheetId}">0</b></span><span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT__${sheetId}">0</b></span></div>`).insertBefore(`#statsBar__${sheetId} .total-row`);
        }
    }

    let newYTText = newYTPeople + ' люд. - ' + newYTQuestionsTotal + ' пит.';
    if (newYTPrayersTotal > 0) newYTText += ' | Молитви: ' + newYTPrayersTotal;
    $(`#countNewYT__${sheetId}`).html(newYTText);

    let totalText = totalPeople + ' люд. - ' + totalQuestions + ' пит.';
    if (totalPrayers > 0) totalText += ' | Молитви: ' + totalPrayers;
    $(`#countTotal__${sheetId}`).text(totalText);
    
    $(`#statsBar__${sheetId}`).show();

    updateCombinedCounters(sheetId);
    
    const outputDiv = $(`#finalResultDiv__${sheetId}`);
    outputDiv.empty();
    if (combinedQuestions.length > 0) {
        const header = $('<div>').text("❓❓❓ВОПРОСЫ\n\n");
        outputDiv.append(header);
        combinedQuestions.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = $('<div>').addClass('q-block').addClass('q-' + item.source);
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    if (combinedPrayers.length > 0) {
        const header = $('<div>').text("🙏🙏🙏МОЛИТВЫ\n\n");
        outputDiv.append(header);
        combinedPrayers.forEach((item, index) => {
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = $('<div>').addClass('q-block').addClass('q-pray');
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    const deletedLog = $(`#deletedLog__${sheetId}`);
    deletedLog.empty();
    if (preservedData.deleted.length > 0) {
        preservedData.deleted.forEach((d: any) => {
            let msg = '№' + d.originalId + ' (' + d.author + '): ';
            if (d.type === 'block') msg += 'Видалено повністю (' + d.count + ' пит.)';
            else msg += 'Видалено підпункт';
            deletedLog.append($('<div>').addClass('del-row').text(msg));
        });
        $(`#deletedLogCount__${sheetId}`).text(`(${preservedData.deleted.length})`);
    } else {
        deletedLog.append($('<div>').addClass('del-empty-msg').css({ color: '#9ca3af', padding: '6px', 'font-style': 'italic' }).text('Видалень немає'));
        $(`#deletedLogCount__${sheetId}`).text('(0)');
    }
    $(`#deletedLogDetails__${sheetId}`).show();

    const cleanedLog = $(`#cleanedLog__${sheetId}`);
    cleanedLog.empty();
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
        cleanedLog.append(table);
        $(`#cleanedLogCount__${sheetId}`).text(`(${cleaningLog.length})`);
    } else {
        cleanedLog.append($('<div>').addClass('clean-empty-msg').css({ color: '#9ca3af', padding: '6px', 'font-style': 'italic' }).text('Очищених фраз чи нікнеймів немає'));
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

    // Збереження результатів процесингу Telegram в сховище per sheetId
    SYH_STORAGE.set({
        [`tg_finalResultHtml__${sheetId}`]: outputDiv.html(),
        [`tg_statsHtml__${sheetId}`]: $(`#statsBar__${sheetId}`).html(),
        [`tg_statsVisible__${sheetId}`]: $(`#statsBar__${sheetId}`).is(':visible'),
        [`tg_deletedLogHtml__${sheetId}`]: deletedLog.html(),
        [`tg_deletedLogCount__${sheetId}`]: preservedData.deleted.length,
        [`tg_deletedLogDetailsVisible__${sheetId}`]: $(`#deletedLogDetails__${sheetId}`).is(':visible'),
        [`tg_deletedLogDetailsOpen__${sheetId}`]: $(`#deletedLogDetails__${sheetId}`).attr('open') !== undefined,
        [`tg_cleanedLogHtml__${sheetId}`]: cleanedLog.html(),
        [`tg_cleanedLogCount__${sheetId}`]: cleaningLog.length,
        [`tg_cleanedLogDetailsVisible__${sheetId}`]: $(`#cleanedLogDetails__${sheetId}`).is(':visible'),
        [`tg_cleanedLogDetailsOpen__${sheetId}`]: $(`#cleanedLogDetails__${sheetId}`).attr('open') !== undefined
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