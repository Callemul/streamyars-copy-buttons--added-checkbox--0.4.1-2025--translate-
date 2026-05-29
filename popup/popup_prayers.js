// popup_prayers.js
// Рендеринг та менеджмент молитовних прохань
window.renderPrayers = function(prayersList) {
    const outputDiv = $('#prayersResultDiv');
    outputDiv.empty();
    
    // Вимикаємо редагування всього блоку, будемо редагувати точково
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
        // Зачищаємо всі @ на початку імені, щоб не було дублів
        const cleanAuthor = p.author.replace(/^@+/, '');
        if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
        
        // Зберігаємо оригінальний індекс масиву, щоб знати, що редагувати/видаляти
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
        
        // Логіка визначення загальної іконки автора для заголовка
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
        const header = $(`<div style="margin-bottom: 5px;"><b style="color: #0b5394;">${authorIcon} @${author}</b></div>`);
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
                // Копіювання в буфер обміну залишено без змін (іконки зберігаються)
                fullTextForCopy += `${idx + 1}) ${item.icon} ${item.text}\n`;
                
                const textContainer = $('<div>').css({display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px'});
                
                // ФІКС ВІЗУАЛУ: Прибираємо іконку ТІЛЬКИ з візуального інтерфейсу попапу, залишаючи лише номер
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