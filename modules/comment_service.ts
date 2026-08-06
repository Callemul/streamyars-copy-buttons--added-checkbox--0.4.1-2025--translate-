import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from './storage';
import { SYH_BUS } from './event_bus';

import { RetentionService } from './retention_service';

export interface CommentPayload {
    id: string;
    author: string;
    text: string;
    type: 'question' | 'prayer';
    timestamp: number;
    videoId?: string;
    videoTitle?: string;
    roomId?: string;
}

export interface PrayerRecord {
    author: string;
    text: string;
    type: string;
    icon: string;
    roomId: string;
    timestamp: number;
}

/**
 * Єдиний доменний сервіс бізнес-логіки коментарів для StreamYard, YouTube та YouTube Studio
 */
export class CommentService {
    /**
     * Стандартне форматування тексту коментаря для буфера обміну
     */
    public static formatForClipboard(author: string, text: string): string {
        const cleanAuthor = (author || '').trim().replace(/^@+/, '');
        const cleanText = (text || '').trim();
        return cleanAuthor ? `@${cleanAuthor}\n\n${cleanText}` : cleanText;
    }

    /**
     * Безнадійна безпечна запис у буфер обміну з фолбеком для усіх платформ
     */
    public static async copyToClipboard(text: string): Promise<boolean> {
        if (!text) return false;

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('[SYH CommentService] Clipboard API error, falling back to execCommand:', err);
        }

        if (typeof document === 'undefined' || !document.body) {
            return false;
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.pointerEvents = 'none';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (err) {
            console.error('[SYH CommentService] Copy failed:', err);
            return false;
        }
    }

    /**
     * Уніфіковане збереження зібраного коментаря у відповідний аркуш сховища
     */
    public static async saveCollectedComment(
        sheetId: string,
        comment: CommentPayload
    ): Promise<CommentPayload[]> {
        const storageKey = getSheetCollectedStorageKey(sheetId);
        const result = await SYH_STORAGE.getAsync<Record<string, CommentPayload[]>>([storageKey]);
        const list = result[storageKey] || [];
        const index = list.findIndex(item => 
            item.id === comment.id || 
            (item.author === comment.author && item.text === comment.text && item.type === comment.type)
        );

        const updated = index >= 0
            ? list.map((item, idx) => idx === index ? comment : item)
            : [comment, ...list];

        await SYH_STORAGE.setAsync({ [storageKey]: updated });
        SYH_BUS.emit('SHEET_DATA_PROCESSED', {
            sheetId,
            totalQuestions: updated.filter(i => i.type === 'question').length,
            totalPrayers: updated.filter(i => i.type === 'prayer').length
        });
        return updated;
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
        const storageKey = getSheetCollectedStorageKey(sheetId);
        const result = await SYH_STORAGE.getAsync<Record<string, CommentPayload[]>>([storageKey]);
        const list = result[storageKey] || [];
        const updated = list.filter(item => !(
            item.id === commentId ||
            (author && text && item.author === author && item.text === text)
        ));

        await SYH_STORAGE.setAsync({ [storageKey]: updated });
        SYH_BUS.emit('SHEET_DATA_PROCESSED', {
            sheetId,
            totalQuestions: updated.filter(i => i.type === 'question').length,
            totalPrayers: updated.filter(i => i.type === 'prayer').length
        });
        return updated;
    }

    /**
     * Уніфіковане очищення всіх зібраних коментарів для конкретного аркуша
     * та скидання стану їхніх кнопок у YouTube / Studio.
     */
    public static async clearAllCollectedForSheet(sheetId: string): Promise<void> {
        const storageKey = getSheetCollectedStorageKey(sheetId);
        const result = await SYH_STORAGE.getAsync<Record<string, any>>([
            storageKey,
            STORAGE_KEYS.YT_BUTTON_STATES,
            STORAGE_KEYS.STUDIO_BUTTON_STATE
        ]);

        const items: CommentPayload[] = result[storageKey] || [];
        const commentIds = items.map(item => item.id);

        const ytBtnStates = result[STORAGE_KEYS.YT_BUTTON_STATES] || {};
        const studioBtnStates = result[STORAGE_KEYS.STUDIO_BUTTON_STATE] || {};

        commentIds.forEach(id => {
            delete ytBtnStates[id];
            delete studioBtnStates[id];
        });

        await SYH_STORAGE.setAsync({
            [storageKey]: [],
            [STORAGE_KEYS.YT_BUTTON_STATES]: ytBtnStates,
            [STORAGE_KEYS.STUDIO_BUTTON_STATE]: studioBtnStates
        });

        SYH_BUS.emit('SHEET_DATA_PROCESSED', {
            sheetId,
            totalQuestions: 0,
            totalPrayers: 0
        });
    }

    /**
     * Уніфіковане збереження стану кнопок у сховищі
     */
    public static async saveButtonState(
        storageKey: string,
        buttonStates: Record<string, 'question' | 'prayer' | null>,
        commentKey: string,
        state: 'question' | 'prayer' | null
    ): Promise<Record<string, 'question' | 'prayer' | null>> {
        if (state === null) {
            delete buttonStates[commentKey];
        } else {
            buttonStates[commentKey] = state;
        }
        await SYH_STORAGE.setAsync({ [storageKey]: buttonStates });
        return buttonStates;
    }

    /**
     * Уніфіковане збереження стану чекбокса у сховищі
     */
    public static async saveCheckboxState(
        storageKey: string,
        checkboxStates: Record<string, { checked: boolean; timestamp: number }>,
        commentKey: string,
        isChecked: boolean
    ): Promise<Record<string, { checked: boolean; timestamp: number }>> {
        checkboxStates[commentKey] = {
            checked: isChecked,
            timestamp: Date.now()
        };
        await SYH_STORAGE.setAsync({ [storageKey]: checkboxStates });
        return checkboxStates;
    }

    /**
     * Уніфіковане збереження молитви/питання в базі STREAMYARD з урахуванням TTL
     */
    public static async savePrayerRecord(record: PrayerRecord): Promise<PrayerRecord[]> {
        const now = Date.now();
        const result = await SYH_STORAGE.getAsync<Record<string, any>>([STORAGE_KEYS.PRAYERS]);
        let list: PrayerRecord[] = result[STORAGE_KEYS.PRAYERS] || [];

        list = RetentionService.filterFreshPrayers(list, now);
        list = list.filter(item => item.text !== record.text);
        list.push(record);

        await SYH_STORAGE.setAsync({ [STORAGE_KEYS.PRAYERS]: list });
        return list;
    }

    /**
     * Уніфіковане видалення молитви/питання з бази STREAMYARD з урахуванням TTL
     */
    public static async removePrayerRecord(text: string): Promise<PrayerRecord[]> {
        const now = Date.now();
        const result = await SYH_STORAGE.getAsync<Record<string, any>>([STORAGE_KEYS.PRAYERS]);
        let list: PrayerRecord[] = result[STORAGE_KEYS.PRAYERS] || [];

        list = list.filter(item => item.text !== text);
        list = RetentionService.filterFreshPrayers(list, now);

        await SYH_STORAGE.setAsync({ [STORAGE_KEYS.PRAYERS]: list });
        return list;
    }
}
