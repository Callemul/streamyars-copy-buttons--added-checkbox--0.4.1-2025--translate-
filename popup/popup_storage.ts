// popup/popup_storage.ts
// Storage-related functions

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage/storage';

export const db: Record<string, unknown> = {};

export function saveDataToStorage(): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.DB]: db });
}

export async function loadData(key: string): Promise<unknown> {
    const res = await SYH_STORAGE.getAsync<Record<string, unknown>>([key]);
    return res[key];
}

export async function saveData(key: string, value: unknown): Promise<void> {
    await SYH_STORAGE.setAsync({ [key]: value });
}