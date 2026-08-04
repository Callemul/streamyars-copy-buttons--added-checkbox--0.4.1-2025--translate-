import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comment_service';
import { RetentionService } from '../modules/retention_service';

import type { PrayerItem } from '../modules/types';
export type { PrayerItem };

function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function setStyle(el: HTMLElement, styles: Record<string, string>): void {
    Object.assign(el.style, styles);
}

export function sendUnstarMessage(text: string): void {
    if (!text) return;
    SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: text });
}

export function sendUnstarMessagesForList(prayersList: PrayerItem[]): void {
    if (!prayersList || prayersList.length === 0) return;
    prayersList.forEach(item => {
        if (item.text) {
            SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: item.text });
        }
    });
}

export function renderPrayers(prayersList: PrayerItem[]): void {
    const outputDiv = $('prayersResultDiv');
    if (!outputDiv) return;
    outputDiv.innerHTML = '';

    const roomWarning = $('syh-room-warning');
    if (roomWarning) roomWarning.remove();
    outputDiv.removeAttribute('contenteditable');

    if (!prayersList || prayersList.length === 0) {
        const totalCount = $('prayersTotalCount');
        if (totalCount) totalCount.textContent = '0 люд. - 0 прохань';
        outputDiv.innerHTML = '<span style="color:#999; font-style:italic;">Список порожній. Натисніть кнопку 🔄 "Підтягнути", щоб завантажити зіркові коментарі з ефіру, або маркуйте їх вручну.</span>';
        outputDiv.setAttribute('data-raw-text', '');
        return;
    }

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

    const cleanedList = RetentionService.filterFreshPrayers(prayersList);

    if (cleanedList.length !== prayersList.length) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: cleanedList });
        prayersList = cleanedList;
    }

    if (SYH_MESSAGING.isExtensionValid() && typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].url) return;
            try {
                const url = new URL(tabs[0].url);
                const isStreamYard = url.hostname.includes('streamyard.com');
                const currentRoomId = url.pathname.replace(/\//g, '');
                const nonRoomPaths = ['broadcasts', 'destinations', 'plan', 'members', 'billing', 'settings', 'onboarding', 'home', 'login', 'signup', 'logout', ''];
                const isStudioRoom = isStreamYard && currentRoomId && !nonRoomPaths.includes(currentRoomId.toLowerCase());

                if (isStudioRoom) {
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
                        outputDiv.insertAdjacentHTML('beforebegin', warningHTML);
                    }
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
    const totalCount = $('prayersTotalCount');
    if (totalCount) totalCount.textContent = `${authorsCount} люд. - ${totalRequests} прохань`;

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

        const block = document.createElement('div');
        block.className = 'q-block q-pray';
        block.style.position = 'relative';

        const header = document.createElement('div');
        setStyle(header, {
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            width: '100%'
        });

        const leftWrap = document.createElement('div');
        setStyle(leftWrap, {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            flex: '1',
            minWidth: '0'
        });

        const iconSpan = document.createElement('span');
        setStyle(iconSpan, { color: '#0b5394', fontWeight: 'bold', marginRight: '2px', whiteSpace: 'nowrap', flexShrink: '0' });
        iconSpan.textContent = `${authorIcon} @`;

        const authorSpan = document.createElement('span');
        authorSpan.className = 'editable-author';
        authorSpan.setAttribute('contenteditable', 'true');
        setStyle(authorSpan, {
            color: '#0b5394',
            fontWeight: 'bold',
            outline: 'none',
            borderBottom: '1px dashed transparent',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        });
        authorSpan.textContent = author;

        leftWrap.append(iconSpan, authorSpan);

        const rightWrap = document.createElement('div');
        setStyle(rightWrap, { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: '0' });

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-prayer-btn';
        editBtn.setAttribute('title', 'Редагувати автора');
        setStyle(editBtn, { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 4px' });
        editBtn.textContent = '✏️';

        const delBtn = document.createElement('button');
        delBtn.className = 'del-author-btn';
        delBtn.setAttribute('data-author', author);
        delBtn.setAttribute('title', 'Видалити автора з усіма проханнями');
        setStyle(delBtn, { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 4px' });
        delBtn.textContent = '🗑️';

        rightWrap.append(editBtn, delBtn);
        header.append(leftWrap, rightWrap);
        block.appendChild(header);

        if (grouped[author].length === 1) {
            const item = grouped[author][0];
            fullTextForCopy += `${item.text}\n\n`;

            const textContainer = document.createElement('div');
            setStyle(textContainer, { display: 'flex', alignItems: 'flex-start', gap: '5px' });

            const textSpan = document.createElement('span');
            textSpan.className = 'editable-prayer';
            textSpan.setAttribute('contenteditable', 'true');
            textSpan.setAttribute('data-id', item.id);
            setStyle(textSpan, { flex: '1', outline: 'none', borderBottom: '1px dashed transparent', padding: '2px' });
            textSpan.textContent = item.text;

            const delBtnSingle = document.createElement('button');
            delBtnSingle.textContent = '❌';
            delBtnSingle.setAttribute('title', 'Видалити прохання');
            delBtnSingle.setAttribute('data-id', item.id);
            delBtnSingle.className = 'del-prayer-btn';
            setStyle(delBtnSingle, { background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px' });

            textContainer.append(textSpan, delBtnSingle);
            block.appendChild(textContainer);
        } else {
            grouped[author].forEach((item, idx) => {
                fullTextForCopy += `${idx + 1}) ${item.text}\n`;

                const textContainer = document.createElement('div');
                setStyle(textContainer, { display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '4px' });

                const indexSpan = document.createElement('span');
                setStyle(indexSpan, { color: '#666', fontWeight: 'bold', whiteSpace: 'nowrap' });
                indexSpan.textContent = `${idx + 1}) `;

                const textSpan = document.createElement('span');
                textSpan.className = 'editable-prayer';
                textSpan.setAttribute('contenteditable', 'true');
                textSpan.setAttribute('data-id', item.id);
                setStyle(textSpan, { flex: '1', outline: 'none', borderBottom: '1px dashed transparent', padding: '2px' });
                textSpan.textContent = item.text;

                const delBtnItem = document.createElement('button');
                delBtnItem.textContent = '❌';
                delBtnItem.setAttribute('title', 'Видалити прохання');
                delBtnItem.setAttribute('data-id', item.id);
                delBtnItem.className = 'del-prayer-btn';
                setStyle(delBtnItem, { background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px' });

                textContainer.append(indexSpan, textSpan, delBtnItem);
                block.appendChild(textContainer);
            });
            fullTextForCopy += `\n`;
        }
        outputDiv.appendChild(block);
    }

    outputDiv.setAttribute('data-raw-text', fullTextForCopy.trim());
}

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('focusin', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-prayer') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed #2b7de9';
    });

    document.addEventListener('focusout', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-prayer') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed transparent';

        const id = el.getAttribute('data-id');
        const newText = el.textContent?.trim() || '';

        SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
            const targetItem = list.find(item => item.id === id);
            if (targetItem && targetItem.text !== newText) {
                targetItem.text = newText;
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
            }
        });
    });

    document.addEventListener('focusin', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-author') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed #2b7de9';
        el.setAttribute('data-old-val', el.textContent?.trim() || '');
    });

    document.addEventListener('focusout', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-author') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed transparent';

        const oldAuthor = el.getAttribute('data-old-val');
        const newAuthor = el.textContent?.trim() || '';

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

    document.addEventListener('click', function(e) {
        const target = e.target as Element | null;

        const editBtn = target?.closest('.edit-prayer-btn');
        if (editBtn) {
            const block = editBtn.closest('.q-block');
            const authorSpan = block?.querySelector('.editable-author') as HTMLElement | null;
            if (authorSpan) {
                authorSpan.focus();

                const range = document.createRange();
                const sel = window.getSelection();
                if (sel) {
                    range.selectNodeContents(authorSpan);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
            return;
        }

        const delAuthorBtn = target?.closest('.del-author-btn');
        if (delAuthorBtn) {
            const authorToDelete = delAuthorBtn.getAttribute('data-author') || '';
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
            return;
        }

        const wipeBtn = target?.closest('#syh-wipe-prayers');
        if (wipeBtn) {
            if (confirm("Повністю очистити старі молитви з пам'яті розширення?")) {
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: [] }, function() {
                    renderPrayers([]);
                });
            }
            return;
        }

        const keepBtn = target?.closest('#syh-keep-prayers');
        if (keepBtn) {
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
            return;
        }

        const delPrayerBtn = target?.closest('.del-prayer-btn');
        if (delPrayerBtn) {
            const id = delPrayerBtn.getAttribute('data-id');
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
        }
    });

    const copyBtn = $('copyPrayersBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async function() {
            const outputDiv = $('prayersResultDiv');
            const text = outputDiv ? (outputDiv.getAttribute('data-raw-text') || '') : '';
            if (!text) return;

            const btn = this as HTMLElement;
            const originalText = btn.textContent || '';

            const success = await CommentService.copyToClipboard(text);
            btn.textContent = success ? "Скопійовано! ✅" : "Помилка ❌";
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        });
    }

    const clearBtn = $('clearPrayersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
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
    }

    const fetchBtn = $('fetchPrayersBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async function() {
            const originalText = this.textContent || '';
            this.textContent = "⌛...";

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
                            fetchBtn.textContent = originalText;
                            if (addedCount > 0) {
                                alert(`[SYH] Успішно підтягнуто нових молитов: ${addedCount}`);
                            } else {
                                alert("[SYH] Зіркових МОЛИТОВ не знайдено (або вони всі вже є в списку).");
                            }
                        });
                    });
                } else {
                    fetchBtn.textContent = originalText;
                    alert("[SYH] Не вдалося підтягнути молитви з активної вкладки StreamYard.");
                }
            } catch (err) {
                console.error("[SYH] Fetch prayers error:", err);
                fetchBtn.textContent = originalText;
            }
        });
    }
});
