import { SYH_STORAGE } from './storage';
import { SYH_BUS } from './event_bus';

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
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('[SYH CommentService] Clipboard API error, falling back to execCommand:', err);
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
    ): Promise<void> {
        const storageKey = `syh:popup:collected:${sheetId}`;
        const result = await SYH_STORAGE.getAsync<Record<string, CommentPayload[]>>([storageKey]);
        const list = result[storageKey] || [];
        const index = list.findIndex(item => item.id === comment.id);

        const updated = index >= 0
            ? list.map((item, idx) => idx === index ? comment : item)
            : [comment, ...list];

        await SYH_STORAGE.setAsync({ [storageKey]: updated });
        SYH_BUS.emit('SHEET_DATA_PROCESSED', {
            sheetId,
            totalQuestions: updated.filter(i => i.type === 'question').length,
            totalPrayers: updated.filter(i => i.type === 'prayer').length
        });
    }
}