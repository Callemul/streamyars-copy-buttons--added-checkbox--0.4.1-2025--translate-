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

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { DEFAULT_OPTIONS } from './defaults';
import { validateImportedConfig, extractImportedItems } from './validation';

const EXPORT_APP_NAME = 'StreamYard Helper';
const FALLBACK_VERSION = '1.0.0';

/** `streamyard_helper_config_YYYY-MM-DD.json`. */
function buildExportFileName(): string {
    return `streamyard_helper_config_${new Date().toISOString().slice(0, 10)}.json`;
}

function buildExportPayload(allKeys: string[], result: Record<string, any>): Record<string, any> {
    const exportData: Record<string, any> = {
        app: EXPORT_APP_NAME,
        timestamp: new Date().toISOString(),
        version: result[STORAGE_KEYS.VERSION] || FALLBACK_VERSION,
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
function downloadJson(payload: Record<string, any>, fileName: string): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

export function exportConfig(notify: (message: string) => void): void {
    const allKeys = Object.values(STORAGE_KEYS);

    SYH_STORAGE.get(allKeys, (result) => {
        downloadJson(buildExportPayload(allKeys, result), buildExportFileName());
        notify('📥 Налаштування та стан успішно експортовано');
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
                notify('📤 Налаштування та стан успішно імпортовано!');
            });
        } else {
            alert('Некоректний формат файлу конфігурації.');
        }
    } catch {
        alert('Помилка при зчитуванні JSON файлу.');
    }
}

export function importConfig(
    event: Event,
    onImported: () => void,
    notify: (message: string) => void
): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const reader = new FileReader();
    reader.onload = (e) => applyImportedText(e.target?.result as string, onImported, notify);
    reader.readAsText(input.files[0]);
}
