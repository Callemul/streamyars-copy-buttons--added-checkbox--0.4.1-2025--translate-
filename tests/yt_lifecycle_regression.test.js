// tests/yt_lifecycle_regression.test.js
//
// Регресійні тести життєвого циклу звичайного YouTube watch-page (Задача YT-A3).
//
// Охоплює 4 ключові області:
// 1. Тест вимкненого та увімкненого стану (disabled / enabled lifecycle transition).
// 2. Очищення UI (cleanupYouTubeUI, видалення панелей, класів, зв'язок, AbortController dispose).
// 3. Актуальність кешу (Stale cache safety: відсутність застарілого перезапису при змінах зі сховища).
// 4. SPA-навігація та захист від гонки (Race condition при зміні каналів і паралельних ініціалізаціях).

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';

// ---------------------------------------------------------------------------
// 1. Ініціалізація хром-моку для сховища та середовища розширення
// ---------------------------------------------------------------------------

installChromeMock();

const { initializeYouTubeModule, cleanupYouTubeUI } = await import('../youtube/yt_init.ts');
const { processYTComment, processAllYTComments, startObserver } = await import('../youtube/yt_comment_processor.ts');
const { canProcessComment, toSelectorString } = await import('../youtube/yt_comment_rules.ts');
const { stateCache, YT_COLLECTED_SHEET_ID } = await import('../youtube/yt_state.ts');
const { isCommentObserverActive, stopCommentObserver } = await import('../youtube/yt_observer.ts');
const { handleOptionsChange, handleStorageChange } = await import('../youtube/yt_storage_handler.ts');
const { bindYTEvents } = await import('../youtube/yt_events.ts');
const { isAllowedChannel } = await import('../youtube/yt_channel_gate.ts');
const { YT_SELECTORS } = await import('../youtube/yt_selectors.ts');
const { STORAGE_KEYS, getSheetCollectedStorageKey, SYH_STORAGE } = await import('../modules/storage.ts');
const { CommentInjector } = await import('../modules/comment_injector.ts');
const { CommentService } = await import('../modules/comment_service.ts');

const COLLECTED_KEY = getSheetCollectedStorageKey(YT_COLLECTED_SHEET_ID);

// ---------------------------------------------------------------------------
// Хелпери генерації DOM для тестів
// ---------------------------------------------------------------------------

function setChannel(name = 'Время перемен', handle = '@vremyaperemen') {
    let owner = document.getElementById('owner');
    if (!owner) {
        owner = document.createElement('div');
        owner.id = 'owner';
        document.body.appendChild(owner);
    }
    owner.innerHTML = '';

    const nameEl = document.createElement('div');
    nameEl.id = 'channel-name';
    nameEl.textContent = name;
    owner.appendChild(nameEl);

    if (handle) {
        const handleLink = document.createElement('a');
        handleLink.setAttribute('href', `https://www.youtube.com/${handle}`);
        owner.appendChild(handleLink);
    }
}

function createCommentNode({
    id = 'comment-1',
    author = 'Тестовий Автор',
    text = 'Тестовий коментар для перевірки',
    videoLink = `https://www.youtube.com/watch?v=vid123&lc=${id}`
} = {}) {
    const thread = document.createElement('ytd-comment-thread-renderer');
    thread.id = `thread-${id}`;

    const body = document.createElement('div');
    body.id = 'body';

    const header = document.createElement('div');
    header.id = 'header-author';

    const authorLink = document.createElement('a');
    authorLink.id = 'author-text';
    authorLink.setAttribute('href', `/@${encodeURIComponent(author)}`);
    const authorSpan = document.createElement('span');
    authorSpan.textContent = `@${author}`;
    authorLink.appendChild(authorSpan);
    header.appendChild(authorLink);

    const published = document.createElement('div');
    published.id = 'published-time-text';
    const link = document.createElement('a');
    link.setAttribute('href', videoLink);
    link.textContent = '5 хвилин тому';
    published.appendChild(link);
    header.appendChild(published);

    const contentText = document.createElement('div');
    contentText.id = 'content-text';
    contentText.textContent = text;

    body.appendChild(header);
    body.appendChild(contentText);
    thread.appendChild(body);

    document.body.appendChild(thread);
    return thread;
}

