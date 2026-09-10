import type { StorageRawResult } from '../modules/storage/storage';
import type { StorageReadResult } from '../modules/storage/storage';
// popup/popup_ui_state_rules.ts
//
// ПРИЗНАЧЕННЯ: чисті правила відновлення UI-стану попапа (без DOM і без сховища).
//
// Винесено з `popup/popup_ui_state_restorer.ts`, який мав найгіршу підтримуваність
// серед продакшн-файлів за звітом Fallow (MI 78.6, щільність складності 0.50).
// Кожен із шести відновлювачів повторював правило «новий ключ ?? легасі-ключ»
// та власний перелік id — тепер це одне джерело правди.

/**
 * Читає значення стану попапа з підтримкою застарілого ключа.
 *
 * Семантика `??` збережена 1-в-1: легасі-ключ спрацьовує ЛИШЕ коли новий
 * відсутній або `null`. Збережений `0`, `''` чи `false` перекривають легасі.
 */
export function readStoredValue<T = unknown>(
    result: StorageReadResult,
    key: string,
    legacyKey: string
): T | undefined {
    // Помічник свідомо ключ-агностичний: обидва ключі приходять аргументами,
    // тож індексуємо сире представлення, а не закриту схему (T17).
    const raw = result as StorageRawResult;
    return (raw[key] ?? raw[legacyKey]) as T | undefined;
}

/** Спільні (не per-sheet) контейнери, чий `scrollTop` відновлюється. */
export const SHARED_SCROLL_TARGET_IDS = [
    'prayersResultDiv',
    'textArea1_oldText',
    'textArea2_generatedRuText'
];

/** Префікси per-sheet контейнерів, чий `scrollTop` відновлюється. */
export const SHEET_SCROLL_ID_PREFIXES = [
    'finalResultDiv__',
    'deletedLog__',
    'oldList__',
    'newTelegram__'
];

/**
 * Повний перелік id, чий `scrollTop` треба відновити.
 *
 * Ключ у сховищі збігається з id елемента, тому окремої мапи не потрібно.
 * Порядок збережено як в оригіналі: спершу спільні панелі, далі — по аркушах,
 * усередині аркуша — у порядку `SHEET_SCROLL_ID_PREFIXES`.
 */
export function buildScrollTargetIds(sheetIds: string[]): string[] {
    return [
        ...SHARED_SCROLL_TARGET_IDS,
        ...sheetIds.flatMap(sId => SHEET_SCROLL_ID_PREFIXES.map(prefix => `${prefix}${sId}`))
    ];
}
