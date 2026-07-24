import assert from 'node:assert';

// Мокаємо об'єкт window та alert для сумісності з браузерним скриптом у Node.js
global.window = global;
global.alert = () => {};
global.document = {};

// Мокаємо JQuery для сумісності з popup_telegram.js
const jQueryMock = (sel) => {
    const obj = {
        val: () => "",
        text: () => "",
        html: () => obj,
        show: () => obj,
        hide: () => obj,
        empty: () => obj,
        append: () => obj,
        click: () => obj,
        css: () => obj,
        on: () => obj,
        closest: () => obj,
        find: () => obj,
        length: 0
    };
    // Якщо це document, повертаємо об'єкт з ready
    if (sel === global.window || sel === global.document || sel === 'document' || (sel && sel.ready)) {
        return {
            ready: (fn) => fn()
        };
    }
    return obj;
};
jQueryMock.ready = (fn) => fn();
global.$ = jQueryMock;
global.jQuery = jQueryMock;

// Динамічний імпорт модулів після виставляння global.window
const { SYH_PARSERS } = await import('./modules/parsers.js');
const { SYH_CONFIG } = await import('./modules/config.ts');
const { SYH_BANNER_CREATOR } = await import('./modules/banner_creator.js');
await import('./popup/popup_telegram.js');

const parsers = SYH_PARSERS;

console.log("=== Запуск тестів для парсерів StreamYard Helper ===\n");

// Тест 1: Перевірка парсингу Суботньої школи без нумерації (ігнорування заголовка, нумерація рядків)
try {
    const rawInput = `ПРЕВОСХОДСТВО ХРИСТА
Памятный (Молчанов, Опарин)
В чем проявляется единство и различие Лиц Троицы?
Как понимать выражение «Христос образ Бога невидимого»?
Что означают слова о том, что Христос «рожденный прежде всякой твари»?`;

    const expected = [
        "Памятный",
        "В чем проявляется единство и различие Лиц Троицы?",
        "Как понимать выражение «Христос образ Бога невидимого»?",
        "Что означают слова о том, что Христос «рожденный прежде всякой твари»?"
    ];

    const result = parsers.parseSabbathSchoolUnnumberedQuestions(rawInput);
    assert.deepStrictEqual(result, expected);
    console.log("✅ Тест 1 пройдено: Успішно розпарсено Суботню Школу без нумерації.");
} catch (e) {
    console.error("❌ Тест 1 провалено:", e);
    process.exit(1);
}

// Тест 2: Обмеження кількості питань (помилка, якщо > 10 питань)
try {
    const rawInput = `ПРЕВОСХОДСТВО ХРИСТА
Памятный (Молчанов, Опарин)
Питання 2
Питання 3
Питання 4
Питання 5
Питання 6
Питання 7
Питання 8
Питання 9
Питання 10
Питання 11`;

    assert.throws(() => {
        parsers.parseSabbathSchoolUnnumberedQuestions(rawInput);
    }, /Помилка: Кількість питань перевищує ліміт/);

    console.log("✅ Тест 2 пройдено: Викидається помилка, якщо кількість питань > 10.");
} catch (e) {
    console.error("❌ Тест 2 провалено:", e);
    process.exit(1);
}

// Тест 3: Перевірка, що стандартні нумеровані питання парсяться без змін
try {
    const rawInput = `1. В чем проявляется единство?
2. Как понимать выражение?`;

    const expected = [
        "В чем проявляется единство?",
        "Как понимать выражение?"
    ];

    const result = parsers.parseStandardNumberedQuestions(rawInput);
    assert.deepStrictEqual(result, expected);
    console.log("✅ Тест 3 пройдено: Стандартні нумеровані питання парсяться без змін.");
} catch (e) {
    console.error("❌ Тест 3 провалено:", e);
    process.exit(1);
}

