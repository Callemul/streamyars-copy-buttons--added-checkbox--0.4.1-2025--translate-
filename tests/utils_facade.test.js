// tests/utils_facade.test.js
//
// Характерні тести публічного API `SYH_UTILS` (`modules/utils.ts`).
//
// Мета — зафіксувати поведінку фасада 1-в-1 ПЕРЕД декомпозицією модуля
// (310 рядків, cyclomatic 84 / cognitive 51, fan_in 22 за звітом Fallow).
// Ці тести навмисно б'ють лише по експортованому контракту (`SYH_UTILS`),
// а не по внутрішніх файлах, тому вони мають лишатися зеленими і до, і після
// розбиття `utils.ts` на менші модулі.
//
// Окремо перевіряється пізнє зв'язування через `this` (`smartSearch`,
// `transliterate`, `switchKeyboardLayout` викликають `this.normalizeText`),
// бо саме цей контракт найлегше зламати під час винесення чистих функцій.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_UTILS } = await import('../modules/core/utils.ts');
const { STORAGE_KEYS } = await import('../modules/storage.ts');

/** Робить елемент «видимим» для перевірок offsetWidth/offsetHeight у happy-dom. */
function makeVisible(el) {
    Object.defineProperty(el, 'offsetWidth', { value: 10, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: 10, configurable: true });
    return el;
}

function resetDom() {
    document.body.innerHTML = '';
}

/**
 * happy-dom не реалізує XPath (`document.evaluate` та `XPathResult` = undefined),
 * а `clickElementByText` побудований саме на ньому. Ставимо мінімальний стаб, який
 * розуміє єдиний вираз, що його будує модуль: `//*[contains(text(), '<TEXT>')]`.
 *
 * Як і справжній браузер, стаб:
 *   - зіставляє лише ПРЯМІ текстові вузли елемента (семантика `text()`);
 *   - кидає SyntaxError на некоректному виразі (напр. коли текст містить апостроф).
 */
function installXPathStub() {
    globalThis.XPathResult = { FIRST_ORDERED_NODE_TYPE: 9 };
    document.evaluate = (expression) => {
        const match = /^\/\/\*\[contains\(text\(\), '([^']*)'\)\]$/.exec(expression);
        if (!match) throw new SyntaxError(`Invalid XPath expression: ${expression}`);
        const needle = match[1];
        const found = Array.from(document.querySelectorAll('*')).find((el) =>
            Array.from(el.childNodes).some(
                (node) => node.nodeType === 3 && (node.nodeValue || '').includes(needle)
            )
        );
        return { singleNodeValue: found || null };
    };
}

function removeXPathStub() {
    delete globalThis.XPathResult;
    delete document.evaluate;
}

describe('SYH_UTILS — конфігурація та середовище', () => {
    afterEach(() => {
        SYH_UTILS.SELECTORS = null;
        delete SYH_UTILS._storage;
    });

    test('1. init() зберігає SELECTORS з конфіга', () => {
        SYH_UTILS.init({ SELECTORS: { bannerText: '.banner' } });
        assert.deepEqual(SYH_UTILS.SELECTORS, { bannerText: '.banner' });
    });

    test('2. init(null) скидає SELECTORS у null (без кидання винятку)', () => {
        SYH_UTILS.init({ SELECTORS: { a: 'b' } });
        SYH_UTILS.init(null);
        assert.equal(SYH_UTILS.SELECTORS, null);
    });

    test('3. геттер storage віддає SYH_STORAGE, доки не задано _storage', () => {
        const fallback = SYH_UTILS.storage;
        assert.ok(fallback, 'storage не має бути порожнім');
        assert.equal(typeof fallback.get, 'function');

        const custom = { get() {}, set() {} };
        SYH_UTILS._storage = custom;
        assert.equal(SYH_UTILS.storage, custom, '_storage має мати пріоритет');
    });

    test('4. isExtensionValid() true, коли є chrome.runtime.id', () => {
        assert.equal(SYH_UTILS.isExtensionValid(), true);
    });

    test('5. isExtensionValid() false, коли runtime.id відсутній', () => {
        const saved = globalThis.chrome;
        globalThis.chrome = { runtime: {} };
        assert.equal(SYH_UTILS.isExtensionValid(), false);

        globalThis.chrome = {};
        assert.equal(SYH_UTILS.isExtensionValid(), false);

        globalThis.chrome = saved;
    });

    test('6. getTodayDateString() повертає локальну дату у форматі YYYY-MM-DD', () => {
        const value = SYH_UTILS.getTodayDateString();
        assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(value, new Date().toLocaleDateString('sv-SE'));
    });
});

