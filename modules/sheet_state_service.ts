import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey, POPUP_SHEET_KEYS } from './storage';
import { countQuestionsInText, parseAndFilterOldList, parseTelegramExportLineByLine } from './telegram_parser';
import type { YTCollectedItem, DeletedLogEntry, CleaningLogEntry } from './types';

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

export interface SheetStateData {
    oldList: string;
    answered: string;
    newTelegram: string;
    finalResultHtml: string;
    statsHtml: string;
    statsVisible: boolean;
    deletedLogHtml: string;
    deletedLogCount: number;
    deletedLogDetailsVisible: boolean;
    deletedLogDetailsOpen: boolean;
    cleanedLogHtml: string;
    cleanedLogCount: number;
    cleanedLogDetailsVisible: boolean;
    cleanedLogDetailsOpen: boolean;
    dividerPos: number;
    ytCollected: YTCollectedItem[];
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

import type { TelegramQuestionItem, GroupedNewItem } from './telegram_parser';

export class SheetStateService {
    public static processSheetData(inputs: {
        oldListText: string;
        answeredInput: string;
        telegramText: string;
        ytItems: YTCollectedItem[];
    }): ProcessedSheetResult {
        const { oldListText, answeredInput, telegramText, ytItems } = inputs;
        const answeredIds = answeredInput
            .split(/[\s,]+/)
            .map(s => parseFloat(s.trim()))
            .filter(n => !isNaN(n));

        const cleaningLog: CleaningLogEntry[] = [];
        const preservedData = parseAndFilterOldList(oldListText, answeredIds, cleaningLog);

        let newQuestions: TelegramQuestionItem[];
        let newPrayers: TelegramQuestionItem[] = [];

        if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(telegramText)) {
            const parsedNew = parseAndFilterOldList(telegramText, [], cleaningLog);
            newQuestions = parsedNew.questions.map((q) => ({ ...q, source: 'new' as const }));
            newPrayers = parsedNew.prayers.map((p) => ({ ...p, source: 'pray' as const }));
        } else {
            const parsedLineItems: GroupedNewItem[] = parseTelegramExportLineByLine(telegramText, cleaningLog);
            newQuestions = parsedLineItems.map(item => ({ ...item, source: 'new' as const }));
        }

        const newYTQuestions: TelegramQuestionItem[] = [];
        const newYTPrayers: TelegramQuestionItem[] = [];

        ytItems.forEach((item: YTCollectedItem) => {
            if (item.type === 'question') {
                newYTQuestions.push({ author: item.author, text: item.text, source: 'yt' });
            } else if (item.type === 'prayer') {
                newYTPrayers.push({ author: item.author, text: item.text, source: 'pray' });
            }
        });

        const combinedQuestions = [...preservedData.questions, ...newQuestions, ...newYTQuestions];
        const combinedPrayers = [...preservedData.prayers, ...newPrayers, ...newYTPrayers];

        const oldPeople = preservedData.questions.length;
        let oldQuestionsTotal = 0;
        preservedData.questions.forEach((q) => oldQuestionsTotal += countQuestionsInText(q.text));

        const newLeftPeople = newQuestions.length;
        let newLeftQuestionsTotal = 0;
        newQuestions.forEach((q) => newLeftQuestionsTotal += countQuestionsInText(q.text));
        const newLeftPrayersTotal = newPrayers.length;

        const newYTPeople = ytItems.length;
        let newYTQuestionsTotal = 0;
        newYTQuestions.forEach((q) => newYTQuestionsTotal += countQuestionsInText(q.text));
        const newYTPrayersTotal = newYTPrayers.length;

        let delPeople = 0;
        let delQuestionsTotal = 0;
        preservedData.deleted.forEach((d: DeletedLogEntry) => {
            if (d.type === 'block') {
                delPeople++;
                delQuestionsTotal += d.count;
            } else if (d.type === 'sub') {
                delQuestionsTotal += d.count;
            }
        });

        const totalPeople = oldPeople + newLeftPeople + newYTPeople;
        const totalQuestions = oldQuestionsTotal + newLeftQuestionsTotal + newYTQuestionsTotal;
        const totalPrayers = combinedPrayers.length;

        return {
            questions: combinedQuestions,
            prayers: combinedPrayers,
            stats: {
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
                totalPeople,
                totalQuestions,
                totalPrayers
            },
            deletedLog: preservedData.deleted,
            cleaningLog
        };
    }