// Тест 4: Перевірка обрізання довгих стандартних питань (довжина >= 200) замість ігнорування
try {
    const longQuestion = "А".repeat(210);
    const rawInput = `1. ${longQuestion}`;
    const result = parsers.parseStandardNumberedQuestions(rawInput);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].length, 198); // 195 символів + "..."
    assert.ok(result[0].endsWith("..."));
    console.log("✅ Тест 4 пройдено: Довгі питання обрізаються до 195 символів із '...', а не відкидаються.");
} catch (e) {
    console.error("❌ Тест 4 провалено:", e);
    process.exit(1);
}

// Тест 5: Автовизначення категорії банерів (Ефір 🎙️ vs Глядачі ❓)
async function testCategoryDetection() {
    try {
        const utilsMock = {
            saveBannerCategory: () => Promise.resolve(),
            copyAndShowBanner: () => {},
            log: () => {}
        };
        global.window.SYH_UTILS = utilsMock;
        
        const bannerCreator = SYH_BANNER_CREATOR;
        bannerCreator.init(SYH_CONFIG, utilsMock, parsers);

        // Перевизначаємо методи для уникнення реальних DOM-операцій та запису категорій
        let capturedCategories = [];
        utilsMock.saveBannerCategory = (text, category) => {
            capturedCategories.push(category);
            return Promise.resolve();
        };
        bannerCreator.ensureCleanStart = () => Promise.resolve();
        bannerCreator.createSingleBanner = () => Promise.resolve();
        bannerCreator.finalCleanup = () => Promise.resolve();

        // Кейс А: Питання Суботньої школи (має йти в "stream" / Ефір)
        const ssInput = `Предложения по вопросам к субботней школе: 
1. Куда нам надо идти и чему мы должны научить все народы?
2. Какие советы дает нам Библия?`;
        
        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(ssInput);
        assert.ok(capturedCategories.length > 0);
        assert.ok(capturedCategories.every(cat => cat === 'stream'), "Питання суботньої школи мають йти в 'stream'");

        // Кейс Б: Звичайні питання глядачів (має йти в "audience" / Глядачі)
        const audienceInput = `Вопросы от зрителей эфира: 
1. Какая тема будет в следующий раз?`;
        
        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(audienceInput);
        assert.ok(capturedCategories.length > 0);
        assert.ok(capturedCategories.every(cat => cat === 'audience'), "Питання глядачів мають йти в 'audience'");

        // Кейс В: Змішаний список (питання СШ -> 'stream', молитви -> 'prayer')
        const mixedInput = `❓❓❓ВОПРОСЫ СШ
1️⃣
@СергейЧурнысов
Где именно записано о том...

🙏🙏🙏МОЛИТВЕННЫЕ ПРОСЬБЫ СШ
1️⃣
@Елена
Пожалуйста помолитесь...`;

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(mixedInput);
        assert.deepStrictEqual(capturedCategories, ['audience', 'prayer'], "Змішаний список повинен розділяти категорії на 'audience' та 'prayer'");

        // Кейс Г: Запитання в один рядок із заголовком та "Памятный стих" наприкінці
        const singleLineInput = "Предлагаемые вопросы к субботней школе. 1. Что для вас значит жизненная буря? Приведите примеры бурь в семье, церкви, на работе, в жизни, какая из них самая тяжёлая?. 2.Почему Иисус вдруг уснул в лодке? И бывало ли, что Вы не могли докричаться до Бога? 3. Как мы можем прикоснуться к Богу, как женщина страдавшая кровотечением? И что для Вас значит прикоснуться к Богу? 4.  Кто испытывал веру Иова Бог или сатана? Нужны ли были эти страдания самому Иову? 5. Бывают ли у вас разочарования в вере и чем они обычно проявляются и обусловлены? 6. Как, зачем и перед кем я могу хвалиться скорбящим? Памятный стих";
        
        let capturedBanners = [];
        const originalCreate = bannerCreator.createSingleBanner;
        bannerCreator.createSingleBanner = (text) => {
            if (!text.startsWith("----")) {
                capturedBanners.push(text);
            }
            return Promise.resolve();
        };

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(singleLineInput);
        
        bannerCreator.createSingleBanner = originalCreate;

        assert.strictEqual(capturedBanners.length, 6);
        assert.strictEqual(capturedBanners[0], "Что для вас значит жизненная буря? Приведите примеры бурь в семье, церкви, на работе, в жизни, какая из них самая тяжёлая?.");
        assert.strictEqual(capturedBanners[5], "Как, зачем и перед кем я могу хвалиться скорбящим? Памятный стих");
        assert.ok(capturedCategories.every(cat => cat === 'stream'), "Питання суботньої школи в один рядок мають йти в 'stream'");

        // Кейс Д: Запитання про молитву із заголовком про СШ
        const prayerQuestionsInput = "Посылаю на рассмотрение предложения по вопросам на субботнюю школу: 1. Приведите из Библии примеры молитв, которые меняли ход истории? Какую роль молитва играла и играет в истории? Презентация: Молитва в истории. 2. Что отличало молитву Илии на горе Кармиле? Что главное не забыть в молитве, когда мы переживаем кризис?";
        
        capturedBanners = [];
        bannerCreator.createSingleBanner = (text) => {
            if (!text.startsWith("----")) {
                capturedBanners.push(text);
            }
            return Promise.resolve();
        };

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(prayerQuestionsInput);
        
        bannerCreator.createSingleBanner = originalCreate;

        assert.strictEqual(capturedBanners.length, 2);
        assert.ok(capturedCategories.every(cat => cat === 'stream'), "Питання про молитву із СШ заголовком повинні йти в 'stream'");

        // Кейс Е: Змішаний список із іншими емодзі в заголовку молитов та без варіаційного селектора в цифрах
        const mixedInputWithWavingHand = `❓❓❓ВОПРОСЫ СШ
1⃣
@sergiotopalov
Здравствуйте братья, у меня такой вопрос возникает, вы можете как то прокомменнтировать тот факт почему священники в день Иом Кипур не вкушали от жертвы ?

🙏🙏👋МОЛИТВЕННЫЕ ПРОСЬБЫ
1⃣
@MarkDörr
Прошу вас молиться о Алисе проблемы с произношением букв.`;

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(mixedInputWithWavingHand);
        assert.deepStrictEqual(capturedCategories, ['audience', 'prayer'], "Змішаний список із 👋 повинен розділяти категорії на 'audience' та 'prayer'");

        // Кейс Ж: Питання про урок субботи з нечітким Saturday/Sabbath School заголовком (має йти в 'stream')
        const lessonQuestionsInput = `Саша, привет,  вопросы по уроку на слудующую субботу

Виталик, привет! Вопросы на субботу: Добрый вечер, Сергей Борисович! Высылаю на Ваше рассмотрение вопросы на субботнюю школу. 1. Как вы понимаете, что такое изучение? Чем чтение Библии отличается от ее изучения?
2. Как лучше подобрать время и место для изучения Библии? А когда и где вы читаете и исследуете Библию?`;

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(lessonQuestionsInput);
        assert.ok(capturedCategories.length > 0);
        assert.ok(capturedCategories.every(cat => cat === 'stream'), "Питання про урок субботи мають йти в 'stream'");

        // Кейс З: Питання з декількох повідомлень Telegram одночасно (з датою та часом)
        const multiMessageTelegramInput = `[16.04.2026 12:17] Віталій. Время: ❓❓❓ВОПРОСЫ СШ
1️⃣
@ЗояБело
Подскажите , каким спортом могут заниматься женщины ?
2️⃣
@wyr
Вибачте за запитання...

🙏🙏🙏МОЛИТВЕННЫЕ ПРОСЬБЫ СШ:
1️⃣
@Tarasova
Молитвенная просьба о духовном здоровье дочери Татьяны.
[16.04.2026 12:17] Віталій. Время: Вопросы к уроку субботней школы. 1. Чем Библия отличается от других книг? В чем критика обвиняла и обвиняет Библию? 
2. Почему долгие века церкви...`;

        capturedCategories = [];
        await bannerCreator.processAndCreateBanners(multiMessageTelegramInput);
        assert.deepStrictEqual(capturedCategories, ['audience', 'audience', 'prayer', 'stream', 'stream'], "Декілька Telegram повідомлень повинні розділятися на правильні категорії ('audience', 'prayer', 'stream')");

        console.log("✅ Тест 5 пройдено: Категорії та формати питань (включаючи очищення від заголовків, однорядкові списки, запитання про молитву, емодзі 👋/1⃣, суботні/урокові ключі та декілька повідомлень Telegram) автоматично визначаються правильно.");
    } catch (e) {
        console.error("❌ Тест 5 провалено:", e);
        process.exit(1);
    }
}

