import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comment_service';
import { RetentionService } from '../modules/retention_service';

import type { PrayerItem } from '../modules/types';
export type { PrayerItem };

// Хелпер відправки сигналу зняття зірки до StreamYard в реальному часі через SYH_MESSAGING
export function sendUnstarMessage(text: string): void {
    if (!text) return;
    SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: text });
}

// Хелпер відправки сигналів для списку коментарів
export function sendUnstarMessagesForList(prayersList: PrayerItem[]): void {
    if (!prayersList || prayersList.length === 0) return;
    prayersList.forEach(item => {
        if (item.text) {
            SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: item.text });
        }
    });
}

// Рендеринг та менеджмент молитовних прохань
export function renderPrayers(prayersList: PrayerItem[]): void {
    const outputDiv = $('#prayersResultDiv');
    outputDiv.empty();
    
    // Прибираємо старе попередження про інший ефір, якщо воно було
    $('#syh-room-warning').remove();
    outputDiv.removeAttr('contenteditable');

    if (!prayersList || prayersList.length === 0) {
        $('#prayersTotalCount').text('0 люд. - 0 прохань');
        outputDiv.html('<span style="color:#999; font-style:italic;">Список порожній. Натисніть кнопку 🔄 "Підтягнути", щоб завантажити зіркові коментарі з ефіру, або маркуйте їх вручну.</span>');
        outputDiv.data('raw-text', '');
        return;
    }

    // 0. ENSURE UNIQUE IDs FOR PRAYERS
    let needsSaveId = false;
    prayersList.forEach((p, idx) => {
        if (!p.id) {
            p.id = 'p_' + (p.timestamp || Date.now()) + '_' + idx + '_' + Math.random().toString(36).substring(2, 7);
            needsSaveId = true;
        }
    });
    if (needsSaveId) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: prayersList });
    }

    // 1. GARBAGE COLLECTION: Автоматично видаляємо молитви старіші за 2 дні та питання старіші за 30 днів
    const cleanedList = RetentionService.filterFreshPrayers(prayersList);

    if (cleanedList.length !== prayersList.length) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: cleanedList });
        prayersList = cleanedList;
    }

    // 2. СИГНАЛІЗАЦІЯ РОЗСИНХРОНІЗАЦІЇ (ROOM ID TRACKING)
    if (SYH_MESSAGING.isExtensionValid() && typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].url) return;
            try {
                const url = new URL(tabs[0].url);
                const currentRoomId = url.pathname.replace(/\//g, '');
                
                const onlyPrayers = prayersList.filter(p => p.type === 'prayer');
                const hasForeignPrayers = onlyPrayers.some(p => p.roomId && p.roomId !== currentRoomId);
                
                if (hasForeignPrayers) {
                    const warningHTML = `
                        <div id="syh-room-warning" style="background: #f39c12; color: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; font-weight: bold; font-size: 13px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span>⚠️ Знайдено молитви з минулого ефіру!</span>
                            </div>
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button id="syh-keep-prayers" style="background: #27ae60; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Залишити як є">✅ Залишити (Це мої)</button>
                                <button id="syh-wipe-prayers" style="background: #c0392b; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Видалити старі молитви з пам'яті розширення">🗑️ Очистити все</button>
                            </div>
                        </div>
                    `;
                    outputDiv.before(warningHTML);
                }
            } catch(e) { console.error("[SYH] Room check error", e); }
        });
    }

    const grouped: Record<string, { text: string; icon: string; id: string }[]> = {};
    let totalRequests = 0;

    const onlyPrayers = prayersList.filter(p => p.type === 'prayer');

    onlyPrayers.forEach((p) => {
        const cleanAuthor = p.author.replace(/^@+/, '');
        if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
        
        grouped[cleanAuthor].push({ 
            text: p.text, 
            icon: p.icon || '🙏🙏🙏',
            id: p.id! 
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
        
        const header = $('<div>').css({
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            width: '100%'
        });

        const leftWrap = $('<div>').css({
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            flex: '1',
            minWidth: '0'
        });

        const iconSpan = $('<span>')
            .css({ color: '#0b5394', fontWeight: 'bold', marginRight: '2px', whiteSpace: 'nowrap', flexShrink: '0' })
            .text(`${authorIcon} @`);

        const authorSpan = $('<span>')
            .addClass('editable-author')
            .attr('contenteditable', 'true')
            .css({
                color: '#0b5394',
                fontWeight: 'bold',
                outline: 'none',
                borderBottom: '1px dashed transparent',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            })
            .text(author);

        leftWrap.append(iconSpan, authorSpan);

        const rightWrap = $('<div>').css({ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: '0' });

        const editBtn = $('<button>')
            .addClass('edit-prayer-btn')
            .attr('title', 'Редагувати автора')
            .css({ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 4px' })
            .text('✏️');

        const delBtn = $('<button>')
            .addClass('del-author-btn')
            .attr('data-author', author)
            .attr('title', 'Видалити автора з усіма проханнями')
            .css({ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 4px' })
            .text('🗑️');

        rightWrap.append(editBtn, delBtn);
        header.append(leftWrap, rightWrap);
        block.append(header);

        if (grouped[author].length === 1) {
            const item = grouped[author][0];
            fullTextForCopy += `${item.text}\n\n`;
            
            const textContainer = $('<div>').css({display: 'flex', alignItems: 'flex-start', gap: '5px'});
            
            const textSpan = $('<span>')
                .addClass('editable-prayer')
                .attr('contenteditable', 'true')
                .attr('data-id', item.id)
                .css({flex: 1, outline: 'none', borderBottom: '1px dashed transparent', padding: '2px'})
                .text(item.text);
            
            const delBtnSingle = $('<button>')
                .text('❌')
                .attr('title', 'Видалити прохання')
                .attr('data-id', item.id)
                .addClass('del-prayer-btn')
                .css({background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px'});

            textContainer.append(textSpan).append(delBtnSingle);
            block.append(textContainer);
        } else {
            grouped[author].forEach((item, idx) => {
                fullTextForCopy += `${idx + 1}) ${item.text}\n`;
                
                const textContainer = $('<div>').css({display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px'});
                
                const indexSpan = $('<span>').css({color: '#666', fontWeight: 'bold', whiteSpace: 'nowrap'}).text(`${idx + 1}) `);
                
                const textSpan = $('<span>')
                    .addClass('editable-prayer')
                    .attr('contenteditable', 'true')
                    .attr('data-id', item.id)
                    .css({flex: 1, outline: 'none', borderBottom: '1px dashed transparent', padding: '2px'})
                    .text(item.text);
                
                const delBtnItem = $('<button>')
                    .text('❌')
                    .attr('title', 'Видалити прохання')
                    .attr('data-id', item.id)
                    .addClass('del-prayer-btn')
                    .css({background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px'});

                textContainer.append(indexSpan).append(textSpan).append(delBtnItem);
                block.append(textContainer);
            });
            fullTextForCopy += `\n`;
        }
        outputDiv.append(block);
    }

    outputDiv.data('raw-text', fullTextForCopy.trim());
}

$(document).ready(function() {
    $(document).on('focus', '.editable-prayer', function() {
        $(this).css('border-bottom', '1px dashed #2b7de9');
    }).on('blur', '.editable-prayer', function() {
        $(this).css('border-bottom', '1px dashed transparent');
        
        const id = $(this).attr('data-id');
        const newText = $(this).text().trim();
        
        SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
            const targetItem = list.find(item => item.id === id);
            if (targetItem && targetItem.text !== newText) {
                targetItem.text = newText;
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
            }
        });
    });

    $(document).on('focus', '.editable-author', function() {
        $(this).css('border-bottom', '1px dashed #2b7de9');
        $(this).data('old-val', $(this).text().trim());
    }).on('blur', '.editable-author', function() {
        $(this).css('border-bottom', '1px dashed transparent');
        
        const oldAuthor = $(this).data('old-val');
        const newAuthor = $(this).text().trim();
        
        if (oldAuthor && newAuthor && oldAuthor !== newAuthor) {
            SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
                const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
                let updated = false;
                list.forEach(item => {
                    if (item.author === oldAuthor) {
                        item.author = newAuthor;
                        updated = true;
                    }
                });
                if (updated) {
                    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
                }
            });
        }
    });

    $(document).on('click', '.edit-prayer-btn', function() {
        const block = $(this).closest('.q-block');
        const authorSpan = block.find('.editable-author');
        authorSpan.focus();
        
        const el = authorSpan[0];
        if (el) {
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    });

    $(document).on('click', '.del-author-btn', function() {
        const authorToDelete = $(this).data('author');
        if (confirm(`Видалити всі прохання від @${authorToDelete}?`)) {
            SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
                let list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
                const authorPrayers = list.filter(item => item.author === authorToDelete);
                
                sendUnstarMessagesForList(authorPrayers);
                
                list = list.filter(item => item.author !== authorToDelete);
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
                    renderPrayers(list);
                });
            });
        }
    });

    // Примусово очистити ВСЮ базу молитов без зняття зірок
    $(document).on('click', '#syh-wipe-prayers', function() {
        if (confirm("Повністю очистити старі молитви з пам'яті розширення?")) {
            SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: [] }, function() {
                renderPrayers([]);
            });
        }
    });

    // Залишити молитви (оновити Room ID)
    $(document).on('click', '#syh-keep-prayers', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs[0] || !tabs[0].url) return;
            try {
                const url = new URL(tabs[0].url);
                const currentRoomId = url.pathname.replace(/\//g, '');
                
                SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
                    const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
                    list.forEach(item => {
                        if (item.type === 'prayer') {
                            item.roomId = currentRoomId;
                            item.timestamp = Date.now(); 
                        }
                    });
                    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
                        renderPrayers(list);
                    });
                });
            } catch {
                /* ignore URL parse error */
            }
        });
    });

    $(document).on('click', '.del-prayer-btn', function() {
        const id = $(this).attr('data-id');
        SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            let list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
            const targetItem = list.find(item => item.id === id);
            if (targetItem) {
                sendUnstarMessage(targetItem.text);
            }
            list = list.filter(item => item.id !== id);
            SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
                renderPrayers(list);
            });
        });
    });

    $('#copyPrayersBtn').click(async function() {
        const text = $('#prayersResultDiv').data('raw-text');
        if (!text) return;

        const $btn = $(this);
        const originalText = $btn.text();

        const success = await CommentService.copyToClipboard(text);
        if (success) {
            $btn.text("Скопійовано! ✅");
        } else {
            $btn.text("Помилка ❌");
        }
        setTimeout(() => $btn.text(originalText), 2000);
    });

    // Очищення через червону кнопку корзини
    $('#clearPrayersBtn').click(function() {
        if (confirm("Очистити список молитовних прохань? Це не видалить їх зі Стрімярду.")) {
            SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
                let list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
                list = list.filter(item => item.type !== 'prayer');
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
                    renderPrayers(list);
                });
            });
        }
    });

    // 🔄 НОВЕ: ФОНОВЕ ПІДТЯГУВАННЯ ЗІРКОВИХ КОМЕНТАРІВ ЗІ STREAMYARD (ТІЛЬКИ МОЛИТВИ)
    $('#fetchPrayersBtn').click(async function() {
        const originalText = $(this).text();
        $(this).text("⌛...");

        try {
            const fetched = await SYH_MESSAGING.sendToActiveTab<PrayerItem[]>({ action: 'FETCH_PRAYERS' });
            if (fetched && Array.isArray(fetched)) {
                SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(res: Record<string, any>) {
                    const list: PrayerItem[] = res[STORAGE_KEYS.PRAYERS] || [];
                    let addedCount = 0;

                    fetched.forEach(f => {
                        if (!list.find(p => p.text === f.text)) {
                            list.push(f);
                            addedCount++;
                        }
                    });

                    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
                        renderPrayers(list);
                        $('#fetchPrayersBtn').text(originalText);
                        if (addedCount > 0) {
                            alert(`[SYH] Успішно підтягнуто нових молитов: ${addedCount}`);
                        } else {
                            alert("[SYH] Зіркових МОЛИТОВ не знайдено (або вони всі вже є в списку).");
                        }
                    });
                });
            } else {
                $('#fetchPrayersBtn').text(originalText);
                alert("[SYH] Не вдалося підтягнути молитви з активної вкладки StreamYard.");
            }
        } catch (err) {
            console.error("[SYH] Fetch prayers error:", err);
            $('#fetchPrayersBtn').text(originalText);
        }
    });
});
