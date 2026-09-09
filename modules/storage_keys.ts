/**
 * StreamYard Helper - Storage Key Definitions & Key Migration
 * Винесено з `storage.ts`, щоб ізолювати чисту логіку ключів та міграцій
 * від адаптера сховища (`SYH_STORAGE`). Це знижує розмір `storage.ts` і
 * усуває зациклення навантаження (ключі/міграції не залежать від адаптера).
 */

import type { PrayerItem, YTCollectedItem, StudioOverrideLogEntry, VideoSheetMapEntry, StoredElementSize } from './types';
import type { StreamChartSession } from './stats_types';
// Імпорт лише типу: у рантаймі стирається, тож циклу з `channel_config` немає.
import type { ChannelConfigItem } from './channel_config';
import type { CheckboxStateEntry, CommentPayload } from './comment_types';
import type { CommentStateActionId } from './comment_actions';

// ─────────────────────────────────────────────────────────────────────────────
// ДИНАМІЧНІ РОДИНИ КЛЮЧІВ (T17, крок 2)
//
// Частина ключів будується в рантаймі з ідентифікатора аркуша, тому статично
// перелічити їх не можна. Але описати ФОРМУ можна — шаблонними літеральними
// типами. Саме вони дозволили прибрати зі схеми `[key: string]: any`, під яким
// доти ховалась будь-яка одруківка в ключі.
// ─────────────────────────────────────────────────────────────────────────────

/** Канонічний ключ стану аркуша: `syh:popup:sheet:<sheetId>:<field>`. */
export type SheetStateKey = `syh:popup:sheet:${string}:${string}`;

/** Зібрані з YouTube коментарі аркуша: `syh:popup:collected:<sheetId>`. */
export type SheetCollectedKey = `syh:popup:collected:${string}`;

/** Позиція роздільника колонок аркуша: `syh:popup:divider_pos:<sheetId>`. */
export type SheetDividerKey = `syh:popup:divider_pos:${string}`;

/** Будь-який ключ, прив'язаний до конкретного аркуша. */
export type SheetScopedKey = SheetStateKey | SheetCollectedKey | SheetDividerKey;

/**
 * Історична («легасі») форма ключів попапу: `tg_<field>__<sheetId>` і кілька
 * глобальних (`tg_active_tab`, `tg_scroll_positions`, …).
 *
 * Ці ключі МАЮТЬ читатися й надалі — це дані користувача
 * (docs/rules/storage.md, zero data loss). Тому вони описані в схемі явно,
 * а не потрапляють під неї випадково.
 */
export type LegacyTgKey = `tg_${string}`;

/** Дані телеграм-вкладки попапу, що будуються з префіксів `TELEGRAM_*`. */
export type TelegramDataKey = `syh:popup:telegram:${string}`;

/** Значення, які лягають під ключі стану аркуша. */
export type SheetStateValue = string | number | boolean;

/**
 * Сире, ще не нормалізоване, що віддав `chrome.storage`.
 *
 * Це МЕЖА зі сховищем: сюди приходять і ключі, яких у схемі вже немає
 * (історичні імена до міграції). Схема застосовується ПІСЛЯ нормалізації, у
 * `processGetResult`. Єдине місце, де схема свідомо не діє — тому тип
 * названий, а не розмазаний по коду як черговий `Record<string, any>`.
 */
export type StorageRawResult = Record<string, unknown>;

/**
 * Контракт адаптера сховища.
 *
 * Дефолтні типи читання/запису — `StorageSchema`, а не `Record<string, any>`
 * (T17, крок 1). Схема існувала й раніше, але не використовувалась ЖОДНИМ
 * місцем: дані користувача жили в API без будь-якої перевірки типів.
 * Тепер відомі ключі типізовані, а `result[STORAGE_KEYS.PRAYERS]` має тип
 * `PrayerItem[] | undefined` замість `any`.
 */
export interface StorageAdapter {
    isChromeStorageAvailable(): boolean;
    get<T = StorageReadResult>(keys: StorageKeyValues | StorageKeyValues[], cb: (result: T) => void): void;
    set(items: StorageWriteItems, cb?: () => void): void;
    remove(keys: StorageKeyValues | StorageKeyValues[], cb?: () => void): void;
    getAsync<T = StorageReadResult>(keys: StorageKeyValues | StorageKeyValues[]): Promise<T>;
    setAsync(items: StorageWriteItems): Promise<void>;
    removeAsync(keys: StorageKeyValues | StorageKeyValues[]): Promise<void>;
    updateAsync<T = StorageReadResult>(
        keys: StorageKeyValues | StorageKeyValues[],
        updateFn: (current: T) => T | Promise<T>
    ): Promise<T>;
    onChanged(callback: (changes: StorageChanges, areaName: string) => void): () => void;
}

