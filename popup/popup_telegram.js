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

window.updateNewInputStats = function() {
    const text = $('#newTelegram').val();
    if (!text) { $('#tgTotalCount').text(''); return; }
    let peopleCount;
    let questionsCount = 0;
    let prayersCount;
    if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(text)) {
        const parsed = window.parseAndFilterOldList(text, []);
        peopleCount = parsed.questions.length;
        parsed.questions.forEach(q => questionsCount += window.countQuestionsInText(q.text));
        prayersCount = parsed.prayers.length;
        $('#tgTotalCount').text(`(${peopleCount} люд. - ${questionsCount} пит. | Молитви: ${prayersCount})`);
    } else {
        const items = window.parseTelegramExportLineByLine(text);
        peopleCount = items.length;
        items.forEach(q => questionsCount += window.countQuestionsInText(q.text));
        $('#tgTotalCount').text(`(${peopleCount} люд. - ${questionsCount} пит.)`);
    }
    $('#tgTotalCount').css({ 'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px' });
};

window.numberToEmoji = function(num) {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num];
    return num.toString().split('').map(d => emojis[parseInt(d)]).join('');
};

window.cleanAuthorName = function(rawName) {
    let name = rawName.trim();
    if (name.startsWith('@')) name = name.substring(1);
    name = name.replace(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/, '');
    name = name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, '$1 $2');
    return name.trim();
};

