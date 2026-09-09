// options/form.ts
//
// Двонаправлений міст «форма ↔ стан налаштувань»:
//   - `populateFormElements` пише стан у DOM;
//   - `readOptionsFromForm` читає DOM у стан.
//
// Читання винесено сюди з `OptionsController.saveSettings`
// (CRAP 63.6 / cyclomatic 15 за звітом Fallow 3.14): вся складність там була
// суто механічною — 11 однотипних звернень до DOM із фолбеками.
//
// Після T9 обидві функції — цикли по реєстру опцій (`option_fields.ts`).
// Раніше це були два з п'яти паралельних списків: опція, забута в
// `readOptionsFromForm`, показувалась у формі, але не зберігалась.
import type { OptionsState } from './defaults';
import { OPTION_FIELDS, type OptionFieldDescriptor } from './option_fields';

function setVal(id: string, val: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val;
}

function setCheck(id: string, val: boolean): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = val;
}

function getDefaultValue<T>(value: T | undefined, defaultValue: T): T {
    return value !== undefined ? value : defaultValue;
}

/**
 * Значення опції для форми з правильним фолбеком.
 *
 * КВІРК 1-в-1: текстові поля та `<select>` падають на дефолт за `||`
 * (порожній рядок вважається «немає значення»), а чекбокси й числа — лише
 * коли значення `undefined` (тобто збережений `false` або `0` поважається).
 */
function resolveFormValue(
    field: OptionFieldDescriptor,
    stored: Record<string, unknown>,
    defaults: OptionsState
): any {
    const raw = stored[field.key];
    const fallback = (defaults as Record<string, unknown>)[field.key];

    if (field.kind === 'text' || field.kind === 'select') return raw || fallback;
    return getDefaultValue(raw, fallback);
}

export function populateFormElements(
    db: any,
    opts: Partial<OptionsState>,
    defaults: OptionsState,
    studioEnabled?: boolean
): void {
    // `studio_enabled` живе ще й окремим ключем сховища; переданий явно, він
    // має пріоритет над значенням усередині об'єкта опцій (поведінка 1-в-1).
    const overrides: Record<string, unknown> = {};
    if (studioEnabled !== undefined) overrides.studio_enabled = studioEnabled;

    OPTION_FIELDS.forEach(field => {
        const stored = field.source === 'db' ? (db || {}) : (opts || {});
        const value = field.key in overrides
            ? overrides[field.key]
            : resolveFormValue(field, stored, defaults);

        if (field.kind === 'checkbox') setCheck(field.elementId, Boolean(value));
        else setVal(field.elementId, String(value));
    });
}

/**
 * Текстове поле з обрізанням країв; порожній рядок падає на фолбек.
 *
 * Каст до неnullable типу навмисний і збережений 1-в-1 з оригіналом: він
 * повідомляє TypeScript, що поле «завжди є», тоді як у рантаймі `?.` усе одно
 * дає `undefined` для відсутнього елемента.
 */
function readTrimmedText(id: string, fallback: string): string {
    return (document.getElementById(id) as HTMLInputElement)?.value.trim() || fallback;
}

/** Значення `<select>` без обрізання країв (як в оригіналі). */
function readSelectValue(id: string, fallback: string): string {
    return (document.getElementById(id) as HTMLSelectElement)?.value || fallback;
}

/**
 * Стан чекбокса.
 *
 * Повертає булеве значення (true/false, навіть якщо елемент відсутній у DOM).
 */
function readCheckbox(id: string): boolean {
    return Boolean((document.getElementById(id) as HTMLInputElement)?.checked);
}

/**
 * Ціле число з поля вводу.
 *
 * Нечисловий ввід (порожнє поле, "abc") або нечисловий фолбек більше не дають
 * `NaN`: результат завжди валідне ціле, інакше повертається `0`, щоб уникнути
 * запису `NaN` у storage і подальшого «зациклення» поля на рядку "NaN".
 */
function readInteger(id: string, fallback: string): number {
    const parsed = parseInt((document.getElementById(id) as HTMLInputElement)?.value || fallback, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function readFieldValue(field: OptionFieldDescriptor, defaults: OptionsState): unknown {
    const fallback = (defaults as Record<string, unknown>)[field.key];

    switch (field.kind) {
        case 'text': return readTrimmedText(field.elementId, String(fallback));
        case 'select': return readSelectValue(field.elementId, String(fallback));
        case 'checkbox': return readCheckbox(field.elementId);
        // Числовий фолбек — рядковий літерал із реєстру, навмисно не зв'язаний
        // з `default` (див. коментар до `readFallback` в `option_fields.ts`).
        case 'number': return readInteger(field.elementId, field.readFallback ?? String(fallback));
    }
}

/**
 * Збирає повний стан налаштувань із DOM-форми.
 * Дзеркальна операція до `populateFormElements`.
 *
 * Порядок ключів у результаті = порядок рядків у `OPTION_FIELDS`. Він доходить
 * до JSON експорту конфігурації, тому зафіксований тестом.
 */
export function readOptionsFromForm(defaults: OptionsState): OptionsState {
    const state: Record<string, unknown> = {};
    OPTION_FIELDS.forEach(field => { state[field.key] = readFieldValue(field, defaults); });
    return state as OptionsState;
}
