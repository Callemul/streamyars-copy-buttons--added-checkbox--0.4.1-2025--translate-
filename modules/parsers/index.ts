// modules/parsers/index.ts
// Main export file for parsers module

export * from './regex';
export * from './question_parsers';
export * from './author';
export * from './split_prayer';

import { SYH_CONFIG } from '../config';
import { SABBATH_SCHOOL_KEYWORDS_REGEX } from '../channel_config';
import {
    EMOJI_NUMBER_LINE_REGEX,
    QUESTION_SPLIT_REGEX,
    PRAYER_SECTION_SPLIT_REGEX,
    STANDARD_NUMBER_REGEX,
    STANDARD_NUMBER_START_REGEX,
    QUESTION_START_REGEX,
    SECTION_HEADER_SPLIT_REGEX,
    TG_HEADER_A_REGEX,
    TG_HEADER_B_REGEX,
    TG_HEADER_CLEANUP_REGEX,
    RELATIVE_TIME_LINE_REGEX
} from './regex';

import { parseEmojiNumberedQuestions, parseStandardNumberedQuestions, parseSabbathSchoolUnnumberedQuestions } from './question_parsers';
import { cleanAuthorName, type CleaningLogEntry } from './author';
import { splitPrayerSection } from './split_prayer';

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