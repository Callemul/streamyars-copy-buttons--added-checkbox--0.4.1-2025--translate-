/**
 * StreamYard Helper — обробка ОДНОГО блоку «старого» списку Telegram.
 *
 * Рівень елемента: витягування автора з сирих рядків, зняття службової мітки
 * часу, фільтрація підпунктів 🔹 за дробовими ID і складання підсумкового
 * елемента. Розбір самої секції на блоки живе в `telegram_old_section.ts`.
 */

import { RELATIVE_TIME_LINE_REGEX } from '../parsers/index';
import { cleanTelegramHeadersLogged, countQuestionsInText, hasSubQuestions } from './telegram_text_rules';
import type { TelegramQuestionItem } from './telegram_types';
import type { CleaningLogEntry, DeletedLogEntry } from '../types';

/** Ім'я, яким підписується блок без розпізнаного автора. */
const ANONYMOUS_AUTHOR = 'Анонім';

/** Маркер підпункту всередині блоку питань. */
const SUB_QUESTION_BULLET = '🔹';

/** Сирий блок, зібраний станковою машиною секції. */
export interface RawOldItem {
    rawLines?: string[];
    author?: string | null;
    type?: string;
    bodyLines?: string[];
}

/** Відкидає порожні рядки на початку масиву. */
export function trimLeadingEmptyLines(lines: string[]): string[] {
    const idx = lines.findIndex(l => l.trim() !== '');
    return idx === -1 ? [] : lines.slice(idx);
}

/** Автор блоку разом із рештою рядків, що складають текст питання. */
export interface ExtractedAuthor {
    author: string;
    contentLines: string[];
}

/**
 * Бере першим непорожнім рядком ім'я автора, знімає з нього хвіст після «•»
 * і, за наявності, наступну відносну мітку часу («5 хвилин тому»).
 * Обидва зняття потрапляють у журнал очищення.
 */
export function extractAuthorFromLines(
    lines: string[],
    cleaningLog?: CleaningLogEntry[]
): ExtractedAuthor | null {
    const cleanLines = trimLeadingEmptyLines(lines);
    if (cleanLines.length === 0) return null;

    const rawAuthorLine = (cleanLines[0] ?? '').trim();
    const authorBulletMatch = rawAuthorLine.match(/\s*•.*$/);
    let author = rawAuthorLine.replace(/\s*•.*$/, '').trim();

    if (authorBulletMatch && cleaningLog) {
        cleaningLog.push({
            before: rawAuthorLine,
            after: author,
            removed: authorBulletMatch[0].trim()
        });
    }

    let contentLines = trimLeadingEmptyLines(cleanLines.slice(1));

    const firstContentLine = (contentLines[0] ?? '').trim();
    if (contentLines.length > 0 && RELATIVE_TIME_LINE_REGEX.test(firstContentLine)) {
        const timeLine = firstContentLine;
        contentLines = trimLeadingEmptyLines(contentLines.slice(1));
        if (cleaningLog) {
            cleaningLog.push({
                before: `${rawAuthorLine}\n${timeLine}`,
                after: author,
                removed: `${timeLine} (мітка часу)`
            });
        }
    }

    if (!author) author = ANONYMOUS_AUTHOR;
    return { author, contentLines };
}

/** Дістає номери підпунктів, замовлених до видалення для конкретного блоку. */
function collectSubIndexesToRemove(id: number, filterIds: number[]): number[] {
    return filterIds
        .filter(fid => Math.floor(fid) === id)
        .map(fid => {
            const parts = fid.toString().split('.');
            return parts[1] ? parseInt(parts[1], 10) : 0;
        })
        .filter(subIdx => subIdx > 0);
}

/**
 * Фільтрує підпункти 🔹 всередині блоку.
 * Повертає новий текст або `null`, якщо блок спорожнів і має зникнути повністю.
 */
export function filterSubQuestionsInBlock(
    rawText: string,
    id: number,
    filterIds: number[],
    deletedArr: DeletedLogEntry[],
    author: string,
    totalQuestionsInBlock: number
): string | null {
    const subIndexesToRemove = collectSubIndexesToRemove(id, filterIds);
    if (subIndexesToRemove.length === 0) {
        return rawText;
    }

    const subQuestions = rawText.split(SUB_QUESTION_BULLET).map(t => t.trim()).filter(Boolean);

    subIndexesToRemove.forEach(idx => {
        if (subQuestions[idx - 1]) {
            deletedArr.push({ originalId: `${id}.${idx}`, author, type: 'sub', count: 1 });
        }
    });

    const kept = subQuestions.filter((_, idx) => !subIndexesToRemove.includes(idx + 1));

    if (kept.length === 0) {
        deletedArr.push({ originalId: id, author, type: 'block', count: totalQuestionsInBlock });
        return null;
    }

    // Єдиний підпункт більше не потребує маркера — це знову звичайне питання.
    const [onlyQuestion] = kept;
    if (kept.length === 1 && onlyQuestion !== undefined) {
        return onlyQuestion;
    }

    return kept.map(q => `${SUB_QUESTION_BULLET}${q}`).join('\n');
}

/**
 * Перетворює сирий блок на елемент списку, застосовуючи фільтр відповідей.
 * Нічого не додає, якщо блок повністю відфільтрований.
 */
export function processOldTelegramItem(
    itemsArray: TelegramQuestionItem[],
    itemObj: RawOldItem,
    filterIds: number[] | null,
    id: number,
    deletedArr: DeletedLogEntry[],
    src: 'old' | 'pray',
    cleaningLog?: CleaningLogEntry[]
): void {
    const extracted = extractAuthorFromLines(itemObj.rawLines || [], cleaningLog);
    if (!extracted) return;

    const { author, contentLines } = extracted;
    let rawText = contentLines.map(l => l.trimEnd()).join('\n').trim();
    rawText = cleanTelegramHeadersLogged(rawText, cleaningLog);

    const totalQuestionsInBlock = countQuestionsInText(rawText);

    if (filterIds && filterIds.includes(id)) {
        deletedArr.push({ originalId: id, author, type: 'block', count: totalQuestionsInBlock });
        return;
    }

    if (hasSubQuestions(rawText) && filterIds) {
        const filteredText = filterSubQuestionsInBlock(
            rawText, id, filterIds, deletedArr, author, totalQuestionsInBlock
        );
        if (filteredText === null) return;
        rawText = filteredText;
    }

    itemsArray.push({ author, text: rawText, source: src });
}
