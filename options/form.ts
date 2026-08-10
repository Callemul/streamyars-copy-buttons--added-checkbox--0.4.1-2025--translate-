// options/form.ts
//
// Двонаправлений міст «форма ↔ стан налаштувань»:
//   - `populateFormElements` пише стан у DOM;
//   - `readOptionsFromForm` читає DOM у стан.
//
// Читання винесено сюди з `OptionsController.saveSettings`
// (CRAP 63.6 / cyclomatic 15 за звітом Fallow 3.14): вся складність там була
// суто механічною — 11 однотипних звернень до DOM із фолбеками. Тепер це
// таблиця полів, а `saveSettings` лишається лінійним.
import type { OptionsState } from './defaults';

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

export function populateFormElements(
    db: any,
    opts: Partial<OptionsState>,
    defaults: OptionsState,
    studioEnabled?: boolean
): void {
    setVal('optSschoolName', db.newTitleSS || defaults.newTitleSS);
    setVal('optPreachName', db.newTitlePreach || defaults.newTitlePreach);
    setVal('optLanguage', opts.ui_locale || defaults.ui_locale);

    setCheck('optAntiAfkEnabled', getDefaultValue(opts.anti_afk_enabled, defaults.anti_afk_enabled));
    setVal('optAntiAfkInterval', String(getDefaultValue(opts.anti_afk_interval_sec, defaults.anti_afk_interval_sec)));

    setCheck('optAutoHealEnabled', getDefaultValue(opts.auto_heal_enabled, defaults.auto_heal_enabled));
    setVal('optTruncationLength', String(getDefaultValue(opts.text_truncation_length, defaults.text_truncation_length)));

    setCheck('optShowCopyButtons', getDefaultValue(opts.show_copy_buttons, defaults.show_copy_buttons));
    setCheck('optCompactSecondaryTabs', getDefaultValue(opts.compact_secondary_tabs_default, defaults.compact_secondary_tabs_default));
    setCheck('optYouTubeEnabled', getDefaultValue(opts.youtube_enabled, defaults.youtube_enabled));

    const isStudioEnabled = studioEnabled !== undefined
        ? studioEnabled
        : getDefaultValue(opts.studio_enabled, defaults.studio_enabled);
    setCheck('optStudioEnabled', isStudioEnabled);
}

// Рядкові фолбеки числових полів. Навмисно лишені літералами, як і в
// оригінальному `saveSettings`: вони дублюють `DEFAULT_OPTIONS`, але не
// зв'язані з ним (сьогодні збігаються — 30 с та 195 символів).
const ANTI_AFK_INTERVAL_FALLBACK = '30';
const TRUNCATION_LENGTH_FALLBACK = '195';

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
 * КВІРК 1-в-1: для відсутнього у DOM елемента повертає `undefined`, попри
 * задекларований тип `boolean`. Саме це значення потрапляє в storage.
 */
function readCheckbox(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement)?.checked;
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

/**
 * Збирає повний стан налаштувань із DOM-форми.
 * Дзеркальна операція до `populateFormElements`.
 */
export function readOptionsFromForm(defaults: OptionsState): OptionsState {
    return {
        newTitleSS: readTrimmedText('optSschoolName', defaults.newTitleSS),
        newTitlePreach: readTrimmedText('optPreachName', defaults.newTitlePreach),
        ui_locale: readSelectValue('optLanguage', defaults.ui_locale),
        anti_afk_enabled: readCheckbox('optAntiAfkEnabled'),
        anti_afk_interval_sec: readInteger('optAntiAfkInterval', ANTI_AFK_INTERVAL_FALLBACK),
        auto_heal_enabled: readCheckbox('optAutoHealEnabled'),
        text_truncation_length: readInteger('optTruncationLength', TRUNCATION_LENGTH_FALLBACK),
        show_copy_buttons: readCheckbox('optShowCopyButtons'),
        compact_secondary_tabs_default: readCheckbox('optCompactSecondaryTabs'),
        youtube_enabled: readCheckbox('optYouTubeEnabled'),
        studio_enabled: readCheckbox('optStudioEnabled')
    };
}