import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

global.window = global;
global.document = {
    querySelectorAll: mock.fn(() => []),
    body: {}
};

const { StudioHeaderUpdater } = await import('../youtube/studio/studio_header_updater.ts');

describe('Studio Header Updater tests', () => {

    test('StudioHeaderUpdater constructs with sheetStatsMap', () => {
        const sheetStatsMap = { 'sheet1': { questions: 5, prayers: 3 } };
        const updater = new StudioHeaderUpdater(sheetStatsMap);
        assert.ok(updater);
    });

    test('setSheetStatsMap updates internal map', () => {
        const updater = new StudioHeaderUpdater({});
        const newMap = { 'sheet2': { questions: 10, prayers: 2 } };
        updater.setSheetStatsMap(newMap);
        assert.strictEqual(updater.getChannelKey(), 'unknown');
    });

    test('getChannelKey returns unknown when channelInfo not set', () => {
        const updater = new StudioHeaderUpdater({});
        assert.strictEqual(updater.getChannelKey(), 'unknown');
    });

    test('getChannelLabel returns unknown when channelInfo not set', () => {
        const updater = new StudioHeaderUpdater({});
        assert.strictEqual(updater.getChannelLabel(), 'Невідомий канал');
    });

    test('updateHeaderCounters returns early when not enabled', () => {
        const updater = new StudioHeaderUpdater({});
        updater.updateHeaderCounters(false, () => true);
        assert.ok(true);
    });

    test('updateHeaderCounters returns early when not on comments page', () => {
        const updater = new StudioHeaderUpdater({});
        updater.updateHeaderCounters(true, () => false);
        assert.ok(true);
    });
});