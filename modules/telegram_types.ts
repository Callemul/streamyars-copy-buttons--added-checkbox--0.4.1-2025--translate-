/**
 * StreamYard Helper — типи домену розбору Telegram/YouTube-списків.
 *
 * Виділено з `telegram_parser.ts`, щоб парсери старого списку
 * (`telegram_old_*`) і рядкового експорту (`telegram_line_export`)
 * посилались на одну форму даних без взаємних імпортів.
 */

import type { CleaningLogEntry, DeletedLogEntry } from './types';

/** Одне питання/молитва з будь-якого джерела. */
export interface TelegramQuestionItem {
    author: string;
    text: string;
    source: 'old' | 'new' | 'pray' | 'yt';
}

/** Результат розбору «старого» списку: питання, молитви й обидва журнали. */
export interface ParseOldListResult {
    questions: TelegramQuestionItem[];
    prayers: TelegramQuestionItem[];
    deleted: DeletedLogEntry[];
    cleaned: CleaningLogEntry[];
}

/** Елемент рядкового експорту Telegram після групування за автором. */
export interface GroupedNewItem {
    author: string;
    text: string;
    source: 'new' | 'pray' | 'yt';
}