// Тест 6: Парсинг змішаного списку питань та молитов Telegram (Тест з багом)
try {
    const rawInput = `❓❓❓ВОПРОСЫ СШ
1️⃣
@СергейЧурнысов
Где именно записано о том что будут погибать общинами а не спасаться  прочитал всю книгу и не нашел



🙏🙏🙏МОЛИТВЕННЫЕ ПРОСЬБЫ СШ
1️⃣
@Елена
Пожалуйста помолитесь, чтобы внук Кирилл поступил учиться, куда он хочет.
2️⃣
@Ірина
Божих благословінь вам брати, прохання молитись за Односельчан-захистникіі`;

    const parsed = global.window.parseAndFilterOldList(rawInput, []);
    
    assert.strictEqual(parsed.questions.length, 1);
    assert.strictEqual(parsed.questions[0].author, "@СергейЧурнысов");
    assert.strictEqual(parsed.questions[0].text, "Где именно записано о том что будут погибать общинами а не спасаться  прочитал всю книгу и не нашел");
    
    assert.strictEqual(parsed.prayers.length, 2);
    assert.strictEqual(parsed.prayers[0].author, "@Елена");
    assert.ok(parsed.prayers[0].text.includes("чтобы внук Кирилл"));
    assert.strictEqual(parsed.prayers[1].author, "@Ірина");
    assert.ok(parsed.prayers[1].text.includes("Божих благословінь"));

    console.log("✅ Тест 6 пройдено: Змішані списки Telegram (питання + молитви) успішно розбиваються та парсяться.");
} catch (e) {
    console.error("❌ Тест 6 провалено:", e);
    process.exit(1);
}

