import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { SheetStateService } from '../modules/sheets/sheet_state_service.ts';

describe('SheetStateService Tests', () => {
    test('1. processSheetData correctly calculates questions, prayers, and deleted log', () => {
        const oldListText = `1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?`;
        const answeredInput = '1';
        const telegramText = `[10.07.2026 20:44] @Alex\nWhat is grace?`;
        const ytItems = [
            { id: 'yt_1', author: 'Peter', text: 'How to pray?', type: 'question', timestamp: Date.now(), videoId: 'v1' },
            { id: 'yt_2', author: 'Anna', text: 'Pray for health', type: 'prayer', timestamp: Date.now(), videoId: 'v1' }
        ];

        const result = SheetStateService.processSheetData({
            oldListText,
            answeredInput,
            telegramText,
            ytItems
        });

        assert.equal(result.questions.length, 3); // 1 old preserved (@Mary), 1 new telegram (@Alex), 1 YT question (@Peter)
        assert.equal(result.prayers.length, 1); // 1 YT prayer (@Anna)
        assert.equal(result.deletedLog.length, 1); // 1 deleted old item (ID 1)
        assert.equal(result.stats.oldPeople, 1);
        assert.equal(result.stats.delPeople, 1);
        assert.equal(result.stats.newLeftPeople, 1);
        assert.equal(result.stats.newYTPeople, 2);
        assert.equal(result.stats.totalPeople, 4);
    });

    test('2. computeSheetCounters matches processSheetData counters for new items', () => {
        const telegramText = `[10.07.2026 20:44] @Alex\nWhat is grace?\n\n[10.07.2026 20:45] @Bob\nWhat is mercy?`;
        const ytItems = [
            { id: 'yt_1', author: 'Peter', text: 'How to pray?', type: 'question', timestamp: Date.now(), videoId: 'v1' },
            { id: 'yt_2', author: 'Anna', text: 'Pray for health', type: 'prayer', timestamp: Date.now(), videoId: 'v1' }
        ];

        const processResult = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText,
            ytItems
        });

        const computeResult = SheetStateService.computeSheetCounters(telegramText, ytItems);

        assert.equal(computeResult.leftPeople, processResult.stats.newLeftPeople);
        assert.equal(computeResult.leftQuestions, processResult.stats.newLeftQuestionsTotal);
        assert.equal(computeResult.leftPrayers, processResult.stats.newLeftPrayersTotal);

        assert.equal(computeResult.rightPeople, processResult.stats.newYTPeople);
        assert.equal(computeResult.rightQuestions, processResult.stats.newYTQuestionsTotal);
        assert.equal(computeResult.rightPrayers, processResult.stats.newYTPrayersTotal);

        assert.equal(computeResult.totalPeople, computeResult.leftPeople + computeResult.rightPeople);
        assert.equal(computeResult.totalQuestions, computeResult.leftQuestions + computeResult.rightQuestions);
        assert.equal(computeResult.totalPrayers, computeResult.leftPrayers + computeResult.rightPrayers);
    });

    test('3. processSheetData with empty text inputs and populated ytItems', () => {
        const result = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText: '',
            ytItems: [
                { id: 'yt_1', author: 'Peter', text: 'How to pray?', type: 'question', timestamp: Date.now(), videoId: 'v1' },
                { id: 'yt_2', author: 'Anna', text: 'Pray for health', type: 'prayer', timestamp: Date.now(), videoId: 'v1' }
            ]
        });

        assert.equal(result.questions.length, 1);
        assert.equal(result.prayers.length, 1);
        assert.equal(result.stats.totalPeople, 2);
    });

    test('4. leftPeople and newLeftPeople include both questions and prayers from Telegram', () => {
        const telegramText = `❓❓❓ВОПРОСЫ\n1️⃣\n@Alex\nWhat is grace?\n\n🙏🙏🙏МОЛИТВЫ\n1️⃣\n@Maria\nPray for peace`;
        const processResult = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText,
            ytItems: []
        });

        const computeResult = SheetStateService.computeSheetCounters(telegramText, []);

        assert.equal(computeResult.leftPeople, 2); // 1 question author + 1 prayer author
        assert.equal(computeResult.leftQuestions, 1);
        assert.equal(computeResult.leftPrayers, 1);

        assert.equal(processResult.stats.newLeftPeople, 2);
        assert.equal(processResult.stats.newLeftQuestionsTotal, 1);
        assert.equal(processResult.stats.newLeftPrayersTotal, 1);
    });

    test('5. leftPeople deduplicates identical author names (e.g. @Alex and Alex)', () => {
        const telegramText = `❓❓❓ВОПРОСЫ\n1️⃣\n@Alex\nFirst question?\n\n2️⃣\nAlex\nSecond question?`;
        const computeResult = SheetStateService.computeSheetCounters(telegramText, []);

        assert.equal(computeResult.leftPeople, 1); // 1 unique author (@Alex and Alex)
        assert.equal(computeResult.leftQuestions, 2); // 2 questions total
    });
});