function resetEnvironment() {
    stopCommentObserver();
    cleanupYouTubeUI();
    installChromeMock();
    stateCache.youtubeEnabled = true;
    stateCache.buttonStates = {};
    stateCache.checkboxStates = {};
    stateCache.collectedList = [];
    document.body.innerHTML = '';
    setChannel('Время перемен', '@vremyaperemen');
}

// ---------------------------------------------------------------------------
// ТЕСТОВІ НАБОРИ
// ---------------------------------------------------------------------------

describe('YT-A3: 1. Тест вимкненого та увімкненого стану (Disabled & Enabled Lifecycle)', () => {
    beforeEach(resetEnvironment);
    afterEach(resetEnvironment);

    test('1.1. canProcessComment повертає false і не робить зайвих перевірок при youtubeEnabled === false', () => {
        const dummyNode = document.createElement('div');
        let headerCheckCalls = 0;
        const hasHeaderFn = () => {
            headerCheckCalls++;
            return true;
        };

        const resultDisabled = canProcessComment(dummyNode, false, hasHeaderFn);
        assert.equal(resultDisabled, false, 'вимкнений модуль блокує обробку коментаря');
        assert.equal(headerCheckCalls, 0, 'шапка автора не перевіряється, якщо модуль вимкнений (short-circuit)');

        const resultEnabled = canProcessComment(dummyNode, true, hasHeaderFn);
        assert.equal(resultEnabled, true, 'увімкнений модуль дозволяє обробку валідного вузла');
        assert.equal(headerCheckCalls, 1, 'шапка автора перевіряється коли модуль увімкнено');
    });

    test('1.2. processYTComment та processAllYTComments ігнорують коментарі, коли модуль вимкнено', () => {
        stateCache.youtubeEnabled = false;

        const comment1 = createCommentNode({ id: 'c1', text: 'Питання 1' });
        const comment2 = createCommentNode({ id: 'c2', text: 'Питання 2' });

        processYTComment(comment1);
        assert.equal(comment1.querySelector('.syh-yt-buttons'), null, 'кнопки не додаються до окремого коментаря');
        assert.equal(comment1.getAttribute('data-syh-yt-events-bound'), null, 'події не прив\'язуються');

        processAllYTComments();
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 0, 'жоден коментар не отримав кнопок');
    });

    test('1.3. initializeYouTubeModule() при youtube_enabled: false у сховищі не сканує коментарі', async () => {
        await SYH_STORAGE.setAsync({
            [STORAGE_KEYS.OPTIONS]: { youtube_enabled: false },
            [STORAGE_KEYS.YT_BUTTON_STATES]: { c1: 'question' }
        });

        createCommentNode({ id: 'c1', text: 'Коментар для перевірки' });

        await initializeYouTubeModule();

        assert.equal(stateCache.youtubeEnabled, false, 'прапорець youtubeEnabled вимкнено');
        assert.deepEqual(stateCache.buttonStates, {}, 'стани кнопок не підвантажуються для вимкненого модуля');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 0, 'DOM не модифікується');
    });

    test('1.4. Перехід disable -> enable створює повнофункціональну робочу панель кнопок', async () => {
        stateCache.youtubeEnabled = false;
        const thread = createCommentNode({ id: 'c_toggle', text: 'Питання для тесту перемикання' });

        processAllYTComments();
        assert.equal(thread.querySelector('.syh-yt-buttons'), null, 'до перемикання кнопок немає');

        handleOptionsChange({ youtube_enabled: true });
        // Даємо асинхронній ініціалізації модулю завершити читання сховища та сканування
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.equal(stateCache.youtubeEnabled, true, 'модуль перейшов в активний стан');

        const panel = thread.querySelector('.syh-yt-buttons');
        assert.ok(panel, 'після увімкнення панель кнопок успішно створено');

        const questionBtn = panel.querySelector('.syh-yt-btn-question');
        const prayerBtn = panel.querySelector('.syh-yt-btn-prayer');
        const copyBtn = panel.querySelector('.syh-yt-btn-copy');
        const checkboxEl = panel.querySelector('.syh-checkbox');

        assert.ok(questionBtn, 'кнопка "до питань" присутня');
        assert.ok(prayerBtn, 'кнопка "до молитов" присутня');
        assert.ok(copyBtn, 'кнопка копіювання присутня');
        assert.ok(checkboxEl, 'чекбокс присутній');
        assert.equal(thread.getAttribute('data-syh-yt-events-bound'), 'true', 'події прив\'язані');

        // Перевіряємо працездатність кліку на кнопку
        questionBtn.click();
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.equal(questionBtn.dataset.state, 'added', 'кнопка отримала data-state="added" після кліку');
        assert.equal(questionBtn.innerText, 'Додано до питань', 'текст кнопки оновився');
        assert.equal(stateCache.buttonStates['c_toggle'], 'question', 'стан записано у stateCache');
    });
});