// Тест 7: Парсинг змішаного списку питань та молитов Telegram (користувацький заголовок з 👋 та 1⃣)
try {
    const rawInput = `❓❓❓ВОПРОСЫ СШ
1⃣
@sergiotopalov
Здравствуйте братья, у меня такой вопрос возникает, вы можете как то прокомменнтировать тот факт почему священники в день Иом Кипур не вкушали от жертвы ?
2⃣
@ЛюдмилаМаляр  я почула ,за так названий чат,:іскуственний інтелект'' що цей чат може правильно пояснювати Біблію ,але потрібно уточнити до якої конфесії ти відносишся.
І от у мене запитання:-чи можу я отримати правильну відповідь  не назвавши свою конфесію?
Чи ,,іскуственний інтелект'' не є,, лжепророк''?
Може я щось неправильно розумію,допоможіть розібратися.
3⃣
@НатальяКарпова
Брат Сергей Борисович ! Тогда к вам такой вопрос! Елена Уйат писала что христиан зашивали в шкуры животных и убивали на гладиаторских боях а вы говорите не было ! Это как?? Ответьте

🙏🙏👋МОЛИТВЕННЫЕ ПРОСЬБЫ
1⃣
@MarkDörr
Прошу вас молиться о Алисе проблемы с произношением букв.
За друга Константина он служит , чтобы Господь открылся и хранил.
За церковь в Германии о единстве и росте о том чтобы Господь прилагал спасаемых`;

    const parsed = global.window.parseAndFilterOldList(rawInput, []);
    
    assert.strictEqual(parsed.questions.length, 3);
    assert.strictEqual(parsed.questions[0].author, "@sergiotopalov");
    assert.strictEqual(parsed.questions[0].text, "Здравствуйте братья, у меня такой вопрос возникает, вы можете как то прокомменнтировать тот факт почему священники в день Иом Кипур не вкушали от жертвы ?");
    
    assert.strictEqual(parsed.prayers.length, 1);
    assert.strictEqual(parsed.prayers[0].author, "@MarkDörr");
    assert.ok(parsed.prayers[0].text.includes("Прошу вас молиться о Алисе"));

    console.log("✅ Тест 7 пройдено: Змішані списки Telegram з 👋 та 1⃣ успішно розпарсено.");
} catch (e) {
    console.error("❌ Тест 7 провалено:", e);
    process.exit(1);
}

