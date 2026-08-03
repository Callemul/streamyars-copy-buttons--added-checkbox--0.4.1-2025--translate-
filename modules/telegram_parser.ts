/**
 * StreamYard Helper - Telegram & Questions Parsing Module
 * Чистий сервісний модуль обробки та фільтрації списків Telegram/YouTube.
 * Не має залежностей від DOM чи jQuery.
 */

import { 
    SYH_PARSERS, 
    EMOJI_NUMBER_LINE_REGEX, 
    EMOJI_NUMBER_CONTAINS_REGEX,
    PRAYER_SECTION_SPLIT_REGEX,
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

export function countQuestionsInText(text: string): number {
    if (!text) return 0;
    const bullets = (text.match(/🔹/g) || []).length;
    return bullets > 0 ? bullets : 1;
}

export function numberToEmoji(num: number): string {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num];
    return num.toString().split('').map(d => emojis[parseInt(d, 10)]).join('');
}

export function cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_PARSERS.cleanAuthorName(rawName, cleaningLog);
}

export function cleanTelegramHeadersLogged(text: string, cleaningLog?: CleaningLogEntry[]): string {
    return SYH_UTILS.cleanTelegramHeaders(text, cleaningLog);
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

    const processOldItem = (
        itemsArray: TelegramQuestionItem[],
        itemObj: { rawLines: string[]; author?: string | null; type?: string; bodyLines?: string[] },
        filterIds: number[] | null,
        id: number,
        deletedArr: DeletedLogEntry[],
        src: 'old' | 'pray'
    ) => {
        const lines: string[] = itemObj.rawLines || [];
        while (lines.length > 0 && lines[0].trim() === "") lines.shift();
        if (lines.length === 0) return;

        const rawAuthorLine = lines[0].trim();
        let author = rawAuthorLine;
        const authorBulletMatch = author.match(/\s*•.*$/);
        author = author.replace(/\s*•.*$/, '').trim();
        if (authorBulletMatch && cleaningLog) {
            cleaningLog.push({
                before: rawAuthorLine,
                after: author,
                removed: authorBulletMatch[0].trim()
            });
        }

        let contentLines = lines.slice(1);
        while (contentLines.length > 0 && contentLines[0].trim() === "") contentLines.shift();
        if (contentLines.length > 0 && RELATIVE_TIME_LINE_REGEX.test(contentLines[0].trim())) {
            const timeLine = contentLines[0].trim();
            contentLines = contentLines.slice(1);
            if (cleaningLog) {
                cleaningLog.push({
                    before: `${rawAuthorLine}\n${timeLine}`,
                    after: author,
                    removed: `${timeLine} (мітка часу)`
                });
            }
        }

        let rawText = contentLines.map(l => l.trimEnd()).join('\n').trim();
        if (!author) author = "Анонім";

        rawText = cleanTelegramHeadersLogged(rawText, cleaningLog);

        const totalQuestionsInBlock = countQuestionsInText(rawText);

        if (filterIds && filterIds.includes(id)) {
            deletedArr.push({ originalId: id, author: author, type: 'block', count: totalQuestionsInBlock });
            return;
        }

        if (rawText.includes('🔹') && filterIds) {
            const subIndexesToRemove = filterIds
                .filter(fid => Math.floor(fid) === id)
                .map(fid => {
                    const parts = fid.toString().split('.');
                    return parts[1] ? parseInt(parts[1], 10) : 0;
                })
                .filter(subIdx => subIdx > 0);

            if (subIndexesToRemove.length > 0) {
                const subQuestions = rawText.split('🔹').map(t => t.trim()).filter(Boolean);
                subIndexesToRemove.forEach(idx => {
                    if (subQuestions[idx - 1]) {
                        deletedArr.push({ originalId: `${id}.${idx}`, author: author, type: 'sub', count: 1 });
                    }
                });

                const filteredSubQuestions = subQuestions.filter((_, idx) => !subIndexesToRemove.includes(idx + 1));

                if (filteredSubQuestions.length === 0) {
                    deletedArr.push({ originalId: id, author: author, type: 'block', count: totalQuestionsInBlock });
                    return;
                } else if (filteredSubQuestions.length === 1) {
                    rawText = filteredSubQuestions[0];
                } else {
                    rawText = filteredSubQuestions.map(q => `🔹${q}`).join('\n');
                }
            }
        }
        itemsArray.push({ author, text: rawText, source: src });
    };

    const parseSection = (sectionText: string, filterIds: number[] | null, sourceType: 'old' | 'pray') => {
        const lines = sectionText.split('\n');
        const items: TelegramQuestionItem[] = [];
        let currentItem: any = null;
        let currentCounter = (sourceType === 'old') ? allQuestions.length : allPrayers.length;

        const emojiNumberRegex = EMOJI_NUMBER_LINE_REGEX;
        const tgHeaderARegex = TG_HEADER_A_REGEX;
        const tgHeaderBRegex = TG_HEADER_B_REGEX;

        const hasKeycapInRemainingLines = (linesArr: string[], currentIndex: number) => {
            for (let i = currentIndex; i < linesArr.length; i++) {
                if (EMOJI_NUMBER_CONTAINS_REGEX.test(linesArr[i])) {
                    return true;
                }
            }
            return false;
        };

        const finalizeCurrentItem = () => {
            if (currentItem) {
                if (currentItem.type === 'telegram') {
                    const bodyLines: string[] = currentItem.bodyLines;
                    if (currentItem.author === null) {
                        let firstNonEmptyIdx = -1;
                        for (let i = 0; i < bodyLines.length; i++) {
                            if (bodyLines[i].trim() !== "") {
                                firstNonEmptyIdx = i;
                                break;
                            }
                        }
                        if (firstNonEmptyIdx !== -1) {
                            const firstLine = bodyLines[firstNonEmptyIdx].trim();
                            if (firstLine.startsWith('@')) {
                                currentItem.author = cleanAuthorName(firstLine, cleaningLog);
                                bodyLines.splice(firstNonEmptyIdx, 1);
                            } else {
                                currentItem.author = "Питання з чату";
                            }
                        } else {
                            currentItem.author = "Питання з чату";
                        }
                    }
                    currentItem.rawLines = [currentItem.author, ...bodyLines];
                }
                processOldItem(items, currentItem, filterIds, currentCounter, deletedItems, sourceType);
            }
        };

        lines.forEach((line, idx) => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes("❓❓❓ВОПРОСЫ")) return;
            if (trimmedLine.includes("Віталій Кривко")) return;

            if (emojiNumberRegex.test(trimmedLine)) {
                finalizeCurrentItem();
                currentCounter++;
                currentItem = { type: 'keycap', rawLines: [] };
                return;
            }

            const isHeaderA = tgHeaderARegex.test(trimmedLine);
            const isHeaderB = tgHeaderBRegex.test(trimmedLine);

            if ((isHeaderA || isHeaderB) && sourceType === 'old' && !hasKeycapInRemainingLines(lines, idx + 1)) {
                finalizeCurrentItem();
                currentCounter++;

                let author = null;
                const bodyLines: string[] = [];

                if (isHeaderB) {
                    const match = trimmedLine.match(tgHeaderBRegex);
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
                }
                currentItem = { type: 'telegram', author: author, bodyLines: bodyLines };
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
    };

    for (const msg of messages) {
        const parts = msg.split(PRAYER_SECTION_SPLIT_REGEX);
        const questionsText = parts[0] || "";
        const prayersText = parts[1] || "";

        if (questionsText.trim()) {
            const qs = parseSection(questionsText, answeredIds || null, 'old');
            allQuestions = allQuestions.concat(qs);
        }
        if (prayersText.trim()) {
            const prs = parseSection(prayersText, null, 'pray');
            allPrayers = allPrayers.concat(prs);
        }
    }

    return { questions: allQuestions, prayers: allPrayers, deleted: deletedItems, cleaned: cleaningLog };
}

export function parseTelegramExportLineByLine(text: string, cleaningLog?: CleaningLogEntry[]): GroupedNewItem[] {
    cleaningLog = cleaningLog || [];
    const rawItems: { author: string; text: string; source: 'new' }[] = [];
    const lines = text.split('\n');
    const headerARegex = TG_HEADER_A_REGEX;
    const tgHeaderBRegex = TG_HEADER_B_REGEX;
    let currentItem: { author: string | null; textLines: string[] } | null = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        const isHeader = headerARegex.test(trimmed) || tgHeaderBRegex.test(trimmed);

        if (isHeader) {
            if (currentItem && currentItem.textLines.length > 0) {
                rawItems.push({ author: currentItem.author || "Питання з чату", text: currentItem.textLines.join('\n').trim(), source: 'new' });
            }
            let author: string | null = null;
            const textLines: string[] = [];
            if (tgHeaderBRegex.test(trimmed)) {
                const match = trimmed.match(tgHeaderBRegex);
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
            currentItem = { author: author, textLines: textLines };
        } else if (currentItem) {
            if (trimmed === "") return;
            if (currentItem.author === null) {
                if (trimmed.startsWith('@')) {
                    currentItem.author = cleanAuthorName(trimmed, cleaningLog);
                    return;
                }
                if (RELATIVE_TIME_LINE_REGEX.test(trimmed)) {
                    if (cleaningLog) {
                        cleaningLog.push({
                            before: trimmed,
                            after: '',
                            removed: `${trimmed} (службова мітка часу, рядок прибрано повністю)`
                        });
                    }
                    return;
                }
                currentItem.author = "Питання з чату";
                currentItem.textLines.push(trimmed);
            } else {
                currentItem.textLines.push(trimmed);
            }
        }
    });

    if (currentItem && currentItem.textLines.length > 0) {
        rawItems.push({ author: currentItem.author || "Питання з чату", text: currentItem.textLines.join('\n').trim(), source: 'new' });
    }

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