describe('SYH_UTILS — текстові перетворення', () => {
    test('7. normalizeText() лоуеркейсить, трімить і не чіпає символи поза таблицею', () => {
        // 'r' та 'm' відсутні у таблиці гомогліфів, тому лишаються латинськими.
        assert.equal(SYH_UTILS.normalizeText('  ARTEM  '), '\u0430r\u0442\u0435m');
        assert.equal(SYH_UTILS.normalizeText(''), '');
        assert.equal(SYH_UTILS.normalizeText(null), '');
        assert.equal(SYH_UTILS.normalizeText(undefined), '');
    });

    test('8. normalizeText() мапить кожен символ таблиці гомогліфів', () => {
        // a e o i c p x y t h  ->  а е о і с р х у т н
        assert.equal(SYH_UTILS.normalizeText('aeoicpxyth'), 'аеоісрхутн');
    });

    test('9. transliterate() обробляє 4-, 2- та 1-символьні послідовності', () => {
        assert.equal(SYH_UTILS.transliterate('shcha'), 'шча');
        assert.equal(SYH_UTILS.transliterate('ch'), 'ч');
        assert.equal(SYH_UTILS.transliterate('zh'), 'ж');
        assert.equal(SYH_UTILS.transliterate(''), '');
        assert.equal(SYH_UTILS.transliterate(null), '');
    });

    test('10. transliterate() лишає невідомі символи як є', () => {
        assert.equal(SYH_UTILS.transliterate('@!'), '@!');
    });

    test('11. toFuzzy() згортає диграфи та прибирає м’який/твердий знак і апостроф', () => {
        assert.equal(SYH_UTILS.toFuzzy('shch'), 'щ');
        assert.equal(SYH_UTILS.toFuzzy('ye'), 'е');
        assert.equal(SYH_UTILS.toFuzzy('день'), 'ден');
        assert.equal(SYH_UTILS.toFuzzy("об'єкт"), 'обект');
        assert.equal(SYH_UTILS.toFuzzy(''), '');
        assert.equal(SYH_UTILS.toFuzzy(null), '');
    });

    test('12. toFuzzy() уніфікує и/й/і/ї/ы та е/є/ё/э', () => {
        assert.equal(SYH_UTILS.toFuzzy('йіїы'), 'ииии');
        assert.equal(SYH_UTILS.toFuzzy('єёэ'), 'еее');
    });

    test('13. switchKeyboardLayout() перекладає QWERTY у ЙЦУКЕН', () => {
        assert.equal(SYH_UTILS.switchKeyboardLayout('gjl'), 'под');
        assert.equal(SYH_UTILS.switchKeyboardLayout('vjk'), 'мол');
        assert.equal(SYH_UTILS.switchKeyboardLayout(''), '');
        assert.equal(SYH_UTILS.switchKeyboardLayout(null), '');
    });

    test('14. switchKeyboardLayout() лишає символи поза розкладкою без змін', () => {
        assert.equal(SYH_UTILS.switchKeyboardLayout('1'), '1');
    });
});

