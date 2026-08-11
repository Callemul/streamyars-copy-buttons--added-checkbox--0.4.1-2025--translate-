/**
 * StreamYard Helper — стани кнопок і чекбоксів коментарів.
 *
 * Виокремлено з `comment_service.ts`. Два різні механізми свідомо живуть поряд:
 *   - StreamYard тримає стан чекбокса в оперативному `SYH_STATE` (без сховища);
 *   - YouTube / Studio персистять стани у `chrome.storage` за окремими ключами.
 *
 * Спільне для обох — еміт `STATE_CHANGED`, на який підписані UI-відновлювачі.
 */
import { SYH_STORAGE } from './storage';
import { SYH_BUS } from './event_bus';
import { SYH_STATE } from './state';
import type { ButtonStateValue, CheckboxStateEntry } from './comment_types';

/** Затримка дебаунсу за замовчуванням для оперативного стану StreamYard. */
const DEFAULT_STATE_DELAY_MS = 150;

/** Встановлення стану чекбокса StreamYard (оперативний стан, без сховища). */
export function setStreamYardCheckboxState(textKey: string, isChecked: boolean, delayMs = DEFAULT_STATE_DELAY_MS): void {
    if (!textKey) return;
    SYH_STATE.updateState(textKey, isChecked, delayMs);
}

/** Отримання стану чекбокса StreamYard. Порожній ключ завжди означає «не відмічено». */
export function getStreamYardCheckboxState(textKey: string): boolean {
    if (!textKey) return false;
    return SYH_STATE.getState(textKey);
}

/** Підписка на оновлення стану коментарів через шину подій. Повертає функцію відписки. */
export function subscribeToStateChanges(
    callback: (data: { key: string; value: boolean }) => void
): () => void {
    return SYH_BUS.on('STATE_CHANGED', callback);
}

/**
 * Зберігає стан кнопки у переданому кеші та у сховищі.
 * `state === null` означає «зняти позначку», тому ключ саме видаляється,
 * а не перезаписується у `null` — інакше кеш ріс би вічно.
 */
export async function saveButtonState(
    storageKey: string,
    buttonStates: Record<string, ButtonStateValue>,
    commentKey: string,
    state: ButtonStateValue
): Promise<Record<string, ButtonStateValue>> {
    if (state === null) {
        delete buttonStates[commentKey];
    } else {
        buttonStates[commentKey] = state;
    }
    await SYH_STORAGE.setAsync({ [storageKey]: buttonStates });
    SYH_BUS.emit('STATE_CHANGED', { key: commentKey, value: state !== null });
    return buttonStates;
}

/**
 * Зберігає стан чекбокса у переданому кеші та у сховищі.
 * На відміну від кнопок, знятий чекбокс лишається записом `{ checked: false }`
 * з міткою часу — за нею працює TTL-прибирання у `RetentionService`.
 */
export async function saveCheckboxState(
    storageKey: string,
    checkboxStates: Record<string, CheckboxStateEntry>,
    commentKey: string,
    isChecked: boolean
): Promise<Record<string, CheckboxStateEntry>> {
    checkboxStates[commentKey] = {
        checked: isChecked,
        timestamp: Date.now()
    };
    await SYH_STORAGE.setAsync({ [storageKey]: checkboxStates });
    SYH_BUS.emit('STATE_CHANGED', { key: commentKey, value: isChecked });
    return checkboxStates;
}
