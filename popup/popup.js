// ==========================================
// ЧАСТИНА 1: СТАРИЙ КОД
// ==========================================
var db = {};
function translitToRussian(translitText) {
    const translitMap = { "A": "А", "B": "Б", "V": "В", "G": "Г", "D": "Д", "E": "Е", "YO": "Ё", "J": "Ж", "ZH": "Ж", "Z": "З", "I": "И", "Y": "Й", "K": "К", "L": "Л", "M": "М", "N": "Н", "O": "О", "P": "П", "R": "Р", "S": "С", "T": "Т", "U": "У", "F": "Ф", "H": "Х", "C": "Ц", "CH": "Ч", "SH": "Ш", "SHCH": "Щ", "YU": "Ю", "YA": "Я", "'": "ь", "Y'": "Ы", "X": "Х", "\"": "\"", ":": ":", ";": ";", ".": ".", ",": ",", "!": "!", "?": "?", "%": "%", "*": "*", "(": "(", ")": ")", "-": "-", "_": "_", "@": "@", "~": "~", "a": "а", "b": "б", "v": "в", "g": "г", "d": "д", "e": "е", "yo": "ё", "j": "ж", "zh": "ж", "z": "з", "i": "и", "y": "ы", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о", "p": "п", "r": "р", "s": "с", "t": "т", "u": "у", "f": "ф", "h": "х", "c": "ц", "ch": "ч", "sh": "ш", "shch": "щ", "Yu": "Ю", "yu": "ю", "Ya": "Я", "ya": "я", "'": "ь", "y'": "ы", "x": "х" };
    translitText = translitText.replaceAll('BLAGODARU', 'БЛАГОДАРЮ').replaceAll('BLAGODARNOST', 'БЛАГОДАРНОСТЬ').replaceAll('SINOVIAX', 'СЫНОВЬЯХ').replaceAll('moiu', 'мою').replaceAll('bratia', 'братья');
    translitText = translitText.replaceAll('ts', 'ц').replaceAll('ei', 'ей').replaceAll('shch', 'щ').replaceAll('sh', 'ш').replaceAll('ch', 'ч').replaceAll('ya', 'я').replaceAll('yu', 'ю').replaceAll('yo', 'ё').replaceAll('zh', 'ж');
    translitText = translitText.replaceAll('TS', 'Ц').replaceAll('EI', 'ЕЙ').replaceAll('SHCH', 'Щ').replaceAll('SH', 'Ш').replaceAll('CH', 'Ч').replaceAll('YA', 'Я').replaceAll('YU', 'Ю').replaceAll('YO', 'Ё').replaceAll('ZH', 'Ж');
    const words = translitText.split(' ');
    const russianWords = words.map(word => {
        let russianWord = "";
        let curLetter = "";
        for (let i = 0; i < word.length; i++) {
            curLetter += word[i];
            if (translitMap[curLetter]) { russianWord += translitMap[curLetter]; curLetter = ""; } else { russianWord += word[i]; curLetter = ""; }
        }
        return russianWord;
    });
    return russianWords.join(' ');
}
function saveDataToStorage() { chrome.storage.local.set({'db':db}); }

// ==========================================
// ЧАСТИНА 2: НОВИЙ КОД (ТЕЛЕГРАМ)
// ==========================================

$(document).ready(function(){
    // ВІДНОВЛЕННЯ
    chrome.storage.local.get(['tg_oldList', 'tg_answered', 'tg_newTelegram', 'db'], function(result) {
        if (result.tg_oldList) {
            $('#oldList').val(result.tg_oldList);
            updateOldInputStats(); 
        }
        if (result.tg_answered) $('#answeredIds').val(result.tg_answered);
        if (result.tg_newTelegram) {
            $('#newTelegram').val(result.tg_newTelegram);
            updateNewInputStats();
        }
        if(result.db) { db = result.db; if(db.newTitleSS) $("#sschoolName").val(db.newTitleSS); if(db.newTitlePreach) $("#preachNameInput").val(db.newTitlePreach); }
    });

    // Лісенери
    $('#oldList').on('input', function() {
        chrome.storage.local.set({'tg_oldList': $(this).val()});
        updateOldInputStats();
    });
    
    $('#newTelegram').on('input', function() {
        chrome.storage.local.set({'tg_newTelegram': $(this).val()});
        updateNewInputStats();
    });
    
    $('#answeredIds').on('input', function() {
        chrome.storage.local.set({'tg_answered': $(this).val()});
    });

    $('#clearStateBtn').click(function() {
        if(confirm("Очистити всі поля введення?")) {
            $('#oldList, #answeredIds, #newTelegram').val('');
            $('#finalResultDiv').empty();
            $('#statsBar').hide();
            $('#deletedLogDetails').hide();
            $('#oldTotalCount').text('');
            $('#tgTotalCount').text('');
            chrome.storage.local.remove(['tg_oldList', 'tg_answered', 'tg_newTelegram']);
        }
    });

    $('.tab-link').click(function() {
        var tabId = $(this).data('tab');
        $('.tab-link').removeClass('active');
        $('.tab-content').removeClass('active');
        $(this).addClass('active');
        $('#' + tabId).addClass('active');
    });

    $("#Translate").click(function(){ $("#textArea2_generatedRuText").val(translitToRussian($("#textArea1_oldText").val())); });
    $("#sschoolNameBtn").click(function(){ db.newTitleSS = $("#sschoolName").val(); saveDataToStorage(); alert("Збережено!"); });
    $("#preachNameBtn").click(function(){ db.newTitlePreach = $("#preachNameInput").val(); saveDataToStorage(); alert("Збережено!"); });

    $('#processTelegramBtn').click(function() {
        try { processTelegramData(); } catch (e) { alert("❌ Помилка:\n" + e.message); console.error(e); }
    });

    $('#copyResultBtn').click(function() {
        var plainText = $('#finalResultDiv').text();
        var $temp = $("<textarea>");
        $("body").append($temp);
        $temp.val(plainText).select();
        document.execCommand("copy");
        $temp.remove();
        var originalText = $(this).text();
        $(this).text("Скопійовано! ✅");
        setTimeout(() => $(this).text(originalText), 2000);
    });
});

// --- HELPERS ---
function countQuestionsInText(text) {
    if (!text) return 0;
    const bullets = (text.match(/🔹/g) || []).length;
    return bullets > 0 ? bullets : 1;
}

// --- СТАТИСТИКА ВХІДНИХ ДАНИХ (СТАРИЙ СПИСОК) ---
function updateOldInputStats() {
    const text = $('#oldList').val();
    if (!text) { $('#oldTotalCount').text(''); return; }

    // Використовуємо ТОЙ САМИЙ ПАРСЕР, що і для обробки.
    // Передаємо пустий масив filterIds, щоб нічого не видаляти і порахувати все.
    const parsed = parseAndFilterOldList(text, []); 
    
    // Тепер це точні дані (19 людей)
    const qPeople = parsed.questions.length;
    
    // Рахуємо суму питань (підпунктів)
    let qQuestions = 0;
    parsed.questions.forEach(q => qQuestions += countQuestionsInText(q.text));

    const pCount = parsed.prayers.length;
    
    // Формат: (19 людей - 34 питання | Молитви: 12)
    $('#oldTotalCount').text(`(${qPeople} людей - ${qQuestions} питань | Молитви: ${pCount})`);
    $('#oldTotalCount').css({'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px'});
}

// --- СТАТИСТИКА ВХІДНИХ ДАНИХ (НОВИЙ ТЕЛЕГРАМ) ---
function updateNewInputStats() {
    const text = $('#newTelegram').val();
    if (!text) { $('#tgTotalCount').text(''); return; }

    const items = parseTelegramExportLineByLine(text);
    
    let peopleCount = items.length;
    let questionsCount = 0;
    items.forEach(q => questionsCount += countQuestionsInText(q.text));

    $('#tgTotalCount').text(`(${peopleCount} людей - ${questionsCount} питань)`);
    $('#tgTotalCount').css({'color': '#2b7de9', 'font-weight': 'bold', 'font-size': '12px'});
}


// --- ГОЛОВНА ЛОГІКА ОБРОБКИ ---

function processTelegramData() {
    const oldListText = $('#oldList').val();
    const answeredInput = $('#answeredIds').val();
    const telegramText = $('#newTelegram').val();

    const answeredIds = answeredInput.split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));

    let preservedData = parseAndFilterOldList(oldListText, answeredIds);
    let newItems = parseTelegramExportLineByLine(telegramText);

    const combinedQuestions = [...preservedData.questions, ...newItems];
    const combinedPrayers = [...preservedData.prayers];

    // --- ПІДРАХУНОК РЕЗУЛЬТАТІВ ---
    
    // 1. Старі (що залишились)
    let oldPeople = preservedData.questions.length;
    let oldQuestionsTotal = 0;
    preservedData.questions.forEach(q => oldQuestionsTotal += countQuestionsInText(q.text));

    // 2. Нові
    let newPeople = newItems.length;
    let newQuestionsTotal = 0;
    newItems.forEach(q => newQuestionsTotal += countQuestionsInText(q.text));

    // 3. Видалені
    let delPeople = 0;
    let delQuestionsTotal = 0;
    
    preservedData.deleted.forEach(d => {
        if (d.type === 'block') {
            delPeople++;
            delQuestionsTotal += d.count; 
        } else if (d.type === 'sub') {
            delQuestionsTotal += d.count; 
        }
    });

    // 4. Разом
    let totalPeople = oldPeople + newPeople;
    let totalQuestions = oldQuestionsTotal + newQuestionsTotal;

    // Оновлюємо UI Статистики
    $('.stat-item.old').html(`Залишилось старих: <b>${oldPeople} люд. - ${oldQuestionsTotal} пит.</b>`);
    $('#countDel').text(`${delPeople} люд. - ${delQuestionsTotal} пит.`);
    $('#countNew').text(`${newPeople} люд. - ${newQuestionsTotal} пит.`);
    $('#countTotal').text(`${totalPeople} люд. - ${totalQuestions} пит.`);
    $('#statsBar').show();

    // Генерація HTML
    const outputDiv = $('#finalResultDiv');
    outputDiv.empty();

    let fullText = "❓❓❓ВОПРОСЫ 🔹\n";
    
    combinedQuestions.forEach((item, index) => {
        const emojiNum = numberToEmoji(index + 1);
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
            const emojiNum = numberToEmoji(index + 1);
            const textBlock = `${emojiNum}\n${item.author}\n${item.text}\n\n`;
            fullText += textBlock;
            const block = $('<div>').addClass('q-block').addClass('q-pray');
            block.text(textBlock);
            outputDiv.append(block);
        });
    }
    
    const deletedLog = $('#deletedLog');
    deletedLog.empty();
    if(preservedData.deleted.length > 0) {
        preservedData.deleted.forEach(d => {
            let msg = `№${d.originalId} (${d.author}): `;
            if(d.type === 'block') msg += `Видалено повністю (${d.count} пит.)`;
            else msg += `Видалено підпункт`;
            deletedLog.append($('<div>').addClass('del-row').text(msg));
        });
        $('#deletedLogDetails').show();
    } else {
        $('#deletedLogDetails').hide();
    }
}

