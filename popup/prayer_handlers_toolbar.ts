import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comment_service';
import { renderPrayers } from './prayer_render';
import { $ } from './prayer_utils'
import type { PrayerItem } from '../modules/types';

export function bindPrayerToolbarListeners(): void {
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