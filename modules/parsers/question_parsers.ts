// modules/parsers/question_parsers.ts
import { SYH_CONFIG } from '../config';
import { SABBATH_SCHOOL_KEYWORDS_REGEX } from '../channel_config';
import {
    EMOJI_NUMBER_LINE_REGEX,
    QUESTION_SPLIT_REGEX
} from './regex';

export interface GroupedQuestion {
    number: string;
    author: string;
    textLines: string[];
}

const DEFAULT_MAX_LENGTH = 195;

/**
 * Парсер для формату з emoji-цифрами, що підтримує підпункти '🔹'.
 */
export function parseEmojiNumberedQuestions(rawText: string): string[] {
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
}

/**
 * Парсер для старого формату: "1. Текст питання (Автор)"
 */
export function parseStandardNumberedQuestions(rawText: string): string[] {
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
}

export function parseSabbathSchoolUnnumberedQuestions(rawText: string): string[] {
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
}