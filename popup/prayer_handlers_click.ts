import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { sendUnstarMessage, sendUnstarMessagesForList } from './prayer_messaging';
import { renderPrayers } from './prayer_render';
import { bindPrayerFocusListeners } from './prayer_handlers_focus';
import { bindPrayerToolbarListeners } from './prayer_handlers_toolbar';
import type { PrayerItem } from '../modules/types';

export function handleEditPrayerAuthor(editBtn: Element): void {
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
}

export function handleDeleteAuthorPrayers(delAuthorBtn: Element): void {
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
}

export function handleWipeAllPrayers(): void {
    if (confirm("Повністю очистити старі молитви з пам'яті розширення?")) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: [] }, function() {
            renderPrayers([]);
        });
    }
}

export function handleKeepCurrentRoomPrayers(): void {
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
}

export function handleDeleteSinglePrayer(delPrayerBtn: Element): void {
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

export function bindPrayerClickListeners(): void {
    document.addEventListener('click', function(e) {
        const target = e.target as Element | null;

        const editBtn = target?.closest('.edit-prayer-btn');
        if (editBtn) {
            handleEditPrayerAuthor(editBtn);
            return;
        }

        const delAuthorBtn = target?.closest('.del-author-btn');
        if (delAuthorBtn) {
            handleDeleteAuthorPrayers(delAuthorBtn);
            return;
        }

        const wipeBtn = target?.closest('#syh-wipe-prayers');
        if (wipeBtn) {
            handleWipeAllPrayers();
            return;
        }

        const keepBtn = target?.closest('#syh-keep-prayers');
        if (keepBtn) {
            handleKeepCurrentRoomPrayers();
            return;
        }

        const delPrayerBtn = target?.closest('.del-prayer-btn');
        if (delPrayerBtn) {
            handleDeleteSinglePrayer(delPrayerBtn);
        }
    });
}

export function initPopupPrayersListeners(): void {
    bindPrayerFocusListeners();
    bindPrayerClickListeners();
    bindPrayerToolbarListeners();
}