describe('YT-A3: 2. Очищення UI (cleanupYouTubeUI)', () => {
    beforeEach(resetEnvironment);
    afterEach(resetEnvironment);

    test('2.1. cleanupYouTubeUI видаляє всі .syh-yt-buttons, знімає класи та атрибути прив\'язки', () => {
        const t1 = createCommentNode({ id: 'clean1' });
        const t2 = createCommentNode({ id: 'clean2' });
        const t3 = createCommentNode({ id: 'clean3' });

        processAllYTComments();

        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 3);
        assert.equal(document.querySelectorAll('[data-syh-yt-events-bound]').length, 3);

        t1.classList.add('syh-yt-comment-checked');
        t2.classList.add('syh-yt-comment-checked');

        startObserver();
        assert.equal(isCommentObserverActive(), true);

        cleanupYouTubeUI();

        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 0, 'усі панелі .syh-yt-buttons видалено');
        assert.equal(document.querySelectorAll('.syh-yt-comment-checked').length, 0, 'усі класи .syh-yt-comment-checked знято');
        assert.equal(document.querySelectorAll('[data-syh-yt-events-bound]').length, 0, 'усі атрибути data-syh-yt-events-bound знято');
        assert.equal(isCommentObserverActive(), false, 'спостерігач зупинено');
    });

    test('2.2. cleanupYouTubeUI викликає CommentInjector.dispose та абортить прив\'язані слухачі подій', async () => {
        const thread = createCommentNode({ id: 'dispose_test' });
        processYTComment(thread);

        const questionBtn = thread.querySelector('.syh-yt-btn-question');
        assert.ok(questionBtn, 'кнопка існує до очищення');

        let saveButtonStateCalls = 0;
        const originalSaveButtonState = CommentService.saveButtonState;
        CommentService.saveButtonState = async (...args) => {
            saveButtonStateCalls++;
            return originalSaveButtonState.apply(CommentService, args);
        };

        try {
            cleanupYouTubeUI();

            // Клік по від'єднаній кнопці не повинен спрацьовувати через abort signal
            questionBtn.click();
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(saveButtonStateCalls, 0, 'абортований слухач не викликає CommentService');
        } finally {
            CommentService.saveButtonState = originalSaveButtonState;
        }
    });

    test('2.3. cleanupYouTubeUI є повністю ідемпотентним і не кидає помилок при повторних викликах', () => {
        assert.doesNotThrow(() => {
            cleanupYouTubeUI();
            cleanupYouTubeUI();
            cleanupYouTubeUI();
        }, 'повторний виклик на порожньому або вже очищеному DOM безпечний');
        assert.equal(isCommentObserverActive(), false);
    });
});

