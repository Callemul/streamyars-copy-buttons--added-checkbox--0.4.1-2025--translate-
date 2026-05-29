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
    const items = window.parseTelegramExportLineByLine(text);
    let peopleCount = items.length;
    let questionsCount = 0;
    items.forEach(q => questionsCount += window.countQuestionsInText(q.text));
    $('#tgTotalCount').text(`(${peopleCount} люд. - ${questionsCount} пит.)`);
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
    const parts = text.split(/🙏🙏🙏МОЛИТВЫ/i);
    const questionsText = parts[0] || "";
    const prayersText = parts[1] || "";
    const deletedItems = [];

    const parseSection = (sectionText, filterIds, sourceType) => {
        const lines = sectionText.split('\n');
        const items = [];
        let currentItem = null;
        let currentCounter = 0;
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

    return { questions: parseSection(questionsText, answeredIds, 'old'), prayers: parseSection(prayersText, null, 'pray'), deleted: deletedItems };
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
    let newItems = window.parseTelegramExportLineByLine(telegramText);
    const combinedQuestions = [...preservedData.questions, ...newItems];
    const combinedPrayers = [...preservedData.prayers];
    let oldPeople = preservedData.questions.length;
    let oldQuestionsTotal = 0;
    preservedData.questions.forEach(q => oldQuestionsTotal += window.countQuestionsInText(q.text));
    let newPeople = newItems.length;
    let newQuestionsTotal = 0;
    newItems.forEach(q => newQuestionsTotal += window.countQuestionsInText(q.text));
    let delPeople = 0;
    let delQuestionsTotal = 0;
    preservedData.deleted.forEach(d => {
        if (d.type === 'block') { delPeople++; delQuestionsTotal += d.count; } 
        else if (d.type === 'sub') { delQuestionsTotal += d.count; }
    });
    let totalPeople = oldPeople + newPeople;
    let totalQuestions = oldQuestionsTotal + newQuestionsTotal;
    $('.stat-item.old').html(`Залишилось старих: <b>${oldPeople} люд. - ${oldQuestionsTotal} пит.</b>`);
    $('#countDel').text(`${delPeople} люд. - ${delQuestionsTotal} пит.`);
    $('#countNew').text(`${newPeople} люд. - ${newQuestionsTotal} пит.`);
    $('#countTotal').text(`${totalPeople} люд. - ${totalQuestions} пит.`);
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
    
    $('#copyResultBtn').click(function() {
        const plainText = $('#finalResultDiv').text(); 
        const $temp = $("<textarea>"); 
        $("body").append($temp); 
        $temp.val(plainText).select(); 
        document.execCommand("copy"); 
        $temp.remove(); 
        const originalText = $(this).text(); 
        $(this).text("Скопійовано! ✅"); 
        setTimeout(() => $(this).text(originalText), 2000);
    });
});