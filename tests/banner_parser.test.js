// tests/banner_parser.test.js
//
// Характеристичні тести публічного API `modules/banner_parser.ts`.
//
// Навіщо: за звітом Fallow це файл із найнижчим індексом підтримуваності серед
// `modules/` (MI 80.7, CRAP 14, complexity density 0.43) і трьома функціями у
// топі складності: `detectBlockCategory` (cyclomatic 14 / cognitive 12, critical),
// `parseBlock` (10 / 12, critical) та `parseRawTextToBanners` (7 / 10, high).
// Наявний `tests/banner_creator.test.js` перевіряє їх лише опосередковано через
// фасад. Ці тести фіксують контракт 1-в-1 перед декомпозицією.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { detectBlockCategory, parseBlock, parseRawTextToBanners } = await import('../modules/banners/banner_parser.ts');

/** Парсери-заглушки: кожен маркує свій формат, щоб гілку було видно у результаті. */
function createParsers() {
    return {
        parseStandardNumberedQuestions: (text) => [`STD:${text.trim()}`],
        parseEmojiNumberedQuestions: (text) => [`EMOJI:${text.trim()}`],
        parseSabbathSchoolUnnumberedQuestions: (text) => [`SS:${text.trim()}`]
    };
}

/** `SyhUtils`-подібна заглушка з керованим `cleanTelegramHeaders`. */
function createUtils(cleaner) {
    if (cleaner === null) return {};
    return { cleanTelegramHeaders: cleaner || ((t) => t) };
}

function createLogger() {
    const messages = [];
    return { log: (msg) => messages.push(msg), messages };
}

describe('banner_parser — detectBlockCategory', () => {
    test('1. рядок, що починається як питання ("1."), не аналізується — віддає defaultCat', () => {
        assert.strictEqual(detectBlockCategory('1. Молитва за родину', 'stream'), 'stream');
        assert.strictEqual(detectBlockCategory('1. Молитва за родину', 'prayer'), 'prayer');
    });

    test('2. emoji-нумерований та 🔹-рядок також вважаються початком питання', () => {
        assert.strictEqual(detectBlockCategory('1\uFE0F\u20E3 Вопрос', 'stream'), 'stream');
        assert.strictEqual(detectBlockCategory('🔹 Молитва', 'stream'), 'stream');
    });

    test('3. порожній перший рядок віддає defaultCat', () => {
        assert.strictEqual(detectBlockCategory('', 'audience'), 'audience');
    });

    test('4. ключові слова молитви дають "prayer"', () => {
        assert.strictEqual(detectBlockCategory('МОЛИТВЕННЫЕ НУЖДЫ', 'stream'), 'prayer');
        assert.strictEqual(detectBlockCategory('Прохання про молитву', 'stream'), 'prayer');
        assert.strictEqual(detectBlockCategory('🙏 потреби', 'stream'), 'prayer');
    });

    test('5. ключові слова уроку/суботи дають "stream"', () => {
        assert.strictEqual(detectBlockCategory('СУББОТНЯЯ ШКОЛА', 'audience'), 'stream');
        assert.strictEqual(detectBlockCategory('Суботня школа', 'audience'), 'stream');
        assert.strictEqual(detectBlockCategory('Урок на тиждень', 'audience'), 'stream');
    });

    test('6. ключові слова питань дають "audience"', () => {
        assert.strictEqual(detectBlockCategory('ВОПРОСЫ ЗРИТЕЛЕЙ', 'stream'), 'audience');
        assert.strictEqual(detectBlockCategory('Питання глядачів', 'stream'), 'audience');
        assert.strictEqual(detectBlockCategory('??? від глядачів', 'stream'), 'audience');
        assert.strictEqual(detectBlockCategory('❓ від глядачів', 'stream'), 'audience');
    });

    test('7. регістр не має значення — заголовок приводиться до верхнього', () => {
        assert.strictEqual(detectBlockCategory('молитвенные нужды', 'stream'), 'prayer');
    });

    test('8. пріоритет перевірок: prayer > stream > audience', () => {
        // Заголовок містить одразу всі три групи ключових слів.
        assert.strictEqual(detectBlockCategory('МОЛИТВА, УРОК И ВОПРОСЫ', 'stream'), 'prayer');
        // Без молитви виграє stream.
        assert.strictEqual(detectBlockCategory('УРОК И ВОПРОСЫ', 'audience'), 'stream');
    });

    test('9. аналізується лише сегмент до першого номера питання', () => {
        // "1. ВОПРОС" відрізається сплітером, тому заголовок = "МОЛИТВЫ".
        assert.strictEqual(detectBlockCategory('МОЛИТВЫ 1. ВОПРОС', 'stream'), 'prayer');
        // Тут ключове слово живе вже ПІСЛЯ номера, отже не враховується.
        assert.strictEqual(detectBlockCategory('Тема 1. МОЛИТВА', 'stream'), 'stream');
    });

    test('10. заголовок без ключових слів лишає defaultCat недоторканим', () => {
        assert.strictEqual(detectBlockCategory('Привіт усім', 'prayer'), 'prayer');
        assert.strictEqual(detectBlockCategory('Привіт усім', 'whatever'), 'whatever');
    });
});

