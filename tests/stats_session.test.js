// Характеристичні тести чистих хелперів статистики, винесених з `stats_tracker.ts`
// у `stats_session.ts`. Ізольовані від DOM/таймерів/EventBus.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { getOrCreateTodaySession, searchBrandNameInObject } from '../modules/stats_session.ts';

describe('stats_session — getOrCreateTodaySession', () => {
    test('створює вкладену сесію за брендом і датою (in-place)', () => {
        const db = {};
        const session = getOrCreateTodaySession(db, 'BrandA', '2026-08-09');

        assert.deepEqual(session, { data: [] });
        assert.equal(db['BrandA']['2026-08-09'], session);
    });

    test('повертає ту саму сесію при повторному виклику (не перезаписує дані)', () => {
        const db = {};
        const s1 = getOrCreateTodaySession(db, 'BrandA', '2026-08-09');
        s1.data.push({ time: '0:00', viewers: 5 });

        const s2 = getOrCreateTodaySession(db, 'BrandA', '2026-08-09');
        assert.equal(s2, s1, 'той самий об’єкт посилання');
        assert.equal(s2.data.length, 1);
    });

    test('різні дати -> різні сесії під одним брендом', () => {
        const db = {};
        getOrCreateTodaySession(db, 'BrandA', '2026-08-09').data.push({ time: '1', viewers: 1 });
        const other = getOrCreateTodaySession(db, 'BrandA', '2026-08-10');

        assert.equal(other.data.length, 0);
        assert.equal(db['BrandA']['2026-08-09'].data.length, 1);
    });

    test('не затирає існуючі бренди/дати', () => {
        const db = { BrandB: { '2026-08-08': { data: [1] } } };
        getOrCreateTodaySession(db, 'BrandA', '2026-08-09');

        assert.deepEqual(db['BrandB']['2026-08-08'].data, [1]);
        assert.ok(db['BrandA']['2026-08-09']);
    });
});

describe('stats_session — searchBrandNameInObject', () => {
    test('дістає назву з activeBrand.name', () => {
        assert.equal(searchBrandNameInObject({ activeBrand: { name: 'Время перемен' } }), 'Время перемен');
    });

    test('дістає назву з brand.name (фолбек)', () => {
        assert.equal(searchBrandNameInObject({ brand: { name: 'Слово живое' } }), 'Слово живое');
    });

    test('пріоритет activeBrand.name над brand.name', () => {
        assert.equal(
            searchBrandNameInObject({ activeBrand: { name: 'A' }, brand: { name: 'B' } }),
            'A'
        );
    });

    test('необ’єктні значення -> null', () => {
        assert.equal(searchBrandNameInObject(null), null);
        assert.equal(searchBrandNameInObject(undefined), null);
        assert.equal(searchBrandNameInObject('string'), null);
        assert.equal(searchBrandNameInObject({}), null);
    });
});
