// modules/parsers/standard_parser.ts
import { SYH_CONFIG } from '../config';
import { truncateWithLimit } from './truncation';
import { QUESTION_AUTHOR_SUFFIX_REGEX } from './regex';

const DEFAULT_MAX_LENGTH = 195;

function getMaxLength(): number {
    return SYH_CONFIG?.LIMITS?.TEXT_TRUNCATION_LENGTH ?? DEFAULT_MAX_LENGTH;
}

function formatNumberedLine(line: string): string {
    return line
        .replace(/^\d+[.)]?\s*/, '')
        .replace(QUESTION_AUTHOR_SUFFIX_REGEX, '')
        .trim();
}

function truncateIfNeeded(line: string, maxLength: number): string {
    return truncateWithLimit(line, maxLength);
}

export function parseStandardNumberedQuestions(rawText: string): string[] {
    if (!rawText) return [];
    const maxLen = getMaxLength();

    const formattedText = rawText.replace(/(?:^|\s)(\d+\.)/g, '\n$1');

    return formattedText.split('\n')
        .map(line => line.trim())
        .filter(line => /^\d+\./.test(line))
        .map(formatNumberedLine)
        .filter(line => line.length > 0)
        .map(line => truncateIfNeeded(line, maxLen));
}