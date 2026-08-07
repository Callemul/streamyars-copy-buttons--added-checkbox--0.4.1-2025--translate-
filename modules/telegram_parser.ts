/**
 * StreamYard Helper - Telegram & Questions Parsing Module
 * Чистий сервісний модуль обробки та фільтрації списків Telegram/YouTube.
 * Не має залежностей від DOM чи jQuery.
 */

import { 
    SYH_PARSERS, 
    EMOJI_NUMBER_LINE_REGEX, 
    EMOJI_NUMBER_CONTAINS_REGEX,
    splitPrayerSection,
    TG_HEADER_A_REGEX,
    TG_HEADER_B_REGEX,
    RELATIVE_TIME_LINE_REGEX
} from './parsers';
import { SYH_UTILS } from './utils';
import type { CleaningLogEntry, DeletedLogEntry } from './types';

export { 
    EMOJI_NUMBER_LINE_REGEX, 
    EMOJI_NUMBER_CONTAINS_REGEX, 
    TELEGRAM_HEADER_MARKER_REGEX,
    PRAYER_SECTION_SPLIT_REGEX,
    QUESTION_START_REGEX,
    QUESTION_SPLIT_REGEX,
    STANDARD_NUMBER_START_REGEX,
    SECTION_HEADER_SPLIT_REGEX,
    TG_HEADER_A_REGEX,
    TG_HEADER_B_REGEX,
    TG_HEADER_CLEANUP_REGEX,
    RELATIVE_TIME_LINE_REGEX
} from './parsers';

export interface TelegramQuestionItem {
    author: string;
    text: string;
    source: 'old' | 'new' | 'pray' | 'yt';
}

export interface ParseOldListResult {
    questions: TelegramQuestionItem[];
    prayers: TelegramQuestionItem[];
    deleted: DeletedLogEntry[];
    cleaned: CleaningLogEntry[];
}

export interface GroupedNewItem {
    author: string;
    text: string;
    source: 'new' | 'pray' | 'yt';
}

/** 
 * Pure Helper: Підрахунок кількості питань у блоці тексту за марками 🔹
 */
export function countQuestionsInText(text: string): number {
    if (!text) return 0;
    const bullets = (text.match(/🔹/g) || []).length;
    return bullets > 0 ? bullets : 1;
}

/** 
 * Pure Helper: Конвертація числа в emoji-цифри (напр. 1 -> 1️⃣, 10 -> 🔟)
 */
export function numberToEmoji(num: number): string {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num];
    return num.toString().split('').map(d => emojis[parseInt(d, 10)]).join('');
}

/**
 * Parses answered IDs from a string (space or comma separated)
 * Returns an array of valid numbers
 */
