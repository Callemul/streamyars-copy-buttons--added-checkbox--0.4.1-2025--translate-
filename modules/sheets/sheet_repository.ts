/**
 * StreamYard Helper — сховище стану аркуша (Telegram-вкладка попапу).
 *
 * Виділено з `modules/sheet_state_service.ts` у рамках декомпозиції за звітом
 * Fallow. Єдине місце, що знає мапу «поле стану → ключ chrome.storage», тому
 * читання (`loadSheetState`), запис (`saveSheetState`) і очищення
 * (`clearSheetState`) не можуть розійтися між собою.
 *
 * Поведінка збережена 1-в-1 (див. tests/sheet_state_api.test.js).
 */

import type { StorageReadResult, StorageWriteItems, SheetScopedKey } from '../storage_keys';
import { SYH_STORAGE, getSheetCollectedStorageKey, POPUP_SHEET_KEYS } from '../storage';
import type { YTCollectedItem } from '../core/types';

/**
 * Оновлення полів аркуша: ім'я поля → нове значення.
 *
 * Об'єднання не випадкове — записують двома різними способами:
 *   • готовим зрізом стану (`TelegramSheetDOMState` з попапу) → `Partial<…>`;
 *   • по одному полю, ім'я якого РОЗІБРАНЕ В РАНТАЙМІ з ключа сховища
 *     (`persistSheetValue`) → мапа, яку статично звузити не можна.
 * У другому випадку це вже `unknown`, а не безіменний `any`.
 */
export type SheetStateUpdate = Partial<SheetStateData> | Record<string, unknown>;

export interface SheetStateData {
    oldList: string;
    answered: string;
    newTelegram: string;
    finalResultHtml: string;
    statsHtml: string;
    statsVisible: boolean;
    deletedLogHtml: string;
    deletedLogCount: number;
    deletedLogDetailsVisible: boolean;
    deletedLogDetailsOpen: boolean;
    cleanedLogHtml: string;
    cleanedLogCount: number;
    cleanedLogDetailsVisible: boolean;
    cleanedLogDetailsOpen: boolean;
    dividerPos: number;
    ytCollected: YTCollectedItem[];
}

/**
 * Поля, які складають «стан аркуша» у сховищі. Порядок збережено з
 * оригінальної реалізації: саме в цьому порядку ключі йдуть у
 * `chrome.storage.local.get` / `.remove`.
 *
 * `dividerPos` і зібрані YT-коментарі свідомо НЕ входять сюди: вони
 * читаються разом зі станом, але переживають очищення аркуша.
 */
const SHEET_STATE_FIELDS = [
    'oldList',
    'answered',
    'newTelegram',
    'finalResultHtml',
    'statsHtml',
    'statsVisible',
    'deletedLogHtml',
    'deletedLogCount',
    'deletedLogDetailsVisible',
    'deletedLogDetailsOpen',
    'cleanedLogHtml',
    'cleanedLogCount',
    'cleanedLogDetailsVisible',
    'cleanedLogDetailsOpen'
] as const;

type SheetStateField = typeof SHEET_STATE_FIELDS[number];

/** Поля-прапорці: будь-яке збережене значення нормалізується до boolean. */
const FLAG_FIELDS: ReadonlySet<SheetStateField> = new Set<SheetStateField>([
    'statsVisible',
    'deletedLogDetailsVisible',
    'deletedLogDetailsOpen',
    'cleanedLogDetailsVisible',
    'cleanedLogDetailsOpen'
]);

/** Поля-лічильники: дефолт `0` замість порожнього рядка. */
const COUNT_FIELDS: ReadonlySet<SheetStateField> = new Set<SheetStateField>([
    'deletedLogCount',
    'cleanedLogCount'
]);

const DEFAULT_DIVIDER_POS = 50;

function getSheetStateKeys(sheetId: string): string[] {
    return SHEET_STATE_FIELDS.map(field => POPUP_SHEET_KEYS[field](sheetId));
}

/** Дефолти читання 1-в-1: прапорці → `!!`, лічильники → `|| 0`, решта → `|| ''`. */
function readStateField(field: SheetStateField, rawValue: unknown): unknown {
    if (FLAG_FIELDS.has(field)) return !!rawValue;
    if (COUNT_FIELDS.has(field)) return rawValue || 0;
    return rawValue || '';
}

function readStoredFields(sheetId: string, res: StorageReadResult): Partial<SheetStateData> {
    const state: Record<string, unknown> = {};

    for (const field of SHEET_STATE_FIELDS) {
        state[field] = readStateField(field, res[POPUP_SHEET_KEYS[field](sheetId)]);
    }

    return state as Partial<SheetStateData>;
}

/** Відоме поле → канонічний ключ; невідоме → історичний fallback-шаблон. */
function resolveStorageKey(sheetId: string, field: string): SheetScopedKey {
    const keyFn = (POPUP_SHEET_KEYS as Record<string, (id: string) => SheetScopedKey>)[field];
    return keyFn ? keyFn(sheetId) : `syh:popup:sheet:${sheetId}:${field}`;
}

export class SheetRepository {
    public static async loadSheetState(sheetId: string): Promise<Partial<SheetStateData>> {
        const sheetKey = getSheetCollectedStorageKey(sheetId);
        const dividerKey = POPUP_SHEET_KEYS.dividerPos(sheetId);
        const keysToLoad = [...getSheetStateKeys(sheetId), dividerKey, sheetKey];

        const res = await SYH_STORAGE.getAsync(keysToLoad);
        // ЗНАХІДКА T17: та сама збережена сутність описана двома типами —
        // `CommentPayload` (як її пише `comment_collected_store`) і суворішим
        // `YTCollectedItem` (`videoId` обов'язковий). Звуження тут явне; злиття
        // двох описів — окрема зміна, бо міняє обов'язковість полів у споживачах.
        const ytCollected = (res[sheetKey] || []) as unknown as YTCollectedItem[];

        return {
            ...readStoredFields(sheetId, res),
            dividerPos: res[dividerKey] || DEFAULT_DIVIDER_POS,
            ytCollected
        };
    }

    public static async saveSheetState(sheetId: string, updates: SheetStateUpdate): Promise<void> {
        const storageObj: StorageWriteItems = {};

        for (const [field, value] of Object.entries(updates)) {
            storageObj[resolveStorageKey(sheetId, field)] = value;
        }

        await SYH_STORAGE.setAsync(storageObj);
    }

    public static async clearSheetState(sheetId: string): Promise<void> {
        await SYH_STORAGE.removeAsync(getSheetStateKeys(sheetId));
    }
}
