import type { StorageRawResult, StorageWriteItems } from './storage_keys';
import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from './storage';
import { SHEET_REGISTRY } from './sheets';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export interface RetentionBackupSnapshot {
    timestamp: number;
    timestampIso: string;
    data: StorageRawResult;
}

export class RetentionService {
    /**
     * Перевіряє актуальність елемента молитов/питань за типом:
     * - Молитви (type === 'prayer'): 48 годин
     * - Питання (type !== 'prayer'): 30 днів
     */
    public static isFreshPrayerItem(item: { timestamp?: number; type?: string }, now: number = Date.now()): boolean {
        if (!item.timestamp) return true;
        const maxAge = item.type === 'prayer' ? TWO_DAYS_MS : THIRTY_DAYS_MS;
        return (now - item.timestamp < maxAge);
    }

    /**
     * Фільтрує масив молитов/питань, залишаючи тільки актуальні записи
     */
    public static filterFreshPrayers<T extends { timestamp?: number; type?: string }>(prayers: T[], now: number = Date.now()): T[] {
        if (!Array.isArray(prayers)) return [];
        return prayers.filter(p => RetentionService.isFreshPrayerItem(p, now));
    }

    /**
     * Створює автоматичну резервну копію (snapshot) списку зібраних коментарів перед очищенням
     */
    public static async createBackupSnapshot(): Promise<RetentionBackupSnapshot> {
        const sheetIds = SHEET_REGISTRY.getAllIds();
        const collectedKeys = sheetIds.map(id => getSheetCollectedStorageKey(id));
        const keysToFetch = [
            STORAGE_KEYS.PRAYERS,
            STORAGE_KEYS.YT_COLLECTED,
            ...collectedKeys
        ];

        const rawData = await SYH_STORAGE.getAsync(keysToFetch);
        const now = Date.now();
        const snapshot: RetentionBackupSnapshot = {
            timestamp: now,
            timestampIso: new Date(now).toISOString(),
            // Знімок зберігає прочитане ЯК Є, включно з ключами поза схемою —
            // це межа зі сховищем (`StorageRawResult`), а не типізовані дані.
            data: (rawData || {}) as StorageRawResult
        };

        await SYH_STORAGE.setAsync({
            [STORAGE_KEYS.AUTO_BACKUP_SNAPSHOT]: snapshot
        });

        console.log('[RetentionService] Automatic backup snapshot created:', snapshot.timestampIso);
        return snapshot;
    }

    /**
     * Очищення застарілих записів у всіх таблицях розширення
     */
    public static cleanExpiredTimestampEntries<T extends { timestamp?: number }>(
        record: Record<string, T> | undefined,
        maxAgeMs: number,
        now: number = Date.now()
    ): Record<string, T> | null {
        if (!record || typeof record !== 'object') return null;
        let modified = false;
        const cleaned = { ...record };
        for (const key of Object.keys(cleaned)) {
            if (cleaned[key]?.timestamp && (now - cleaned[key].timestamp > maxAgeMs)) {
                delete cleaned[key];
                modified = true;
            }
        }
        return modified ? cleaned : null;
    }

    public static async runGlobalCleanup(): Promise<void> {
        await RetentionService.createBackupSnapshot();
        const now = Date.now();

        const res = await SYH_STORAGE.getAsync([
            STORAGE_KEYS.YT_CHECKBOX_STATE,
            STORAGE_KEYS.PRAYERS,
            STORAGE_KEYS.STUDIO_CHECKBOX_STATE
        ]);

        const updates: StorageWriteItems = {};

        const freshYtCheckboxes = RetentionService.cleanExpiredTimestampEntries(res[STORAGE_KEYS.YT_CHECKBOX_STATE], THIRTY_DAYS_MS, now);
        if (freshYtCheckboxes) updates[STORAGE_KEYS.YT_CHECKBOX_STATE] = freshYtCheckboxes;

        const prayers = res[STORAGE_KEYS.PRAYERS];
        if (Array.isArray(prayers)) {
            const freshPrayers = RetentionService.filterFreshPrayers(prayers, now);
            if (freshPrayers.length !== prayers.length) {
                updates[STORAGE_KEYS.PRAYERS] = freshPrayers;
            }
        }

        const freshStudioCheckboxes = RetentionService.cleanExpiredTimestampEntries(res[STORAGE_KEYS.STUDIO_CHECKBOX_STATE], THIRTY_DAYS_MS, now);
        if (freshStudioCheckboxes) updates[STORAGE_KEYS.STUDIO_CHECKBOX_STATE] = freshStudioCheckboxes;

        if (Object.keys(updates).length > 0) {
            await SYH_STORAGE.setAsync(updates);
            console.log('[RetentionService] Automatic data cleanup finished:', Object.keys(updates));
        }
    }
}