window.parseAndFilterOldList = function(text, answeredIds) {
    const tgHeaderRegex = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\Snapshot_or_time\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;
    const cleanRegex = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;
    
    let messages = [];
    let match;
    let lastIdx = 0;
    
    // Розбиваємо за заголовками повідомлень Telegram
    while ((match = cleanRegex.exec(text)) !== null) {
        const part = text.substring(lastIdx, match.index).trim();
        if (part) messages.push(part);
        lastIdx = cleanRegex.lastIndex;
    }
    const lastPart = text.substring(lastIdx).trim();
    if (lastPart) messages.push(lastPart);
    if (messages.length === 0) messages = [text];

    let allQuestions = [];
    let allPrayers = [];
    const deletedItems = [];

    const processOldItem = (itemsArray, itemObj, filterIds, id, deletedArr, src) => {
        let lines = itemObj.rawLines;
        while (lines.length > 0 && lines[0].trim() === "") lines.shift();
        if (lines.length === 0) return;

        let author = lines[0].trim();
        let rawText = lines.slice(1).map(l => l.trimEnd()).join('\n').trim();
        if (!author) author = "Анонім";

        const totalQuestionsInBlock = window.countQuestionsInText(rawText);

        if (filterIds && filterIds.includes(id)) {
            deletedArr.push({ originalId: id, author: author, type: 'block', count: totalQuestionsInBlock });
            return;
        }
        
        if (rawText.includes('🔹') && filterIds) {
            const subIndexesToRemove = filterIds.filter(fid => Math.floor(fid) === id && fid % 1 !== 0).map(fid => Math.round((fid % 1) * 10));

            if (subIndexesToRemove.length > 0) {
                let subQuestions = rawText.split('🔹').map(t => t.trim()).filter(Boolean);
                subIndexesToRemove.forEach(idx => {
                    if (subQuestions[idx-1]) deletedArr.push({ originalId: `${id}.${idx}`, author: author, type: 'sub', count: 1 });
                });

                let filteredSubQuestions = subQuestions.filter((_, idx) => !subIndexesToRemove.includes(idx + 1));

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

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes("❓❓❓ВОПРОСЫ")) return;
            if (trimmedLine.includes("Віталій Кривко")) return;

            if (emojiNumberRegex.test(trimmedLine)) {
                if (currentItem) processOldItem(items, currentItem, filterIds, currentCounter, deletedItems, sourceType);
                currentCounter++;
                currentItem = { rawLines: [] };
            } 
            else if (currentItem) {
                currentItem.rawLines.push(line);
            }
        });

        if (currentItem) processOldItem(items, currentItem, filterIds, currentCounter, deletedItems, sourceType);
        return items;
    };

    for (const msg of messages) {
        const parts = msg.split(/(?:^|\r?\n)\s*🙏+[^\r\nа-яА-Яa-zA-Z]*(?:МОЛИТ|ПРОХАН)[^\r\n]*/iu);
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
    const headerRegex = /^.+?, \[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]$/;
    let currentItem = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (headerRegex.test(trimmed)) {
            if (currentItem && currentItem.textLines.length > 0) { rawItems.push({ author: currentItem.author, text: currentItem.textLines.join('\n').trim(), source: 'new' }); }
            currentItem = { author: null, textLines: [] };
        } else if (currentItem) {
            if (trimmed === "") return;
            if (currentItem.author === null) {
                if (trimmed.startsWith('@')) { currentItem.author = window.cleanAuthorName(trimmed); } 
                else { currentItem.author = "Питання з чату"; currentItem.textLines.push(trimmed); }
            } else { currentItem.textLines.push(trimmed); }
        }
    });

    if (currentItem && currentItem.textLines.length > 0) { rawItems.push({ author: currentItem.author || "Питання з чату", text: currentItem.textLines.join('\n').trim(), source: 'new' }); }

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
    const answeredIds = answeredInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    let preservedData = window.parseAndFilterOldList(oldListText, answeredIds);
    
    let newQuestions;
    let newPrayers = [];
    if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(telegramText)) {
        let parsedNew = window.parseAndFilterOldList(telegramText, []);
        newQuestions = parsedNew.questions.map(q => ({ ...q, source: 'new' }));
        newPrayers = parsedNew.prayers.map(p => ({ ...p, source: 'pray' }));
    } else {
        newQuestions = window.parseTelegramExportLineByLine(telegramText);
    }
    
    const combinedQuestions = [...preservedData.questions, ...newQuestions];
    const combinedPrayers = [...preservedData.prayers, ...newPrayers];
    
    let oldPeople = preservedData.questions.length;
    let oldQuestionsTotal = 0;
    preservedData.questions.forEach(q => oldQuestionsTotal += window.countQuestionsInText(q.text));
    
    let newPeople = newQuestions.length;
    let newQuestionsTotal = 0;
    newQuestions.forEach(q => newQuestionsTotal += window.countQuestionsInText(q.text));
    
    let newPrayersTotal = newPrayers.length;
    
    let delPeople = 0;
    let delQuestionsTotal = 0;
    preservedData.deleted.forEach(d => {
        if (d.type === 'block') { delPeople++; delQuestionsTotal += d.count; } 
        else if (d.type === 'sub') { delQuestionsTotal += d.count; }
    });
    
    let totalPeople = oldPeople + newPeople;
    let totalQuestions = oldQuestionsTotal + newQuestionsTotal;
    let totalPrayers = combinedPrayers.length;
    
    $('.stat-item.old').html(`Залишилось старих: <b>${oldPeople} люд. - ${oldQuestionsTotal} пит.</b>`);
    $('#countDel').text(`${delPeople} люд. - ${delQuestionsTotal} пит.`);
    
    let newText = `${newPeople} люд. - ${newQuestionsTotal} пит.`;
    if (newPrayersTotal > 0) newText += ` | Молитви: ${newPrayersTotal}`;
    $('#countNew').html(newText);
    
    let totalText = `${totalPeople} люд. - ${totalQuestions} пит.`;
    if (totalPrayers > 0) totalText += ` | Молитви: ${totalPrayers}`;
    $('#countTotal').text(totalText);
    
    $('#statsBar').show();
    
    const outputDiv = $('#finalResultDiv');
    outputDiv.empty();
    let fullText = "❓❓❓ВОПРОСЫ 🔹\n";
    combinedQuestions.forEach((item, index) => {
        const emojiNum = window.numberToEmoji(index + 1);
        const textBlock = `${emojiNum}\n${item.author}\n${item.text}\n\n`;
        fullText += textBlock;
        const block = $('<div>').addClass('q-block').addClass(`q-${item.source}`);
        block.text(textBlock);
        outputDiv.append(block);
    });
    if (combinedPrayers.length > 0) {
        fullText += "\n\n🙏🙏🙏МОЛИТВЫ\n";
        const header = $('<div>').text("\n\n🙏🙏🙏МОЛИТВЫ\n");
        outputDiv.append(header);
        combinedPrayers.forEach((item, index) => {
            const emojiNum = window.numberToEmoji(index + 1);
            const textBlock = `${emojiNum}\n${item.author}\n${item.text}\n\n`;
            fullText += textBlock;
            const block = $('<div>').addClass('q-block').addClass('q-pray');
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    const deletedLog = $('#deletedLog');
    deletedLog.empty();
    if (preservedData.deleted.length > 0) {
        preservedData.deleted.forEach(d => {
            let msg = `№${d.originalId} (${d.author}): `;
            if (d.type === 'block') msg += `Видалено повністю (${d.count} пит.)`;
            else msg += `Видалено підпункт`;
            deletedLog.append($('<div>').addClass('del-row').text(msg));
        });
        $('#deletedLogDetails').show();
    } else {
        $('#deletedLogDetails').hide();
    }
};

$(document).ready(function() {
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