describe('YT-A3: 3. Актуальність кешу (Stale cache safety & storage updates)', () => {
    beforeEach(resetEnvironment);
    afterEach(resetEnvironment);

    test('3.1. Оновлення buttonStates через handleStorageChange актуалізує stateCache та оновлює візуал', () => {
        const thread = createCommentNode({ id: 'comm_stale_1' });
        processYTComment(thread);

        const questionBtn = thread.querySelector('.syh-yt-btn-question');
        const prayerBtn = thread.querySelector('.syh-yt-btn-prayer');
        assert.equal(questionBtn.dataset.state, '');
        assert.equal(prayerBtn.dataset.state, '');

        // Імітуємо зміну зі сховища
        handleStorageChange({
            [STORAGE_KEYS.YT_BUTTON_STATES]: {
                newValue: { 'comm_stale_1': 'question' }
            }
        });

        assert.equal(stateCache.buttonStates['comm_stale_1'], 'question', 'stateCache оновлено');
        assert.equal(questionBtn.dataset.state, 'added', 'кнопка питання отримала data-state="added"');
        assert.equal(questionBtn.innerText, 'Додано до питань', 'текст кнопки оновився');
        assert.equal(prayerBtn.dataset.state, '', 'молитва не активна');
    });

    test('3.2. Уже прив\'язаний обробник використовує актуальний стан stateCache (No stale cache overwrite)', async () => {
        stateCache.buttonStates['comm_stale_2'] = 'question';

        const thread = createCommentNode({ id: 'comm_stale_2' });
        processYTComment(thread);

        const questionBtn = thread.querySelector('.syh-yt-btn-question');
        assert.equal(questionBtn.dataset.state, 'added', 'візуал кнопки ініціалізовано як додано');

        // Клік по вже активній кнопці має виконати untoggle (зняти стан), а не перезаписати старим порожнім кешем
        questionBtn.click();
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.equal(stateCache.buttonStates['comm_stale_2'], undefined, 'стан скинуто у null/undefined (untoggle)');
        assert.equal(questionBtn.dataset.state, '', 'активний стан знято');
        assert.equal(questionBtn.innerText, 'Додати до питань', 'кнопка повернулась до початкового тексту');
    });

    test('3.3. Перемикання станів (question -> prayer) коректно працює з кешем', async () => {
        stateCache.buttonStates['comm_stale_3'] = 'question';

        const thread = createCommentNode({ id: 'comm_stale_3' });
        processYTComment(thread);

        const questionBtn = thread.querySelector('.syh-yt-btn-question');
        const prayerBtn = thread.querySelector('.syh-yt-btn-prayer');
        assert.equal(questionBtn.dataset.state, 'added');

        // Клікаємо на молитву — стан має перемкнутися на prayer
        prayerBtn.click();
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.equal(stateCache.buttonStates['comm_stale_3'], 'prayer', 'стан перемкнувся на prayer');
        assert.equal(prayerBtn.dataset.state, 'added', 'молитва стала активною');
        assert.equal(prayerBtn.innerText, 'Додано до молитов');
        assert.equal(questionBtn.dataset.state, '', 'питання деактивовано');
        assert.equal(questionBtn.innerText, 'Додати до питань');
    });

    test('3.4. Оновлення checkboxStates через handleStorageChange синхронізує DOM і класи', () => {
        const thread = createCommentNode({ id: 'comm_stale_4' });
        processYTComment(thread);

        const checkbox = thread.querySelector('.syh-checkbox');
        assert.ok(checkbox, 'чекбокс знайдено');
        assert.equal(checkbox.checked, false);
        assert.equal(thread.classList.contains('syh-yt-comment-checked'), false);

        // 1. Оновлення зі сховища на позначений стан
        handleStorageChange({
            [STORAGE_KEYS.YT_CHECKBOX_STATE]: {
                newValue: { 'comm_stale_4': { checked: true, timestamp: 123456 } }
            }
        });

        assert.equal(stateCache.checkboxStates['comm_stale_4'].checked, true, 'stateCache оновлено');
        assert.equal(checkbox.checked, true, 'чекбокс став позначеним');
        assert.ok(thread.classList.contains('syh-yt-comment-checked'), 'тред отримав syh-yt-comment-checked');

        // 2. Оновлення зі сховища на непозначений стан
        handleStorageChange({
            [STORAGE_KEYS.YT_CHECKBOX_STATE]: {
                newValue: { 'comm_stale_4': { checked: false, timestamp: 123457 } }
            }
        });

        assert.equal(stateCache.checkboxStates['comm_stale_4'].checked, false, 'stateCache знято');
        assert.equal(checkbox.checked, false, 'чекбокс знято');
        assert.equal(thread.classList.contains('syh-yt-comment-checked'), false, 'клас syh-yt-comment-checked знято');
    });
});

