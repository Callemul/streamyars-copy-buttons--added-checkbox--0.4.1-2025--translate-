/**
 * StreamYard Helper — підрахунок статистики аркуша.
 *
 * Виділено з `modules/sheet_state_service.ts` (307 LOC, CC 52) у рамках
 * декомпозиції за звітом Fallow. Містить виключно чисті обчислення:
 * дедуплікацію людей та агрегацію лівої (Telegram) і правої (YouTube) колонок.
 * Не залежить ані від DOM, ані від сховища.
 *
 * Поведінка збережена 1-в-1 (див. tests/sheet_state_api.test.js).
 */

import { parseAndFilterOldList, parseTelegramExportLineByLine, countQuestionsInText } from './telegram_parser';
import { TELEGRAM_HEADER_MARKER_REGEX } from './parsers/index';
import type { YTCollectedItem } from './types';

export interface SheetCounterStats {
    leftPeople: number;
    leftQuestions: number;
    leftPrayers: number;
    rightPeople: number;
    rightQuestions: number;
    rightPrayers: number;
    totalPeople: number;
    totalQuestions: number;
    totalPrayers: number;
}

/** Один «стовпчик» лічильників: люди / питання / молитви. */
interface ColumnCounters {
    people: number;
    questions: number;
    prayers: number;
}

const GENERIC_ANONYMOUS_AUTHORS: ReadonlySet<string> = new Set([
    '',
    'анонім',
    'питання з чату',
    'невідомий'
]);

/** `  @Alex ` → `alex`. Порожній рядок означає «анонім». */
function normalizeAuthorKey(author: string | undefined): string {
    return (author || '').trim().replace(/^@+/, '').toLowerCase();
}

export function countUniquePeople(items: { author: string }[]): number {
    const namedAuthors = new Set<string>();
    let anonymousCount = 0;

    for (const item of items) {
        const norm = normalizeAuthorKey(item.author);

        if (GENERIC_ANONYMOUS_AUTHORS.has(norm)) {
            anonymousCount++;
        } else {
            namedAuthors.add(norm);
        }
    }

    return namedAuthors.size + anonymousCount;
}

/** Сумує «скільки питань всередині тексту» по всьому списку. */
export function sumQuestionsInTexts(items: { text: string }[]): number {
    let total = 0;
    items.forEach(item => { total += countQuestionsInText(item.text); });
    return total;
}

/**
 * Ліва колонка (Telegram). Дві гілки збережено 1-в-1:
 *   - є маркер-заголовок → блоковий парсер (питання + молитви);
 *   - немає маркера     → порядковий парсер (молитов не буває).
 */
function countTelegramColumn(telegramText: string): ColumnCounters {
    if (!telegramText || !telegramText.trim()) {
        return { people: 0, questions: 0, prayers: 0 };
    }

    if (TELEGRAM_HEADER_MARKER_REGEX.test(telegramText)) {
        const parsed = parseAndFilterOldList(telegramText, []);
        return {
            people: countUniquePeople([...parsed.questions, ...parsed.prayers]),
            questions: sumQuestionsInTexts(parsed.questions),
            prayers: parsed.prayers.length
        };
    }

    const items = parseTelegramExportLineByLine(telegramText);
    return {
        people: countUniquePeople(items),
        questions: sumQuestionsInTexts(items),
        prayers: 0
    };
}

/** Права колонка (зібране з YouTube): `question` → питання, `prayer` → молитва. */
function countYoutubeColumn(ytItems: YTCollectedItem[]): ColumnCounters {
    let questions = 0;
    let prayers = 0;

    ytItems.forEach(item => {
        if (item.type === 'question') {
            questions += countQuestionsInText(item.text);
        } else if (item.type === 'prayer') {
            prayers += 1;
        }
    });

    return { people: countUniquePeople(ytItems), questions, prayers };
}

export class SheetStatsCalculator {
    public static countUniquePeople(items: { author: string }[]): number {
        return countUniquePeople(items);
    }

    public static computeSheetCounters(telegramText: string, ytItems: YTCollectedItem[]): SheetCounterStats {
        const left = countTelegramColumn(telegramText);
        const right = countYoutubeColumn(ytItems);

        return {
            leftPeople: left.people,
            leftQuestions: left.questions,
            leftPrayers: left.prayers,
            rightPeople: right.people,
            rightQuestions: right.questions,
            rightPrayers: right.prayers,
            totalPeople: left.people + right.people,
            totalQuestions: left.questions + right.questions,
            totalPrayers: left.prayers + right.prayers
        };
    }
}
