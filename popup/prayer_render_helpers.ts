import { SYH_MESSAGING } from '../modules/messaging';
import { setStyle, getAuthorIcon } from './prayer_utils';

import type { PrayerItem } from '../modules/types';

export function checkRoomWarning(prayersList: PrayerItem[], outputDiv: HTMLElement): void {
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
}

export function buildAuthorHeader(author: string, items: { text: string; icon: string; id: string }[]): { header: HTMLElement; authorIcon: string } {
    const authorIcon = getAuthorIcon(items);

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

    return { header, authorIcon };
}

export function buildPrayerRow(item: { text: string; id: string }, idx?: number): HTMLElement {
    const textContainer = document.createElement('div');
    setStyle(textContainer, {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '5px',
        ...(idx !== undefined ? { marginBottom: '4px' } : {})
    });

    if (idx !== undefined) {
        const indexSpan = document.createElement('span');
        setStyle(indexSpan, { color: '#666', fontWeight: 'bold', whiteSpace: 'nowrap' });
        indexSpan.textContent = `${idx + 1}) `;
        textContainer.appendChild(indexSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'editable-prayer';
    textSpan.setAttribute('contenteditable', 'true');
    textSpan.setAttribute('data-id', item.id);
    setStyle(textSpan, { flex: '1', outline: 'none', borderBottom: '1px dashed transparent', padding: '2px' });
    textSpan.textContent = item.text;

    const delBtn = document.createElement('button');
    delBtn.textContent = '❌';
    delBtn.setAttribute('title', 'Видалити прохання');
    delBtn.setAttribute('data-id', item.id);
    delBtn.className = 'del-prayer-btn';
    setStyle(delBtn, { background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: '12px' });

    textContainer.append(textSpan, delBtn);
    return textContainer;
}