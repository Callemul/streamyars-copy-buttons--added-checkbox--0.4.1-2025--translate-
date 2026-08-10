import { splitPrayerSection } from './parsers/index';
import type { SyhParsers } from './parsers/index';
import type { SyhUtils } from './utils';
import type { BannerItem } from './banner_types';
import {
    detectBlockCategory,
    detectBlockFormat,
    readFirstNonEmptyLine,
    splitIntoMessages,
    BLOCK_FORMAT_LOG_MESSAGES,
    type BlockFormat
} from './banner_parser_rules';

// Публічний контракт модуля лишається незмінним: `detectBlockCategory`
// історично імпортують із `./banner_parser` (і далі — з `./banner_creator`).
export { detectBlockCategory } from './banner_parser_rules';

/** Як кожен формат перетворюється на список питань і чи вважається «стандартним». */
const FORMAT_HANDLERS: Readonly<Record<BlockFormat, {
    read: (parsers: SyhParsers, text: string) => string[];
    isStandard: boolean;
    /** Формат, що жорстко перекриває категорію блока (лише «Суботня школа»). */
    forcedCategory?: string;
}>> = {
    'sabbath-school': {
        read: (parsers, text) => parsers.parseSabbathSchoolUnnumberedQuestions(text),
        isStandard: false,
        forcedCategory: 'stream'
    },
    'emoji': {
        read: (parsers, text) => parsers.parseEmojiNumberedQuestions(text),
        isStandard: false
    },
    'standard': {
        read: (parsers, text) => parsers.parseStandardNumberedQuestions(text),
        isStandard: true
    }
};

/**
 * Розбирає один блок тексту на банери.
 *
 * Раніше — функція з cyclomatic 10 / cognitive 12 (severity critical за
 * `fallow health`) із трьома розлогими гілками формату. Тепер вибір формату
 * декларативний (`FORMAT_HANDLERS`), а правила живуть у `./banner_parser_rules`.
 * Поведінка збережена 1-в-1, включно з текстами логів і перекриттям категорії
 * для «Суботньої школи».
 */
export function parseBlock(
    text: string,
    defaultCat: string,
    parsers: SyhParsers,
    logger?: (msg: string) => void
): BannerItem[] {
    if (!text.trim()) return [];

    const format = detectBlockFormat(text);
    const handler = FORMAT_HANDLERS[format];

    if (logger) logger(BLOCK_FORMAT_LOG_MESSAGES[format]);

    const category = handler.forcedCategory ?? detectBlockCategory(readFirstNonEmptyLine(text), defaultCat);
    const blockQuestions = handler.read(parsers, text);

    return blockQuestions.map((q: string) => ({ text: q, category, isStandard: handler.isStandard }));
}

/**
 * Прибирає системні заголовки Telegram, якщо утиліта доступна.
 * `SyhUtils` може прийти частково ініціалізованим, тому потрібен фолбек-тотожність.
 */
function resolveTelegramCleaner(utils: SyhUtils): (text: string) => string {
    return utils.cleanTelegramHeaders ? utils.cleanTelegramHeaders.bind(utils) : ((t: string) => t);
}

/**
 * Повний конвеєр: сирий текст → список банерів.
 *
 * `hasStandardFormat` навмисно рахується ЛИШЕ по блоку питань: молитовна секція
 * на цей прапорець не впливає (поведінка оригіналу, збережена 1-в-1).
 */
export function parseRawTextToBanners(
    rawText: string,
    parsers: SyhParsers,
    utils: SyhUtils,
    logger?: (msg: string) => void
): { bannersToCreate: BannerItem[]; hasStandardFormat: boolean } {
    const bannersToCreate: BannerItem[] = [];
    let hasStandardFormat = false;

    const cleanedText = resolveTelegramCleaner(utils)(rawText);

    for (const msg of splitIntoMessages(cleanedText)) {
        const { questionsText, prayersText } = splitPrayerSection(msg);

        if (questionsText.trim()) {
            const qItems = parseBlock(questionsText, 'stream', parsers, logger);
            qItems.forEach(item => bannersToCreate.push(item));
            if (qItems.some(item => item.isStandard)) {
                hasStandardFormat = true;
            }
        }
        if (prayersText.trim()) {
            parseBlock(prayersText, 'prayer', parsers, logger).forEach(item => bannersToCreate.push(item));
        }
    }

    return { bannersToCreate, hasStandardFormat };
}
