import assert from 'node:assert';
import { test, describe } from 'node:test';

// Мокаємо global.window для Node.js середовища
global.window = global;

const { SYH_UTILS } = await import('../modules/utils.js');

describe('SYH_UTILS tests', () => {

    test('1. getTodayDateString повертає дату у форматі YYYY-MM-DD', () => {
        const dateStr = SYH_UTILS.getTodayDateString();
        assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
        const expected = new Date().toLocaleDateString('sv-SE');
        assert.strictEqual(dateStr, expected);
    });

    test('2. smartSearch - точний збіг', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('hello', 'hello world'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('world', 'hello world'), true);
    });

    test('3. smartSearch - регістронезалежність', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('HELLO', 'hello world'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('World', 'HELLO WORLD'), true);
    });

    test('4. smartSearch - пошук кирилицею по кириличному тексту', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('молчанов', 'Памятный (Молчанов, Опарин)'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('артем', 'Артем Молчанов'), true);
    });

    test('5. smartSearch - пошук у помилковій англійській розкладці (gjl -> под, vjk -> мол, fhntv -> артем)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('gjl', 'Подкаст Молчанова'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('vjk', 'Молчанов Опарин'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('fhntv', 'Артем'), true);
    });

    test('5b. smartSearch - транслітерація латиницею (artem -> Артем, natasha -> Наташа)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('artem', 'Артем Молчанов'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('natasha', 'Наташа'), true);
    });

    test('6. smartSearch - багатослівний пошук у помилковій розкладці (vjk gjl)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('vjk gjl', 'Молчанов Подкаст'), true);
    });

    test('7. smartSearch - багатослівний пошук з довільним порядком слів', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('борис вопросы', 'вопросы к борису'), true);
    });

    test('8. smartSearch - незбіг (повертає false)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('новости', 'привіт світ'), false);
    });

    test('9. smartSearch - edge cases (порожній запит)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('', 'будь-який текст'), true);
        assert.strictEqual(SYH_UTILS.smartSearch(null, 'будь-який текст'), true);
        assert.strictEqual(SYH_UTILS.smartSearch(undefined, 'будь-який текст'), true);
    });

    test('10. smartSearch - edge cases (порожній цільовий текст)', () => {
        assert.strictEqual(SYH_UTILS.smartSearch('запит', ''), false);
        assert.strictEqual(SYH_UTILS.smartSearch('запит', null), false);
        assert.strictEqual(SYH_UTILS.smartSearch('запит', undefined), false);
    });

    test('11. normalizeText - заміна латинських гомогліфів на кириличні аналоги', () => {
        const input = 'a e o i c p x y t h';
        const result = SYH_UTILS.normalizeText(input);
        assert.strictEqual(result, 'а е о і с р х у т н');
    });

    test('12. transliterate - правильна транслітерація', () => {
        assert.strictEqual(SYH_UTILS.transliterate('shch'), 'шч');
        assert.strictEqual(SYH_UTILS.transliterate('ch'), 'ч');
        assert.strictEqual(SYH_UTILS.transliterate('zh'), 'ж');
        assert.strictEqual(SYH_UTILS.transliterate('ya'), 'я');
    });

    test('13. switchKeyboardLayout - конвертація розкладки QWERTY в йцукен', () => {
        const res = SYH_UTILS.switchKeyboardLayout('qwe');
        assert.strictEqual(res, 'йцу');
    });

    test('14. saveBannerCategory - обробка відсутності storage adapter', async () => {
        const origStorage = SYH_UTILS.storage;
        delete global.SYH_STORAGE;
        delete global.window.SYH_STORAGE;

        let resolved = false;
        await SYH_UTILS.saveBannerCategory('test', 'stream').then(() => {
            resolved = true;
        });

        assert.strictEqual(resolved, true);
        if (origStorage) global.SYH_STORAGE = origStorage;
    });

    test('15. smartSearch - гнучка транслітерація та варіанти авторських нікнеймів (@zaitseva, зай, zai, zaj, zay)', () => {
        // Пошук за латинським нікнеймом @zaitseva
        assert.strictEqual(SYH_UTILS.smartSearch('зай', '@zaitseva'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zai', '@zaitseva'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zaj', '@zaitseva'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zay', '@zaitseva'), true);

        // Пошук за кириличним ім'ям @Зайцева
        assert.strictEqual(SYH_UTILS.smartSearch('зай', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zai', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zaj', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zay', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zaitseva', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zajtseva', '@Зайцева'), true);
        assert.strictEqual(SYH_UTILS.smartSearch('zaytseva', '@Зайцева'), true);
    });

});