/** Зміни, які chrome віддає в `onChanged`: ключ → пара «було / стало». */
export type StorageChanges = Record<string, { oldValue?: any; newValue?: any }>;

/**
 * Результат читання зі сховища — ЗАКРИТА схема (T17, крок 2).
 *
 * Саме на читанні схема й потрібна: тут дані користувача перетворюються на
 * значення, і саме тут одруківка в ключі дає тихий `undefined` замість
 * помилки. Ключ, який не є ані відомим літералом, ані членом описаної родини,
 * тепер не компілюється.
 */
export type StorageReadResult = StorageSchema;

/**
 * Набір значень на запис — навмисно ШИРШИЙ за схему.
 *
 * Причина технічна й варта того, щоб її не переоткривати щоразу:
 * запис майже завжди виглядає як `{ [обчислений_ключ]: значення }`, а
 * TypeScript зводить такий літерал до індексної сигнатури `{ [x: string]: T }`,
 * яку закрита схема відхиляє — навіть коли ключ насправді правильний. Плюс у
 * проєкті є свідомо ключ-агностичні помічники (`popup_storage.saveData`).
 *
 * Тому: читання строге, запис — названий мішок замість безіменного
 * `Record<string, any>`. Захист від хибного ключа на записі дають будівники
 * (`STORAGE_KEYS`, `getSheetStorageKey`, `POPUP_SHEET_KEYS`), а не цей тип.
 */
export type StorageWriteItems = Record<string, unknown>;

export const STORAGE_SCHEMA_VERSION = 2;

/**
 * Опції в сховищі.
 *
 * ДУБЛЮЄ `OptionsState` (виводиться з реєстру `options/option_fields.ts`).
 * Дублювання свідоме: правило напрямку залежностей забороняє `modules/`
 * імпортувати з `options/` (ARCHITECTURE §2, Presentation → Infrastructure,
 * не навпаки). Щоб копія не розійшлась мовчки, її склад звіряється з реєстром
 * тестом `tests/storage_schema.test.js`.
 */
/**
 * Об'єкт `db` попапу: назви програм плюс СТОРОННІ поля.
 *
 * Індексна сигнатура тут не косметична: `saveSettingsFromForm` навмисно мутує
 * наявний об'єкт, а не замінює його, «щоб сторонні поля DB не губились»
 * (`options_settings_io.ts`). Тому відомі поля названі, а решта лишається
 * відкритою — але вже як `unknown`, а не `any`.
 */
export interface StoredDb {
    newTitleSS?: string;
    newTitlePreach?: string;
    [key: string]: unknown;
}

/**
 * Опції в сховищі.
 *
 * СКЛАД = поля форми (реєстр `options/option_fields.ts`) ПЛЮС кілька значень,
 * які зберігаються поруч, але у формі не показуються. Такі «позаформні» поля
 * перелічені нижче окремо і мають бути свідомим рішенням, а не випадковістю —
 * тест `storage_schema` вимагає, щоб кожне з них було в явному списку.
 */
export interface StoredOptions {
    newTitleSS?: string;
    newTitlePreach?: string;
    ui_locale?: string;
    anti_afk_enabled?: boolean;
    anti_afk_interval_sec?: number;
    auto_heal_enabled?: boolean;
    text_truncation_length?: number;
    youtube_enabled?: boolean;
    studio_enabled?: boolean;
    compact_secondary_tabs_default?: boolean;

    // --- позаформні поля (немає елемента в options.html) ---
    /** Додаткові канали, зареєстровані програмно (`channel_config.ts`). */
    customChannels?: ChannelConfigItem[];
}

