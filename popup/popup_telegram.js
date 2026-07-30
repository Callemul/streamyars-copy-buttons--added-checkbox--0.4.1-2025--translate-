// popup_telegram.js
// Допоміжні утиліти парсингу та розрахунку статистики питань Telegram
window.countQuestionsInText = function(text) {
    if (!text) return 0;
    const bullets = (text.match(/🔹/g) || []).length;
    return bullets > 0 ? bullets : 1;
};

window.updateOldInputStats = function() {
    const text = $('#oldList').val();
    if (!text) { $('#oldTotalCount').text(''); return; }
    const parsed = window.parseAndFilterOldList(text, []); 
    const qPeople = parsed.questions.length;
    let qQuestions = 0;
    parsed.questions.forEach(q => qQuestions += window.countQuestionsInText(q.text));
    const pCount = parsed.prayers.length;
    $('#oldTotalCount').text(`(${qPeople} люд. - ${qQuestions} пит. | Молитви: ${pCount})`);
    $('#oldTotalCount').css({ 'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px' });
};

window.syh_yt_collected = [];

window.loadYTCollected = function() {
    chrome.storage.local.get(['syh_yt_collected'], function(result) {
        const items = result.syh_yt_collected || [];
        window.syh_yt_collected = items;
        const $list = $('#ytCollectedList');
        $list.empty();
        if (items.length === 0) {
            $list.append('<div class="yt-empty-msg">Зібраних коментарів з YouTube немає</div>');
        } else {
            items.forEach((item) => {
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
                    window.deleteYTCollectedItem(item.id);
                });

                $header.append($author, $badge, $delBtn);
                const $text = $('<div>').addClass('yt-item-text').text(item.text);
                $card.append($header, $text);
                $list.append($card);
            });
        }
        window.updateCombinedCounters();
    });
};

window.deleteYTCollectedItem = function(commentId) {
    chrome.storage.local.get(['syh_yt_collected'], function(result) {
        let items = result.syh_yt_collected || [];
        items = items.filter(item => item.id !== commentId);
        chrome.storage.local.set({ syh_yt_collected: items }, function() {
            window.loadYTCollected();
        });
    });
};

window.clearAllYTCollected = function() {
    if (confirm("Очистити всі зібрані коментарі з YouTube?")) {
        chrome.storage.local.set({ syh_yt_collected: [] }, function() {
            window.loadYTCollected();
        });
    }
};

window.updateRightColumnStats = function() {
    const items = window.syh_yt_collected || [];
    let qCount = 0;
    let pCount = 0;
    items.forEach(item => {
        if (item.type === 'question') {
            qCount += window.countQuestionsInText(item.text);
        } else if (item.type === 'prayer') {
            pCount += 1;
        }
    });
    return { people: items.length, questions: qCount, prayers: pCount };
};

window.updateCombinedCounters = function() {
    // 1. Left column stats (Telegram)
    const text = $('#newTelegram').val() || '';
    let leftPeople = 0;
    let leftQuestions = 0;
    let leftPrayers = 0;
    if (text.trim()) {
        if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(text)) {
            const parsed = window.parseAndFilterOldList(text, []);
            leftPeople = parsed.questions.length;
            parsed.questions.forEach(q => leftQuestions += window.countQuestionsInText(q.text));
            leftPrayers = parsed.prayers.length;
        } else {
            const items = window.parseTelegramExportLineByLine(text);
            leftPeople = items.length;
            items.forEach(q => leftQuestions += window.countQuestionsInText(q.text));
        }
    }

    // 2. Right column stats (YouTube)
    const rightStats = window.updateRightColumnStats();

    // 3. Render Badges
    if (leftPeople > 0) {
        let leftStr = '📝 Telegram: ' + leftPeople + ' люд. - ' + leftQuestions + ' пит.';
        if (leftPrayers > 0) leftStr += ' | Молитви: ' + leftPrayers;
        $('#tgTotalCountLeft').text(leftStr).show();
    } else {
        $('#tgTotalCountLeft').text('').hide();
    }

    if (rightStats.people > 0) {
        let rightStr = '🎬 YouTube: ' + rightStats.people + ' люд. - ' + rightStats.questions + ' пит.';
        if (rightStats.prayers > 0) rightStr += ' | Молитви: ' + rightStats.prayers;
        $('#tgTotalCountRight').text(rightStr).show();
        $('#ytHeaderCount').text(rightStats.people + ' люд. - ' + rightStats.questions + ' пит.').show();
    } else {
        $('#tgTotalCountRight').text('').hide();
        $('#ytHeaderCount').text('').hide();
    }

    const totalPeople = leftPeople + rightStats.people;
    const totalQuestions = leftQuestions + rightStats.questions;
    const totalPrayers = leftPrayers + rightStats.prayers;

    if (totalPeople > 0) {
        let allStr = 'Разом: ' + totalPeople + ' люд. - ' + totalQuestions + ' пит.';
        if (totalPrayers > 0) allStr += ' | Молитви: ' + totalPrayers;
        $('#tgTotalCountAll').text('(' + allStr + ')').show();
    } else {
        $('#tgTotalCountAll').text('').hide();
    }
};

