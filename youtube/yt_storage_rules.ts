import type { StorageChanges, StoredOptions } from '../modules/storage';
/**
 * StreamYard Helper — чисті правила реакції YouTube-модуля на зміни сховища.
 *
 * Винесено з `youtube/yt_storage_handler.ts` (дві функції з CRAP 30 за звітом Fallow).
 * Модуль навмисно не імпортує нічого з `youtube/yt_*`: рішення «що робити»
 * відокремлені від побічних ефектів «як це робити», тож їх можна перевіряти
 * без DOM, chrome-API та ланцюжка ініціалізації YouTube.
 *
 * Поведінка збережена 1-в-1 з оригінальними обробниками.
 */

/** Напрямок перемикання YouTube-модуля після зміни опцій. */
export type YoutubeToggleTransition = 'enable' | 'disable' | 'none';

/** Пара «ключ сховища → нове значення» для ключів, що дійсно змінилися. */
export interface StorageChangeEntry {
    key: string;
    newValue: any;
}

/**
 * YouTube-модуль увімкнений, доки опція не виставлена явно у `false`.
 * Відсутня опція трактується як «увімкнено».
 */
export function readYoutubeEnabled(options: StoredOptions): boolean {
    return options.youtube_enabled !== false;
}

/** Що робити після зміни прапорця: піднімати модуль, гасити його, чи нічого. */
export function resolveYoutubeToggleTransition(
    wasEnabled: boolean,
    isEnabled: boolean
): YoutubeToggleTransition {
    if (!wasEnabled && isEnabled) return 'enable';
    if (wasEnabled && !isEnabled) return 'disable';
    return 'none';
}

/**
 * Відбирає з об'єкта змін `chrome.storage` лише ті ключі, для яких є запис змін.
 * Порядок ключів зберігається — від нього залежить порядок виклику обробників.
 */
export function selectChangedEntries(
    changes: StorageChanges,
    keys: string[]
): StorageChangeEntry[] {
    const entries: StorageChangeEntry[] = [];

    for (const key of keys) {
        if (changes[key]) {
            entries.push({ key, newValue: changes[key].newValue });
        }
    }

    return entries;
}

/** Нове значення ключа, якщо запис про зміну взагалі присутній. */
export function readChangedValue(changes: StorageChanges, key: string): unknown {
    return changes[key]?.newValue;
}

/** Еквівалент `value || {}`: захищає кеш стану від `null`/`undefined` зі сховища. */
export function orEmptyRecord<T extends object>(value: T | null | undefined): T {
    return value || ({} as T);
}
