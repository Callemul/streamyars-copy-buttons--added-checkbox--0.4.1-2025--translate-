import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { SheetStateService } from '../modules/sheet_state_service.ts';

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
});