describe('YT-A3: 4. SPA-навігація та захист від гонки (SPA navigation & Race conditions)', () => {
    beforeEach(resetEnvironment);
    afterEach(resetEnvironment);

    test('4.1. Зміна каналу на недозволений деактивує модуль та очищає будь-який наявний UI', async () => {
        setChannel('Кулінарне шоу шефа', '@cooking_show_tv');
        assert.equal(isAllowedChannel(), false, 'канал визначено як недозволений');

        // Створюємо залишкові кнопки від попереднього каналу
        createCommentNode({ id: 'leftover_1' });
        const leftoverPanel = document.createElement('div');
        leftoverPanel.className = 'syh-yt-buttons';
        document.body.appendChild(leftoverPanel);

        await initializeYouTubeModule();

        assert.equal(isCommentObserverActive(), false, 'спостерігач не стартує на недозволеному каналі');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 0, 'увесь старий UI очищено');
    });

    test('4.2. Перехід з недозволеного на дозволений канал успішно ініціалізує модуль', async () => {
        setChannel('Чужий канал', '@random');
        await initializeYouTubeModule();
        assert.equal(isCommentObserverActive(), false);

        // Переходимо на дозволений канал
        setChannel('Время перемен', '@vremyaperemen');
        createCommentNode({ id: 'allowed_comm' });

        await initializeYouTubeModule();

        assert.equal(isAllowedChannel(), true, 'канал дозволений');
        assert.equal(isCommentObserverActive(), true, 'спостерігач активовано');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 1, 'панель кнопок створена');
        assert.equal(document.querySelectorAll('[data-syh-yt-events-bound]').length, 1, 'події прив\'язані');
    });

    test('4.3. Два паралельних (overlapping) виклики initializeYouTubeModule() завершуються консистентним станом', async () => {
        setChannel('Время перемен', '@vremyaperemen');
        createCommentNode({ id: 'race_comm_1' });
        createCommentNode({ id: 'race_comm_2' });

        await Promise.all([
            initializeYouTubeModule(),
            initializeYouTubeModule()
        ]);

        assert.equal(isCommentObserverActive(), true, 'спостерігач активний');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 2, 'рівно 2 панелі (без дублікатів)');
        assert.equal(document.querySelectorAll('[data-syh-yt-events-bound]').length, 2, 'рівно 2 прив\'язки');
    });

    test('4.4. SPA-навігація на недозволений канал після активного стану очищає UI та вимикає спостерігач', async () => {
        // 1. Спочатку піднімаємо модуль на дозволеному каналі
        setChannel('Время перемен', '@vremyaperemen');
        createCommentNode({ id: 'spa_nav_1' });

        await initializeYouTubeModule();
        assert.equal(isCommentObserverActive(), true, 'спостерігач активний');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 1, 'кнопки присутні');

        // 2. SPA-навігація переходить на недозволений канал (викликається обробник yt-navigate-finish)
        setChannel('Невідомий Канал 123', '@unknown_channel');
        await initializeYouTubeModule();

        // 3. Перевіряємо повну деактивацію
        assert.equal(isAllowedChannel(), false, 'канал недозволений');
        assert.equal(isCommentObserverActive(), false, 'спостерігач зупинено');
        assert.equal(document.querySelectorAll('.syh-yt-buttons').length, 0, 'усі панелі кнопок видалено');
        assert.equal(document.querySelectorAll('[data-syh-yt-events-bound]').length, 0, 'усі прив\'язки очищено');
    });
});