function numberToEmoji(num) {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num];
    return num.toString().split('').map(d => emojis[parseInt(d)]).join('');
}

function cleanAuthorName(rawName) {
    let name = rawName.trim();
    if (name.startsWith('@')) name = name.substring(1);
    name = name.replace(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/, '');
    name = name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, '$1 $2');
    return name.trim();
}

function parseAndFilterOldList(text, answeredIds) {
    const parts = text.split(/🙏🙏🙏МОЛИТВЫ/i);
    const questionsText = parts[0] || "";
    const prayersText = parts[1] || "";
    const deletedItems = [];

    const parseSection = (sectionText, filterIds, sourceType) => {
        const lines = sectionText.split('\n');
        const items = [];
        let currentItem = null;
        let currentCounter = 0;
        
        const emojiNumberRegex = /^([0-9]*[️⃣🔟])+\s*$/; 

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes("❓❓❓ВОПРОСЫ")) return;
            // Важливо: це сміттєві рядки, які можуть поламати логіку, якщо їх не видалити
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

        const totalQuestionsInBlock = countQuestionsInText(rawText);

        if (filterIds && filterIds.includes(id)) {
            deletedArr.push({ 
                originalId: id, 
                author: author, 
                type: 'block', 
                count: totalQuestionsInBlock 
            });
            return;
        }
        
        if (rawText.includes('🔹') && filterIds) {
            const subIndexesToRemove = filterIds
                .filter(fid => Math.floor(fid) === id && fid % 1 !== 0)
                .map(fid => Math.round((fid % 1) * 10));

            if (subIndexesToRemove.length > 0) {
                let subQuestions = rawText.split('🔹').map(t => t.trim()).filter(Boolean);
                subIndexesToRemove.forEach(idx => {
                    if(subQuestions[idx-1]) {
                        deletedArr.push({ originalId: `${id}.${idx}`, author: author, type: 'sub', count: 1 });
                    }
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

    return {
        questions: parseSection(questionsText, answeredIds, 'old'),
        prayers: parseSection(prayersText, null, 'pray'),
        deleted: deletedItems
    };
}

function parseTelegramExportLineByLine(text) {
    const rawItems = [];
    const lines = text.split('\n');
    const headerRegex = /^.+?, \[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]$/;
    let currentItem = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        
        if (headerRegex.test(trimmed)) {
            if (currentItem && currentItem.textLines.length > 0) {
                rawItems.push({ author: currentItem.author, text: currentItem.textLines.join('\n').trim(), source: 'new' });
            }
            currentItem = { author: null, textLines: [] };
        } 
        else if (currentItem) {
            if (trimmed === "") return;
            if (currentItem.author === null) {
                if (trimmed.startsWith('@')) {
                    currentItem.author = cleanAuthorName(trimmed);
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
}