// Характеристичні тести чистої логіки ключів/міграцій, винесеної з `storage.ts`
// у `storage_keys.ts`. Ізольовані від адаптера `SYH_STORAGE`, тому фіксують
// поведінку 1-в-1 після декомпозиції.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
    migrateKey,
    migrateItemKeys,
    migrateKeys,
    prepareQueryKeys,
    processGetResult,
    getSheetStorageKey,
    getSheetCollectedStorageKey,
    POPUP_SHEET_KEYS,
    STORAGE_KEYS
} from '../modules/storage/storage_keys.ts';

describe('storage_keys — migrateKey (точні відповідності)', () => {
    test('перетворює відомі legacy-ключі у схему syh:*', () => {
        assert.equal(migrateKey('syh_options'), STORAGE_KEYS.OPTIONS);
        assert.equal(migrateKey('syh_prayers'), STORAGE_KEYS.PRAYERS);
        assert.equal(migrateKey('syh_yt_collected'), STORAGE_KEYS.YT_COLLECTED);
        assert.equal(migrateKey('db'), STORAGE_KEYS.DB);
        assert.equal(migrateKey('syh_banner_categories'), STORAGE_KEYS.CATEGORIES);
        assert.equal(migrateKey('studio_comment_state'), 'syh:studio:state');
    });

    test('порожній/syh:-ключ повертається без змін', () => {
        assert.equal(migrateKey(''), '');
        assert.equal(migrateKey('syh:core:options'), 'syh:core:options');
        assert.equal(migrateKey('syh:popup:prayers'), 'syh:popup:prayers');
    });

    test('невідомий ключ повертається без змін', () => {
        assert.equal(migrateKey('some_random_key'), 'some_random_key');
    });
});

describe('storage_keys — migrateKey (префіксні міграції)', () => {
    test('syh_telegram_data__ перетворюється у префікс telegram:data', () => {
        assert.equal(
            migrateKey('syh_telegram_data__abc'),
            `${STORAGE_KEYS.TELEGRAM_DATA_PREFIX}abc`
        );
    });

    test('syh_collected__<id> -> syh:popup:collected:<id>', () => {
        assert.equal(migrateKey('syh_collected__vp_ss'), getSheetCollectedStorageKey('vp_ss'));
    });

    test('tg_<name>__<id> -> syh:popup:sheet:<id>:<name>', () => {
        assert.equal(migrateKey('tg_oldList__vp_ss'), POPUP_SHEET_KEYS.oldList('vp_ss'));
    });

    test('tg_<plain> -> syh:popup:legacy:<plain>', () => {
        assert.equal(migrateKey('tg_active_tab'), STORAGE_KEYS.POPUP_ACTIVE_TAB);
    });
});

describe('storage_keys — migrateItemKeys / migrateKeys', () => {
    test('migrateItemKeys мігрує кожен ключ об’єкта', () => {
        const out = migrateItemKeys({ syh_options: { a: 1 }, db: { b: 2 }, keep: 3 });
        assert.deepEqual(out, {
            [STORAGE_KEYS.OPTIONS]: { a: 1 },
            [STORAGE_KEYS.DB]: { b: 2 },
            keep: 3
        });
    });

    test('migrateKeys працює з рядком і масивом', () => {
        assert.equal(migrateKeys('syh_options'), STORAGE_KEYS.OPTIONS);
        assert.deepEqual(migrateKeys(['syh_options', 'db']), [STORAGE_KEYS.OPTIONS, STORAGE_KEYS.DB]);
    });
});

describe('storage_keys — prepareQueryKeys', () => {
    test('додає мігрований ключ до queryKeys поруч з оригіналом', () => {
        const { origKeys, queryKeys } = prepareQueryKeys('syh_options');
        assert.deepEqual(origKeys, ['syh_options']);
        assert.deepEqual(queryKeys.sort(), ['syh_options', STORAGE_KEYS.OPTIONS].sort());
    });

    test('масив ключів дедуплікується у Set', () => {
        const { queryKeys } = prepareQueryKeys(['syh_options', 'syh_options']);
        assert.equal(queryKeys.length, 2);
    });

    test('порожній ключ лишається в origKeys, але відкидається з queryKeys', () => {
        const { origKeys, queryKeys } = prepareQueryKeys(['', 'db']);
        assert.deepEqual(origKeys, ['', 'db']);
        assert.deepEqual(queryKeys.sort(), ['db', STORAGE_KEYS.DB].sort());
    });
});

describe('storage_keys — processGetResult', () => {
    test('підставляє значення під оригінальний ключ з мігрованого', () => {
        const raw = { [STORAGE_KEYS.OPTIONS]: { a: 1 } };
        const out = processGetResult(['syh_options'], raw);
        assert.deepEqual(out['syh_options'], { a: 1 });
        assert.deepEqual(out[STORAGE_KEYS.OPTIONS], { a: 1 });
    });

    test('порожній rawResult -> порожній об’єкт без падінь', () => {
        assert.deepEqual(processGetResult(['syh_options'], {}), {});
        assert.deepEqual(processGetResult(['syh_options'], null), {});
    });
});

describe('storage_keys — sheet helpers', () => {
    test('getSheetStorageKey будує ключ із суфіксом', () => {
        assert.equal(getSheetStorageKey('vp_ss', 'oldList'), 'syh:popup:sheet:vp_ss:oldList');
    });

    test('getSheetCollectedStorageKey будує ключ collected', () => {
        assert.equal(getSheetCollectedStorageKey('vp_ss'), 'syh:popup:collected:vp_ss');
    });

    test('POPUP_SHEET_KEYS утворює ті самі ключі, що й хелпери', () => {
        assert.equal(POPUP_SHEET_KEYS.oldList('vp_ss'), getSheetStorageKey('vp_ss', 'oldList'));
        assert.equal(POPUP_SHEET_KEYS.dividerPos('vp_ss'), 'syh:popup:divider_pos:vp_ss');
    });
});
