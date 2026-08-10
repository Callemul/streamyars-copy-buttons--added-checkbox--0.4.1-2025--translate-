/**
 * StreamYard Helper — Storage promise-based operations.
 *
 * Виділено зі `storage.ts`. Проміс-контракт (`getAsync` / `setAsync` /
 * `removeAsync` / `updateAsync`) для сучасних викликачів (popup, service
 * worker, сервіси).
 *
 * Ключова відмінність від колбечного шару: тут виняток додатково логується
 * (`console.error`), але проміс однаково РЕЗОЛВИТЬСЯ, а не реджектиться —
 * жоден викликач не має отримати unhandled rejection через мертвий контекст.
 *
 * `removeAsync` і `updateAsync` навмисно делегують через `this` (`this.remove`,
 * `this.getAsync`, `this.setAsync`), а не напряму у внутрішні функції: це
 * зберігає можливість підмінити окремий метод на адаптері-нащадку.
 */

import { checkAndLogStorageError } from './storage_migration';
import {
    prepareQueryKeys,
    processGetResult,
    migrateItemKeys,
    type StorageKeyValues,
    type StorageAdapter
} from './storage_keys';

export function storageGetAsync<T = Record<string, any>>(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[]
): Promise<T> {
    return new Promise((resolve) => {
        if (!this.isChromeStorageAvailable()) {
            resolve({} as T);
            return;
        }
        try {
            const { origKeys, queryKeys } = prepareQueryKeys(keys);
            chrome.storage.local.get(queryKeys, (result) => {
                if (checkAndLogStorageError('get')) {
                    resolve({} as T);
                    return;
                }
                resolve(processGetResult<T>(origKeys, result || {}));
            });
        } catch (e: unknown) {
            const err = e as Error;
            console.error('[SYH Storage] Context invalidated or API failed:', err?.message || e);
            resolve({} as T);
        }
    });
}

export function storageSetAsync(
    this: StorageAdapter,
    items: Record<string, any>
): Promise<void> {
    return new Promise((resolve) => {
        if (!this.isChromeStorageAvailable()) {
            resolve();
            return;
        }
        try {
            chrome.storage.local.set(migrateItemKeys(items), () => {
                checkAndLogStorageError('set');
                resolve();
            });
        } catch (e: unknown) {
            const err = e as Error;
            console.error('[SYH Storage] set failed:', err?.message || e);
            resolve();
        }
    });
}

export function storageRemoveAsync(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[]
): Promise<void> {
    return new Promise((resolve) => {
        this.remove(keys as any, resolve);
    });
}

/**
 * Серіалізація read-modify-write для `updateAsync` на рівні набору ключів.
 * Усуває race condition (втрачене оновлення) та write-amplification у межах
 * одного JS-контексту. Див. audit storage-updateasync-lost-update-race.
 */
const updateQueues = new Map<string, Promise<unknown>>();

function queueKey(keys: StorageKeyValues | StorageKeyValues[]): string {
    const list = Array.isArray(keys) ? [...keys] : [keys];
    return list
        .map(k => String(k))
        .sort()
        .join('|');
}

export async function storageUpdateAsync<T = Record<string, any>>(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[],
    updateFn: (current: T) => T | Promise<T>
): Promise<T> {
    const lane = queueKey(keys);
    const previous = updateQueues.get(lane) ?? Promise.resolve();

    const run = previous.then(async () => {
        const currentData = await this.getAsync<T>(keys);
        const updatedData = await updateFn(currentData);

        // Пишемо лише ті ключі, значення яких справді змінилося, щоб не
        // затерти сусідні ключі паралельних записів (write-amplification).
        const changed: Record<string, any> = {};
        for (const [k, v] of Object.entries(updatedData as Record<string, any>)) {
            if ((currentData as Record<string, any>)[k] !== v) {
                changed[k] = v;
            }
        }
        if (Object.keys(changed).length > 0) {
            await this.setAsync(changed);
        }
        return updatedData;
    });

    // Черга не має «залипати» через помилку одного оновлення: зберігаємо
    // поглинутий проміс, але повертаємо оригінальний (з реджектом) викликачу.
    updateQueues.set(lane, run.catch(() => undefined));
    return run as Promise<T>;
}
