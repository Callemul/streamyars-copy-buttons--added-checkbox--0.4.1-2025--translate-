import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

/**
 * `youtube/yt_storage_rules.ts` навмисно не тягне за собою ані DOM, ані chrome-API,
 * ані ланцюжок ініціалізації YouTube — тому імпортується без жодних моків.
 */
const {
    orEmptyRecord,
    readChangedValue,
    readYoutubeEnabled,
    resolveYoutubeToggleTransition,
    selectChangedEntries
} = await import('../youtube/yt_storage_rules.ts');

const { STORAGE_KEYS } = await import('../modules/storage/storage.ts');

/** Формат, у якому chrome.storage.onChanged віддає зміни. */
function change(newValue, oldValue) {
    return { newValue, oldValue };
}

describe('yt_storage_rules — readYoutubeEnabled', () => {
    test('1. модуль увімкнено, доки опція не виставлена явно у false', () => {
        assert.equal(readYoutubeEnabled({ youtube_enabled: true }), true);
        assert.equal(readYoutubeEnabled({}), true, 'відсутня опція = увімкнено');
        assert.equal(readYoutubeEnabled({ youtube_enabled: undefined }), true);
    });

    test('2. вимикає лише строгий false, а не будь-яке falsy-значення', () => {
        assert.equal(readYoutubeEnabled({ youtube_enabled: false }), false);
        assert.equal(readYoutubeEnabled({ youtube_enabled: 0 }), true);
        assert.equal(readYoutubeEnabled({ youtube_enabled: '' }), true);
        assert.equal(readYoutubeEnabled({ youtube_enabled: null }), true);
    });
});

describe('yt_storage_rules — resolveYoutubeToggleTransition', () => {
    test('3. вимкнено -> увімкнено дає "enable"', () => {
        assert.equal(resolveYoutubeToggleTransition(false, true), 'enable');
    });

    test('4. увімкнено -> вимкнено дає "disable"', () => {
        assert.equal(resolveYoutubeToggleTransition(true, false), 'disable');
    });

    test('5. без зміни стану — "none" (жодних побічних ефектів)', () => {
        assert.equal(resolveYoutubeToggleTransition(true, true), 'none');
        assert.equal(resolveYoutubeToggleTransition(false, false), 'none');
    });

    test('6. перекриває всі 4 комбінації прапорців', () => {
        const matrix = [[false, false], [false, true], [true, false], [true, true]]
            .map(([was, is]) => resolveYoutubeToggleTransition(was, is));

        assert.deepEqual(matrix, ['none', 'enable', 'disable', 'none']);
    });
});

describe('yt_storage_rules — selectChangedEntries', () => {
    const keys = [
        STORAGE_KEYS.OPTIONS,
        STORAGE_KEYS.YT_BUTTON_STATES,
        STORAGE_KEYS.YT_CHECKBOX_STATE
    ];

    test('7. відбирає лише присутні ключі й розгортає newValue', () => {
        const changes = {
            [STORAGE_KEYS.YT_BUTTON_STATES]: change({ a: 'question' }, {}),
            'syh:unrelated:key': change('ignored')
        };

        assert.deepEqual(selectChangedEntries(changes, keys), [
            { key: STORAGE_KEYS.YT_BUTTON_STATES, newValue: { a: 'question' } }
        ]);
    });

    test('8. зберігає порядок ключів, а не порядок об’єкта змін', () => {
        const changes = {
            [STORAGE_KEYS.YT_CHECKBOX_STATE]: change({ c: true }),
            [STORAGE_KEYS.OPTIONS]: change({ youtube_enabled: true })
        };

        assert.deepEqual(
            selectChangedEntries(changes, keys).map(e => e.key),
            [STORAGE_KEYS.OPTIONS, STORAGE_KEYS.YT_CHECKBOX_STATE]
        );
    });

    test('9. порожні зміни -> порожній список', () => {
        assert.deepEqual(selectChangedEntries({}, keys), []);
        assert.deepEqual(selectChangedEntries({ [STORAGE_KEYS.OPTIONS]: null }, keys), []);
    });

    test('10. newValue === undefined (ключ видалено) все одно потрапляє в результат', () => {
        const changes = { [STORAGE_KEYS.OPTIONS]: { oldValue: { youtube_enabled: true } } };

        assert.deepEqual(selectChangedEntries(changes, keys), [
            { key: STORAGE_KEYS.OPTIONS, newValue: undefined }
        ]);
    });
});

describe('yt_storage_rules — readChangedValue / orEmptyRecord', () => {
    test('11. readChangedValue дістає newValue лише за наявності запису', () => {
        const key = 'syh:popup:vp_ss:collected';
        assert.deepEqual(readChangedValue({ [key]: change([1, 2]) }, key), [1, 2]);
        assert.equal(readChangedValue({}, key), undefined);
        assert.equal(readChangedValue({ [key]: undefined }, key), undefined);
    });

    test('12. orEmptyRecord захищає кеш стану від null/undefined', () => {
        assert.deepEqual(orEmptyRecord(null), {});
        assert.deepEqual(orEmptyRecord(undefined), {});
    });

    test('13. orEmptyRecord повертає той самий об’єкт, коли він є', () => {
        const value = { 'ugc-1': 'prayer' };
        assert.equal(orEmptyRecord(value), value);
    });
});

describe('yt_storage_rules — композиція правил (сценарій обробника)', () => {
    /**
     * Відтворює рішення `handleOptionsChange` без побічних ефектів:
     * зміна опцій -> новий прапорець -> напрямок перемикання.
     */
    function decide(wasEnabled, optionsChange) {
        const isEnabled = readYoutubeEnabled(orEmptyRecord(optionsChange));
        return { isEnabled, transition: resolveYoutubeToggleTransition(wasEnabled, isEnabled) };
    }

    test('14. вимкнення модуля через опції веде до "disable"', () => {
        assert.deepEqual(decide(true, { youtube_enabled: false }), {
            isEnabled: false,
            transition: 'disable'
        });
    });

    test('15. очищення опцій (null) трактується як увімкнення модуля', () => {
        assert.deepEqual(decide(false, null), { isEnabled: true, transition: 'enable' });
    });

    test('16. повторне збереження тих самих опцій нічого не перемикає', () => {
        assert.deepEqual(decide(true, { youtube_enabled: true }), {
            isEnabled: true,
            transition: 'none'
        });
    });
});
