import test from 'node:test';
import assert from 'node:assert/strict';
import {
    countQuestionsInText,
    numberToEmoji,
    parseAndFilterOldList,
    parseTelegramExportLineByLine,
    cleanAuthorName,
    EMOJI_NUMBER_LINE_REGEX,
    EMOJI_NUMBER_CONTAINS_REGEX,
    TELEGRAM_HEADER_MARKER_REGEX
} from '../modules/telegram_parser.ts';
import { SYH_PARSERS } from '../modules/parsers/index.ts';

test('countQuestionsInText counts bullet points correctly', () => {
    assert.equal(countQuestionsInText('Simple question'), 1);
    assert.equal(countQuestionsInText('🔹Question 1\n🔹Question 2'), 2);
    assert.equal(countQuestionsInText('🔹Q1\n🔹Q2\n🔹Q3'), 3);
});

test('numberToEmoji converts numbers to keycap emojis', () => {
    assert.equal(numberToEmoji(1), '1️⃣');
    assert.equal(numberToEmoji(10), '🔟');
    assert.equal(numberToEmoji(12), '1️⃣2️⃣');
});

test('parseAndFilterOldList correctly filters answered question IDs', () => {
    const text = `1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?`;
    const result = parseAndFilterOldList(text, [1]);
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].author, '@Mary');
    assert.equal(result.deleted.length, 1);
    assert.equal(result.deleted[0].originalId, 1);
});

test('parseTelegramExportLineByLine handles line by line exports', () => {
    const text = `[10.07.2026 20:44] @John\nWhat is grace?\n[10.07.2026 20:45] @John\nWhat is love?`;
    const result = parseTelegramExportLineByLine(text);
    assert.equal(result.length, 1);
    assert.equal(result[0].author, 'John');
    assert.ok(result[0].text.includes('🔹What is grace?'));
    assert.ok(result[0].text.includes('🔹What is love?'));
});

test('cleanAuthorName removes @ symbol, bullets, and suffixes', () => {
    const log = [];
    assert.equal(cleanAuthorName('@JohnDoe', log), 'John Doe');
    assert.equal(cleanAuthorName('@Mary•Admin', log), 'Mary');
    assert.equal(cleanAuthorName('Alex-UA', log), 'Alex');
    assert.ok(log.length > 0);
});

test('Shared Emoji Regex Constants match keycap patterns correctly', () => {
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣2️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('🔟'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('Simple text'), false);

    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('Question 1️⃣ in list'), true);
    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('No keycaps here'), false);

    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('❓❓❓ВОПРОСЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('🙏🙏🙏МОЛИТВЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('1️⃣'), true);
});

test('SYH_PARSERS formats emoji, standard, and Sabbath school question lists', () => {
    const emojiText = `1️⃣\n@John\n🔹Question A\n🔹Question B`;
    const emojiBanners = SYH_PARSERS.parseEmojiNumberedQuestions(emojiText);
    assert.equal(emojiBanners.length, 2);
    assert.ok(emojiBanners[0].includes('John'));

    const stdText = `1. First question (John)\n2. Second question (Mary)`;
    const stdBanners = SYH_PARSERS.parseStandardNumberedQuestions(stdText);
    assert.equal(stdBanners.length, 2);
    assert.equal(stdBanners[0], 'First question');

    const ssText = `Урок 5 Субботняя школа\nПамятный стих\nВопрос про веру`;
    const ssBanners = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(ssText);
    assert.equal(ssBanners.length, 2);
});