describe('banner_parser — parseBlock', () => {
    test('11. порожній або пробільний текст дає порожній список', () => {
        const parsers = createParsers();
        assert.deepStrictEqual(parseBlock('', 'stream', parsers), []);
        assert.deepStrictEqual(parseBlock('   \n  ', 'stream', parsers), []);
    });

    test('12. стандартний формат: isStandard = true і лог "Стандартний"', () => {
        const parsers = createParsers();
        const logger = createLogger();

        const items = parseBlock('1. Питання перше', 'stream', parsers, logger.log);

        assert.deepStrictEqual(items, [{ text: 'STD:1. Питання перше', category: 'stream', isStandard: true }]);
        assert.deepStrictEqual(logger.messages, ['Формат: Стандартний 1.']);
    });

    test('13. emoji-формат: isStandard = false і лог "Емодзі"', () => {
        const parsers = createParsers();
        const logger = createLogger();

        const items = parseBlock('1\uFE0F\u20E3 Питання', 'audience', parsers, logger.log);

        assert.strictEqual(items[0].isStandard, false);
        assert.ok(items[0].text.startsWith('EMOJI:'));
        assert.deepStrictEqual(logger.messages, ['Формат: Емодзі 1\uFE0F\u20E3']);
    });

    test('14. Суботня школа без нумерації примусово перекриває категорію на "stream"', () => {
        const parsers = createParsers();
        const logger = createLogger();

        // "памятн" — ключове слово SABBATH_SCHOOL_KEYWORDS_REGEX; нумерації немає.
        const items = parseBlock('МОЛИТВЕННЫЙ блок\nпамятный стих', 'prayer', parsers, logger.log);

        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].category, 'stream');
        assert.strictEqual(items[0].isStandard, false);
        assert.ok(items[0].text.startsWith('SS:'));
        assert.deepStrictEqual(logger.messages, ['Формат: Суботня Школа (без нумерації)']);
    });

    test('15. Суботня школа з нумерацією йде звичайним стандартним шляхом', () => {
        const parsers = createParsers();

        const items = parseBlock('памятный стих\n1. Питання', 'audience', parsers);

        assert.strictEqual(items[0].isStandard, true);
        assert.ok(items[0].text.startsWith('STD:'));
        assert.strictEqual(items[0].category, 'audience');
    });

    test('16. Суботня школа з emoji-нумерацією також не йде в SS-гілку', () => {
        const parsers = createParsers();

        const items = parseBlock('памятный стих\n1\uFE0F\u20E3 Питання', 'audience', parsers);

        assert.ok(items[0].text.startsWith('EMOJI:'));
        assert.strictEqual(items[0].isStandard, false);
    });

    test('17. категорія блока береться з першого НЕпорожнього рядка (з trim)', () => {
        const parsers = createParsers();

        const items = parseBlock('\n   \n  ВОПРОСЫ ЗРИТЕЛЕЙ  \nтіло', 'stream', parsers);

        assert.strictEqual(items[0].category, 'audience');
    });

    test('18. logger необовʼязковий — виклик без нього не падає', () => {
        const parsers = createParsers();
        assert.doesNotThrow(() => parseBlock('1. Питання', 'stream', createParsers()));
        assert.strictEqual(parseBlock('1. Питання', 'stream', parsers).length, 1);
    });

    test('19. кожне питання парсера перетворюється на окремий BannerItem зі спільною категорією', () => {
        const parsers = createParsers();
        parsers.parseStandardNumberedQuestions = () => ['A', 'B', 'C'];

        const items = parseBlock('МОЛИТВЫ\n1. x', 'stream', parsers);

        assert.deepStrictEqual(items, [
            { text: 'A', category: 'prayer', isStandard: true },
            { text: 'B', category: 'prayer', isStandard: true },
            { text: 'C', category: 'prayer', isStandard: true }
        ]);
    });

    test('20. порожній результат парсера дає порожній список банерів', () => {
        const parsers = createParsers();
        parsers.parseStandardNumberedQuestions = () => [];
        assert.deepStrictEqual(parseBlock('1. x', 'stream', parsers), []);
    });
});