describe('SYH_UTILS — пізнє зв’язування через this', () => {
    test('15. transliterate() пропускає результат через this.normalizeText', () => {
        const own = Object.getOwnPropertyDescriptor(SYH_UTILS, 'normalizeText');
        const calls = [];
        SYH_UTILS.normalizeText = function (value) {
            calls.push(value);
            return `<${value}>`;
        };

        assert.equal(SYH_UTILS.transliterate('ch'), '<ч>');
        assert.deepEqual(calls, ['ч']);

        Object.defineProperty(SYH_UTILS, 'normalizeText', own);
    });

    test('16. transliterate("") повертає "" НЕ викликаючи this.normalizeText', () => {
        const own = Object.getOwnPropertyDescriptor(SYH_UTILS, 'normalizeText');
        let called = 0;
        SYH_UTILS.normalizeText = function (value) {
            called += 1;
            return value;
        };

        assert.equal(SYH_UTILS.transliterate(''), '');
        assert.equal(SYH_UTILS.transliterate(null), '');
        assert.equal(called, 0, 'ранній вихід не має чіпати normalizeText');

        Object.defineProperty(SYH_UTILS, 'normalizeText', own);
    });

    test('17. switchKeyboardLayout() пропускає результат через this.normalizeText', () => {
        const own = Object.getOwnPropertyDescriptor(SYH_UTILS, 'normalizeText');
        const calls = [];
        SYH_UTILS.normalizeText = function (value) {
            calls.push(value);
            return value;
        };

        SYH_UTILS.switchKeyboardLayout('gjl');
        assert.deepEqual(calls, ['под']);

        Object.defineProperty(SYH_UTILS, 'normalizeText', own);
    });

    test('18. smartSearch() делегує всі чотири перетворення через this', () => {
        const seen = { normalizeText: 0, transliterate: 0, switchKeyboardLayout: 0, toFuzzy: 0 };
        const owns = {};
        for (const key of Object.keys(seen)) {
            owns[key] = Object.getOwnPropertyDescriptor(SYH_UTILS, key);
        }

        const original = {
            normalizeText: SYH_UTILS.normalizeText,
            transliterate: SYH_UTILS.transliterate,
            switchKeyboardLayout: SYH_UTILS.switchKeyboardLayout,
            toFuzzy: SYH_UTILS.toFuzzy
        };

        for (const key of Object.keys(seen)) {
            SYH_UTILS[key] = function (value) {
                seen[key] += 1;
                return original[key].call(this, value);
            };
        }

        assert.equal(SYH_UTILS.smartSearch('артем', 'Артем Молчанов'), true);

        for (const key of Object.keys(seen)) {
            assert.ok(seen[key] > 0, `${key} має викликатись через this`);
            Object.defineProperty(SYH_UTILS, key, owns[key]);
        }
    });
});

describe('SYH_UTILS — smartSearch контракт', () => {
    test('19. порожній запит завжди true, порожня ціль — false', () => {
        assert.equal(SYH_UTILS.smartSearch('', 'будь-що'), true);
        assert.equal(SYH_UTILS.smartSearch(null, 'будь-що'), true);
        assert.equal(SYH_UTILS.smartSearch(undefined, 'будь-що'), true);
        assert.equal(SYH_UTILS.smartSearch('щось', ''), false);
        assert.equal(SYH_UTILS.smartSearch('щось', null), false);
    });

    test('20. усі слова запиту мають знайтись (AND-семантика)', () => {
        assert.equal(SYH_UTILS.smartSearch('артем молчанов', 'Артем Молчанов'), true);
        assert.equal(SYH_UTILS.smartSearch('артем опарин', 'Артем Молчанов'), false);
    });

    test('21. зайві пробіли в запиті не ламають пошук', () => {
        assert.equal(SYH_UTILS.smartSearch('  артем   молчанов  ', 'Артем Молчанов'), true);
    });
});

