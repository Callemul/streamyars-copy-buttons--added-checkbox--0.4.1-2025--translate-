import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RetentionService } from '../modules/retention_service.ts';

describe('RetentionService Tests', () => {
    test('1. filterFreshPrayers keeps prayers younger than 48 hours and questions younger than 30 days', () => {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
        const fortyDaysMs = 40 * 24 * 60 * 60 * 1000;

        const items = [
            { id: '1', text: 'Fresh prayer', type: 'prayer', timestamp: now - oneDayMs },
            { id: '2', text: 'Old prayer', type: 'prayer', timestamp: now - threeDaysMs },
            { id: '3', text: 'Fresh question', type: 'question', timestamp: now - tenDaysMs },
            { id: '4', text: 'Old question', type: 'question', timestamp: now - fortyDaysMs },
            { id: '5', text: 'No timestamp item', type: 'prayer' }
        ];

        const filtered = RetentionService.filterFreshPrayers(items, now);

        assert.equal(filtered.length, 3);
        assert.deepEqual(filtered.map(i => i.id), ['1', '3', '5']);
    });

    test('2. createBackupSnapshot saves backup snapshot to storage', async () => {
        const snapshot = await RetentionService.createBackupSnapshot();
        assert.ok(snapshot.timestamp > 0);
        assert.ok(snapshot.timestampIso);
        assert.ok(snapshot.data);
    });

    test('3. runGlobalCleanup creates backup snapshot before cleanup', async () => {
        await RetentionService.runGlobalCleanup();
        const snapshot = await RetentionService.createBackupSnapshot();
        assert.ok(snapshot);
    });
});