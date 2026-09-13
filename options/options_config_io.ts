import { SYH_I18N } from '../modules/registry/i18n';
// options/options_config_io.ts
//
// Експорт та імпорт повної конфігурації розширення у/з JSON-файл.
//
// Виділено з `OptionsController.exportConfig` / `importConfig`: це єдина
// частина сторінки, що працює з `Blob`, `URL.createObjectURL` та `FileReader`,
// і вона не має нічого спільного з формою налаштувань.
//
// Поведінка 1-в-1:
//   - у файл потрапляють службові поля (`app`, `timestamp`, `version`, `db`,
//     `syh_options`) ПЛЮС сирі копії всіх наявних ключів storage;
//   - `version` без збереженого значення падає на `'1.0.0'`;
//   - `syh_options` без збережених опцій падає на `DEFAULT_OPTIONS`;
//   - невалідна структура і битий JSON повідомляються через `alert`.

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage/storage';
import { DEFAULT_OPTIONS } from './defaults';
import { validateImportedConfig, extractImportedItems, type ImportedConfig } from './validation';
import type { StorageRawResult } from '../modules/storage/storage';

const EXPORT_APP_NAME = 'StreamYard Helper';
/** Фолбек версії для тестового середовища без доступу до chrome.runtime.getManifest */
const FALLBACK_VERSION = '1.0.0';

/** `streamyard_helper_config_YYYY-MM-DD.json`. */
function buildExportFileName(): string {
    return `streamyard_helper_config_${new Date().toISOString().slice(0, 10)}.json`;
}

function resolveExportVersion(storageVersion: unknown): string {
    if (typeof storageVersion === 'string' && storageVersion) {
        return storageVersion;
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) {
        return chrome.runtime.getManifest().version;
    }
    return FALLBACK_VERSION;
}

function buildExportPayload(allKeys: string[], result: StorageRawResult): ImportedConfig {
    const exportData: ImportedConfig = {
        app: EXPORT_APP_NAME,
        timestamp: new Date().toISOString(),
        version: resolveExportVersion(result[STORAGE_KEYS.VERSION]),
        db: result[STORAGE_KEYS.DB] || {},
        syh_options: result[STORAGE_KEYS.OPTIONS] || DEFAULT_OPTIONS
    };

    for (const key of allKeys) {
        if (result[key] !== undefined) {
            exportData[key] = result[key];
        }
    }

    return exportData;
}

/** Віддає JSON користувачу через тимчасовий object-URL. */
function downloadJson(payload: ImportedConfig, fileName: string): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportConfig(notify: (message: string) => void): void {
    const allKeys = Object.values(STORAGE_KEYS);

    // Експорт вигрібає сховище ЯК Є — разом із ключами поза схемою
    // (історичні імена зі старих версій), тож тут саме сире представлення.
    SYH_STORAGE.get<StorageRawResult>(allKeys, (result) => {
        downloadJson(buildExportPayload(allKeys, result), buildExportFileName());
        notify(SYH_I18N.getMessage('options_export_success', '📥 Налаштування та стан успішно експортовано'));
    });
}

/**
 * Розбирає та зберігає вміст файлу; `onImported` — після успішного запису.
 *
 * КВІРК 1-в-1: `try` навмисно охоплює весь конвеєр, а не лише `JSON.parse`.
 * Тому будь-який виняток нижче за течією теж повідомляється як «помилка
 * зчитування JSON».
 */
function applyImportedText(raw: string, onImported: () => void, notify: (message: string) => void): void {
    try {
        const imported = JSON.parse(raw);
        if (validateImportedConfig(imported)) {
            SYH_STORAGE.set(extractImportedItems(imported), () => {
                onImported();
                notify(SYH_I18N.getMessage('options_import_success', '📤 Налаштування та стан успішно імпортовано!'));
            });
        } else {
            notify(SYH_I18N.getMessage('options_import_invalid', 'Некоректний формат файлу конфігурації.'));
        }
    } catch {
        notify(SYH_I18N.getMessage('options_import_error', 'Помилка при зчитуванні JSON файлу.'));
    }
}

export function importConfig(
    event: Event,
    onImported: () => void,
    notify: (message: string) => void
): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => applyImportedText(e.target?.result as string, onImported, notify);
    reader.readAsText(file);
}
