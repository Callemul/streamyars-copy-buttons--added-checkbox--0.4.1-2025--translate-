/**
 * StreamYard Helper - Centralized Storage Adapter (фасад)
 *
 * Публічний API залишено 1-в-1 для зворотної сумісності (68 залежних файлів).
 * Цей файл більше не містить реалізації — лише збирає `SYH_STORAGE` з окремих
 * шарів і реекспортує ключі/міграції:
 *   - `storage_keys.ts`      — чисті ключі, типи та міграція імен ключів;
 *   - `storage_migration.ts` — важка одноразова міграція схеми сховища;
 *   - `storage_runtime.ts`   — живучість Chrome-контексту + onChanged;
 *   - `storage_ops_callback.ts` — колбечні get/set/remove;
 *   - `storage_ops_async.ts`    — проміс-контракт getAsync/setAsync/removeAsync/updateAsync.
 *
 * Методи адаптера свідомо зібрані як посилання на функції з `this: StorageAdapter`,
 * тому динамічний диспатч (`this.isChromeStorageAvailable()`, `this.remove()`,
 * `this.getAsync()`) працює точно так само, як коли все лежало в одному файлі.
 *
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між
 * контент-скриптом і попапом.
 */

export {
    STORAGE_SCHEMA_VERSION,
    type StoredOptions,
    type StorageSchema,
    STORAGE_KEYS,
    getSheetStorageKey,
    getSheetCollectedStorageKey,
    POPUP_SHEET_KEYS,
    migrateKey,
    type StorageKeyValues,
    type StorageReadResult,
    type StorageWriteItems,
    type StorageChanges,
    migrateItemKeys,
    migrateKeys,
    prepareQueryKeys,
    processGetResult,
    type StorageAdapter
} from './storage_keys';

export {
    checkAndLogStorageError,
    migrateLegacyYtCollected,
    migrateStorageIfNeeded
} from './storage_migration';

import type { StorageAdapter } from './storage_keys';
import { isChromeStorageAvailable, storageOnChanged } from './storage_runtime';
import { storageGet, storageSet, storageRemove } from './storage_ops_callback';
import {
    storageGetAsync,
    storageSetAsync,
    storageRemoveAsync,
    storageUpdateAsync
} from './storage_ops_async';

export const SYH_STORAGE: StorageAdapter = {
    isChromeStorageAvailable,
    get: storageGet,
    set: storageSet,
    remove: storageRemove,
    getAsync: storageGetAsync,
    setAsync: storageSetAsync,
    removeAsync: storageRemoveAsync,
    updateAsync: storageUpdateAsync,
    onChanged: storageOnChanged
};
