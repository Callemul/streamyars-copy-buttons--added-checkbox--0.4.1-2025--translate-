// modules/parsers/index.ts
// Main export file for parsers module

export * from './regex';
export * from './question_parsers';
export * from './author';
export * from './split_prayer';

import { parseEmojiNumberedQuestions, parseStandardNumberedQuestions, parseSabbathSchoolUnnumberedQuestions } from './question_parsers';
import { cleanAuthorName, type CleaningLogEntry } from './author';

export interface SyhParsers {
    parseEmojiNumberedQuestions(rawText: string): string[];
    parseStandardNumberedQuestions(rawText: string): string[];
    parseSabbathSchoolUnnumberedQuestions(rawText: string): string[];
    cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string;
}

export const SYH_PARSERS: SyhParsers = {
    parseEmojiNumberedQuestions,
    parseStandardNumberedQuestions,
    parseSabbathSchoolUnnumberedQuestions,
    cleanAuthorName
};

// Re-export types
export type { GroupedQuestion } from './question_parsers';
export type { CleaningLogEntry } from './author';