window.updateNewInputStats = function() {
    window.updateCombinedCounters();
};
window.numberToEmoji = function(num) {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num];
    return num.toString().split('').map(d => emojis[parseInt(d)]).join('');
};

window.cleanAuthorName = function(rawName) {
    let name = rawName.trim();
    if (name.startsWith('@')) name = name.substring(1);
    name = name.replace(/\s*•.*$/, '');
    name = name.replace(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/, '');
    name = name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, '$1 $2');
    return name.trim();
};

window.parseAndFilterOldList = function(text, answeredIds) {
    // Отримуємо очищувач для очищення вкладених заголовків
    const cleaner = (window.SYH_UTILS && window.SYH_UTILS.cleanTelegramHeaders) 
        ? window.SYH_UTILS.cleanTelegramHeaders 
        : (window.cleanTelegramHeaders || (t => t));

    const messages = [text];

    let allQuestions = [];
    let allPrayers = [];
    const deletedItems = [];

    const processOldItem = (itemsArray, itemObj, filterIds, id, deletedArr, src) => {
        const lines = itemObj.rawLines;
        while (lines.length > 0 && lines[0].trim() === "") lines.shift();
        if (lines.length === 0) return;

        let author = lines[0].trim();
        author = author.replace(/\s*•.*$/, '').trim();
        let rawText = lines.slice(1).map(l => l.trimEnd()).join('\n').trim();
        if (!author) author = "Анонім";

        // Очищаємо вкладені заголовки всередині блоку тексту питання/молитви
        rawText = cleaner(rawText);

        const totalQuestionsInBlock = window.countQuestionsInText(rawText);

        if (filterIds && filterIds.includes(id)) {
            deletedArr.push({ originalId: id, author: author, type: 'block', count: totalQuestionsInBlock });
            return;
        }
        
        if (rawText.includes('🔹') && filterIds) {
            const subIndexesToRemove = filterIds
                .filter(fid => Math.floor(fid) === id)
                .map(fid => {
                    const parts = fid.toString().split('.');
                    return parts[1] ? parseInt(parts[1], 10) : 0;
                })
                .filter(subIdx => subIdx > 0);

            if (subIndexesToRemove.length > 0) {
                const subQuestions = rawText.split('🔹').map(t => t.trim()).filter(Boolean);
                subIndexesToRemove.forEach(idx => {
                    if (subQuestions[idx-1]) deletedArr.push({ originalId: `${id}.${idx}`, author: author, type: 'sub', count: 1 });
                });

                const filteredSubQuestions = subQuestions.filter((_, idx) => !subIndexesToRemove.includes(idx + 1));

                if (filteredSubQuestions.length === 0) {
                    deletedArr.push({ originalId: id, author: author, type: 'block', count: totalQuestionsInBlock });
                    return; 
                } else if (filteredSubQuestions.length === 1) {
                    rawText = filteredSubQuestions[0];
                } else {
                    rawText = filteredSubQuestions.map(q => `🔹${q}`).join('\n');
                }
            }
        }
        itemsArray.push({ author, text: rawText, source: src });
    };

    const parseSection = (sectionText, filterIds, sourceType) => {
        const lines = sectionText.split('\n');
        const items = [];
        let currentItem = null;
        let currentCounter = (sourceType === 'old') ? allQuestions.length : allPrayers.length;

        const emojiNumberRegex = /^(?:\d+\uFE0F?\u20E3|🔟)+\s*$/;
        const tgHeaderARegex = /^.+?,\s*\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*$/;
        const tgHeaderBRegex = /^\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*([^:\n]+)(?::\s*(.*))?$/;

        const hasKeycapInRemainingLines = (lines, currentIndex) => {
            const regex = /(?:\d+\uFE0F?\u20E3|🔟)/;
            for (let i = currentIndex; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    return true;
                }
            }
            return false;
        };

        const finalizeCurrentItem = () => {
            if (currentItem) {
                if (currentItem.type === 'telegram') {
                    const bodyLines = currentItem.bodyLines;
                    if (currentItem.author === null) {
                        let firstNonEmptyIdx = -1;
                        for (let i = 0; i < bodyLines.length; i++) {
                            if (bodyLines[i].trim() !== "") {
                                firstNonEmptyIdx = i;
                                break;
                            }
                        }
                        if (firstNonEmptyIdx !== -1) {
                            const firstLine = bodyLines[firstNonEmptyIdx].trim();
                            if (firstLine.startsWith('@')) {
                                currentItem.author = window.cleanAuthorName(firstLine);
                                bodyLines.splice(firstNonEmptyIdx, 1);
                            } else {
                                currentItem.author = "Питання з чату";
                            }
                        } else {
                            currentItem.author = "Питання з чату";
                        }
                    }
                    currentItem.rawLines = [currentItem.author, ...bodyLines];
                }
                processOldItem(items, currentItem, filterIds, currentCounter, deletedItems, sourceType);
            }
        };

        lines.forEach((line, idx) => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes("❓❓❓ВОПРОСЫ")) return;
            if (trimmedLine.includes("Віталій Кривко")) return;

            // 1. Перевіряємо, чи це лінія з keycap emoji
            if (emojiNumberRegex.test(trimmedLine)) {
                finalizeCurrentItem();
                currentCounter++;
                currentItem = { type: 'keycap', rawLines: [] };
                return;
            }

            // 2. Перевіряємо, чи це Telegram-заголовок (Формат A чи B)
            const isHeaderA = tgHeaderARegex.test(trimmedLine);
            const isHeaderB = tgHeaderBRegex.test(trimmedLine);

            if ((isHeaderA || isHeaderB) && sourceType === 'old' && !hasKeycapInRemainingLines(lines, idx + 1)) {
                finalizeCurrentItem();
                currentCounter++;

                let author = null;
                const bodyLines = [];

                if (isHeaderB) {
                    const match = trimmedLine.match(tgHeaderBRegex);
                    if (match) {
                        const trailing = match[2] ? match[2].trim() : "";
                        if (trailing) {
                            if (trailing.startsWith('@')) {
                                author = window.cleanAuthorName(trailing);
                            } else {
                                bodyLines.push(trailing);
                            }
                        }
                    }
                }
                currentItem = { type: 'telegram', author: author, bodyLines: bodyLines };
                return;
            }

            // 3. Інакше додаємо до поточного блоку
            if (currentItem) {
                if (currentItem.type === 'keycap') {
                    currentItem.rawLines.push(line);
                } else if (currentItem.type === 'telegram') {
                    currentItem.bodyLines.push(line);
                }
            }
        });

        finalizeCurrentItem();
        return items;
    };

    for (const msg of messages) {
        const parts = msg.split(/(?:^|\r?\n)\s*🙏+[^\r\n]*(?:МОЛИТ|ПРОХАН)[^\r\n]*/iu);
        const questionsText = parts[0] || "";
        const prayersText = parts[1] || "";

        if (questionsText.trim()) {
            const qs = parseSection(questionsText, answeredIds, 'old');
            allQuestions = allQuestions.concat(qs);
        }
        if (prayersText.trim()) {
            const prs = parseSection(prayersText, null, 'pray');
            allPrayers = allPrayers.concat(prs);
        }
    }

    return { questions: allQuestions, prayers: allPrayers, deleted: deletedItems };
};

