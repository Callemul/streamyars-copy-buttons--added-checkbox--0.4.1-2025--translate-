/**
 * StreamYard Helper — розбір «рядкового» експорту Telegram.
 *
 * Формат, у якому кожне повідомлення починається власним заголовком
 * («[дд.мм.рррр гг:хх] @Автор: текст» або «Автор, [дд.мм.рррр гг:хх]»),
 * а послідовні повідомлення одного автора зливаються в одне питання з 🔹.
 * Виділено з `telegram_parser.ts`.
 */

import { TG_HEADER_A_REGEX, TG_HEADER_B_REGEX, RELATIVE_TIME_LINE_REGEX } from '../parsers/index';
import { cleanAuthorName } from './telegram_text_rules';
import type { GroupedNewItem } from './telegram_types';
import type { CleaningLogEntry } from '../core/types';

/** Підпис для повідомлення без явного «@автора». */
const CHAT_AUTHOR_FALLBACK = 'Питання з чату';

/** Маркер підпункту, яким зшиваються повідомлення одного автора. */
const SUB_QUESTION_BULLET = '🔹';

/** Накопичувач одного повідомлення до моменту його завершення. */
export interface LineByLineItem {
    author: string | null;
    textLines: string[];
}

/** Хвіст заголовка стає текстом, лише якщо це не «@автор». */
function collectTrailingText(trailing: string): string[] {
    if (trailing && !trailing.startsWith('@')) {
        return [trailing];
    }
    return [];
}

/** Автор береться з групи заголовка, а якщо там не «@» — із хвоста. */
function resolveHeaderAuthor(
    headerAuthorCandidate: string,
    trailing: string,
    cleaningLog?: CleaningLogEntry[]
): string | null {
    if (headerAuthorCandidate && headerAuthorCandidate.startsWith('@')) {
        return cleanAuthorName(headerAuthorCandidate, cleaningLog);
    }
    if (trailing && trailing.startsWith('@')) {
        return cleanAuthorName(trailing, cleaningLog);
    }
    return null;
}

/** Створює новий накопичувач із рядка-заголовка. */
export function createLineByLineHeaderItem(
    trimmedLine: string,
    cleaningLog?: CleaningLogEntry[]
): LineByLineItem {
    const match = trimmedLine.match(TG_HEADER_B_REGEX);
    if (!match) return { author: null, textLines: [] };

    const headerAuthorCandidate = match[1] ? match[1].trim() : '';
    const trailing = match[2] ? match[2].trim() : '';

    return {
        author: resolveHeaderAuthor(headerAuthorCandidate, trailing, cleaningLog),
        textLines: collectTrailingText(trailing)
    };
}

/**
 * Додає контентний рядок до відкритого повідомлення.
 * Поки автор не визначений, рядок може ним стати («@Ім'я»), бути відкинутий
 * як службова мітка часу, або зафіксувати автора-заглушку.
 */
export function processLineByLineContent(
    trimmedLine: string,
    currentItem: LineByLineItem,
    cleaningLog?: CleaningLogEntry[]
): void {
    if (trimmedLine === '') return;

    if (currentItem.author !== null) {
        currentItem.textLines.push(trimmedLine);
        return;
    }

    if (trimmedLine.startsWith('@')) {
        currentItem.author = cleanAuthorName(trimmedLine, cleaningLog);
        return;
    }

    if (RELATIVE_TIME_LINE_REGEX.test(trimmedLine)) {
        if (cleaningLog) {
            cleaningLog.push({
                before: trimmedLine,
                after: '',
                removed: `${trimmedLine} (службова мітка часу, рядок прибрано повністю)`
            });
        }
        return;
    }

    currentItem.author = CHAT_AUTHOR_FALLBACK;
    currentItem.textLines.push(trimmedLine);
}

/** Зливає послідовні питання одного автора в одне, розділяючи їх маркерами 🔹. */
export function groupItemsByAuthor(
    rawItems: { author: string; text: string; source: 'new' }[]
): GroupedNewItem[] {
    const groupedItems: GroupedNewItem[] = [];

    rawItems.forEach(item => {
        const lastGroup = groupedItems[groupedItems.length - 1];

        if (lastGroup && lastGroup.author === item.author) {
            if (!lastGroup.text.startsWith(SUB_QUESTION_BULLET)) {
                lastGroup.text = `${SUB_QUESTION_BULLET}${lastGroup.text}`;
            }
            lastGroup.text += `\n${SUB_QUESTION_BULLET}${item.text}`;
            return;
        }

        groupedItems.push(item);
    });

    return groupedItems;
}

/** Повний розбір рядкового експорту Telegram у згруповані питання. */
export function parseTelegramExportLineByLine(
    text: string,
    cleaningLog?: CleaningLogEntry[]
): GroupedNewItem[] {
    const log: CleaningLogEntry[] = cleaningLog || [];
    const rawItems: { author: string; text: string; source: 'new' }[] = [];

    let currentItem: LineByLineItem | null = null;

    const finalizeItem = () => {
        if (currentItem && currentItem.textLines.length > 0) {
            rawItems.push({
                author: currentItem.author || CHAT_AUTHOR_FALLBACK,
                text: currentItem.textLines.join('\n').trim(),
                source: 'new'
            });
        }
    };

    text.split('\n').forEach(line => {
        const trimmed = line.trim();
        const isHeader = TG_HEADER_A_REGEX.test(trimmed) || TG_HEADER_B_REGEX.test(trimmed);

        if (isHeader) {
            finalizeItem();
            currentItem = createLineByLineHeaderItem(trimmed, log);
        } else if (currentItem) {
            processLineByLineContent(trimmed, currentItem, log);
        }
    });

    finalizeItem();
    return groupItemsByAuthor(rawItems);
}
