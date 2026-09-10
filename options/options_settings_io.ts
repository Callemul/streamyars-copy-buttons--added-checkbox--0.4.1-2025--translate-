// options/options_settings_io.ts
//
// Читання/запис налаштувань сторінки опцій у chrome.storage.
//
// Виділено з `OptionsController.loadSettings` / `saveSettings`. Сам збір даних
// із DOM уже живе в `./form`, тож тут лишається лише робота зі сховищем і
// порядок ключів — саме він критичний для сумісності
// (`tests/options_settings.test.js`).
//
// Поведінка 1-в-1:
//   - `newTitleSS` / `newTitlePreach` дублюються в `DB`, решта полів — в `OPTIONS`;
//   - сторонні поля `DB` зберігаються (об'єкт мутується, а не замінюється);
//   - `studio_enabled` пишеться і всередину `OPTIONS`, і окремим ключем.

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage/storage';
import { DEFAULT_OPTIONS, type OptionsState } from './defaults';
import { populateFormElements, readOptionsFromForm } from './form';

/** Наповнює форму збереженим станом; `onLoaded` викликається після запису в DOM. */
export function loadSettingsIntoForm(onLoaded: () => void): void {
    SYH_STORAGE.get([STORAGE_KEYS.DB, STORAGE_KEYS.OPTIONS, STORAGE_KEYS.STUDIO_ENABLED], (result) => {
        const db = result[STORAGE_KEYS.DB] || {};
        const opts: Partial<OptionsState> = result[STORAGE_KEYS.OPTIONS] || {};
        populateFormElements(db, opts, DEFAULT_OPTIONS, result[STORAGE_KEYS.STUDIO_ENABLED]);
        onLoaded();
    });
}

/** Зчитує форму і зберігає її у три ключі storage; `onSaved` — після запису. */
export function saveSettingsFromForm(onSaved: () => void): void {
    const newOptions = readOptionsFromForm(DEFAULT_OPTIONS);

    SYH_STORAGE.get([STORAGE_KEYS.DB], (result) => {
        const currentDb = result[STORAGE_KEYS.DB] || {};
        currentDb.newTitleSS = newOptions.newTitleSS;
        currentDb.newTitlePreach = newOptions.newTitlePreach;

        SYH_STORAGE.set({
            [STORAGE_KEYS.DB]: currentDb,
            [STORAGE_KEYS.OPTIONS]: newOptions,
            [STORAGE_KEYS.STUDIO_ENABLED]: newOptions.studio_enabled
        }, onSaved);
    });
}

/** Скидає `DB` та `OPTIONS` до значень за замовчуванням після підтвердження. */
export function resetSettingsToDefaults(onReset: () => void): void {
    if (!confirm('Ви впевнені, що хочете скинути всі налаштування до стандартних?')) return;

    SYH_STORAGE.set({
        [STORAGE_KEYS.DB]: {
            newTitleSS: DEFAULT_OPTIONS.newTitleSS,
            newTitlePreach: DEFAULT_OPTIONS.newTitlePreach
        },
        [STORAGE_KEYS.OPTIONS]: DEFAULT_OPTIONS
    }, onReset);
}
