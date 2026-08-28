// options/options.ts
//
// Точка входу сторінки налаштувань: збирає докупи незалежні модулі й
// підписується на кнопки. Це найвищий refactoring target звіту Fallow 3.14
// (`priority 32.1`, hotspot 33.7 — 16 комітів, «accelerating trend»).
//
// Раніше `OptionsController` тримав усе: навігацію, форму, storage, Blob/FileReader,
// журнал Studio і таймер тоста. Тепер кожна відповідальність має власний файл:
//   - `./options_navigation`    — меню секцій;
//   - `./options_toast`         — сповіщення (єдиний володар таймера);
//   - `./options_settings_io`   — завантаження/збереження/скидання налаштувань;
//   - `./options_config_io`     — експорт/імпорт JSON-конфігурації;
//   - `./options_studio_log`    — журнал ручних корекцій YouTube Studio.
//
// Контролер лишає лише проводку: «яка кнопка → яка дія → що показати».
// Поведінка збережена 1-в-1 (`tests/options_settings.test.js`,
// `tests/options_config.test.js`, `tests/options_controller_io.test.js`).

import { validateImportedConfig } from './validation';
import { DEFAULT_OPTIONS, type OptionsState } from './defaults';
import { populateFormElements } from './form';
import { initSectionNavigation } from './options_navigation';
import { createToastController } from './options_toast';
import { loadSettingsIntoForm, saveSettingsFromForm, resetSettingsToDefaults } from './options_settings_io';
import { exportConfig, importConfig } from './options_config_io';
import { loadStudioLog, copyStudioLog, clearStudioLog } from './options_studio_log';

/** Прив'язує обробник кліку, якщо кнопка присутня в розмітці. */
function onClick(id: string, handler: () => void): void {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
}

class OptionsController {
    private readonly toast = createToastController();

    constructor() {
        this.initVersionBadge();
        initSectionNavigation();
        this.initEvents();
        this.loadSettings();
    }

    private initVersionBadge(): void {
        const badge = document.getElementById('optionsVersionBadge');
        if (!badge) return;
        const version = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '1.0.0';
        badge.textContent = `v${version} — Options & Preferences`;
    }

    private notify = (message: string): void => {
        this.toast.show(message);
    };

    private initEvents(): void {
        onClick('saveTopBtn', () => this.saveSettings());
        onClick('exportConfigBtn', () => exportConfig(this.notify));
        onClick('resetDefaultsBtn', () => this.resetDefaults());
        onClick('copyStudioLogBtn', () => copyStudioLog(this.notify));
        onClick('clearStudioLogBtn', () => clearStudioLog(this.notify));

        const importInput = document.getElementById('importConfigFile') as HTMLInputElement;
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                importConfig(e, () => this.loadSettings(), this.notify);
            });
        }
    }

    private loadSettings(): void {
        loadSettingsIntoForm(() => loadStudioLog());
    }

    private saveSettings(): void {
        saveSettingsFromForm(() => this.notify('✅ Налаштування успішно збережено!'));
    }

    private resetDefaults(): void {
        resetSettingsToDefaults(() => {
            this.loadSettings();
            this.notify('⚠️ Налаштування скинуто до початкових!');
        });
    }
}

export { validateImportedConfig, DEFAULT_OPTIONS, type OptionsState, populateFormElements };

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        new OptionsController();
    });
}