export function parseAnsweredIds(input: string): number[] {
    return input
        .split(/[\s,]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

export function cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_PARSERS.cleanAuthorName(rawName, cleaningLog);
}

export function cleanTelegramHeadersLogged(text: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_UTILS.cleanTelegramHeaders(text, cleaningLog);
}

/**
 * Helper: Очищення та витягування імені автора з масиву рядків
 */
function trimLeadingEmptyLines(lines: string[]): string[] {
    const idx = lines.findIndex(l => l.trim() !== "");
    return idx === -1 ? [] : lines.slice(idx);
}

function extractAuthorFromLines(
    lines: string[],
    cleaningLog?: CleaningLogEntry[]
): { author: string; contentLines: string[] } | null {
    const cleanLines = trimLeadingEmptyLines(lines);
    if (cleanLines.length === 0) return null;

    const rawAuthorLine = cleanLines[0].trim();
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

    if (contentLines.length > 0 && RELATIVE_TIME_LINE_REGEX.test(contentLines[0].trim())) {
        const timeLine = contentLines[0].trim();
        contentLines = trimLeadingEmptyLines(contentLines.slice(1));
        if (cleaningLog) {
            cleaningLog.push({
                before: `${rawAuthorLine}\n${timeLine}`,
                after: author,
                removed: `${timeLine} (мітка часу)`
            });
        }
    }

    if (!author) author = "Анонім";
    return { author, contentLines };
}

/**
 * Helper: Фільтрація підпунктів 🔹 у блоці питань
 * Повертає відфільтрований text, або null якщо увесь блок повністю видалено.
 */
function filterSubQuestionsInBlock(
    rawText: string,
    id: number,
    filterIds: number[],
    deletedArr: DeletedLogEntry[],
    author: string,
    totalQuestionsInBlock: number
): string | null {
    const subIndexesToRemove = filterIds
        .filter(fid => Math.floor(fid) === id)
        .map(fid => {
            const parts = fid.toString().split('.');
            return parts[1] ? parseInt(parts[1], 10) : 0;
        })
        .filter(subIdx => subIdx > 0);

    if (subIndexesToRemove.length === 0) {
        return rawText;
    }

    const subQuestions = rawText.split('🔹').map(t => t.trim()).filter(Boolean);
    subIndexesToRemove.forEach(idx => {
        if (subQuestions[idx - 1]) {
            deletedArr.push({ originalId: `${id}.${idx}`, author, type: 'sub', count: 1 });
        }
    });

    const filteredSubQuestions = subQuestions.filter((_, idx) => !subIndexesToRemove.includes(idx + 1));

    if (filteredSubQuestions.length === 0) {
        deletedArr.push({ originalId: id, author, type: 'block', count: totalQuestionsInBlock });
        return null;
    }

    if (filteredSubQuestions.length === 1) {
        return filteredSubQuestions[0];
    }

    return filteredSubQuestions.map(q => `🔹${q}`).join('\n');
}

/**
 * Спрощений обробник окремого елемента старого списку Telegram/Молитви
 */
export function processOldTelegramItem(
    itemsArray: TelegramQuestionItem[],
    itemObj: { rawLines?: string[]; author?: string | null; type?: string; bodyLines?: string[] },
    filterIds: number[] | null,
    id: number,
    deletedArr: DeletedLogEntry[],
    src: 'old' | 'pray',
    cleaningLog?: CleaningLogEntry[]
): void {
    const lines: string[] = itemObj.rawLines || [];
    const extracted = extractAuthorFromLines(lines, cleaningLog);
    if (!extracted) return;

    const { author, contentLines } = extracted;
    let rawText = contentLines.map(l => l.trimEnd()).join('\n').trim();
    rawText = cleanTelegramHeadersLogged(rawText, cleaningLog);

    const totalQuestionsInBlock = countQuestionsInText(rawText);

    if (filterIds && filterIds.includes(id)) {
        deletedArr.push({ originalId: id, author, type: 'block', count: totalQuestionsInBlock });
        return;
    }

    if (rawText.includes('🔹') && filterIds) {
        const filteredText = filterSubQuestionsInBlock(rawText, id, filterIds, deletedArr, author, totalQuestionsInBlock);
        if (filteredText === null) return;
        rawText = filteredText;
    }

    itemsArray.push({ author, text: rawText, source: src });
}

/**
 * Helper: Визначення автора для telegram-блоку при завершенні секції
 */
function resolveItemAuthor(bodyLines: string[], cleaningLog?: CleaningLogEntry[]): string {
    const firstNonEmptyIdx = bodyLines.findIndex(l => l.trim() !== "");
    if (firstNonEmptyIdx !== -1) {
        const firstLine = bodyLines[firstNonEmptyIdx].trim();
        if (firstLine.startsWith('@')) {
            const author = cleanAuthorName(firstLine, cleaningLog);
            bodyLines.splice(firstNonEmptyIdx, 1);
            return author;
        }
    }
    return "Питання з чату";
}

/**
 * Helper: Перевірка наявності keycap у наступних рядках
 */
function hasKeycapInRemainingLines(linesArr: string[], currentIndex: number): boolean {
    for (let i = currentIndex; i < linesArr.length; i++) {
        if (EMOJI_NUMBER_CONTAINS_REGEX.test(linesArr[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Helper: Перевірка службових рядків, які ігноруються при розборі
 */
function isIgnoredSectionLine(line: string): boolean {
    return line.includes("❓❓❓ВОПРОСЫ") || line.includes("Віталій Кривко");
}

/**
 * Helper: Парсинг заголовка теми B експорту Telegram
 */
function parseHeaderBLine(trimmedLine: string, cleaningLog?: CleaningLogEntry[]): { author: string | null; bodyLines: string[] } {
    let author: string | null = null;
    const bodyLines: string[] = [];
    const match = trimmedLine.match(TG_HEADER_B_REGEX);
    if (match) {
        const trailing = match[2] ? match[2].trim() : "";
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
    let currentItem: any = null;
    let currentCounter = initialCounter;

    const finalizeCurrentItem = () => {
        if (currentItem) {
            if (currentItem.type === 'telegram') {
                const bodyLines: string[] = currentItem.bodyLines;
                if (currentItem.author === null) {
                    currentItem.author = resolveItemAuthor(bodyLines, cleaningLog);
                }
                currentItem.rawLines = [currentItem.author, ...bodyLines];
            }
            processOldTelegramItem(items, currentItem, filterIds, currentCounter, deletedItems, sourceType, cleaningLog);
        }
    };

    lines.forEach((line, idx) => {
        const trimmedLine = line.trim();
        if (isIgnoredSectionLine(trimmedLine)) return;

        if (EMOJI_NUMBER_LINE_REGEX.test(trimmedLine)) {
            finalizeCurrentItem();
            currentCounter++;
            currentItem = { type: 'keycap', rawLines: [] };
            return;
        }

        const isHeaderA = TG_HEADER_A_REGEX.test(trimmedLine);
        const isHeaderB = TG_HEADER_B_REGEX.test(trimmedLine);

        if ((isHeaderA || isHeaderB) && sourceType === 'old' && !hasKeycapInRemainingLines(lines, idx + 1)) {
            finalizeCurrentItem();
            currentCounter++;
            const { author, bodyLines } = isHeaderB ? parseHeaderBLine(trimmedLine, cleaningLog) : { author: null, bodyLines: [] };
            currentItem = { type: 'telegram', author, bodyLines };
            return;
        }

        if (currentItem) {
            if (currentItem.type === 'keycap') {
                currentItem.rawLines.push(line);
            } else if (currentItem.type === 'telegram') {
                currentItem.bodyLines.push(line);
            }
        }
    });

    finalizeCurrentItem();
    return items;
}

export interface TelegramSheetDOMState {
    finalResultHtml: string;
    statsHtml: string;
    statsVisible: boolean;
    deletedLogHtml: string;
    deletedLogCount: number;
    deletedLogDetailsVisible: boolean;
    deletedLogDetailsOpen: boolean;
    cleanedLogHtml: string;
    cleanedLogCount: number;
    cleanedLogDetailsVisible: boolean;
    cleanedLogDetailsOpen: boolean;
}

export function collectTelegramSheetStateFromDOM(
    sheetId: string,
    deletedLogCount: number = 0,
    cleanedLogCount: number = 0,
    getElementByIdFn: (id: string) => HTMLElement | null = (id) => typeof document !== 'undefined' ? document.getElementById(id) : null
): TelegramSheetDOMState {
    const outputDiv = getElementByIdFn(`finalResultDiv__${sheetId}`);
    const statsBar = getElementByIdFn(`statsBar__${sheetId}`);
    const deletedLogDiv = getElementByIdFn(`deletedLog__${sheetId}`);
    const cleanedLogDiv = getElementByIdFn(`cleanedLog__${sheetId}`);
    const deletedLogDetails = getElementByIdFn(`deletedLogDetails__${sheetId}`) as HTMLDetailsElement | null;
    const cleanedLogDetails = getElementByIdFn(`cleanedLogDetails__${sheetId}`) as HTMLDetailsElement | null;

    return {
        finalResultHtml: outputDiv?.innerHTML || '',
        statsHtml: statsBar?.innerHTML || '',
        statsVisible: statsBar ? statsBar.style.display !== 'none' : false,
        deletedLogHtml: deletedLogDiv?.innerHTML || '',
        deletedLogCount,
        deletedLogDetailsVisible: true,
        deletedLogDetailsOpen: deletedLogDetails?.open || false,
        cleanedLogHtml: cleanedLogDiv?.innerHTML || '',
        cleanedLogCount,
        cleanedLogDetailsVisible: true,
        cleanedLogDetailsOpen: cleanedLogDetails?.open || false
    };
}

export function parseAndFilterOldList(
    text: string,
    answeredIds?: number[] | null,
    cleaningLog?: CleaningLogEntry[]
): ParseOldListResult {
    cleaningLog = cleaningLog || [];
    const messages = [text];

    let allQuestions: TelegramQuestionItem[] = [];
    let allPrayers: TelegramQuestionItem[] = [];
    const deletedItems: DeletedLogEntry[] = [];

    for (const msg of messages) {
        const { questionsText, prayersText } = splitPrayerSection(msg);

        if (questionsText.trim()) {
            const qs = parseTelegramSection(questionsText, answeredIds || null, 'old', allQuestions.length, deletedItems, cleaningLog);
            allQuestions = allQuestions.concat(qs);
        }
        if (prayersText.trim()) {
            const prs = parseTelegramSection(prayersText, null, 'pray', allPrayers.length, deletedItems, cleaningLog);
            allPrayers = allPrayers.concat(prs);
        }
    }

    return { questions: allQuestions, prayers: allPrayers, deleted: deletedItems, cleaned: cleaningLog };
}

/**
 * Helper: Створення об'єкта елемента для заголовка рядкового експорту
 */
function createLineByLineHeaderItem(trimmedLine: string, cleaningLog?: CleaningLogEntry[]): { author: string | null; textLines: string[] } {
    let author: string | null = null;
    const textLines: string[] = [];
    if (TG_HEADER_B_REGEX.test(trimmedLine)) {
        const match = trimmedLine.match(TG_HEADER_B_REGEX);
        if (match) {
            const headerAuthorCandidate = match[1] ? match[1].trim() : "";
            const trailing = match[2] ? match[2].trim() : "";
            if (headerAuthorCandidate && headerAuthorCandidate.startsWith('@')) {
                author = cleanAuthorName(headerAuthorCandidate, cleaningLog);
            } else if (trailing && trailing.startsWith('@')) {
                author = cleanAuthorName(trailing, cleaningLog);
            }
            if (trailing && !trailing.startsWith('@')) {
                textLines.push(trailing);
            }
        }
    }
    return { author, textLines };
}

/**
 * Helper: Обробка контентного рядка для рядкового експорту
 */
function processLineByLineContent(
    trimmedLine: string,
    currentItem: { author: string | null; textLines: string[] },
    cleaningLog?: CleaningLogEntry[]
): void {
    if (trimmedLine === "") return;
    if (currentItem.author === null) {
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
        currentItem.author = "Питання з чату";
        currentItem.textLines.push(trimmedLine);
    } else {
        currentItem.textLines.push(trimmedLine);
    }
}

/**
 * Helper: Згрупувати послідовні питання одного автора в одне з маркерами 🔹
 */
function groupItemsByAuthor(rawItems: { author: string; text: string; source: 'new' }[]): GroupedNewItem[] {
    const groupedItems: GroupedNewItem[] = [];
    rawItems.forEach(item => {
        if (groupedItems.length > 0) {
            const lastGroup = groupedItems[groupedItems.length - 1];
            if (lastGroup.author === item.author) {
                if (!lastGroup.text.startsWith('🔹')) lastGroup.text = `🔹${lastGroup.text}`;
                lastGroup.text += `\n🔹${item.text}`;
                return;
            }
        }
        groupedItems.push(item);
    });
    return groupedItems;
}

export function parseTelegramExportLineByLine(text: string, cleaningLog?: CleaningLogEntry[]): GroupedNewItem[] {
    cleaningLog = cleaningLog || [];
    const rawItems: { author: string; text: string; source: 'new' }[] = [];
    const lines = text.split('\n');
    let currentItem: { author: string | null; textLines: string[] } | null = null;

    const finalizeItem = () => {
        if (currentItem && currentItem.textLines.length > 0) {
            rawItems.push({
                author: currentItem.author || "Питання з чату",
                text: currentItem.textLines.join('\n').trim(),
                source: 'new'
            });
        }
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        const isHeader = TG_HEADER_A_REGEX.test(trimmed) || TG_HEADER_B_REGEX.test(trimmed);

        if (isHeader) {
            finalizeItem();
            currentItem = createLineByLineHeaderItem(trimmed, cleaningLog);
        } else if (currentItem) {
            processLineByLineContent(trimmed, currentItem, cleaningLog);
        }
    });

    finalizeItem();
    return groupItemsByAuthor(rawItems);
}

