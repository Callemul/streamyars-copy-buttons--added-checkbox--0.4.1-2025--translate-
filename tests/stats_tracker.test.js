import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

let mockStorageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { res[k] = mockStorageStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(mockStorageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { delete mockStorageStore[k]; });
            if (cb) cb();
        }
    }
});

const { SYH_STATS_TRACKER } = await import('../modules/stats/stats_tracker.ts');

describe('SYH_STATS_TRACKER Unit Tests', () => {
    beforeEach(() => {
        mockStorageStore = {};
        SYH_STATS_TRACKER.currentBrand = "DefaultShow";
        SYH_STATS_TRACKER.lastKnownBrand = "";
        SYH_STATS_TRACKER.destroy();
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
    });

    test('1. searchBrandNameInObject extracts active brand name from nested objects', () => {
        const obj1 = { activeBrand: { name: 'Время перемен' } };
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject(obj1), 'Время перемен');

        const obj2 = { brand: { name: 'Слово живое' } };
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject(obj2), 'Слово живое');

        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject(null), null);
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject({}), null);
    });

    test('2. getBrandFromLocalStorage reads brand name from mock localStorage', () => {
        const localStorageMap = {
            'streamyard_brand': '{"name":"Канал 1"}'
        };
        Object.defineProperty(global, 'localStorage', {
            value: {
                getItem: (key) => localStorageMap[key] || null
            },
            writable: true,
            configurable: true
        });

        const brand = SYH_STATS_TRACKER.getBrandFromLocalStorage();
        assert.equal(brand, 'Канал 1');
    });

    test('3. restoreButtonStates restores question and prayer phase button texts from storage', (t, done) => {
        const today = new Date().toLocaleDateString('sv-SE');
        mockStorageStore['syh:stats:charts'] = {
            'DefaultShow': {
                [today]: {
                    data: [],
                    phase_questions_start: '00:15',
                    phase_prayers_start: '01:00'
                }
            }
        };

        const btnQ = { innerText: '', style: {} };
        const btnP = { innerText: '', style: {} };

        SYH_STATS_TRACKER.restoreButtonStates(btnQ, btnP);

        setTimeout(() => {
            assert.equal(btnQ.innerText, '✅ Питання');
            assert.equal(btnP.innerText, '✅ Молитви');
            done();
        }, 50);
    });

    test('4. markPhase updates phase timestamps in storage', (t, done) => {
        const today = new Date().toLocaleDateString('sv-SE');
        global.document = {
            querySelector: (sel) => {
                if (sel.includes('Timer')) return { innerText: '00:25\n' };
                return null;
            }
        };

        const btnQ = { innerText: '', style: {} };
        SYH_STATS_TRACKER.markPhase('questions', btnQ);

        setTimeout(() => {
            const db = mockStorageStore['syh:stats:charts'];
            assert.ok(db);
            assert.ok(db['DefaultShow'][today]);
            assert.equal(db['DefaultShow'][today].phase_questions_start, '00:25');
            assert.equal(btnQ.innerText, '✅ Питання');
            done();
        }, 50);
    });

    test('5. startTracking and destroy control tracking interval', () => {
        SYH_STATS_TRACKER.startTracking();
        assert.ok(SYH_STATS_TRACKER.intervalId !== null);

        SYH_STATS_TRACKER.destroy();
        assert.equal(SYH_STATS_TRACKER.intervalId, null);
    });

    test('6. registerPrayerMarker logs marker without error', () => {
        SYH_STATS_TRACKER.registerPrayerMarker();
        assert.ok(true);
    });
});