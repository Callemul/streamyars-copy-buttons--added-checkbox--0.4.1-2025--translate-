import { SYH_STORAGE, STORAGE_KEYS } from './storage';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export class RetentionService {
    /**
     * Очищення застарілих записів у всіх таблицях розширення
     */
    public static async runGlobalCleanup(): Promise<void> {
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

        // 2. Очищення Молитов (48 годин) та питання (30 днів)
        const prayers = res[STORAGE_KEYS.PRAYERS];
        if (Array.isArray(prayers)) {
            const freshPrayers = prayers.filter(p => {
                if (!p.timestamp) return true;
                const maxAge = p.type === 'prayer' ? TWO_DAYS_MS : THIRTY_DAYS_MS;
                return (now - p.timestamp < maxAge);
            });
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
