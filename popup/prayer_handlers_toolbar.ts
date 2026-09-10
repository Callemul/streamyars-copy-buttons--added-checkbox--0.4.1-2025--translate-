import type { StorageReadResult } from '../modules/storage';
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comments/comment_service';
import { showBanner } from '../modules/core/utils_notify';
import { savePrayersAndRender } from './prayer_render';
import { $ } from './prayer_utils'
import {
    CLEAR_PRAYERS_CONFIRM_MESSAGE,
    COPY_LABEL_RESET_DELAY_MS,
    FETCH_PENDING_LABEL,
    FETCH_PRAYERS_FAILED_MESSAGE,
    PRAYER_ENTRY_TYPE,
    buildFetchSummaryMessage,
    copyResultLabel,
    isPrayerListPayload,
    mergeFetchedPrayers,
    readElementLabel,
    readRawPrayerText,
    readStoredPrayers,
    removePrayerEntries
} from './prayer_toolbar_actions';
import type { PrayerItem } from '../modules/core/types';

type ToolbarClickHandler = (this: HTMLElement, ev: MouseEvent) => void | Promise<void>;

async function handleCopyPrayersClick(this: HTMLElement): Promise<void> {
    const text = readRawPrayerText($('prayersResultDiv'));
    if (!text) return;

    const originalText = readElementLabel(this);

    const success = await CommentService.copyToClipboard(text);
    this.textContent = copyResultLabel(success);
    setTimeout(() => { this.textContent = originalText; }, COPY_LABEL_RESET_DELAY_MS);
}

function handleClearPrayersClick(): void {
    if (!confirm(CLEAR_PRAYERS_CONFIRM_MESSAGE)) return;

    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: StorageReadResult) {
        const stored = readStoredPrayers(result, STORAGE_KEYS.PRAYERS);
        const prayersToRemove = stored.filter(item => item.type === PRAYER_ENTRY_TYPE);
        prayersToRemove.forEach(p => {
            void CommentService.removePrayerRecord(p.text);
        });
        const list = removePrayerEntries(stored);
        savePrayersAndRender(list, () => {});
    });
}

/** Зливає підтягнуті молитви зі збереженими, зберігає результат і звітує користувачу. */
async function storeFetchedPrayers(fetched: PrayerItem[], btn: HTMLElement, originalText: string): Promise<void> {
    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], async function(res: StorageReadResult) {
        const stored = readStoredPrayers(res, STORAGE_KEYS.PRAYERS);
        const { list, addedCount } = mergeFetchedPrayers(stored, fetched);

        // SSOT: Зберігаємо нові молитви через CommentService.savePrayerRecord
        for (const item of fetched) {
            if (!stored.some(existing => existing.text === item.text)) {
                await CommentService.savePrayerRecord({
                    id: item.id,
                    author: item.author,
                    text: item.text,
                    type: item.type || 'prayer',
                    icon: item.icon || '🙏🙏🙏',
                    roomId: item.roomId || '',
                    timestamp: item.timestamp || Date.now()
                });
            }
        }

        savePrayersAndRender(list, () => {
            btn.textContent = originalText;
            showBanner(buildFetchSummaryMessage(addedCount));
        });
    });
}

async function handleFetchPrayersClick(this: HTMLElement): Promise<void> {
    const originalText = readElementLabel(this);
    this.textContent = FETCH_PENDING_LABEL;

    try {
        const fetched = await SYH_MESSAGING.sendToActiveTab<PrayerItem[]>({ action: 'FETCH_PRAYERS' });

        if (!isPrayerListPayload(fetched)) {
            this.textContent = originalText;
            showBanner(FETCH_PRAYERS_FAILED_MESSAGE, 'error');
            return;
        }

        await storeFetchedPrayers(fetched, this, originalText);
    } catch (err) {
        console.error("[SYH] Fetch prayers error:", err);
        this.textContent = originalText;
    }
}

function bindToolbarClick(id: string, handler: ToolbarClickHandler): void {
    const el = $(id);
    if (el) {
        el.addEventListener('click', handler as EventListener);
    }
}

export function bindPrayerToolbarListeners(): void {
    bindToolbarClick('copyPrayersBtn', handleCopyPrayersClick);
    bindToolbarClick('clearPrayersBtn', handleClearPrayersClick);
    bindToolbarClick('fetchPrayersBtn', handleFetchPrayersClick);
}
