/**
 * StreamYard Helper — станкова машина розбору «старого» списку Telegram.
 *
 * Рівень секції: проходить рядки згори вниз, відкриває новий блок на
 * emoji-нумерації або на заголовку експорту Telegram і віддає накопичений блок
 * у `telegram_old_item.ts`. Розділення питань і молитов — у `parseAndFilterOldList`.
 */

import {
    EMOJI_NUMBER_LINE_REGEX,
    EMOJI_NUMBER_CONTAINS_REGEX,
    splitPrayerSection,
    TG_HEADER_A_REGEX,
    TG_HEADER_B_REGEX
} from './parsers/index';
import { cleanAuthorName } from './telegram_text_rules';
import { processOldTelegramItem, type RawOldItem } from './telegram_old_item';
import type { TelegramQuestionItem, ParseOldListResult } from './telegram_types';
import type { CleaningLogEntry, DeletedLogEntry } from './types';

/** Підпис для блоку Telegram, у якому автор не вказаний явно через «@». */
const CHAT_AUTHOR_FALLBACK = 'Питання з чату';

/** Службові рядки-роздільники, які ніколи не є частиною питання. */
function isIgnoredSectionLine(line: string): boolean {
    return line.includes('❓❓❓ВОПРОСЫ') || line.includes('Віталій Кривко');
}

/** Чи трапляється далі по тексту хоч одна emoji-нумерація. */
function hasKeycapInRemainingLines(linesArr: string[], currentIndex: number): boolean {
    for (let i = currentIndex; i < linesArr.length; i++) {
        if (EMOJI_NUMBER_CONTAINS_REGEX.test(linesArr[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Визначає автора telegram-блоку при його завершенні: якщо перший непорожній
 * рядок починається з «@», він стає автором і вилучається з тіла.
 */
function resolveItemAuthor(bodyLines: string[], cleaningLog?: CleaningLogEntry[]): string {
    const firstNonEmptyIdx = bodyLines.findIndex(l => l.trim() !== '');
    if (firstNonEmptyIdx !== -1) {
        const firstLine = bodyLines[firstNonEmptyIdx].trim();
        if (firstLine.startsWith('@')) {
            const author = cleanAuthorName(firstLine, cleaningLog);
            bodyLines.splice(firstNonEmptyIdx, 1);
            return author;
        }
    }
    return CHAT_AUTHOR_FALLBACK;
}

/** Розбирає заголовок типу B: «[дд.мм.рррр гг:хх] Автор: текст». */
function parseHeaderBLine(
    trimmedLine: string,
    cleaningLog?: CleaningLogEntry[]
): { author: string | null; bodyLines: string[] } {
    let author: string | null = null;
    const bodyLines: string[] = [];

    const match = trimmedLine.match(TG_HEADER_B_REGEX);
    if (match) {
        const trailing = match[2] ? match[2].trim() : '';
        if (trailing) {
            if (trailing.startsWith('@')) {
                author = cleanAuthorName(trailing, cleaningLog);
            } else {
                bodyLines.push(trailing);
            }
        }
    }

    return { author, bodyLines };
}

/**
 * Розбирає одну секцію (питання АБО молитви) на елементи.
 *
 * `initialCounter` зсуває нумерацію блоків, щоб ID у журналі видалень
 * збігалися з тим, що бачить користувач у наскрізному списку.
 */
export function parseTelegramSection(
    sectionText: string,
    filterIds: number[] | null,
    sourceType: 'old' | 'pray',
    initialCounter: number,
    deletedItems: DeletedLogEntry[],
    cleaningLog: CleaningLogEntry[]
): TelegramQuestionItem[] {
    const lines = sectionText.split('\n');
    const items: TelegramQuestionItem[] = [];

    let currentItem: RawOldItem | null = null;
    let currentCounter = initialCounter;

    const finalizeCurrentItem = () => {
        if (!currentItem) return;

        if (currentItem.type === 'telegram') {
            const bodyLines: string[] = currentItem.bodyLines || [];
            if (currentItem.author === null) {
                currentItem.author = resolveItemAuthor(bodyLines, cleaningLog);
            }
            currentItem.rawLines = [currentItem.author as string, ...bodyLines];
        }

        processOldTelegramItem(
            items, currentItem, filterIds, currentCounter, deletedItems, sourceType, cleaningLog
        );
    };

    lines.forEach((line, idx) => {
        const trimmedLine = line.trim();
        if (isIgnoredSectionLine(trimmedLine)) return;

        // 1) Явна emoji-нумерація завжди відкриває новий блок.
        if (EMOJI_NUMBER_LINE_REGEX.test(trimmedLine)) {
            finalizeCurrentItem();
            currentCounter++;
            currentItem = { type: 'keycap', rawLines: [] };
            return;
        }

        // 2) Заголовок експорту Telegram — лише коли нумерації далі вже немає.
        const isHeaderA = TG_HEADER_A_REGEX.test(trimmedLine);
        const isHeaderB = TG_HEADER_B_REGEX.test(trimmedLine);

        if ((isHeaderA || isHeaderB) && sourceType === 'old' && !hasKeycapInRemainingLines(lines, idx + 1)) {
            finalizeCurrentItem();
            currentCounter++;
            const { author, bodyLines } = isHeaderB
                ? parseHeaderBLine(trimmedLine, cleaningLog)
                : { author: null, bodyLines: [] };
            currentItem = { type: 'telegram', author, bodyLines };
            return;
        }

        // 3) Решта рядків накопичується у відкритому блоці.
        if (currentItem) {
            if (currentItem.type === 'keycap') {
                currentItem.rawLines?.push(line);
            } else if (currentItem.type === 'telegram') {
                currentItem.bodyLines?.push(line);
            }
        }
    });

    finalizeCurrentItem();
    return items;
}

/**
 * Повний розбір вставленого тексту: ділить його на секцію питань і секцію
 * молитов, застосовує фільтр відповідей ЛИШЕ до питань і повертає обидва журнали.
 */
export function parseAndFilterOldList(
    text: string,
    answeredIds?: number[] | null,
    cleaningLog?: CleaningLogEntry[]
): ParseOldListResult {
    const cleaned: CleaningLogEntry[] = cleaningLog || [];
    const deletedItems: DeletedLogEntry[] = [];

    const { questionsText, prayersText } = splitPrayerSection(text);

    let allQuestions: TelegramQuestionItem[] = [];
    let allPrayers: TelegramQuestionItem[] = [];

    if (questionsText.trim()) {
        allQuestions = allQuestions.concat(
            parseTelegramSection(questionsText, answeredIds || null, 'old', allQuestions.length, deletedItems, cleaned)
        );
    }

    if (prayersText.trim()) {
        allPrayers = allPrayers.concat(
            parseTelegramSection(prayersText, null, 'pray', allPrayers.length, deletedItems, cleaned)
        );
    }

    return { questions: allQuestions, prayers: allPrayers, deleted: deletedItems, cleaned };
}
