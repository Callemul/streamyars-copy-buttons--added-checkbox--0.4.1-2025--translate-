/**
 * StreamYard Helper — доменні типи коментарів.
 *
 * Винесені з `comment_service.ts` в окремий модуль, щоб сервіси зберігання
 * (`comment_collected_store`, `prayer_record_store`) не залежали від фасаду
 * і не утворювали циклів імпорту. Фасад `CommentService` перевидає ці типи,
 * тому історичні імпорти `from './comment_service'` лишаються робочими.
 */

/** Один зібраний коментар у списку аркуша. */
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

/** Запис молитви/питання у базі StreamYard (із TTL за `timestamp`). */
export interface PrayerRecord {
    author: string;
    text: string;
    type: string;
    icon: string;
    roomId: string;
    timestamp: number;
}

/** Стан кнопки коментаря: питання, молитва або «не зібрано». */
export type ButtonStateValue = 'question' | 'prayer' | null;

/** Запис стану чекбокса разом із міткою часу для TTL-прибирання. */
export interface CheckboxStateEntry {
    checked: boolean;
    timestamp: number;
}
