// popup_prayers.js
// Рендеринг та менеджмент молитовних прохань
window.renderPrayers = function(prayersList) {
    const outputDiv = $('#prayersResultDiv');
    outputDiv.empty();
    
    outputDiv.removeAttr('contenteditable');

    if (!prayersList || prayersList.length === 0) {
        $('#prayersTotalCount').text('0 люд. - 0 прохань');
        outputDiv.html('<span style="color:#999; font-style:italic;">Список порожній. Натискайте 🙏 біля коментарів у StreamYard, щоб додати сюди молитовні прохання.</span>');
        outputDiv.data('raw-text', '');
        return;
    }

    const grouped = {};
    let totalRequests = 0;

    // Відбираємо тільки молитовні (ігноруємо питання)
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
        
        // Заголовок з редагованою span-зоною для імені та олівцем
        const header = $(`
            <div style="margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <span style="color: #0b5394; font-weight: bold;">${authorIcon} @</span>
                    <span class="editable-author" contenteditable="true" style="color: #0b5394; font-weight: bold; outline: none; border-bottom: 1px dashed transparent;">${author}</span>
                </div>
                <button class="edit-prayer-btn" title="Редагувати автора та повідомлення" style="background: none; border: none; cursor: pointer; font-size: 13px; padding: 0 4px;">✏️</button>
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
                // ФІКС 12: Прибираємо спам іконок з кожної лінії при копіюванні
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

    // 2. Слухач кліку для видалення індивідуального прохання
    $(document).on('click', '.del-prayer-btn', function() {
        const index = $(this).data('index');
        chrome.storage.local.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            list.splice(index, 1);
            chrome.storage.local.set({ 'syh_prayers': list });
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

    // 4. Обробник повного очищення списку молитовних прохань
    $('#clearPrayersBtn').click(function() {
        if (confirm("Очистити список молитовних прохань? Це не видалить їх зі Стрімярду.")) {
            chrome.storage.local.get(['syh_prayers'], function(result) {
                let list = result.syh_prayers || [];
                list = list.filter(item => item.type !== 'prayer');
                chrome.storage.local.set({ 'syh_prayers': list });
            });
        }
    });
});