/**
 * StreamYard Helper - Storage Migration
 *
 * Винесено з `modules/storage.ts`, щоб розбити найвпливовіший файл проєкту
 * (fan-in 60) на менші одиниці. Тут — тип `StorageAdapter`, допоміжник
 * `checkAndLogStorageError` та міграція сховища (`migrateLegacyYtCollected`,
 * `migrateStorageIfNeeded`). Публічний API реекспортується з `modules/storage.ts`
 * 1-в-1 для зворотної сумісності.
 */

import {
    STORAGE_SCHEMA_VERSION,
    STORAGE_KEYS,
    getSheetCollectedStorageKey,
    migrateKey
} from './storage_keys';

export { type StorageAdapter } from './storage_keys';

export function checkAndLogStorageError(actionName: string): boolean {
    if (chrome.runtime?.lastError) {
        console.error(`[SYH Storage] ${actionName} error:`, chrome.runtime.lastError.message);
        return true;
    }
    return false;
}

export function migrateLegacyYtCollected(
    allData: Record<string, any>,
    migrated: Record<string, unknown>,
    keysToRemove: string[]
): void {
    const legacyYtItems = (allData[STORAGE_KEYS.YT_COLLECTED] || allData['syh_yt_collected']) as any[] | undefined;
    if (Array.isArray(legacyYtItems) && legacyYtItems.length > 0) {
        const vpSsKey = getSheetCollectedStorageKey('vp_ss');
        const existingVpSs = (migrated[vpSsKey] || allData[vpSsKey]) as any[] | undefined;
        const itemMap = new Map<string | any, any>();

        if (Array.isArray(existingVpSs)) {
            existingVpSs.forEach(item => { itemMap.set(item?.id ?? item, item); });
        }
        legacyYtItems.forEach(item => { itemMap.set(item?.id ?? item, item); });

        migrated[vpSsKey] = Array.from(itemMap.values());
        if (allData[STORAGE_KEYS.YT_COLLECTED]) keysToRemove.push(STORAGE_KEYS.YT_COLLECTED);
    }
}

export async function migrateStorageIfNeeded(): Promise<void> {
    if (!chrome.storage?.local) return;

    return new Promise((resolve) => {
        chrome.storage.local.get(null, (allData) => {
            if (chrome.runtime.lastError || !allData) {
                resolve();
                return;
            }
            const schemaVersion = allData._schema_version;
            if (typeof schemaVersion === 'number' && schemaVersion >= STORAGE_SCHEMA_VERSION) {
                resolve();
                return;
            }

            const migrated: Record<string, unknown> = {};
            const keysToRemove: string[] = [];

            for (const [oldKey, value] of Object.entries(allData)) {
                if (oldKey === '_schema_version') continue;
                const newKey = migrateKey(oldKey);
                if (newKey !== oldKey) {
                    migrated[newKey] = value;
                    keysToRemove.push(oldKey);
                }
            }

            migrateLegacyYtCollected(allData, migrated, keysToRemove);

            if (keysToRemove.length > 0) {
                chrome.storage.local.set(migrated, () => {
                    chrome.storage.local.remove(keysToRemove, () => {
                        chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION }, () => {
                            console.log(`[SYH Storage] Storage migrated: ${keysToRemove.length} keys renamed`);
                            resolve();
                        });
                    });
                });
            } else {
                chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION }, () => {
                    resolve();
                });
            }
        });
    });
}