    public static async loadSheetState(sheetId: string): Promise<Partial<SheetStateData>> {
        const sheetKey = getSheetCollectedStorageKey(sheetId);
        const k = POPUP_SHEET_KEYS;
        const keysToLoad = [
            k.oldList(sheetId),
            k.answered(sheetId),
            k.newTelegram(sheetId),
            k.finalResultHtml(sheetId),
            k.statsHtml(sheetId),
            k.statsVisible(sheetId),
            k.deletedLogHtml(sheetId),
            k.deletedLogCount(sheetId),
            k.deletedLogDetailsVisible(sheetId),
            k.deletedLogDetailsOpen(sheetId),
            k.cleanedLogHtml(sheetId),
            k.cleanedLogCount(sheetId),
            k.cleanedLogDetailsVisible(sheetId),
            k.cleanedLogDetailsOpen(sheetId),
            k.dividerPos(sheetId),
            sheetKey
        ];

        if (sheetId === 'vp_ss') {
            keysToLoad.push(STORAGE_KEYS.YT_COLLECTED);
        }

        const res = await SYH_STORAGE.getAsync<Record<string, any>>(keysToLoad);
        let ytCollected: YTCollectedItem[] = res[sheetKey] || [];
        if (sheetId === 'vp_ss') {
            const oldItems: YTCollectedItem[] = res[STORAGE_KEYS.YT_COLLECTED] || [];
            const map = new Map<string, YTCollectedItem>();
            oldItems.forEach(item => map.set(item.id, item));
            ytCollected.forEach(item => map.set(item.id, item));
            ytCollected = Array.from(map.values());
        }

        return {
            oldList: res[k.oldList(sheetId)] || '',
            answered: res[k.answered(sheetId)] || '',
            newTelegram: res[k.newTelegram(sheetId)] || '',
            finalResultHtml: res[k.finalResultHtml(sheetId)] || '',
            statsHtml: res[k.statsHtml(sheetId)] || '',
            statsVisible: !!res[k.statsVisible(sheetId)],
            deletedLogHtml: res[k.deletedLogHtml(sheetId)] || '',
            deletedLogCount: res[k.deletedLogCount(sheetId)] || 0,
            deletedLogDetailsVisible: !!res[k.deletedLogDetailsVisible(sheetId)],
            deletedLogDetailsOpen: !!res[k.deletedLogDetailsOpen(sheetId)],
            cleanedLogHtml: res[k.cleanedLogHtml(sheetId)] || '',
            cleanedLogCount: res[k.cleanedLogCount(sheetId)] || 0,
            cleanedLogDetailsVisible: !!res[k.cleanedLogDetailsVisible(sheetId)],
            cleanedLogDetailsOpen: !!res[k.cleanedLogDetailsOpen(sheetId)],
            dividerPos: res[k.dividerPos(sheetId)] || 50,
            ytCollected
        };
    }

    public static async saveSheetState(sheetId: string, updates: Record<string, any>): Promise<void> {
        const storageObj: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
            const keyFn = (POPUP_SHEET_KEYS as Record<string, (id: string) => string>)[key];
            if (keyFn) {
                storageObj[keyFn(sheetId)] = value;
            } else {
                storageObj[`syh:popup:sheet:${sheetId}:${key}`] = value;
            }
        }
        await SYH_STORAGE.setAsync(storageObj);
    }

    public static async clearSheetState(sheetId: string): Promise<void> {
        const k = POPUP_SHEET_KEYS;
        const keysToRemove = [
            k.oldList(sheetId),
            k.answered(sheetId),
            k.newTelegram(sheetId),
            k.finalResultHtml(sheetId),
            k.statsHtml(sheetId),
            k.statsVisible(sheetId),
            k.deletedLogHtml(sheetId),
            k.deletedLogCount(sheetId),
            k.deletedLogDetailsVisible(sheetId),
            k.deletedLogDetailsOpen(sheetId),
            k.cleanedLogHtml(sheetId),
            k.cleanedLogCount(sheetId),
            k.cleanedLogDetailsVisible(sheetId),
            k.cleanedLogDetailsOpen(sheetId)
        ];
        await SYH_STORAGE.removeAsync(keysToRemove);
    }

    public static computeSheetCounters(telegramText: string, ytItems: YTCollectedItem[]): SheetCounterStats {
        let leftPeople = 0;
        let leftQuestions = 0;
        let leftPrayers = 0;

        if (telegramText && telegramText.trim()) {
            if (/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu.test(telegramText)) {
                const parsed = parseAndFilterOldList(telegramText, []);
                leftPeople = parsed.questions.length;
                parsed.questions.forEach((q) => leftQuestions += countQuestionsInText(q.text));
                leftPrayers = parsed.prayers.length;
            } else {
                const items = parseTelegramExportLineByLine(telegramText);
                leftPeople = items.length;
                items.forEach((q) => leftQuestions += countQuestionsInText(q.text));
            }
        }

        const rightPeople = ytItems.length;
        let rightQuestions = 0;
        let rightPrayers = 0;

        ytItems.forEach(item => {
            if (item.type === 'question') {
                rightQuestions += countQuestionsInText(item.text);
            } else if (item.type === 'prayer') {
                rightPrayers += 1;
            }
        });

        return {
            leftPeople,
            leftQuestions,
            leftPrayers,
            rightPeople,
            rightQuestions,
            rightPrayers,
            totalPeople: leftPeople + rightPeople,
            totalQuestions: leftQuestions + rightQuestions,
            totalPrayers: leftPrayers + rightPrayers
        };
    }
}
