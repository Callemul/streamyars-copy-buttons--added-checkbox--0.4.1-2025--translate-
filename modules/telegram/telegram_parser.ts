/**
 * StreamYard Helper - Telegram & Questions Parsing Module (facade)
 *
 * Чистий сервісний модуль обробки та фільтрації списків Telegram/YouTube.
 * Не має залежностей від DOM чи jQuery.
 *
 * Декомпозиція (етап 3, рефакторинг #2): імплементація винесена у вузькі
 * доменні модулі, цей файл лише перевидає стабільний публічний API 1-в-1.
 */

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
} from '../parsers/index';

export type { TelegramQuestionItem, ParseOldListResult, GroupedNewItem } from './telegram_types';
export type { TelegramSheetDOMState } from '../../popup/telegram_sheet_dom';

export { countQuestionsInText, numberToEmoji, parseAnsweredIds, cleanAuthorName, cleanTelegramHeadersLogged } from './telegram_text_rules';
export { parseTelegramSection, parseAndFilterOldList } from './telegram_old_section';
export { processOldTelegramItem } from './telegram_old_item';
export { collectTelegramSheetStateFromDOM } from '../../popup/telegram_sheet_dom';
export { createLineByLineHeaderItem, parseTelegramExportLineByLine } from './telegram_line_export';