window.parseTelegramExportLineByLine = function(text) {
    const rawItems = [];
    const lines = text.split('\n');
    const headerARegex = /^.+?, \[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]$/;
    const headerBRegex = /^\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*.+?$/;
    const tgHeaderBRegex = /^\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*([^:\n]+)(?::\s*(.*))?$/;
    let currentItem = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        const isHeader = headerARegex.test(trimmed) || headerBRegex.test(trimmed);
        
        if (isHeader) {
            if (currentItem && currentItem.textLines.length > 0) { 
                rawItems.push({ author: currentItem.author || "Питання з чату", text: currentItem.textLines.join('\n').trim(), source: 'new' }); 
            }
            let author = null;
            const textLines = [];
            if (headerBRegex.test(trimmed)) {
                const match = trimmed.match(tgHeaderBRegex);
                if (match) {
                    const trailing = match[2] ? match[2].trim() : "";
                    if (trailing) {
                        if (trailing.startsWith('@')) {
                            author = window.cleanAuthorName(trailing);
                        } else {
                            textLines.push(trailing);
                        }
                    }
                }
            }
            currentItem = { author: author, textLines: textLines };
        } else if (currentItem) {
            if (trimmed === "") return;
            if (currentItem.author === null) {
                if (trimmed.startsWith('@')) { 
                    currentItem.author = window.cleanAuthorName(trimmed); 
                } else { 
                    currentItem.author = "Питання з чату"; 
                    currentItem.textLines.push(trimmed); 
                }
            } else { 
                currentItem.textLines.push(trimmed); 
            }
        }
    });

    if (currentItem && currentItem.textLines.length > 0) { 
        rawItems.push({ author: currentItem.author || "Питання з чату", text: currentItem.textLines.join('\n').trim(), source: 'new' }); 
    }

    const groupedItems = [];
    rawItems.forEach(item => {
        if (groupedItems.length > 0) {
            const lastGroup = groupedItems[groupedItems.length - 1];
            if (lastGroup.author === item.author) {
                if (!lastGroup.text.startsWith('🔹')) lastGroup.text = `🔹${lastGroup.text}`;
                lastGroup.text += `\n🔹${item.text}`;
                return;
            }
        }
        groupedItems.push(item);
    });
    return groupedItems;
};

