import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { SYH_MESSAGING } from '../modules/messaging';
import { CommentService } from '../modules/comment_service';
import { renderPrayers } from './prayer_render';
import { $ } from './prayer_utils'
import {
    CLEAR_PRAYERS_CONFIRM_MESSAGE,
    COPY_LABEL_RESET_DELAY_MS,
    FETCH_PENDING_LABEL,
    FETCH_PRAYERS_FAILED_MESSAGE,
    buildFetchSummaryMessage,
    copyResultLabel,
    isPrayerListPayload,
    mergeFetchedPrayers,
    readElementLabel,
    readRawPrayerText,
    readStoredPrayers,
    removePrayerEntries
} from './prayer_toolbar_actions';
import type { PrayerItem } from '../modules/types';

type ToolbarClickHandler = (this: HTMLElement, ev: MouseEvent) => void | Promise<void>;

/** Записує список у сховище і перемальовує його; `after` виконується вже після рендера. */
function savePrayersAndRender(list: PrayerItem[], after: () => void): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
        renderPrayers(list);
        after();
    });
}

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

    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
        const list = removePrayerEntries(readStoredPrayers(result, STORAGE_KEYS.PRAYERS));
        savePrayersAndRender(list, () => {});
    });
}

/** Зливає підтягнуті молитви зі збереженими, зберігає результат і звітує користувачу. */
function storeFetchedPrayers(fetched: PrayerItem[], btn: HTMLElement, originalText: string): void {
    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(res: Record<string, any>) {
        const { list, addedCount } = mergeFetchedPrayers(
            readStoredPrayers(res, STORAGE_KEYS.PRAYERS),
            fetched
        );

        savePrayersAndRender(list, () => {
            btn.textContent = originalText;
            alert(buildFetchSummaryMessage(addedCount));
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
            alert(FETCH_PRAYERS_FAILED_MESSAGE);
            return;
        }

        storeFetchedPrayers(fetched, this, originalText);
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