describe('SYH_UTILS — cleanTelegramHeaders', () => {
    test('22. прибирає заголовок на початку тексту без переносу', () => {
        const input = '[01.02.2026 10:30] Іван Петров: Привіт усім';
        assert.equal(SYH_UTILS.cleanTelegramHeaders(input), 'Привіт усім');
    });

    test('23. заголовок усередині тексту замінюється на перенос рядка', () => {
        const input = 'Перший рядок\n[01.02.2026 10:30] Іван: Другий рядок';
        assert.equal(SYH_UTILS.cleanTelegramHeaders(input), 'Перший рядок\nДругий рядок');
    });

    test('24. порожній вхід повертає порожній рядок', () => {
        assert.equal(SYH_UTILS.cleanTelegramHeaders(''), '');
        assert.equal(SYH_UTILS.cleanTelegramHeaders(null), '');
        assert.equal(SYH_UTILS.cleanTelegramHeaders(undefined), '');
    });

    test('25. cleaningLog отримує запис лише коли щось видалено', () => {
        const log = [];
        SYH_UTILS.cleanTelegramHeaders('[01.02.2026 10:30] Іван: Текст', log);
        assert.equal(log.length, 1);
        assert.equal(log[0].after, 'Текст');
        assert.ok(log[0].removed.includes('01.02.2026'));

        const emptyLog = [];
        SYH_UTILS.cleanTelegramHeaders('Звичайний текст', emptyLog);
        assert.equal(emptyLog.length, 0, 'без видалень лог не поповнюється');
    });

    test('26. кілька заголовків потрапляють у removed через роздільник " | "', () => {
        const log = [];
        const input = '[01.02.2026 10:30] A: раз\n[02.02.2026 11:00] B: два';
        SYH_UTILS.cleanTelegramHeaders(input, log);
        assert.equal(log.length, 1);
        assert.ok(log[0].removed.includes(' | '));
    });
});

describe('SYH_UTILS — saveBannerCategory', () => {
    afterEach(() => {
        delete SYH_UTILS._storage;
    });

    test('27. записує категорію у STORAGE_KEYS.CATEGORIES через адаптер', async () => {
        let db = { 'Старий банер': 'audience' };
        SYH_UTILS._storage = {
            get(keys, cb) { cb({ [STORAGE_KEYS.CATEGORIES]: db }); },
            set(obj, cb) { db = obj[STORAGE_KEYS.CATEGORIES]; if (cb) cb(); }
        };

        await SYH_UTILS.saveBannerCategory('Новий банер', 'stream');

        assert.equal(db['Новий банер'], 'stream');
        assert.equal(db['Старий банер'], 'audience', 'наявні записи мають зберегтись');
    });

    test('28. створює нову базу, коли сховище порожнє', async () => {
        let db = null;
        SYH_UTILS._storage = {
            get(keys, cb) { cb({}); },
            set(obj, cb) { db = obj[STORAGE_KEYS.CATEGORIES]; if (cb) cb(); }
        };

        await SYH_UTILS.saveBannerCategory('Банер', 'prayer');
        assert.deepEqual(db, { 'Банер': 'prayer' });
    });
});

describe('SYH_UTILS — copyAndShowBanner', () => {
    let written;

    beforeEach(() => {
        resetDom();
        written = [];
        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: { writeText: (t) => { written.push(t); return Promise.resolve(); } },
            configurable: true,
            writable: true
        });
    });

    afterEach(resetDom);

    test('29. порожній текст не звертається до буфера обміну', () => {
        SYH_UTILS.copyAndShowBanner('');
        assert.equal(written.length, 0);
    });

    test('30. копіює текст і показує банер із дефолтним написом', async () => {
        SYH_UTILS.copyAndShowBanner('текст');
        await Promise.resolve();
        await Promise.resolve();

        assert.deepEqual(written, ['текст']);
        const banner = document.querySelector('.copy-success-banner');
        assert.ok(banner, 'банер має з’явитись у DOM');
        assert.equal(banner.textContent, 'Скопійовано!');
    });

    test('31. кастомний напис банера та прибирання попереднього банера', async () => {
        const stale = document.createElement('div');
        stale.className = 'copy-success-banner';
        stale.textContent = 'старий';
        document.body.appendChild(stale);

        SYH_UTILS.copyAndShowBanner('текст', 'Готово!');
        await Promise.resolve();
        await Promise.resolve();

        const banners = document.querySelectorAll('.copy-success-banner');
        assert.equal(banners.length, 1, 'старий банер має бути видалений');
        assert.equal(banners[0].textContent, 'Готово!');
    });
});

