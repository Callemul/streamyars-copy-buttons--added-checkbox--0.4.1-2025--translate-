// popup_prayers.js
// Хелпер відправки сигналу зняття зірки до StreamYard в реальному часі
function sendUnstarMessage(text) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'unstar_comment', text: text });
        }
    });
}

// Хелпер відправки сигналів для списку коментарів
function sendUnstarMessagesForList(prayersList) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
            prayersList.forEach(item => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'unstar_comment', text: item.text });
            });
        }
    });
}

// Рендеринг та менеджмент молитовних прохань
window.renderPrayers = function(prayersList) {
    const outputDiv = $('#prayersResultDiv');
    outputDiv.empty();
    
    // Прибираємо старе попередження про інший ефір, якщо воно було
    $('#syh-room-warning').remove();
    
    outputDiv.removeAttr('contenteditable');

    if (!prayersList || prayersList.length === 0) {
        $('#prayersTotalCount').text('0 люд. - 0 прохань');
        outputDiv.html('<span style="color:#999; font-style:italic;">Список порожній. Натискайте 🙏 біля коментарів у StreamYard, щоб додати сюди молитовні прохання.</span>');
        outputDiv.data('raw-text', '');
        return;
    }

    // 1. GARBAGE COLLECTION: Автоматично видаляємо записи, старіші за 30 днів
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let cleanedList = prayersList.filter(item => {
        if (!item.timestamp) return true;
        return (now - item.timestamp) < thirtyDaysMs;
    });

    if (cleanedList.length !== prayersList.length) {
        chrome.storage.local.set({ 'syh_prayers': cleanedList });
        prayersList = cleanedList;
    }

    // 2. СИГНАЛІЗАЦІЯ РОЗСИНХРОНІЗАЦІЇ (ROOM ID TRACKING) з вибором дій
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0] || !tabs[0].url) return;
        try {
            const url = new URL(tabs[0].url);
            const currentRoomId = url.pathname.replace(/\//g, '');
            
            const onlyPrayers = prayersList.filter(p => p.type === 'prayer');
            const hasForeignPrayers = onlyPrayers.some(p => p.roomId && p.roomId !== currentRoomId);
            
            if (hasForeignPrayers) {
                const warningHTML = `
                    <div id="syh-room-warning" style="background: #e74c3c; color: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; font-weight: bold; font-size: 13px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>⚠️ Збережено молитви з іншого ефіру!</span>
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button id="syh-relink-foreign-prayers" style="background: #2ecc71; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Переприв'язати всі старі молитви до поточного архіву чи кімнати">🔗 Переприв'язати</button>
                            <button id="syh-clear-foreign-prayers" style="background: white; color: #e74c3c; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Видалити чужі молитви та зняти з них зірки">🧹 Очистити ефір</button>
                        </div>
                    </div>
                `;
                outputDiv.before(warningHTML);
            }
        } catch(e) { console.error("[SYH] Room check error", e); }
    });

    const grouped = {};
    let totalRequests = 0;

    const onlyPrayers = prayersList.filter(p => p.type === 'prayer');

    onlyPrayers.forEach((p, originalIndex) => {
        const cleanAuthor = p.author.replace(/^@+/, '');
        if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
        
        grouped[cleanAuthor].push({ 
            text: p.text, 
            icon: p.icon || '🙏🙏🙏',
            originalIndex: prayersList.indexOf(p) 
        });
        totalRequests++;
    });

    const authorsCount = Object.keys(grouped).length;
    $('#prayersTotalCount').text(`${authorsCount} люд. - ${totalRequests} прохань`);

    let fullTextForCopy = "🙏🙏🙏 МОЛИТВЕННЫЕ ПРОСЬБЫ\n\n";

    for (const author in grouped) {
        let hasPrayer = false;
        let hasThanks = false;
        
        grouped[author].forEach(item => {
            if (item.icon === '🙏🙏🙏') hasPrayer = true;
            if (item.icon === '❤️❤️❤️') hasThanks = true;
            if (item.icon === '🙏❤️🙏') { hasPrayer = true; hasThanks = true; }
        });
        
        let authorIcon = '🙏🙏🙏';
        if (hasPrayer && hasThanks) authorIcon = '🙏❤️🙏';
        else if (!hasPrayer && hasThanks) authorIcon = '❤️❤️❤️';

        fullTextForCopy += `${authorIcon} @${author}\n`;
        
        const block = $('<div>').addClass('q-block q-pray').css('position', 'relative');
        
        const header = $(`
            <div style="margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between; flex-wrap: nowrap; width: 100%;">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; flex: 1; min-width: 0;">
                    <span style="color: #0b5394; font-weight: bold; margin-right: 2px; white-space: nowrap; flex-shrink: 0;">${authorIcon} @</span>
                    <span class="editable-author" contenteditable="true" style="color: #0b5394; font-weight: bold; outline: none; border-bottom: 1px dashed transparent; white-space: nowrap; display: inline-block; overflow: hidden; text-overflow: ellipsis;">${author}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button class="edit-prayer-btn" title="Редагувати автора" style="background: none; border: none; cursor: pointer; font-size: 13px; padding: 0 4px;">✏️</button>
                    <button class="del-author-btn" data-author="${author}" title="Видалити автора з усіма проханнями" style="background: none; border: none; cursor: pointer; font-size: 13px; padding: 0 4px;">🗑️</button>
                </div>
            </div>
        `);
        block.append(header);

        if (grouped[author].length === 1) {
            const item = grouped[author][0];
            fullTextForCopy += `${item.text}\n\n`;
            
            const textContainer = $('<div>').css({display: 'flex', alignItems: 'flex-start', gap: '5px'});
            
            const textSpan = $('<span>')
                .addClass('editable-prayer')
                .attr('contenteditable', 'true')
                .attr('data-index', item.originalIndex)
                .css({flex: 1, outline: 'none', borderBottom: '1px dashed transparent', padding: '2px'})
                .text(item.text);
            
            const delBtn = $('<button>')
                .html('❌')
                .attr('title', 'Видалити прохання')
                .attr('data-index', item.originalIndex)
                .addClass('del-prayer-btn')
                .css({background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px'});

            textContainer.append(textSpan).append(delBtn);
            block.append(textContainer);
        } else {
            grouped[author].forEach((item, idx) => {
                fullTextForCopy += `${idx + 1}) ${item.text}\n`;
                
                const textContainer = $('<div>').css({display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px'});
                
                const indexSpan = $('<span>').css({color: '#666', fontWeight: 'bold', whiteSpace: 'nowrap'}).text(`${idx + 1}) `);
                
                const textSpan = $('<span>')
                    .addClass('editable-prayer')
                    .attr('contenteditable', 'true')
                    .attr('data-index', item.originalIndex)
                    .css({flex: 1, outline: 'none', borderBottom: '1px dashed transparent', padding: '2px'})
                    .text(item.text);
                
                const delBtn = $('<button>')
                    .html('❌')
                    .attr('title', 'Видалити прохання')
                    .attr('data-index', item.originalIndex)
                    .addClass('del-prayer-btn')
                    .css({background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px'});

                textContainer.append(indexSpan).append(textSpan).append(delBtn);
                block.append(textContainer);
            });
            fullTextForCopy += `\n`;
        }
        outputDiv.append(block);
    }

    outputDiv.data('raw-text', fullTextForCopy.trim());
};

$(document).ready(function() {
    // 1. Слухач подій для фокусу/збереження змін при редагуванні молитов
    $(document).on('focus', '.editable-prayer', function() {
        $(this).css('border-bottom', '1px dashed #2b7de9');
    }).on('blur', '.editable-prayer', function() {
        $(this).css('border-bottom', '1px dashed transparent');
        
        const index = $(this).data('index');
        const newText = $(this).text().trim();
        
        chrome.storage.local.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            if (list[index] && list[index].text !== newText) {
                list[index].text = newText;
                chrome.storage.local.set({ 'syh_prayers': list });
            }
        });
    });

    // Слухач подій для фокусу/збереження змін при редагуванні Імені Автора
    $(document).on('focus', '.editable-author', function() {
        $(this).css('border-bottom', '1px dashed #2b7de9');
        $(this).data('old-val', $(this).text().trim());
    }).on('blur', '.editable-author', function() {
        $(this).css('border-bottom', '1px dashed transparent');
        
        const oldAuthor = $(this).data('old-val');
        const newAuthor = $(this).text().trim();
        
        if (oldAuthor && newAuthor && oldAuthor !== newAuthor) {
            chrome.storage.local.get(['syh_prayers'], function(result) {
                let list = result.syh_prayers || [];
                let updated = false;
                list.forEach(item => {
                    if (item.author === oldAuthor) {
                        item.author = newAuthor;
                        updated = true;
                    }
                });
                if (updated) {
                    chrome.storage.local.set({ 'syh_prayers': list });
                }
            });
        }
    });

    // Клік по олівцю - фокусує ім'я автора для швидкого редагування
    $(document).on('click', '.edit-prayer-btn', function() {
        const block = $(this).closest('.q-block');
        const authorSpan = block.find('.editable-author');
        authorSpan.focus();
        
        const el = authorSpan[0];
        if (el) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // Клік по кнопці масового видалення автора (🗑️) — знімає зірки в SY та видаляє з бази
    $(document).on('click', '.del-author-btn', function() {
        const authorToDelete = $(this).data('author');
        if (confirm(`Видалити всі прохання від @${authorToDelete}?`)) {
            chrome.storage.local.get(['syh_prayers'], function(result) {
                let list = result.syh_prayers || [];
                const authorPrayers = list.filter(item => item.author === authorToDelete);
                
                // Двостороння синхронізація: автоматично unstar ці коментарі у StreamYard
                sendUnstarMessagesForList(authorPrayers);
                
                list = list.filter(item => item.author !== authorToDelete);
                chrome.storage.local.set({ 'syh_prayers': list }, function() {
                    if (window.renderPrayers) window.renderPrayers(list);
                });
            });
        }
    });

    // Клік по кнопці "Переприв'язати" у плашці попередження
    $(document).on('click', '#syh-relink-foreign-prayers', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs[0] || !tabs[0].url) return;
            try {
                const url = new URL(tabs[0].url);
                const currentRoomId = url.pathname.replace(/\//g, '');
                
                chrome.storage.local.get(['syh_prayers'], function(result) {
                    let list = result.syh_prayers || [];
                    list.forEach(item => {
                        // Переприв'язуємо чужі молитви під поточну кімнату архіву/ефіру
                        if (item.type === 'prayer') {
                            item.roomId = currentRoomId;
                            item.timestamp = Date.now(); // Оновлюємо мітку часу, щоб уникнути GC видалення
                        }
                    });
                    chrome.storage.local.set({ 'syh_prayers': list }, function() {
                        if (window.renderPrayers) window.renderPrayers(list);
                    });
                });
            } catch(e) {}
        });
    });

    // Клік по кнопці очищення ЧУЖИХ молитов у плашці попередження (З Двостронньою Синхронізацією)
    $(document).on('click', '#syh-clear-foreign-prayers', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs[0] || !tabs[0].url) return;
            try {
                const url = new URL(tabs[0].url);
                const currentRoomId = url.pathname.replace(/\//g, '');
                
                chrome.storage.local.get(['syh_prayers'], function(result) {
                    let list = result.syh_prayers || [];
                    const foreignPrayers = list.filter(item => item.roomId && item.roomId !== currentRoomId);
                    
                    // Двостороння синхронізація: знімаємо зірки з чужих коментарів у StreamYard
                    sendUnstarMessagesForList(foreignPrayers);
                    
                    // Залишаємо виключно свої прохання для цього ефіру
                    list = list.filter(item => {
                        return !item.roomId || item.roomId === currentRoomId;
                    });
                    chrome.storage.local.set({ 'syh_prayers': list }, function() {
                        if (window.renderPrayers) window.renderPrayers(list);
                    });
                });
            } catch(e) {}
        });
    });

    // Слухач кліку для видалення індивідуального прохання (З МИТТЄВИМ ОНОВЛЕННЯМ UI ТА UNSTAR СИГНАЛОМ)
    $(document).on('click', '.del-prayer-btn', function() {
        const index = $(this).data('index');
        chrome.storage.local.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            const targetItem = list[index];
            if (targetItem) {
                // Двостороння синхронізація: знімаємо зірку з коментаря у StreamYard
                sendUnstarMessage(targetItem.text);
            }
            list.splice(index, 1);
            chrome.storage.local.set({ 'syh_prayers': list }, function() {
                if (window.renderPrayers) window.renderPrayers(list);
            });
        });
    });

    // 3. Обробник копіювання списку молитов в буфер
    $('#copyPrayersBtn').click(function() {
        const text = $('#prayersResultDiv').data('raw-text');
        if (!text) return;
        const $temp = $("<textarea>");
        $("body").append($temp);
        $temp.val(text).select();
        document.execCommand("copy");
        $temp.remove();
        const originalText = $(this).text();
        $(this).text("Скопійовано! ✅");
        setTimeout(() => $(this).text(originalText), 2000);
    });

    // 4. Обробник повного очищення списку молитовних прохань (З МИТТЄВИМ ОНОВЛЕННЯМ UI — Без зняття зірок у SY за ТЗ)
    $('#clearPrayersBtn').click(function() {
        if (confirm("Очистити список молитовних прохань? Це не видалить їх зі Стрімярду.")) {
            chrome.storage.local.get(['syh_prayers'], function(result) {
                let list = result.syh_prayers || [];
                list = list.filter(item => item.type !== 'prayer');
                chrome.storage.local.set({ 'syh_prayers': list }, function() {
                    if (window.renderPrayers) window.renderPrayers(list);
                });
            });
        }
    });
});