/**
 * StreamYard Helper — фасад доменної логіки коментарів.
 *
 * Раніше — клас на 260 рядків (cyclomatic 54), у якому поряд жили чотири
 * незалежні відповідальності. Реалізацію винесено у вузькі модулі:
 *   - `./comment_clipboard`        — форматування та запис у буфер обміну;
 *   - `./comment_collected_store`  — списки зібраних коментарів по аркушах;
 *   - `./comment_state_store`      — стани кнопок і чекбоксів;
 *   - `./prayer_record_store`      — база молитов/питань із TTL;
 *   - `./comment_types`            — доменні типи.
 *
 * Тут лишилося ЛИШЕ делегування. Це навмисно: 28 файлів імпортують
 * `CommentService` (найбільший fan-in у проєкті), а тести підмінюють його
 * статичні методи присвоєнням (`CommentService.copyToClipboard = ...`).
 * Тому статичний клас-фасад збережено 1-в-1, разом із реекспортом типів
 * `CommentPayload` / `PrayerRecord`, які історично імпортують саме звідси.
 */
import { formatCommentForClipboard, writeTextToClipboard } from './comment_clipboard';
import {
    saveCollectedComment,
    removeCollectedComment,
    clearAllCollectedForSheet
} from './comment_collected_store';
import {
    setStreamYardCheckboxState,
    getStreamYardCheckboxState,
    subscribeToStateChanges,
    saveButtonState,
    saveCheckboxState
} from './comment_state_store';
import { savePrayerRecord, removePrayerRecord } from './prayer_record_store';
import type {
    ButtonStateValue,
    CheckboxStateEntry,
    CommentPayload,
    PrayerRecord
} from './comment_types';

export type { CommentPayload, PrayerRecord } from './comment_types';

/**
 * Єдиний доменний сервіс бізнес-логіки коментарів для StreamYard, YouTube та YouTube Studio
 */
export class CommentService {
    /**
     * Стандартне форматування тексту коментаря для буфера обміну
     */
    public static formatForClipboard(author: string, text: string): string {
        return formatCommentForClipboard(author, text);
    }

    /**
     * Безпечний запис у буфер обміну з фолбеком для усіх платформ
     */
    public static async copyToClipboard(text: string): Promise<boolean> {
        return writeTextToClipboard(text);
    }

    /**
     * Уніфіковане збереження зібраного коментаря у відповідний аркуш сховища
     */
    public static async saveCollectedComment(
        sheetId: string,
        comment: CommentPayload
    ): Promise<CommentPayload[]> {
        return saveCollectedComment(sheetId, comment);
    }

    /**
     * Уніфіковане видалення зібраного коментаря з відповідного аркуша сховища
     */
    public static async removeCollectedComment(
        sheetId: string,
        commentId: string,
        author?: string,
        text?: string
    ): Promise<CommentPayload[]> {
        return removeCollectedComment(sheetId, commentId, author, text);
    }

    /**
     * Уніфіковане очищення всіх зібраних коментарів для конкретного аркуша
     * та скидання стану їхніх кнопок у YouTube / Studio.
     */
    public static async clearAllCollectedForSheet(sheetId: string): Promise<void> {
        return clearAllCollectedForSheet(sheetId);
    }

    /**
     * Встановлення стану чекбокса StreamYard
     */
    public static setStreamYardCheckboxState(textKey: string, isChecked: boolean, delayMs = 150): void {
        setStreamYardCheckboxState(textKey, isChecked, delayMs);
    }

    /**
     * Отримання стану чекбокса StreamYard
     */
    public static getStreamYardCheckboxState(textKey: string): boolean {
        return getStreamYardCheckboxState(textKey);
    }

    /**
     * Підписка на оновлення стану коментарів через шину подій
     */
    public static subscribeToStateChanges(
        callback: (data: { key: string; value: boolean }) => void
    ): () => void {
        return subscribeToStateChanges(callback);
    }

    /**
     * Уніфіковане збереження стану кнопок у сховищі
     */
    public static async saveButtonState(
        storageKey: string,
        buttonStates: Record<string, ButtonStateValue>,
        commentKey: string,
        state: ButtonStateValue
    ): Promise<Record<string, ButtonStateValue>> {
        return saveButtonState(storageKey, buttonStates, commentKey, state);
    }

    /**
     * Уніфіковане збереження стану чекбокса у сховищі
     */
    public static async saveCheckboxState(
        storageKey: string,
        checkboxStates: Record<string, CheckboxStateEntry>,
        commentKey: string,
        isChecked: boolean
    ): Promise<Record<string, CheckboxStateEntry>> {
        return saveCheckboxState(storageKey, checkboxStates, commentKey, isChecked);
    }

    /**
     * Уніфіковане збереження молитви/питання в базі STREAMYARD з урахуванням TTL
     */
    public static async savePrayerRecord(record: PrayerRecord): Promise<PrayerRecord[]> {
        return savePrayerRecord(record);
    }

    /**
     * Уніфіковане видалення молитви/питання з бази STREAMYARD з урахуванням TTL
     */
    public static async removePrayerRecord(text: string): Promise<PrayerRecord[]> {
        return removePrayerRecord(text);
    }
}
