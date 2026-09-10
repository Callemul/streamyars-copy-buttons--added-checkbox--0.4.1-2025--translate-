// popup/popup_sheet_keys.ts
//
// Спільний доступ до значень стану аркуша зі storage-результату.
//
// Кожен ключ стану popup має дві форми: канонічну (`syh:popup:sheet:<id>:<field>`,
// див. `POPUP_SHEET_KEYS`) та історичну «легасі» (`tg_<field>__<id>`). Раніше
// цей `??`-фолбек дублювався в кожному відновлювачі; тепер він живе в одному
// місці, а відновлювачі просто читають поле.

import type { StorageReadResult, SheetScopedKey } from '../modules/storage/storage';

/**
 * Історичний префікс ключа аркуша.
 *
 * Форма описана типом, а не `string`, щоб склеєний ключ
 * `${legacyPrefix}${sheetId}` теж лишався членом описаної родини і проходив
 * по закритій схемі сховища (T17, крок 2). Два префікси історично випадають
 * з конвенції `tg_<field>__` — вони перелічені явно.
 */
export type SheetLegacyPrefix = `tg_${string}` | 'syh:popup:divider_pos:' | 'syh:popup:collected:';

/** Канонічний ключ будується з ідентифікатора аркуша. */
export type SheetKeyBuilder = (sheetId: string) => SheetScopedKey;

/**
 * Читає значення аркуша з результату storage: спершу за канонічним ключем,
 * потім за легасі-префіксом `<legacyPrefix><sheetId>`.
 *
 * Поведінка 1-в-1 з попередньою реалізацією: використовується `??`, тож
 * `false`, `0` та `''` вважаються наявними значеннями і НЕ падають на легасі.
 */
export function readSheetValue(
    result: StorageReadResult,
    sheetId: string,
    canonicalKey: SheetKeyBuilder,
    legacyPrefix: SheetLegacyPrefix
): any {
    return result[canonicalKey(sheetId)] ?? result[`${legacyPrefix}${sheetId}`];
}

/** Те саме, але прив'язка береться з реєстру полів (`popup_sheet_fields.ts`). */
export function readSheetBinding(
    result: StorageReadResult,
    sheetId: string,
    binding: { key: SheetKeyBuilder; legacyPrefix: SheetLegacyPrefix }
): any {
    return readSheetValue(result, sheetId, binding.key, binding.legacyPrefix);
}