window.processTelegramData = function() {
    const oldListText = $('#oldList').val();
    const answeredInput = $('#answeredIds').val();
    const telegramText = $('#newTelegram').val();
    const answeredIds = answeredInput.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const preservedData = window.parseAndFilterOldList(oldListText, answeredIds);
    
    let newQuestions;
    let newPrayers = [];
    if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(telegramText)) {
        const parsedNew = window.parseAndFilterOldList(telegramText, []);
        newQuestions = parsedNew.questions.map(q => ({ ...q, source: 'new' }));
        newPrayers = parsedNew.prayers.map(p => ({ ...p, source: 'pray' }));
    } else {
        newQuestions = window.parseTelegramExportLineByLine(telegramText);
    }
    
    // YouTube new items
    const ytItems = window.syh_yt_collected || [];
    const newYTQuestions = [];
    const newYTPrayers = [];

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
    preservedData.questions.forEach(q => oldQuestionsTotal += window.countQuestionsInText(q.text));
    
    const newLeftPeople = newQuestions.length;
    let newLeftQuestionsTotal = 0;
    newQuestions.forEach(q => newLeftQuestionsTotal += window.countQuestionsInText(q.text));
    const newLeftPrayersTotal = newPrayers.length;
    
    const newYTPeople = ytItems.length;
    let newYTQuestionsTotal = 0;
    newYTQuestions.forEach(q => newYTQuestionsTotal += window.countQuestionsInText(q.text));
    const newYTPrayersTotal = newYTPrayers.length;

    let delPeople = 0;
    let delQuestionsTotal = 0;
    preservedData.deleted.forEach(d => {
        if (d.type === 'block') { delPeople++; delQuestionsTotal += d.count; } 
        else if (d.type === 'sub') { delQuestionsTotal += d.count; }
    });
    
    const totalPeople = oldPeople + newLeftPeople + newYTPeople;
    const totalQuestions = oldQuestionsTotal + newLeftQuestionsTotal + newYTQuestionsTotal;
    const totalPrayers = combinedPrayers.length;
    
    $('.stat-item.old').html('Залишилось старих: <b>' + oldPeople + ' люд. - ' + oldQuestionsTotal + ' пит.</b>');
    $('#countDel').text(delPeople + ' люд. - ' + delQuestionsTotal + ' пит.');
    
    let newLeftText = newLeftPeople + ' люд. - ' + newLeftQuestionsTotal + ' пит.';
    if (newLeftPrayersTotal > 0) newLeftText += ' | Молитви: ' + newLeftPrayersTotal;
    $('#countNewLeft').html(newLeftText);
    
    if ($('#countNewYT').length === 0 && $('#statsBar').length > 0) {
        $('<span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT">0</b></span>').insertBefore('#statsBar .stat-item.total');
    }

    let newYTText = newYTPeople + ' люд. - ' + newYTQuestionsTotal + ' пит.';
    if (newYTPrayersTotal > 0) newYTText += ' | Молитви: ' + newYTPrayersTotal;
    $('#countNewYT').html(newYTText);

    let totalText = totalPeople + ' люд. - ' + totalQuestions + ' пит.';
    if (totalPrayers > 0) totalText += ' | Молитви: ' + totalPrayers;
    $('#countTotal').text(totalText);
    
    $('#statsBar').show();

    if (typeof window.updateCombinedCounters === 'function') {
        window.updateCombinedCounters();
    }
    
    const outputDiv = $('#finalResultDiv');
    outputDiv.empty();
    combinedQuestions.forEach((item, index) => {
        const emojiNum = window.numberToEmoji(index + 1);
        const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
        const block = $('<div>').addClass('q-block').addClass('q-' + item.source);
        block.text(textBlock);
        outputDiv.append(block);
    });
    if (combinedPrayers.length > 0) {
        const header = $('<div>').text("\n\n🙏🙏🙏МОЛИТВЫ\n");
        outputDiv.append(header);
        combinedPrayers.forEach((item, index) => {
            const emojiNum = window.numberToEmoji(index + 1);
            const textBlock = emojiNum + '\n' + item.author + '\n' + item.text + '\n\n';
            const block = $('<div>').addClass('q-block').addClass('q-pray');
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    const deletedLog = $('#deletedLog');
    deletedLog.empty();
    if (preservedData.deleted.length > 0) {
        preservedData.deleted.forEach(d => {
            let msg = '№' + d.originalId + ' (' + d.author + '): ';
            if (d.type === 'block') msg += 'Видалено повністю (' + d.count + ' пит.)';
            else msg += 'Видалено підпункт';
            deletedLog.append($('<div>').addClass('del-row').text(msg));
        });
        $('#deletedLogDetails').show();
    } else {
        $('#deletedLogDetails').hide();
    }

    // 30-денне очищення чекбоксів YouTube
    chrome.storage.local.get(['syh_yt_checkbox_state'], function(res) {
        const states = res.syh_yt_checkbox_state;
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
                chrome.storage.local.set({ syh_yt_checkbox_state: states });
            }
        }
    });

    // Збереження результатів процесингу Telegram в сховище
    chrome.storage.local.set({
        'tg_finalResultHtml': outputDiv.html(),
        'tg_statsHtml': $('#statsBar').html(),
        'tg_statsVisible': $('#statsBar').is(':visible'),
        'tg_deletedLogHtml': deletedLog.html(),
        'tg_deletedLogDetailsVisible': $('#deletedLogDetails').is(':visible'),
        'tg_deletedLogDetailsOpen': $('#deletedLogDetails').attr('open') !== undefined
    });
};

$(document).ready(function() {
    // Реактивне оновлення правої колонки при зміні зібраних коментарів YouTube
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function(changes, areaName) {
            if (areaName === 'local' && changes.syh_yt_collected) {
                if (typeof window.loadYTCollected === 'function') {
                    window.loadYTCollected();
                }
            }
        });
    }

    // Обробники кліку для генерації та копіювання списку питань
    $('#processTelegramBtn').click(function() { 
        try { 
            window.processTelegramData(); 
        } catch (e) { 
            alert("❌ Помилка:\n" + e.message); 
            console.error(e); 
        } 
    });
    
    $('#copyResultBtn').click(async function() {
        const plainText = $('#finalResultDiv').text(); 
        if (!plainText) return;

        const $btn = $(this);
        const originalText = $btn.text(); 

        const copyFallback = (txt) => {
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