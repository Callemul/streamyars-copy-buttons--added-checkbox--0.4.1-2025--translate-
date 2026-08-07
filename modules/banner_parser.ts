import { SYH_PARSERS, EMOJI_NUMBER_CONTAINS_REGEX, splitPrayerSection, QUESTION_START_REGEX, QUESTION_SPLIT_REGEX, STANDARD_NUMBER_START_REGEX, SECTION_HEADER_SPLIT_REGEX } from './parsers';
import { SABBATH_SCHOOL_KEYWORDS_REGEX, SPEAKER_SUFFIX_CLEANUP_REGEX } from './channel_config';
import type { SyhParsers } from './parsers';
import type { SyhUtils } from './utils';
import type { BannerItem } from './banner_types';

export function detectBlockCategory(firstLine: string, defaultCat: string): string {
    const isQuestionStart = QUESTION_START_REGEX.test(firstLine);
    if (!isQuestionStart && firstLine) {
        const headerMatch = firstLine.split(QUESTION_SPLIT_REGEX);
        const headerText = (headerMatch[0] || "").trim().toUpperCase();
        if (headerText.includes("МОЛИТВ") || headerText.includes("ПРОХАН") || headerText.includes("🙏")) {
            return "prayer";
        }
        if (headerText.includes("СУББОТ") || headerText.includes("СУБОТ") || headerText.includes("УРОК")) {
            return "stream";
        }
        if (headerText.includes("ВОПРОС") || headerText.includes("ПИТАН") || headerText.includes("???") || headerText.includes("❓")) {
            return "audience";
        }
    }
    return defaultCat;
}

export function parseBlock(
    text: string,
    defaultCat: string,
    parsers: SyhParsers,
    logger?: (msg: string) => void
): BannerItem[] {
    if (!text.trim()) return [];
    let blockQuestions: string[];
    let isStd = false;

    const firstLine = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)[0] || "";
    let blockCategory = detectBlockCategory(firstLine, defaultCat);

    if (SABBATH_SCHOOL_KEYWORDS_REGEX.test(text) && !STANDARD_NUMBER_START_REGEX.test(text) && !EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
        if (logger) logger("Формат: Суботня Школа (без нумерації)");
        blockQuestions = parsers.parseSabbathSchoolUnnumberedQuestions(text);
        blockCategory = "stream";
    } else if (EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
        if (logger) logger("Формат: Емодзі 1️⃣");
        blockQuestions = parsers.parseEmojiNumberedQuestions(text);
    } else {
        if (logger) logger("Формат: Стандартний 1.");
        blockQuestions = parsers.parseStandardNumberedQuestions(text);
        isStd = true;
    }

    return blockQuestions.map((q: string) => ({ text: q, category: blockCategory, isStandard: isStd }));
}

export function parseRawTextToBanners(
    rawText: string,
    parsers: SyhParsers,
    utils: SyhUtils,
    logger?: (msg: string) => void
): { bannersToCreate: BannerItem[]; hasStandardFormat: boolean } {
    let bannersToCreate: BannerItem[] = [];
    let hasStandardFormat = false;

    const cleaner = utils.cleanTelegramHeaders ? utils.cleanTelegramHeaders.bind(utils) : ((t: string) => t);
    const cleanedText = cleaner(rawText);

    let messages = cleanedText.split(SECTION_HEADER_SPLIT_REGEX).map((m: string) => m.trim()).filter(Boolean);
    if (messages.length === 0) messages = [cleanedText];

    for (const msg of messages) {
        const { questionsText, prayersText } = splitPrayerSection(msg);

        if (questionsText.trim()) {
            const qItems = parseBlock(questionsText, "stream", parsers, logger);
            bannersToCreate = bannersToCreate.concat(qItems);
            if (qItems.some(item => item.isStandard)) {
                hasStandardFormat = true;
            }
        }
        if (prayersText.trim()) {
            const pItems = parseBlock(prayersText, "prayer", parsers, logger);
            bannersToCreate = bannersToCreate.concat(pItems);
        }
    }

    return { bannersToCreate, hasStandardFormat };
}