describe('banner_parser — parseRawTextToBanners', () => {
    test('21. простий текст без секцій: один блок з дефолтною категорією "stream"', () => {
        const result = parseRawTextToBanners('1. Питання', createParsers(), createUtils());

        assert.deepStrictEqual(result.bannersToCreate, [
            { text: 'STD:1. Питання', category: 'stream', isStandard: true }
        ]);
        assert.strictEqual(result.hasStandardFormat, true);
    });

    test('22. hasStandardFormat = false, коли жодного стандартного питання немає', () => {
        const result = parseRawTextToBanners('1\uFE0F\u20E3 Питання', createParsers(), createUtils());
        assert.strictEqual(result.hasStandardFormat, false);
    });

    test('23. cleanTelegramHeaders застосовується до сирого тексту', () => {
        const seen = [];
        const utils = createUtils((t) => { seen.push(t); return '1. Очищено'; });

        const result = parseRawTextToBanners('  сирий  ', createParsers(), utils);

        assert.deepStrictEqual(seen, ['  сирий  ']);
        assert.strictEqual(result.bannersToCreate[0].text, 'STD:1. Очищено');
    });

    test('24. cleanTelegramHeaders викликається у контексті utils (bind)', () => {
        const utils = {
            marker: 'ok',
            cleanTelegramHeaders(text) { return `${this.marker}:${text}`; }
        };

        const result = parseRawTextToBanners('1. x', createParsers(), utils);

        assert.strictEqual(result.bannersToCreate[0].text, 'STD:ok:1. x');
    });

    test('25. відсутній cleanTelegramHeaders — фолбек на тотожність', () => {
        const result = parseRawTextToBanners('1. Питання', createParsers(), createUtils(null));
        assert.strictEqual(result.bannersToCreate[0].text, 'STD:1. Питання');
    });

    test('26. текст ділиться на секції за SECTION_HEADER_SPLIT_REGEX', () => {
        const parsers = createParsers();
        const raw = '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Перший\n🙏 БЛОК\n1. Другий';

        const result = parseRawTextToBanners(raw, parsers, createUtils());

        assert.strictEqual(result.bannersToCreate.length, 2);
        assert.deepStrictEqual(result.bannersToCreate.map(i => i.category), ['audience', 'prayer']);
    });

    test('27. після сплітера порожніх повідомлень не лишається', () => {
        const parsers = createParsers();
        parsers.parseStandardNumberedQuestions = (t) => [t.trim()];

        const result = parseRawTextToBanners('\n\n❓ Тема\n1. Один\n', parsers, createUtils());

        assert.strictEqual(result.bannersToCreate.length, 1);
    });

    test('28. коли сплітер дав порожній список, використовується весь очищений текст', () => {
        const result = parseRawTextToBanners('   ', createParsers(), createUtils());
        // cleanedText === '   ' -> messages порожній -> fallback [cleanedText] -> parseBlock повертає []
        assert.deepStrictEqual(result.bannersToCreate, []);
        assert.strictEqual(result.hasStandardFormat, false);
    });

    test('29. секція молитов парситься окремим блоком із категорією "prayer"', () => {
        const parsers = createParsers();
        const raw = '1. Питання ефіру\n🙏 МОЛИТВЕННЫЕ НУЖДЫ\n1. Прохання';

        const result = parseRawTextToBanners(raw, parsers, createUtils());

        assert.strictEqual(result.bannersToCreate.length, 2);
        assert.strictEqual(result.bannersToCreate[0].category, 'stream');
        assert.strictEqual(result.bannersToCreate[1].category, 'prayer');
        assert.strictEqual(result.hasStandardFormat, true);
    });

    test('30. порядок результату: спершу питання секції, потім її молитви', () => {
        const parsers = createParsers();
        parsers.parseStandardNumberedQuestions = (t) => [t.trim().slice(0, 12)];
        const raw = '1. Q-блок\n🙏 ПРОХАННЯ\n1. P-блок';

        const result = parseRawTextToBanners(raw, parsers, createUtils());

        assert.deepStrictEqual(result.bannersToCreate.map(i => i.category), ['stream', 'prayer']);
    });

    test('31. hasStandardFormat реагує лише на блок питань, а не на блок молитов', () => {
        // Питання — emoji-формат (isStandard=false), молитви — стандартний (isStandard=true).
        const parsers = createParsers();
        const raw = '1\uFE0F\u20E3 Питання\n🙏 ПРОХАННЯ\n1. Прохання';

        const result = parseRawTextToBanners(raw, parsers, createUtils());

        assert.strictEqual(result.bannersToCreate.length, 2);
        assert.strictEqual(result.bannersToCreate[1].isStandard, true);
        assert.strictEqual(result.hasStandardFormat, false);
    });

    test('32. logger прокидається у кожен розібраний блок', () => {
        const logger = createLogger();
        const raw = '1. Питання\n🙏 ПРОХАННЯ\n1\uFE0F\u20E3 Прохання';

        parseRawTextToBanners(raw, createParsers(), createUtils(), logger.log);

        assert.deepStrictEqual(logger.messages, ['Формат: Стандартний 1.', 'Формат: Емодзі 1\uFE0F\u20E3']);
    });

    test('33. регресія: список уроку Суботньої Школи (Вк, привет! Вопросы по субботней школе...) йде в "stream"', async () => {
        const { SYH_PARSERS } = await import('../modules/parsers/index.ts');
        const { SYH_UTILS } = await import('../modules/core/utils.ts');

        const input = `Вк, привет! Вопросы по субботней школе. 1. Как на Ваш взгляд предыдущий урок связан с темой сегодняшнего урока? 2. Что сегодня на ваш взгляд не хватает нам и нашей общине, чтобы быть письмом Христовым?
3. Почему проповедь Евангелия практически всегда сопровождается гонениями? Когда нет на церковь гонений о чем это может говорить? 
4. Кто и почему были главными гонителями Павла и апостольской церкви? Кто и как сегодня преследует верующих? 
5. Что значит иметь христоцентричность в жизни и служении? 
6. Что значит жить святой жизнью? Какие главные на ваш взгляд черты святости?`;

        const result = parseRawTextToBanners(input, SYH_PARSERS, SYH_UTILS);
        assert.strictEqual(result.bannersToCreate.length, 6);
        assert.ok(result.bannersToCreate.every(b => b.category === 'stream'), 'Усі питання мають категорію stream (ефір)');
        assert.strictEqual(result.hasStandardFormat, true);
    });

    test('34. регресія: комбінований список ВОПРОСЫ СШ + МОЛИТВЕННЫЕ СШ дає audience і prayer', async () => {
        const { SYH_PARSERS } = await import('../modules/parsers/index.ts');
        const { SYH_UTILS } = await import('../modules/core/utils.ts');

        const input = `❓❓❓ВОПРОСЫ СШ
1️⃣
@ЛюдмилаМихайловнаНосова
Езек34,23-24Хіба пр.Езек.жив до царювання Давида?
2️⃣
@korysnotut 
Здраствуте, к меня есть такой вопрос к Алексею Опарину
3️⃣
@ЛюбовЛіщук
Що таке святиня Господня.дякую

🙏🙏🙏МОЛИТВЕННЫЕ СШ
1️⃣
@ДанієлДьолог
Помоліться за сина Івана
2️⃣
@RustamaKvas
Помолитесь за сына Вадима`;

        const result = parseRawTextToBanners(input, SYH_PARSERS, SYH_UTILS);
        assert.strictEqual(result.bannersToCreate.length, 5);

        const audienceItems = result.bannersToCreate.filter(b => b.category === 'audience');
        const prayerItems = result.bannersToCreate.filter(b => b.category === 'prayer');

        assert.strictEqual(audienceItems.length, 3, '3 питання глядачів з категорією audience');
        assert.strictEqual(prayerItems.length, 2, '2 молитви з категорією prayer');
    });
});

