/**
 * StreamYard Helper — база молитов/питань StreamYard із TTL.
 *
 * Виокремлено з `comment_service.ts`. Ключовий інваріант: список ЗАВЖДИ
 * читається через `RetentionService.filterFreshPrayers`, тому будь-який запис
 * або видалення принагідно вичищає протухлі записи (молитви — 2 доби,
 * питання — 30 днів). Дедуплікація йде за текстом: новий запис витісняє старий.
 */
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { RetentionService } from './retention_service';
import type { PrayerRecord } from './comment_types';

/** Читає список і одразу відкидає протухлі за TTL записи. */
async function loadFreshPrayerList(): Promise<PrayerRecord[]> {
    const now = Date.now();
    const result = await SYH_STORAGE.getAsync([STORAGE_KEYS.PRAYERS]);
    // ЗНАХІДКА T17: `PrayerItem` (схема сховища) і `PrayerRecord` — два описи
    // однієї збереженої сутності, другий суворіший (`type`, `icon`, `roomId`,
    // `timestamp` обов'язкові). Звуження явне; злиття — окрема зміна.
    const list = (result[STORAGE_KEYS.PRAYERS] || []) as unknown as PrayerRecord[];
    return RetentionService.filterFreshPrayers(list, now);
}

async function persistPrayerList(list: PrayerRecord[]): Promise<PrayerRecord[]> {
    await SYH_STORAGE.setAsync({ [STORAGE_KEYS.PRAYERS]: list });
    return list;
}

/** Додає запис у кінець списку, витіснивши попередній із таким самим текстом. */
export async function savePrayerRecord(record: PrayerRecord): Promise<PrayerRecord[]> {
    const list = await loadFreshPrayerList();
    const deduped = list.filter(item => item.text !== record.text);
    deduped.push(record);
    return persistPrayerList(deduped);
}

/** Видаляє запис за точним збігом тексту. */
export async function removePrayerRecord(text: string): Promise<PrayerRecord[]> {
    const list = await loadFreshPrayerList();
    const filtered = list.filter(item => item.text !== text);
    return persistPrayerList(filtered);
}
