import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comment_service';
import { renderPrayers } from './prayer_render';
import { sendUnstarMessage, sendUnstarMessagesForList } from './prayer_api';
import { $ } from './prayer_utils';

function handleEditPrayerAuthor(editBtn: Element): void {
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

function handleDeleteAuthorPrayers(delAuthorBtn: Element): void {
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

function handleWipeAllPrayers(): void {
    if (confirm("Повністю очистити старі молитви з пам'яті розширення?")) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: [] }, function() {
            renderPrayers([]);
        });
    }
}

function handleKeepCurrentRoomPrayers(): void {
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

function handleDeleteSinglePrayer(delPrayerBtn: Element): void {
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

function bindPrayerClickListeners(): void {
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

function bindPrayerFocusListeners(): void {
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
}

function bindPrayerToolbarListeners(): void {
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
}

export function initPopupPrayersListeners(): void {
    bindPrayerFocusListeners();
    bindPrayerClickListeners();
    bindPrayerToolbarListeners();
}

import type { PrayerItem } from '../modules/types';