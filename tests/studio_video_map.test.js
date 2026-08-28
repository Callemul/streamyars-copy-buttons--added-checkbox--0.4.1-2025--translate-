import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

let mockStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { res[k] = mockStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(mockStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { delete mockStore[k]; });
            if (cb) cb();
        }
    }
});

const {
    setStudioVideoSheetOverride,
    getStudioVideoSheetMap,
    generateVideoKey,
    VIDEO_MAP_STORAGE_KEY,
    MANUAL_OVERRIDE_LOG_KEY
} = await import('../youtube/studio/studio_video_map.ts');

describe('studio_video_map — atomic overrides and map', () => {
    beforeEach(() => {
        mockStore = {};
    });

    test('1. generateVideoKey normalizes URL or falls back to title', () => {
        assert.equal(generateVideoKey('/comments/test?v=1', 'Title'), '/comments/test?v=1');
        assert.equal(generateVideoKey(null, '  Title  '), 'Title');
        assert.equal(generateVideoKey('', '  Title  '), 'Title');
    });

    test('2. setStudioVideoSheetOverride sets override and log entry', async () => {
        const res = await setStudioVideoSheetOverride(
            'v1',
            'oparin',
            'vp',
            'Время перемен',
            'Video 1',
            'vp_ss'
        );

        assert.equal(res['v1']?.sheetId, 'oparin');
        assert.equal(res['v1']?.source, 'manual');

        const map = await getStudioVideoSheetMap();
        assert.equal(map['v1']?.sheetId, 'oparin');

        const log = mockStore[MANUAL_OVERRIDE_LOG_KEY];
        assert.ok(Array.isArray(log));
        assert.equal(log.length, 1);
        assert.equal(log[0].assignedSheet, 'oparin');
    });

    test('3. setStudioVideoSheetOverride with sheetId=null resets override', async () => {
        await setStudioVideoSheetOverride('v1', 'oparin', 'vp', 'VP', 'Video 1', null);
        const res = await setStudioVideoSheetOverride('v1', null, 'vp', 'VP', 'Video 1', null);

        assert.equal(res['v1'], undefined);
        const map = await getStudioVideoSheetMap();
        assert.equal(map['v1'], undefined);
    });

    test('4. parallel overrides do not lose entries (atomic serialization)', async () => {
        await Promise.all([
            setStudioVideoSheetOverride('v1', 'oparin', 'vp', 'VP', 'Video 1', null),
            setStudioVideoSheetOverride('v2', 'vp_ss', 'vp', 'VP', 'Video 2', null),
            setStudioVideoSheetOverride('v3', 'tomenko', 'vp', 'VP', 'Video 3', null)
        ]);

        const map = await getStudioVideoSheetMap();
        assert.equal(map['v1']?.sheetId, 'oparin');
        assert.equal(map['v2']?.sheetId, 'vp_ss');
        assert.equal(map['v3']?.sheetId, 'tomenko');

        const log = mockStore[MANUAL_OVERRIDE_LOG_KEY];
        assert.equal(log.length, 3);
    });
});
