// popup/prayer_room_guard.ts
//
// ПРИЗНАЧЕННЯ: Чиста (DOM-free) логіка визначення StreamYard-кімнати та пошуку
// «чужих» молитов, що лишилися з попереднього ефіру.
//
// Виділено з popup/prayer_render_helpers.ts, де ця логіка була закопана всередині
// колбека chrome.tabs.query і не піддавалася юніт-тестуванню (CRAP 90).

import type { PrayerItem } from '../modules/core/types';

/** Шляхи app.streamyard.com, які НЕ є ефірною кімнатою. */
export const NON_ROOM_PATHS: readonly string[] = [
    'broadcasts', 'destinations', 'plan', 'members', 'billing',
    'settings', 'onboarding', 'home', 'login', 'signup', 'logout', ''
];

export interface RoomContext {
    isStudioRoom: boolean;
    roomId: string;
}

export const ROOM_WARNING_HTML = `
    <div id="syh-room-warning" style="background: #f39c12; color: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; font-weight: bold; font-size: 13px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 6px;">
            <span>⚠️ Знайдено молитви з минулого ефіру!</span>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="syh-keep-prayers" style="background: #27ae60; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Залишити як є">✅ Залишити (Це мої)</button>
            <button id="syh-wipe-prayers" style="background: #c0392b; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;" title="Видалити старі молитви з пам'яті розширення">🗑️ Очистити все</button>
        </div>
    </div>
`;

function parseUrlSafely(rawUrl: string): URL | null {
    try {
        return new URL(rawUrl);
    } catch {
        return null;
    }
}

/** Перетворює pathname на roomId: `/abcd-efgh/` -> `abcd-efgh`. */
export function extractRoomId(pathname: string): string {
    if (!pathname) return '';
    return pathname.replace(/\//g, '');
}

/** roomId є справжньою кімнатою, а не службовою сторінкою StreamYard. */
export function isRoomPath(roomId: string): boolean {
    if (!roomId) return false;
    return !NON_ROOM_PATHS.includes(roomId.toLowerCase());
}

/** Визначає, чи вкладка відкрита на ефірній кімнаті StreamYard, і повертає її id. */
export function resolveRoomContext(rawUrl: string): RoomContext {
    const parsed = parseUrlSafely(rawUrl);
    if (!parsed) return { isStudioRoom: false, roomId: '' };

    const roomId = extractRoomId(parsed.pathname);
    const isStreamYard = parsed.hostname.includes('streamyard.com');
    return { isStudioRoom: isStreamYard && isRoomPath(roomId), roomId };
}

/** Молитви, збережені в іншій кімнаті (тобто з попереднього ефіру). */
export function findForeignPrayers(prayersList: PrayerItem[], currentRoomId: string): PrayerItem[] {
    if (!Array.isArray(prayersList)) return [];
    return prayersList.filter(p => p.type === 'prayer' && Boolean(p.roomId) && p.roomId !== currentRoomId);
}

/** Головне рішення: чи показувати банер-попередження про чужі молитви. */
export function shouldWarnAboutForeignPrayers(rawUrl: string, prayersList: PrayerItem[]): boolean {
    const { isStudioRoom, roomId } = resolveRoomContext(rawUrl);
    if (!isStudioRoom) return false;
    return findForeignPrayers(prayersList, roomId).length > 0;
}