// Тест 8: Парсинг змішаного списку Telegram із декількома скопійованими заголовками (з датою та часом)
try {
    const rawInput = `[16.04.2026 12:17] Віталій. Время: ❓❓❓ВОПРОСЫ СШ
1️⃣
@ЗояБело
Подскажите , каким спортом могут заниматься женщины ?
Всвязи с тем, что предполагается соответствующая одежда.
2️⃣
@wyr
Вибачте за запитання, то що якщо Христос художник то нам можна розкрасити себе татуюванням чи жінкам розкрасити себе помадой і тінями, а волосся в рожевий колір?
3️⃣
@FgdsB
Какая разница между гордостью и чувством достоїнства? Заранее благодаря за ответ



🙏🙏🙏МОЛИТВЕННЫЕ ПРОСЬБЫ СШ:
1️⃣
@Tarasova
Молитвенная просьба о духовном здоровье дочери Татьяны.
2️⃣
@ТатьянаКон
Если возможно, сердечно прошу поддержать доброй молитвой двух солдат , оставленных на выживание Саша и Егор, к ним прибилась брошенная овчарка, без денег, без поддержки, потерянные из документы, там где враг близко физически, прошу посланца Христа найти и вывести хлопцев из "плена"  ненужности , болезней, от их все отказались ,на своей земле
3️⃣
@ИринаИ
УВАЖАЕМЫЙ БРАТЬ,Я В КАНАДЕ И ПОЭТОМУ СЛУШАЮ ВАС ПО ЗАПИСИ,НО ВЕРЮ ЧТО ВЫ СМОТРИТЕ НАШИ ПОСЛАНИЯ,ПРОШУ ПОМОЛИТЬСЯ ЗА МИР НА РОДНОЙ ЗЕМЛЕ,И ЗА МОЕ ЗДОРОВЬЕ И ЗА ПОМОЩЬ В ПЕРЕВОДЕ ПЕНСИИ,НАКОНЕЦ МНЕ ЕЕ НАЧТСЛИЛИ
4️⃣
@ЛюбовМ
Прошу молитись за навернення моїх дітей Юрія Андрія , Павла, Василя . а також за внучку Діанку
[16.04.2026 12:17] Віталій. Время: Вопросы к уроку субботней школы. 1. Чем Библия отличается от других книг? В чем критика обвиняла и обвиняет Библию? 
2. Почему долгие века церкви, именующие себя христианскими запрещали переводить и читать Библию? изменилось ли в этом, что-то сегодня?
3. В чем преимущество и опастность новых переводов Библии? 
4. Почему, если Библия одна, то сегодня существует столько христианских церквей?
5. Как надо читать Библию, что бы ее понять и как сделать, что бы Бог мне открылся на ее страницах?
6. Как Вы понимаете памятный стих? Когда Библия будет для нас живым словом, а когда мертвым?`;

    const parsed = global.window.parseAndFilterOldList(rawInput, []);
    
    assert.strictEqual(parsed.questions.length, 3);
    assert.strictEqual(parsed.questions[0].author, "@ЗояБело");
    assert.strictEqual(parsed.questions[1].author, "@wyr");
    assert.strictEqual(parsed.questions[2].author, "@FgdsB");
    
    assert.strictEqual(parsed.prayers.length, 4);
    assert.strictEqual(parsed.prayers[0].author, "@Tarasova");
    assert.strictEqual(parsed.prayers[3].author, "@ЛюбовМ");

    console.log("✅ Тест 8 пройдено: Змішані списки Telegram з декількома повідомленнями та датами/часом успішно розпарсено.");
} catch (e) {
    console.error("❌ Тест 8 провалено:", e);
    process.exit(1);
}

// Запускаємо асинхронні тести
testCategoryDetection().then(() => {
    console.log("\n🎉 Усі тести успішно пройдено!");
});