/**
 * Схема сховища: ключ → форма значення (T17).
 *
 * Catch-all `[key: string]: any` ПРИБРАНО (крок 2). Динамічні родини ключів
 * описані шаблонними літеральними типами вище, тож схема тепер закрита:
 * ключ, який не є ані відомим літералом, ані членом описаної родини, більше
 * не проходить компіляцію. Саме під тим catch-all і ховалась би одруківка в
 * імені ключа — найтихіший спосіб «загубити» дані користувача.
 *
 * Якщо додаєте НОВУ родину динамічних ключів — опишіть її окремим шаблонним
 * типом і додайте індекс сюди. Повертати `[key: string]: any` не можна:
 * це знімає перевірку з усього сховища заради одного нового ключа.
 */
export interface StorageSchema {
    [STORAGE_KEYS.OPTIONS]?: StoredOptions;
    [STORAGE_KEYS.DB]?: StoredDb;
    [STORAGE_KEYS.CATEGORIES]?: Record<string, string>;
    [STORAGE_KEYS.CHECKBOX_STATE]?: { date?: string; data?: Record<string, boolean> };
    [STORAGE_KEYS.PRAYERS]?: PrayerItem[];
    [STORAGE_KEYS.YT_COLLECTED]?: YTCollectedItem[];
    [STORAGE_KEYS.STUDIO_ENABLED]?: boolean;
    [STORAGE_KEYS.COLLAPSED_TABS]?: string[];
    // Значення ніколи не `null`: `saveButtonState` видаляє ключ замість того,
    // щоб записати null. Тому тут `CommentStateActionId`, а не ширший
    // `ButtonStateValue` — інакше кеші поверхонь довелося б розширювати під
    // стан, якого у сховищі не буває.
    [STORAGE_KEYS.STUDIO_BUTTON_STATE]?: Record<string, CommentStateActionId>;
    [STORAGE_KEYS.STUDIO_CHECKBOX_STATE]?: Record<string, CheckboxStateEntry>;
    // Значення — запис прив'язки, а не рядок: ще одна неточність схеми,
    // яку показало її ж підключення (T17).
    [STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP]?: Record<string, VideoSheetMapEntry>;
    // Журнал ручних корекцій — МАСИВ записів, а не мапа: схема тут була
    // просто неправильною (`Record<string, any>`), і ніхто цього не бачив,
    // бо `StorageSchema` не використовувалась жодним місцем коду.
    [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]?: StudioOverrideLogEntry[];
    [STORAGE_KEYS.POPUP_ACTIVE_TAB]?: string;
    [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]?: string;
    [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]?: Record<string, number>;
    // CSS-рядки ('300px'), а не числа — так їх кладе `setupResizeObserver`.
    [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]?: Record<string, StoredElementSize>;
    [STORAGE_KEYS.INSTALLED_AT]?: number;
    [STORAGE_KEYS.VERSION]?: string;
    [STORAGE_KEYS.AUTO_BACKUP_SNAPSHOT]?: { timestamp: number; timestampIso: string; data: StorageRawResult };
    [STORAGE_KEYS.YT_BUTTON_STATES]?: Record<string, CommentStateActionId>;
    [STORAGE_KEYS.YT_CHECKBOX_STATE]?: Record<string, CheckboxStateEntry>;
    [STORAGE_KEYS.STATS_CHARTS]?: Record<string, Record<string, StreamChartSession>>;
    [STORAGE_KEYS.POPUP_TRANSLIT_OLD]?: string;
    [STORAGE_KEYS.POPUP_TRANSLIT_NEW]?: string;
    [STORAGE_KEYS.EXPANDED_TABS]?: string[];

    // Динамічні родини ключів — замість колишнього `[key: string]: any`.
    [key: SheetStateKey]: SheetStateValue | undefined;
    [key: SheetCollectedKey]: CommentPayload[] | undefined;
    [key: SheetDividerKey]: number | undefined;
    [key: LegacyTgKey]: unknown;
    [key: TelegramDataKey]: unknown;
}

