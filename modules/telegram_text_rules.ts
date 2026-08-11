/**
 * StreamYard Helper — дрібні чисті правила над текстом Telegram-списків.
 *
 * Ні DOM, ні стану: підрахунок питань, emoji-нумерація, розбір введених
 * користувачем ID відповідей і два адаптери до спільних парсерів.
 * Виділено з `telegram_parser.ts`.
 */

import { SYH_PARSERS } from './parsers/index';
import { SYH_UTILS } from './utils';
import type { CleaningLogEntry } from './types';

/** Маркер підпункту всередині блоку питань. */
const SUB_QUESTION_BULLET = '🔹';

/** Emoji-цифри для нумерації: індекс масиву дорівнює самій цифрі. */
const KEYCAP_DIGITS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Скільки питань несе блок тексту.
 * Блок без маркерів 🔹 вважається одним питанням; порожній — нулем.
 */
export function countQuestionsInText(text: string): number {
    if (!text) return 0;
    const bullets = (text.match(/🔹/g) || []).length;
    return bullets > 0 ? bullets : 1;
}

/** Конвертує число в emoji-цифри (1 → 1️⃣, 10 → 🔟, 12 → 1️⃣2️⃣). */
export function numberToEmoji(num: number): string {
    if (num <= 10) return KEYCAP_DIGITS[num];
    return num.toString().split('').map(d => KEYCAP_DIGITS[parseInt(d, 10)]).join('');
}

/**
 * Розбирає введені користувачем ID відповідей (через пробіл або кому).
 * Дробові ID (`1.2`) означають конкретний підпункт 🔹 усередині блоку.
 */
export function parseAnsweredIds(input: string): number[] {
    return input
        .split(/[\s,]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

/** Нормалізує ім'я автора через спільний парсер, дописуючи журнал очищення. */
export function cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_PARSERS.cleanAuthorName(rawName, cleaningLog);
}

/** Прибирає службові заголовки експорту Telegram, дописуючи журнал очищення. */
export function cleanTelegramHeadersLogged(text: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_UTILS.cleanTelegramHeaders(text, cleaningLog);
}

/** Чи містить текст хоча б один маркер підпункту 🔹. */
export function hasSubQuestions(text: string): boolean {
    return text.includes(SUB_QUESTION_BULLET);
}
