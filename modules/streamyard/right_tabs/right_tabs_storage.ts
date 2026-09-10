// modules/right_tabs_storage.ts
/**
 * Адаптер збереження стану правих вкладок StreamYard.
 * Уся робота з `SYH_STORAGE` та `chrome.storage.onChanged` ізольована тут,
 * щоб правила згортання (`right_tabs_rules`) залишалися чистими та тестованими.
 */
import { SYH_STORAGE, STORAGE_KEYS, type StoredOptions } from '../../storage';
import {
    createRightTabsState,
    parseStoredTabIds,
    readCompactFlag,
    resolveAutoCompactSecondary,
    type RightTabsState
} from './right_tabs_rules';

/**
 * Ключ переїхав у реєстр `STORAGE_KEYS` (T17, крок 2): він жив тут літералом
 * повз реєстр, і закрита схема сховища це виявила. Ім'я лишається експортованим
 * як псевдонім — щоб не чіпати наявні імпорти.
 */
export const EXPANDED_TABS_KEY = STORAGE_KEYS.EXPANDED_TABS;

type StorageChangeMap = Record<string, { newValue?: unknown }>;

async function readRightTabsState(): Promise<RightTabsState> {
    const res = await SYH_STORAGE.getAsync<{
        [STORAGE_KEYS.COLLAPSED_TABS]?: string[];
        [EXPANDED_TABS_KEY]?: string[];
        [STORAGE_KEYS.OPTIONS]?: StoredOptions;
    }>([STORAGE_KEYS.COLLAPSED_TABS, EXPANDED_TABS_KEY, STORAGE_KEYS.OPTIONS]);

    return {
        collapsedTabIds: parseStoredTabIds(res[STORAGE_KEYS.COLLAPSED_TABS]),
        expandedTabIds: parseStoredTabIds(res[EXPANDED_TABS_KEY]),
        autoCompactSecondary: resolveAutoCompactSecondary(res[STORAGE_KEYS.OPTIONS])
    };
}

/** Ніколи не кидає: за будь-якої помилки повертає дефолтний стан. */
export async function loadRightTabsState(): Promise<RightTabsState> {
    try {
        return await readRightTabsState();
    } catch (err) {
        console.warn('[SYH RightTabs] Failed to load saved state:', err);
        return createRightTabsState();
    }
}

export async function saveRightTabsState(state: RightTabsState): Promise<void> {
    try {
        await SYH_STORAGE.setAsync({
            [STORAGE_KEYS.COLLAPSED_TABS]: Array.from(state.collapsedTabIds),
            [EXPANDED_TABS_KEY]: Array.from(state.expandedTabIds)
        });
    } catch (err) {
        console.warn('[SYH RightTabs] Failed to save collapsed tabs state:', err);
    }
}

/** Витягує новий прапорець автозгортання зі змін chrome.storage; `null` — змін немає. */
export function extractCompactFlag(changes: StorageChangeMap): boolean | null {
    const entry = changes[STORAGE_KEYS.OPTIONS];
    if (!entry) return null;
    return readCompactFlag(entry.newValue as StoredOptions | undefined);
}

export function handleOptionsStorageChange(
    changes: StorageChangeMap,
    areaName: string,
    onChange: (enabled: boolean) => void
): void {
    if (areaName !== 'local') return;

    const flag = extractCompactFlag(changes);
    if (flag !== null) onChange(flag);
}

function getStorageChangeEmitter(): typeof chrome.storage.onChanged | undefined {
    const storage = typeof chrome !== 'undefined' ? chrome.storage : undefined;
    return storage?.onChanged;
}

export function observeCompactOption(onChange: (enabled: boolean) => void): void {
    const emitter = getStorageChangeEmitter();
    if (!emitter) return;

    emitter.addListener((changes: StorageChangeMap, areaName: string) => {
        handleOptionsStorageChange(changes, areaName, onChange);
    });
}