export const STORAGE_KEYS = {
    // Core
    OPTIONS: 'syh:core:options',
    DB: 'syh:core:db',
    CATEGORIES: 'syh:core:categories',
    CHECKBOX_STATE: 'syh:core:checkbox_state',
    INSTALLED_AT: 'syh:core:installed_at',
    VERSION: 'syh:core:version',
    STUDIO_ENABLED: 'syh:core:studio_enabled',

    // StreamYard UI
    COLLAPSED_TABS: 'syh:streamyard:collapsed_tabs',
    // Жив літералом у `right_tabs_storage.ts` повз реєстр ключів — знайдено
    // при закритті схеми (T17, крок 2).
    EXPANDED_TABS: 'syh:streamyard:expanded_tabs',

    // Youtube
    YT_COLLECTED: 'syh:popup:yt:collected',
    YT_BUTTON_STATES: 'syh:yt:button_states',
    YT_CHECKBOX_STATE: 'syh:yt:checkbox_state',
    PRAYERS: 'syh:popup:prayers',
    TELEGRAM_DATA_PREFIX: 'syh:popup:telegram:data:',
    TELEGRAM_OLD_INPUT_PREFIX: 'syh:popup:telegram:oldInput:',

    // Studio
    STUDIO_BUTTON_STATE: 'syh:studio:button_state',
    STUDIO_CHECKBOX_STATE: 'syh:studio:checkbox_state',
    STUDIO_VIDEO_SHEET_MAP: 'syh:studio:video_sheet_map',
    STUDIO_OVERRIDE_LOG: 'syh:studio:override_log',

    // Stats
    STATS_CHARTS: 'syh:stats:charts',

    // Popup UI State
    POPUP_ACTIVE_TAB: 'syh:popup:active_tab',
    POPUP_ACTIVE_SUBTAB: 'syh:popup:active_subtab',
    POPUP_SCROLL_POSITIONS: 'syh:popup:scroll_positions',
    POPUP_TEXTAREA_SIZES: 'syh:popup:textarea_sizes',
    POPUP_TRANSLIT_OLD: 'syh:popup:translit_old',
    POPUP_TRANSLIT_NEW: 'syh:popup:translit_new',
    // Retention & Backup
    AUTO_BACKUP_SNAPSHOT: 'syh:retention:auto_backup_snapshot',
} as const;

/**
 * Type-safe helper to build sheet-specific storage keys
 */
export function getSheetStorageKey(sheetId: string, suffix: string): SheetStateKey {
    return `syh:popup:sheet:${sheetId}:${suffix}`;
}

export function getSheetCollectedStorageKey(sheetId: string): SheetCollectedKey {
    return `syh:popup:collected:${sheetId}`;
}

const _createSheetKey = (suffix: string) => (sheetId: string): SheetStateKey => getSheetStorageKey(sheetId, suffix);

export const POPUP_SHEET_KEYS = {
    oldList: _createSheetKey('oldList'),
    answered: _createSheetKey('answered'),
    newTelegram: _createSheetKey('newTelegram'),
    finalResultHtml: _createSheetKey('finalResultHtml'),
    statsHtml: _createSheetKey('statsHtml'),
    statsVisible: _createSheetKey('statsVisible'),
    deletedLogHtml: _createSheetKey('deletedLogHtml'),
    deletedLogCount: _createSheetKey('deletedLogCount'),
    deletedLogDetailsVisible: _createSheetKey('deletedLogDetailsVisible'),
    deletedLogDetailsOpen: _createSheetKey('deletedLogDetailsOpen'),
    cleanedLogHtml: _createSheetKey('cleanedLogHtml'),
    cleanedLogCount: _createSheetKey('cleanedLogCount'),
    cleanedLogDetailsVisible: _createSheetKey('cleanedLogDetailsVisible'),
    cleanedLogDetailsOpen: _createSheetKey('cleanedLogDetailsOpen'),
    dividerPos: (sheetId: string): SheetDividerKey => `syh:popup:divider_pos:${sheetId}`,
};

