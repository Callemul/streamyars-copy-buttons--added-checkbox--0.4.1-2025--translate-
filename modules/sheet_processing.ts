/**
 * StreamYard Helper — конвеєр обробки даних аркуша.
 *
 * Виділено з `modules/sheet_state_service.ts`, де `processSheetData` була
 * функцією на 89 рядків (порушення ліміту unit-size 60 за звітом Fallow).
 * Тепер кожен крок конвеєра — окрема іменована функція:
 *
 *   1. `collectNewTelegramItems` — нові питання/молитви з Telegram;
 *   2. `splitYoutubeItems`       — зібране з YouTube за типом;
 *   3. `countDeletedEntries`     — підсумки вилученого (відповіді);
 *   4. `buildSheetStats`         — складання блоку статистики.
 *
 * Поведінка збережена 1-в-1 (див. tests/sheet_state_api.test.js).
 */

import {
    parseAnsweredIds,
    parseAndFilterOldList,
    parseTelegramExportLineByLine
} from './telegram/telegram_parser';
import { TELEGRAM_HEADER_MARKER_REGEX } from './parsers/index';
import { countUniquePeople, sumQuestionsInTexts } from './sheet_stats_calculator';
import type { YTCollectedItem, DeletedLogEntry, CleaningLogEntry } from './types';
import type { TelegramQuestionItem, GroupedNewItem } from './telegram/telegram_parser';

export interface SheetProcessingInputs {
    oldListText: string;
    answeredInput: string;
    telegramText: string;
    ytItems: YTCollectedItem[];
}

export interface ProcessedSheetResult {
    questions: TelegramQuestionItem[];
    prayers: TelegramQuestionItem[];
    stats: {
        oldPeople: number;
        oldQuestionsTotal: number;
        newLeftPeople: number;
        newLeftQuestionsTotal: number;
        newLeftPrayersTotal: number;
        newYTPeople: number;
        newYTQuestionsTotal: number;
        newYTPrayersTotal: number;
        delPeople: number;
        delQuestionsTotal: number;
        totalPeople: number;
        totalQuestions: number;
        totalPrayers: number;
    };
    deletedLog: DeletedLogEntry[];
    cleaningLog: CleaningLogEntry[];
}

/** Пара списків «питання + молитви» одного джерела. */
interface SourceItems {
    questions: TelegramQuestionItem[];
    prayers: TelegramQuestionItem[];
}

/**
 * Нові дані з Telegram. Гілки збережено 1-в-1:
 *   - є маркер-заголовок → блоковий парсер (питання + молитви);
 *   - немає маркера     → порядковий парсер (молитов не буває).
 */
function collectNewTelegramItems(telegramText: string, cleaningLog: CleaningLogEntry[]): SourceItems {
    if (TELEGRAM_HEADER_MARKER_REGEX.test(telegramText)) {
        const parsedNew = parseAndFilterOldList(telegramText, [], cleaningLog);
        return {
            questions: parsedNew.questions.map((q) => ({ ...q, source: 'new' as const })),
            prayers: parsedNew.prayers.map((p) => ({ ...p, source: 'pray' as const }))
        };
    }

    const parsedLineItems: GroupedNewItem[] = parseTelegramExportLineByLine(telegramText, cleaningLog);
    return {
        questions: parsedLineItems.map(item => ({ ...item, source: 'new' as const })),
        prayers: []
    };
}

/** Зібране з YouTube: `question` → питання, `prayer` → молитва, решта — ігнорується. */
function splitYoutubeItems(ytItems: YTCollectedItem[]): SourceItems {
    const questions: TelegramQuestionItem[] = [];
    const prayers: TelegramQuestionItem[] = [];

    ytItems.forEach((item: YTCollectedItem) => {
        if (item.type === 'question') {
            questions.push({ author: item.author, text: item.text, source: 'yt' });
        } else if (item.type === 'prayer') {
            prayers.push({ author: item.author, text: item.text, source: 'pray' });
        }
    });

    return { questions, prayers };
}

/** Підсумки журналу вилученого: блок = людина + її питання, sub = лише питання. */
export function countDeletedEntries(deleted: DeletedLogEntry[]): { delPeople: number; delQuestionsTotal: number } {
    let delPeople = 0;
    let delQuestionsTotal = 0;

    deleted.forEach((d: DeletedLogEntry) => {
        if (d.type === 'block') {
            delPeople++;
            delQuestionsTotal += d.count;
        } else if (d.type === 'sub') {
            delQuestionsTotal += d.count;
        }
    });

    return { delPeople, delQuestionsTotal };
}

function buildSheetStats(parts: {
    preserved: SourceItems;
    fromTelegram: SourceItems;
    fromYoutube: SourceItems;
    ytItems: YTCollectedItem[];
    deleted: DeletedLogEntry[];
    totalPrayers: number;
}): ProcessedSheetResult['stats'] {
    const { preserved, fromTelegram, fromYoutube, ytItems, deleted, totalPrayers } = parts;

    const oldPeople = countUniquePeople(preserved.questions);
    const oldQuestionsTotal = sumQuestionsInTexts(preserved.questions);

    const newLeftPeople = countUniquePeople([...fromTelegram.questions, ...fromTelegram.prayers]);
    const newLeftQuestionsTotal = sumQuestionsInTexts(fromTelegram.questions);
    const newLeftPrayersTotal = fromTelegram.prayers.length;

    const newYTPeople = countUniquePeople(ytItems);
    const newYTQuestionsTotal = sumQuestionsInTexts(fromYoutube.questions);
    const newYTPrayersTotal = fromYoutube.prayers.length;

    const { delPeople, delQuestionsTotal } = countDeletedEntries(deleted);

    return {
        oldPeople,
        oldQuestionsTotal,
        newLeftPeople,
        newLeftQuestionsTotal,
        newLeftPrayersTotal,
        newYTPeople,
        newYTQuestionsTotal,
        newYTPrayersTotal,
        delPeople,
        delQuestionsTotal,
        totalPeople: oldPeople + newLeftPeople + newYTPeople,
        totalQuestions: oldQuestionsTotal + newLeftQuestionsTotal + newYTQuestionsTotal,
        totalPrayers
    };
}

export function processSheetData(inputs: SheetProcessingInputs): ProcessedSheetResult {
    const { oldListText, answeredInput, telegramText, ytItems } = inputs;

    const answeredIds = parseAnsweredIds(answeredInput);
    const cleaningLog: CleaningLogEntry[] = [];
    const preservedData = parseAndFilterOldList(oldListText, answeredIds, cleaningLog);

    const fromTelegram = collectNewTelegramItems(telegramText, cleaningLog);
    const fromYoutube = splitYoutubeItems(ytItems);

    const questions = [...preservedData.questions, ...fromTelegram.questions, ...fromYoutube.questions];
    const prayers = [...preservedData.prayers, ...fromTelegram.prayers, ...fromYoutube.prayers];

    return {
        questions,
        prayers,
        stats: buildSheetStats({
            preserved: preservedData,
            fromTelegram,
            fromYoutube,
            ytItems,
            deleted: preservedData.deleted,
            totalPrayers: prayers.length
        }),
        deletedLog: preservedData.deleted,
        cleaningLog
    };
}
