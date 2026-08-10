// modules/banner_parser_rules.ts
//
// ПРИЗНАЧЕННЯ: чисті правила розбору сирого тексту на блоки банерів —
// визначення категорії блока, визначення формату нумерації та нарізка тексту
// на повідомлення. Жодного DOM, жодних сервісів, жодних побічних ефектів.
//
// Винесено з `./banner_parser.ts`, який за звітом Fallow мав найнижчий індекс
// підтримуваності серед `modules/` (MI 80.7, CRAP 14, complexity density 0.43)
// і три функції у топі складності: `detectBlockCategory` (cyclomatic 14 /
// cognitive 12, critical), `parseBlock` (10 / 12, critical) і
// `parseRawTextToBanners` (7 / 10, high). Поведінка збережена 1-в-1.

import {
    EMOJI_NUMBER_CONTAINS_REGEX,
    QUESTION_START_REGEX,
    QUESTION_SPLIT_REGEX,
    STANDARD_NUMBER_START_REGEX,
    SECTION_HEADER_SPLIT_REGEX
} from './parsers/index';
import { SABBATH_SCHOOL_KEYWORDS_REGEX } from './channel_config';

/**
 * Таблиця ключових слів заголовка → категорія банера.
 *
 * Порядок рядків = пріоритет перевірки і повністю повторює порядок `if`-ів
 * оригіналу: prayer → stream → audience. Заголовок порівнюється у ВЕРХНЬОМУ
 * регістрі, тому і ключі тут у верхньому.
 */
const CATEGORY_KEYWORD_RULES: ReadonlyArray<{ category: string; keywords: readonly string[] }> = [
    { category: 'prayer', keywords: ['МОЛИТВ', 'ПРОХАН', '🙏'] },
    { category: 'stream', keywords: ['СУББОТ', 'СУБОТ', 'УРОК'] },
    { category: 'audience', keywords: ['ВОПРОС', 'ПИТАН', '???', '❓'] }
];

/**
 * Заголовкова частина рядка — усе до першого номера питання.
 * Саме її оригінал приводив до верхнього регістру перед пошуком ключових слів.
 */
function readHeaderText(firstLine: string): string {
    const headerMatch = firstLine.split(QUESTION_SPLIT_REGEX);
    return (headerMatch[0] || '').trim().toUpperCase();
}

/**
 * Категорія блока за його першим рядком.
 *
 * Рядок, який сам є початком питання (`1.`, `1️⃣`, `🔹`), заголовком не вважається —
 * тоді повертається `defaultCat`. Так само для порожнього рядка та для заголовка
 * без жодного ключового слова.
 */
export function detectBlockCategory(firstLine: string, defaultCat: string): string {
    const isQuestionStart = QUESTION_START_REGEX.test(firstLine);
    if (isQuestionStart || !firstLine) return defaultCat;

    const headerText = readHeaderText(firstLine);
    const matched = CATEGORY_KEYWORD_RULES.find(rule => rule.keywords.some(kw => headerText.includes(kw)));

    return matched ? matched.category : defaultCat;
}

/** Формати вхідного блока, які вміє розрізняти парсер. */
export type BlockFormat = 'sabbath-school' | 'emoji' | 'standard';

/** Повідомлення в лог для кожного формату — тексти збережено 1-в-1. */
export const BLOCK_FORMAT_LOG_MESSAGES: Readonly<Record<BlockFormat, string>> = {
    'sabbath-school': 'Формат: Суботня Школа (без нумерації)',
    'emoji': 'Формат: Емодзі 1️⃣',
    'standard': 'Формат: Стандартний 1.'
};

/**
 * Визначає формат блока.
 *
 * «Суботня школа» розпізнається лише за відсутності БУДЬ-ЯКОЇ нумерації —
 * і стандартної, і емодзі; інакше блок обробляється як звичайний.
 */
export function detectBlockFormat(text: string): BlockFormat {
    const hasEmojiNumbering = EMOJI_NUMBER_CONTAINS_REGEX.test(text);
    const hasStandardNumbering = STANDARD_NUMBER_START_REGEX.test(text);

    if (SABBATH_SCHOOL_KEYWORDS_REGEX.test(text) && !hasStandardNumbering && !hasEmojiNumbering) {
        return 'sabbath-school';
    }
    return hasEmojiNumbering ? 'emoji' : 'standard';
}

/** Перший непорожній рядок тексту (обрізаний), або `''`, якщо таких немає. */
export function readFirstNonEmptyLine(text: string): string {
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0)[0] || '';
}

/**
 * Нарізає очищений текст на окремі повідомлення за заголовками секцій.
 * Якщо жодної секції не знайдено, увесь текст лишається одним повідомленням.
 */
export function splitIntoMessages(cleanedText: string): string[] {
    const messages = cleanedText.split(SECTION_HEADER_SPLIT_REGEX).map(m => m.trim()).filter(Boolean);
    return messages.length === 0 ? [cleanedText] : messages;
}