test('parseAndFilterOldList correctly splits mixed questions and prayers with Telegram headers (User Report)', () => {
    const text = `[24.07.2026 00:50] Віталій о. Вя пн: ❓❓❓Вопросы
1️⃣
sko
Вопрос:это грех в церкви,если человек или группа,не признают Святую Троицу?
2️⃣
Мар
Велике спасибі за роздуми над Святим письмом.
Якщо буде час ,прошу Вас роз'яснити Євр.4:6-10.
Дякую,вибачте,що не по уроку.
3️⃣
korys
Добрий день, як ви можете пояснити уривок з Матвія 15:24-27 про жінку-язичницю яка сказала Ісусу що і щенята получають крихти від панів своїх. Чому такі слова Ісуса, хіба Він прийшов не для викуплення всіх, а тут Він як показує, що вона не достойна бо язичниця?
4️⃣
Любовь
1-я Царств16:14,15( ..от Саула  отступил Дух Господень, и возмущал его злой дух от Господа). Объясните, пожалуйста,если можно, как может от Господа быть злой дух.
5️⃣
НинаЕ
Слева богу за ваше служение, вы столько молитесь, исконно за людей,столько у людей нужд ,проблем,за вас многие молятся в 1цар.12.23.прекрасный стих.некоторые люди считают что молиться нужно только личностной молитвой с богом а не за других это считается грехом?❤️
6️⃣
Галина
Чи дозволено віруючим дівчатам зустрічатися, і виходити заміж за невіруючих, мотивуючи тим, що у церкві великий брак хлопців????.
7️⃣
Татьяна
А как спасать святых, которые не видят своего состояния?
8️⃣
ЛюбовМ
Дорогі брати поясніть мені ,як розуміти слова 1 Ів 5.16 що таке гріх на смерть?,
9️⃣
Дмитрий
Братья, всё-таки, кто  же Отец Иисуса: Бог Отец или  Бог Дух Святой? 
А, может, у Него два отца?
🔟
Дмитрий
Сергей Борисович, в субботу в Израиле полагалось приносить особое субботнее жертвоприношение, сверх ежедневного. 
Этот устав субботнего дня. 
Таким образом, суббота  связана неразрывно с храмовым служением. 
Вопрос: Как можно соблюдать субботу, когда нет храма?
1️⃣1️⃣
Larisa
Иисус говорит: входите тесными вратами, потому что   широки врата ведущие в погибель... /Павел говорит: ибо для меня отверста великая и широкая дверь, и противников много. 1 Кор 16:9.
Чьи слова нужно избрать, чтобы сохранить единство?
1️⃣2️⃣
Маша
Так и не поняла о чем говорил А. Опарин,О том, что библия доступна и все ее могут понять ибо нет др доктрины кроме библейской иди об ученых степенях?! Если про ученые степеня то тогда не всем доступна библия и ее только избранные могут трактовать, тогда в отличие с католиками?!
1️⃣3️⃣
obey
Звучит как то ужасно: "Когда Илия был во Христе, отрубил 450 голов, и все!". И почему сегодня я не могу отрубить курицу?
1️⃣4️⃣
Елена
Скажите, пожалуйста,  Давид действительно  видел  Бога, или это оборот речи? Пс. 62 - 3.
1️⃣5️⃣
Ольга
Услышала у вас про семью,которая живёт в Болгарии и не могут найти русскоговорящую церковь,как можно связаться с этими людьми?Я тоже живу в Болгарии.
[24.07.2026 00:51] Віталій о. Вя пн: 🙏🙏🙏Молитвы
1️⃣
Світлана
Помоліться за сина Івана від алкогольної залежності,а також за фізичне здоровя і за те,щоб Дух Святий коснувся його серця.Дякую,нехай благословить вас Господь.
2️⃣
Сірожа
Просим молитись за наші документи
3️⃣
Евгения
Дорогі брати і сестри!
11 липня я просила вас молитися за мою бабусю Ліду, у неї была тяжка хвороба онкологія.
Щиро дякую кожному, хто підтримував нас у молитві.
16 липня вранці моя люба бабуся відійшла до спочинку. Нам дуже боляче, але ми довіряємо Богові й тримаємося на Його обітницях про воскресіння.
Прошу й надалі молитися за нашу сім’ю, щоб Господь дав нам мир, силу й потіху в цей непростий час.
Щиро дякую за ваші молитви та підтримку.
4️⃣
Любов
Прошу молитися за внучку Діанку залежна від телефону ,і за навернення моїх дітей ,особливо за синочка Павла,який уже четвертий тиждень не вживає їжу і немає апетиту ,істощав, виключений, за то що сказав нема Бога,так переконував батько, який залишив мене із п'ятьма дітьми, якщо можете то помоліться, він не задіяний нівчому подібному ,скромний, одинокій, по закінченні університету упав в депресію
5️⃣
Галина
Ещё прошу помолиться, что б Бог исцелил меня от коксартроза левого бедренного сустава -- благодарю ❤️
6️⃣
Галина
Прошу молиться за освобождение от алкогольной зависимости сына Сергея и его побратимов, что б Бог  привёл их к покаянию и спасению -- Божьих благословений вам
7️⃣
Елена
Большое спасибо за молитвы! Внук Кирилл продолжит учёбу, его приняли.Слава Богу..Но теперь необходимо договориться на счет практики. Помолитесь, пожалуйста, об этом.`;

    const result = parseAndFilterOldList(text, []);
    assert.equal(result.questions.length, 15);
    assert.equal(result.prayers.length, 7);
});