describe('SYH_UTILS — очікування елементів у DOM', () => {
    beforeEach(resetDom);
    afterEach(resetDom);

    test('32. waitForElement() резолвиться видимим елементом', async () => {
        const el = makeVisible(document.createElement('div'));
        el.id = 'target';
        document.body.appendChild(el);

        const found = await SYH_UTILS.waitForElement('#target', 1000);
        assert.equal(found, el);
    });

    test('33. waitForElement() приймає масив селекторів (фолбеки)', async () => {
        const el = makeVisible(document.createElement('div'));
        el.className = 'second';
        document.body.appendChild(el);

        const found = await SYH_UTILS.waitForElement(['.missing', '.second'], 1000);
        assert.equal(found, el);
    });

    test('34. waitForElement() відхиляється по таймауту з описовою помилкою', async () => {
        await assert.rejects(
            () => SYH_UTILS.waitForElement('#nope', 200),
            (err) => err instanceof Error && err.message.includes('#nope')
        );
    });

    test('35. waitForElement() ігнорує елемент нульового розміру', async () => {
        const el = document.createElement('div');
        el.id = 'hidden';
        document.body.appendChild(el);

        await assert.rejects(() => SYH_UTILS.waitForElement('#hidden', 200));
    });

    test('36. waitForElementToDisappear() резолвиться, коли елемента вже немає', async () => {
        await SYH_UTILS.waitForElementToDisappear('#ghost', 1000);
        assert.ok(true);
    });

    test('37. waitForElementToDisappear() відхиляється, поки елемент лишається', async () => {
        const el = document.createElement('div');
        el.id = 'stay';
        document.body.appendChild(el);

        await assert.rejects(
            () => SYH_UTILS.waitForElementToDisappear('#stay', 200),
            (err) => err instanceof Error && err.message.includes('#stay')
        );
    });

    test('38. waitForNewBanner() шукає за SELECTORS.bannerText', async () => {
        SYH_UTILS.init({ SELECTORS: { bannerText: '.my-banner' } });
        const el = document.createElement('div');
        el.className = 'my-banner';
        el.textContent = '  Питання ефіру  ';
        document.body.appendChild(el);

        const found = await SYH_UTILS.waitForNewBanner('Питання ефіру', 1000);
        assert.equal(found, el);
        SYH_UTILS.SELECTORS = null;
    });

    test('39. waitForNewBanner() падає по таймауту, якщо тексту немає', async () => {
        SYH_UTILS.init({ SELECTORS: { bannerText: '.my-banner' } });
        await assert.rejects(
            () => SYH_UTILS.waitForNewBanner('Немає такого', 200),
            (err) => err instanceof Error && err.message.includes('Немає такого')
        );
        SYH_UTILS.SELECTORS = null;
    });

    test('40. clickElementByText() клікає знайдений видимий елемент', async () => {
        installXPathStub();
        const el = makeVisible(document.createElement('button'));
        el.textContent = 'Натисни мене';
        let clicked = 0;
        el.click = () => { clicked += 1; };
        document.body.appendChild(el);

        await SYH_UTILS.clickElementByText('Натисни мене', 1000);
        assert.equal(clicked, 1);
        removeXPathStub();
    });

    test('41. clickElementByText() резолвиться (НЕ падає) по таймауту', async () => {
        installXPathStub();
        await SYH_UTILS.clickElementByText('Такого тексту немає', 200);
        assert.ok(true, 'таймаут має резолвити проміс, а не відхиляти його');
        removeXPathStub();
    });
});