const EXACT_KEY_MIGRATIONS: Readonly<Record<string, string>> = {
    'syh_yt_collected': STORAGE_KEYS.YT_COLLECTED,
    'syh_yt_button_states': STORAGE_KEYS.YT_BUTTON_STATES,
    'syh_yt_checkbox_state': STORAGE_KEYS.YT_CHECKBOX_STATE,
    'syh_options': STORAGE_KEYS.OPTIONS,
    'db': STORAGE_KEYS.DB,
    'syh_prayers': STORAGE_KEYS.PRAYERS,
    'syh_banner_categories': STORAGE_KEYS.CATEGORIES,
    'syh_checkbox_state': STORAGE_KEYS.CHECKBOX_STATE,
    'syh_stream_charts': STORAGE_KEYS.STATS_CHARTS,
    'syh_installed_at': STORAGE_KEYS.INSTALLED_AT,
    'syh_version': STORAGE_KEYS.VERSION,
    'syh_studio_enabled': STORAGE_KEYS.STUDIO_ENABLED,
    'syh_studio_button_state': STORAGE_KEYS.STUDIO_BUTTON_STATE,
    'syh_studio_checkbox_state': STORAGE_KEYS.STUDIO_CHECKBOX_STATE,
    'syh_studio_video_sheet_map': STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP,
    'syh_studio_manual_override_log': STORAGE_KEYS.STUDIO_OVERRIDE_LOG,
    'studio_comment_state': 'syh:studio:state',

    // Popup state key migrations
    'tg_active_tab': STORAGE_KEYS.POPUP_ACTIVE_TAB,
    'syh:popup:legacy:active_tab': STORAGE_KEYS.POPUP_ACTIVE_TAB,
    'tg_active_subtab': STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
    'syh:popup:legacy:active_subtab': STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
    'tg_scroll_positions': STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
    'syh:popup:legacy:scroll_positions': STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
    'tg_textarea_sizes': STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
    'syh:popup:legacy:textarea_sizes': STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
    'tg_translit_old': STORAGE_KEYS.POPUP_TRANSLIT_OLD,
    'syh:popup:legacy:translit_old': STORAGE_KEYS.POPUP_TRANSLIT_OLD,
    'tg_translit_new': STORAGE_KEYS.POPUP_TRANSLIT_NEW,
    'syh:popup:legacy:translit_new': STORAGE_KEYS.POPUP_TRANSLIT_NEW,
};

const PREFIX_MIGRATIONS: ReadonlyArray<[string, (suffix: string) => string]> = [
    ['syh_telegram_data__', (suffix) => `${STORAGE_KEYS.TELEGRAM_DATA_PREFIX}${suffix}`],
    ['syh_old_input__', (suffix) => `${STORAGE_KEYS.TELEGRAM_OLD_INPUT_PREFIX}${suffix}`],
    ['studio_comment_state__', (suffix) => `syh:studio:state:${suffix}`],
    ['syh_popup_divider_pos__', (suffix) => `syh:popup:divider_pos:${suffix}`],
    ['syh_collected__', (suffix) => `syh:popup:collected:${suffix}`],
    ['tg_', (suffix) => {
        const parts = suffix.split('__');
        if (parts.length === 2) {
            return `syh:popup:sheet:${parts[1]}:${parts[0]}`;
        }
        return `syh:popup:legacy:${suffix}`;
    }]
];

export function migrateKey(oldKey: string): string {
    if (!oldKey || oldKey.startsWith('syh:')) return oldKey;

    const exactMatch = EXACT_KEY_MIGRATIONS[oldKey];
    if (exactMatch) return exactMatch;

    for (const [prefix, transform] of PREFIX_MIGRATIONS) {
        if (oldKey.startsWith(prefix)) {
            return transform(oldKey.substring(prefix.length));
        }
    }

    return oldKey;
}

export type StorageKeyValues = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;

export function migrateItemKeys(items: StorageWriteItems): StorageWriteItems {
    const migratedItems: StorageRawResult = {};
    for (const [k, v] of Object.entries(items)) {
        migratedItems[migrateKey(k)] = v;
    }
    return migratedItems as StorageWriteItems;
}

export function migrateKeys(keys: StorageKeyValues | StorageKeyValues[]): string | string[] {
    return Array.isArray(keys) ? (keys as string[]).map(migrateKey) : migrateKey(keys as string);
}

export function prepareQueryKeys(keys: StorageKeyValues | StorageKeyValues[]): { origKeys: string[]; queryKeys: string[] } {
    const origKeys = Array.isArray(keys) ? (keys as string[]) : [keys as string];
    const keySet = new Set<string>();
    origKeys.forEach(k => {
        if (k) {
            keySet.add(k);
            const m = migrateKey(k);
            if (m) keySet.add(m);
        }
    });
    return { origKeys, queryKeys: Array.from(keySet) };
}

export function processGetResult<T>(origKeys: string[], rawResult: StorageRawResult): T {
    // Ключі приходять ззовні (у тому числі історичні), тому схема тут ще не
    // застосовна — вона діє вже на результаті.
    const raw = rawResult;
    const out: StorageRawResult = { ...raw };
    if (rawResult) {
        origKeys.forEach(k => {
            const m = migrateKey(k);
            const val = raw[k] ?? (m ? raw[m] : undefined);
            if (val !== undefined) {
                out[k] = val;
                if (m) out[m] = val;
            }
        });
    }
    return out as T;
}
