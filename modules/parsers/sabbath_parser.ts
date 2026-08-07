// modules/parsers/sabbath_parser.ts
import { SABBATH_SCHOOL_KEYWORDS_REGEX } from '../channel_config';
import { SYH_CONFIG } from '../config';
import { truncateWithLimit } from './truncation';

const DEFAULT_MAX_LENGTH = 195;

function getMaxLength(): number {
    return SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? DEFAULT_MAX_LENGTH;
}

function findStartIndex(lines: string[]): number {
    return lines.findIndex(l => SABBATH_SCHOOL_KEYWORDS_REGEX.test(l));
}

function cleanLine(line: string): string {
    return line.replace(/\s*\([^)]+\)$/, '').trim();
}

function processQuestionLines(lines: string[], maxLen: number): string[] {
    return lines.map(line => {
        const clean = cleanLine(line);
        return truncateWithLimit(clean, maxLen);
    });
}

export function parseSabbathSchoolUnnumberedQuestions(rawText: string): string[] {
    if (!rawText) return [];
    const maxLen = getMaxLength();

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    const startIndex = findStartIndex(lines);
    if (startIndex === -1) return [];

    const questionLines = lines.slice(startIndex);

    if (questionLines.length > 10) {
        throw new Error("Помилка: Кількість питань перевищує ліміт (максимум 10)!");
    }

    return processQuestionLines(questionLines, maxLen);
}