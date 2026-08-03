import { SYH_CONFIG } from './config';
import { SABBATH_SCHOOL_KEYWORDS_REGEX } from './channel_config';

export interface GroupedQuestion {
    number: string;
    author: string;
    textLines: string[];
}

export interface CleaningLogEntry {
    before: string;
    after: string;
    removed: string;
}

/**
 * ЄДИНЕ ДЖЕРЕЛО ПРАВДИ ДЛЯ REGEX-ПАТЕРНІВ ПАРСИНГУ
 */

/**
 * Регулярний вираз для виявлення рядка, що складається виключно з emoji-цифр (напр. 1️⃣, 🔟)
 */
export const EMOJI_NUMBER_LINE_REGEX = /^(?:\d+\uFE0F?\u20E3|🔟)+\s*$/;

/**
 * Регулярний вираз для виявлення наявності хоча б однієї emoji-циفري у тексті
 */
export const EMOJI_NUMBER_CONTAINS_REGEX = /(?:\d+\uFE0F?\u20E3|🔟)/;

/**
 * Регулярний вираз для виявлення розділювачів/заголовків у форматованому тексті питань
 */
export const TELEGRAM_HEADER_MARKER_REGEX = /❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu;

/**
 * Заголовки експорту Telegram: "Ім'я, [10.07.2026 20:44]"
 */
export const TG_HEADER_A_REGEX = /^.+?,\s*\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*$/;

/**
 * Заголовки експорту Telegram: "[10.07.2026 20:44] @User: Text"
 */
export const TG_HEADER_B_REGEX = /^\[\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\]\s*([^:\n]+)(?::\s*(.*))?$/;

/**
 * Очищення системних заголовків Telegram з часом
 */
export const TG_HEADER_CLEANUP_REGEX = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;

/**
 * Відносні мітки часу Telegram (напр. "щойно", "5 хвилин тому", "2 hours ago")
 */
export const RELATIVE_TIME_LINE_REGEX = /^(?:щойно|только\s*что|just\s*now)$|^\d+\s*(?:секунд[аиу]?|сек\.?|хвилин[аиу]?|хв\.?|минут[аыу]?|мин\.?|час(?:а|ів|ов|и|у)?|ч\.?|годин[аи]?|год\.?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\s*(?:тому|назад|ago)?\.{0,3}$/i;

export interface SyhParsers {
    parseEmojiNumberedQuestions(rawText: string): string[];
    parseStandardNumberedQuestions(rawText: string): string[];
    parseSabbathSchoolUnnumberedQuestions(rawText: string): string[];
    cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string;
}

const DEFAULT_MAX_LENGTH = 195;

export const SYH_PARSERS: SyhParsers = {
    /**
     * Парсер для формату з emoji-цифрами, що підтримує підпункти '🔹'.
     */
    parseEmojiNumberedQuestions: function(rawText: string): string[] {
        if (!rawText) return [];
        const MAX_LENGTH = SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? DEFAULT_MAX_LENGTH;
        const ELLIPSIS = "...";

        const truncate = (text: string): string => {
            if (text.length > MAX_LENGTH) {
                return text.substring(0, MAX_LENGTH - ELLIPSIS.length) + ELLIPSIS;
            }
            return text;
        };

        const groupedQuestions: GroupedQuestion[] = [];
        let currentQuestion: GroupedQuestion | null = null;
        const lines = rawText.split('\n').map(l => l.trim());

        for (const line of lines) {
            // Оновлена регулярка: підтримує всі варіанти цифр у квадратиках
            if (EMOJI_NUMBER_LINE_REGEX.test(line)) {
                if (currentQuestion) groupedQuestions.push(currentQuestion);
                currentQuestion = { number: line, author: '', textLines: [] };
            } else if (currentQuestion && !currentQuestion.author && line) {
                currentQuestion.author = line;
            } else if (currentQuestion && line) {
                currentQuestion.textLines.push(line);
            }
        }
        if (currentQuestion) groupedQuestions.push(currentQuestion);

        const finalBanners: string[] = [];
        for (const group of groupedQuestions) {
            const fullText = group.textLines.join('\n');
            const subQuestions = fullText.split(/\n?(?=🔹)/);

            if (subQuestions.length <= 1) {
                const bannerText = `${group.number}\n${group.author}: \n${fullText}`;
                finalBanners.push(truncate(bannerText));
            } else {
                if (subQuestions[0].trim()) {
                    const firstBannerText = `${group.number}\n${group.author}: \n${subQuestions[0]}`;
                    finalBanners.push(truncate(firstBannerText));
                }
                for (let i = 1; i < subQuestions.length; i++) {
                    const subText = subQuestions[i].trim();
                    if (!subText) continue;
                    const subLines = subText.split('\n');
                    const newHeader = subLines.shift();
                    const newBody = subLines.join('\n');
                    const subsequentBannerText = `${newHeader}: \n${newBody}`;
                    finalBanners.push(truncate(subsequentBannerText));
                }
            }
        }
        return finalBanners;
    },

    /**
     * Парсер для старого формату: "1. Текст питання (Автор)"
     */
    parseStandardNumberedQuestions: function(rawText: string): string[] {
        if (!rawText) return [];
        const formattedText = rawText.replace(/(?:^|\s)(\d+\.)/g, '\n$1');
        const maxLen = SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? DEFAULT_MAX_LENGTH;

        return formattedText.split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\./.test(line))
            .map(line => line.replace(/^\d+[.)]?\s*/, '').replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0)
            .map(line => {
                if (line.length >= 200) {
                    return line.substring(0, maxLen) + "...";
                }
                return line;
            });
    },

    parseSabbathSchoolUnnumberedQuestions: function(rawText: string): string[] {
        console.log("Parsing as Sabbath School Unnumbered questions.");
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const maxLen = SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? 195;
        
        const startIndex = lines.findIndex(l => SABBATH_SCHOOL_KEYWORDS_REGEX.test(l));
        if (startIndex === -1) return [];
        
        const questionLines = lines.slice(startIndex);
        
        if (questionLines.length > 10) {
            throw new Error("Помилка: Кількість питань перевищує ліміт (максимум 10)!");
        }
        
        return questionLines.map(line => {
            const cleanLine = line.replace(/\s*\([^)]+\)$/, '').trim();
            return cleanLine.length >= 200 ? cleanLine.substring(0, maxLen) + "..." : cleanLine;
        });
    },

    cleanAuthorName: cleanAuthorName
};

export function cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string {
    if (!rawName) return '';
    const original = rawName.trim();
    let name = original;
    const removedParts: string[] = [];

    if (name.startsWith('@')) {
        removedParts.push('@');
        name = name.substring(1);
    }

    const bulletMatch = name.match(/\s*•.*$/);
    if (bulletMatch) {
        removedParts.push(bulletMatch[0].trim());
        name = name.replace(/\s*•.*$/, '');
    }

    const suffixMatch = name.match(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/);
    if (suffixMatch) {
        removedParts.push(suffixMatch[0]);
        name = name.replace(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/, '');
    }

    name = name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, '$1 $2').trim();

    if (cleaningLog && name !== original) {
        cleaningLog.push({
            before: original,
            after: name,
            removed: removedParts.length > 0 ? removedParts.join(' | ') : 'форматування'
        });
    }

    return name;
}

// Pure ESM Export
