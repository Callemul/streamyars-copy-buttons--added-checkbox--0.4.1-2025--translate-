// options/option_fields.ts
//
// ЄДИНИЙ РЕЄСТР ОПЦІЙ СТОРІНКИ НАЛАШТУВАНЬ (T9).
//
// До цього файлу одна опція жила в п'яти-семи паралельних списках: поле в
// `OptionsState`, значення в `DEFAULT_OPTIONS`, розмітка в `options.html`,
// рядок у `populateFormElements`, рядок у `readOptionsFromForm`, іноді ще
// валідація і споживач. Усі списки трималися синхронними руками, і будь-який
// пропуск давав тихий збій: опція або не показувалась у формі, або не
// зберігалась, або зберігалась без значення за замовчуванням.
//
// Тепер джерело одне — таблиця `OPTION_FIELDS` нижче. З неї виводяться:
//   • тип `OptionsState`      (`options/defaults.ts`);
//   • `DEFAULT_OPTIONS`       (там само);
//   • `populateFormElements`  (`options/form.ts`) — цикл по таблиці;
//   • `readOptionsFromForm`   (там само) — цикл по таблиці;
//   • перевірка атрибутів `min`/`max`/`step` у `options.html` (тестом).
//
// Додати опцію = розмітка з `id="opt…"` в `options.html` + ОДИН рядок тут
// + споживач, який на неї реагує.
//
// ─────────────────────────────────────────────────────────────────────────────
// ПОРЯДОК РЯДКІВ ЗНАЧУЩИЙ
//
// `readOptionsFromForm` будує об'єкт саме в порядку цієї таблиці, а він потім
// іде в `chrome.storage` і далі у файл експорту конфігурації. `JSON.stringify`
// зберігає порядок вставки ключів, тож перестановка рядків змінила б JSON
// експорту. Порядок збігається з докомітним і зафіксований тестом.

import { SYH_CONFIG } from '../modules/registry/config';

/** Як опція представлена у формі й якого типу її значення. */
export type OptionKind = 'text' | 'select' | 'checkbox' | 'number';

/** Де зберігається значення: у `DB` (назви програм) чи в `OPTIONS`. */
export type OptionSource = 'db' | 'options';

export interface OptionFieldDescriptor {
    /** Ключ у `OptionsState` — він же ключ у сховищі. */
    readonly key: string;
    /** id елемента форми в `options/options.html`. */
    readonly elementId: string;
    readonly kind: OptionKind;
    readonly source: OptionSource;
    readonly default: string | number | boolean;
    /**
     * Рядковий фолбек ЧИСЛОВОГО поля при читанні форми.
     *
     * КВІРК 1-в-1: історично він літерал і НЕ зв'язаний з `default` — сьогодні
     * значення збігаються (30 с та 195 символів), але зв'язок навмисно не
     * робиться, щоб рефакторинг не змінив поведінку порожнього поля.
     */
    readonly readFallback?: string;
    /** Атрибути числового поля в розмітці; звіряються тестом з `options.html`. */
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
}

/**
 * Опції — у порядку, в якому вони пишуться в об'єкт стану (див. вище).
 */
export const OPTION_FIELDS = [
    {
        key: 'newTitleSS', elementId: 'optSschoolName', kind: 'text', source: 'db',
        default: 'СШ Урок'
    },
    {
        key: 'newTitlePreach', elementId: 'optPreachName', kind: 'text', source: 'db',
        default: 'Проповідь'
    },
    {
        key: 'ui_locale', elementId: 'optLanguage', kind: 'select', source: 'options',
        default: 'auto'
    },
    {
        key: 'anti_afk_enabled', elementId: 'optAntiAfkEnabled', kind: 'checkbox', source: 'options',
        default: true
    },
    {
        key: 'anti_afk_interval_sec', elementId: 'optAntiAfkInterval', kind: 'number', source: 'options',
        default: SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL / 1000,
        readFallback: '30', min: 5, max: 300, step: 5
    },
    {
        key: 'auto_heal_enabled', elementId: 'optAutoHealEnabled', kind: 'checkbox', source: 'options',
        default: true
    },
    {
        key: 'text_truncation_length', elementId: 'optTruncationLength', kind: 'number', source: 'options',
        default: SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH,
        readFallback: '195', min: 50, max: 500
    },
    {
        key: 'compact_secondary_tabs_default', elementId: 'optCompactSecondaryTabs', kind: 'checkbox', source: 'options',
        default: true
    },
    {
        key: 'youtube_enabled', elementId: 'optYouTubeEnabled', kind: 'checkbox', source: 'options',
        default: true
    },
    {
        key: 'studio_enabled', elementId: 'optStudioEnabled', kind: 'checkbox', source: 'options',
        default: true
    }
] as const satisfies readonly OptionFieldDescriptor[];

/** Тип значення опції виводиться з її виду у формі. */
type OptionValueOf<K extends OptionKind> =
    K extends 'checkbox' ? boolean :
    K extends 'number' ? number :
    string;

/**
 * Стан налаштувань — виводиться з реєстру, а не пишеться руками.
 * Нова опція в таблиці одразу з'являється в типі, і `tsc` вимагає її обробити.
 */
export type OptionsStateFromRegistry = {
    -readonly [F in (typeof OPTION_FIELDS)[number] as F['key']]: OptionValueOf<F['kind']>
};

/** Значення за замовчуванням — теж із реєстру. */
export function buildDefaultOptions(): OptionsStateFromRegistry {
    const defaults: Record<string, unknown> = {};
    OPTION_FIELDS.forEach(field => { defaults[field.key] = field.default; });
    return defaults as OptionsStateFromRegistry;
}
