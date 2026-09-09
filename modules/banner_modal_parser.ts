import type { BannerItem } from './banner_types';
import type { SyhParsers } from './parsers/index';
import type { SyhUtils } from './utils';
import { splitPrayerSection } from './parsers/index';
import {
    detectBlockCategory,
    readFirstNonEmptyLine,
    splitIntoMessages
} from './banner_parser_rules';
import { parseBlock } from './banner_parser';

export interface ParsedSection {
    id: number;
    title: string;
    rawText: string;
    category: string; // 'stream' | 'audience' | 'prayer'
    banners: BannerItem[];
}

export interface ParseSectionsResult {
    sections: ParsedSection[];
    allBanners: BannerItem[];
    hasStandardFormat: boolean;
    logs: string[];
}

/**
 * Розбирає вхідний текст на секції із збереженням структури для інтерфейсу.
 * Підтримує ручні перевизначення категорій секцій.
 */
export function parseTextToSections(
    rawText: string,
    parsers: SyhParsers,
    utils: SyhUtils,
    categoryOverrides?: Record<number, string>
): ParseSectionsResult {
    const logs: string[] = [];
    const sections: ParsedSection[] = [];
    let hasStandardFormat = false;

    const cleaner = utils.cleanTelegramHeaders ? utils.cleanTelegramHeaders.bind(utils) : ((t: string) => t);
    const cleanedText = cleaner(rawText);

    if (!cleanedText.trim()) {
        return { sections: [], allBanners: [], hasStandardFormat: false, logs: ['Текст порожній'] };
    }

    const messages = splitIntoMessages(cleanedText);
    logs.push(`Виявлено логічних блоків тексту: ${messages.length}`);

    let sectionCounter = 0;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i] ?? '';
        const { questionsText, prayersText } = splitPrayerSection(msg);

        // Обробка підблоку питань
        if (questionsText.trim()) {
            sectionCounter++;
            const secId = sectionCounter;
            const firstLine = readFirstNonEmptyLine(questionsText);
            const autoCat = detectBlockCategory(firstLine, 'stream');
            const finalCat = (categoryOverrides && categoryOverrides[secId]) ? categoryOverrides[secId] : autoCat;

            const qItems = parseBlock(questionsText, finalCat, parsers);
            // Примусово синхронізуємо категорію елементів із секційною категорією
            const updatedItems = qItems.map(item => ({ ...item, category: finalCat }));

            if (updatedItems.some(item => item.isStandard)) {
                hasStandardFormat = true;
            }

            const title = firstLine.length > 35 ? `${firstLine.substring(0, 32)}...` : (firstLine || `Секція ${secId}`);
            sections.push({
                id: secId,
                title: `Секція ${secId}: ${title}`,
                rawText: questionsText,
                category: finalCat,
                banners: updatedItems
            });

            logs.push(`Секція ${secId}: "${title}" → категорія [${finalCat}], знайдено питань: ${updatedItems.length}`);
        }

        // Обробка підблоку молитов
        if (prayersText.trim()) {
            sectionCounter++;
            const secId = sectionCounter;
            const firstLine = readFirstNonEmptyLine(prayersText);
            const autoCat = 'prayer';
            const finalCat = (categoryOverrides && categoryOverrides[secId]) ? categoryOverrides[secId] : autoCat;

            const pItems = parseBlock(prayersText, finalCat, parsers);
            const updatedItems = pItems.map(item => ({ ...item, category: finalCat }));

            const title = firstLine.length > 35 ? `${firstLine.substring(0, 32)}...` : (firstLine || `Молитовна секція ${secId}`);
            sections.push({
                id: secId,
                title: `Секція ${secId}: ${title}`,
                rawText: prayersText,
                category: finalCat,
                banners: updatedItems
            });

            logs.push(`Секція ${secId} (Молитва): "${title}" → категорія [${finalCat}], записів: ${updatedItems.length}`);
        }
    }

    const allBanners = sections.flatMap(sec => sec.banners);
    logs.push(`Всього сформовано банерів: ${allBanners.length}`);

    return { sections, allBanners, hasStandardFormat, logs };
}
