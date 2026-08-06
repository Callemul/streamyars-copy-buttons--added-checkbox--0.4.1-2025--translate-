import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from './storage';
import { SHEET_REGISTRY } from './sheets';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export interface RetentionBackupSnapshot {
    timestamp: number;
    timestampIso: string;
    data: Record<string, any>;
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

        const rawData = await SYH_STORAGE.getAsync<Record<string, any>>(keysToFetch);
        const now = Date.now();
        const snapshot: RetentionBackupSnapshot = {
            timestamp: now,
            timestampIso: new Date(now).toISOString(),
            data: rawData || {}
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
    public static async runGlobalCleanup(): Promise<void> {
        // 0. Автоматичний резервний бекап перед очищенням
        await RetentionService.createBackupSnapshot();

        const now = Date.now();

        const res = await SYH_STORAGE.getAsync<Record<string, any>>([
            STORAGE_KEYS.YT_CHECKBOX_STATE,
            STORAGE_KEYS.PRAYERS,
            STORAGE_KEYS.STUDIO_CHECKBOX_STATE,
            STORAGE_KEYS.STUDIO_BUTTON_STATE
        ]);

        const updates: Record<string, any> = {};

        // 1. Очищення YT Чекбоксів (30 днів)
        const ytCheckboxes = res[STORAGE_KEYS.YT_CHECKBOX_STATE];
        if (ytCheckboxes && typeof ytCheckboxes === 'object') {
            let modified = false;
            for (const key of Object.keys(ytCheckboxes)) {
                if (ytCheckboxes[key]?.timestamp && (now - ytCheckboxes[key].timestamp > THIRTY_DAYS_MS)) {
                    delete ytCheckboxes[key];
                    modified = true;
                }
            }
            if (modified) updates[STORAGE_KEYS.YT_CHECKBOX_STATE] = ytCheckboxes;
        }

        // 2. Очищення Молитов (48 годин) та питань (30 днів)
        const prayers = res[STORAGE_KEYS.PRAYERS];
        if (Array.isArray(prayers)) {
            const freshPrayers = RetentionService.filterFreshPrayers(prayers, now);
            if (freshPrayers.length !== prayers.length) {
                updates[STORAGE_KEYS.PRAYERS] = freshPrayers;
            }
        }

        // 3. Очищення Studio станів (30 днів)
        const studioCheckboxes = res[STORAGE_KEYS.STUDIO_CHECKBOX_STATE];
        if (studioCheckboxes && typeof studioCheckboxes === 'object') {
            let modified = false;
            for (const key of Object.keys(studioCheckboxes)) {
                if (studioCheckboxes[key]?.timestamp && (now - studioCheckboxes[key].timestamp > THIRTY_DAYS_MS)) {
                    delete studioCheckboxes[key];
                    modified = true;
                }
            }
            if (modified) updates[STORAGE_KEYS.STUDIO_CHECKBOX_STATE] = studioCheckboxes;
        }

        if (Object.keys(updates).length > 0) {
            await SYH_STORAGE.setAsync(updates);
            console.log('[RetentionService] Automatic data cleanup finished:', Object.keys(updates));
        }
    }
}
