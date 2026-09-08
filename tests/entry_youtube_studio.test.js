// tests/entry_youtube_studio.test.js
//
// Тести entry point'ів YouTube (T19):
//   • `youtube/youtube_content.ts` — що модуль підключає ПРИ ІМПОРТІ;
//   • `youtube/studio/studio_init.ts` — порядок підняття модуля Studio.
//
// Обидва файли досі не мали тестів зовсім, хоча саме вони вирішують, чи
// розширення взагалі оживе на сторінці. Перевіряється не внутрішня логіка
// (вона покрита `yt_bootstrap.test.js`), а САМЕ ПІДКЛЮЧЕННЯ: підписка на
// сховище, реакція на SPA-навігацію YouTube і те, що падіння ініціалізації
// логується, а не лишається необробленим відхиленням проміса.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({ runtimeImpl: { id: 'test-id' } });

// ── Шпигуни ставляться ДО імпорту entry point'а: він робить свою роботу
//    просто в момент завантаження модуля, іншої нагоди перехопити немає.
const windowListeners = [];
const originalWindowAdd = window.addEventListener.bind(window);
window.addEventListener = (type, handler, opts) => {
    windowListeners.push({ type, handler });
    return originalWindowAdd(type, handler, opts);
};

const documentListeners = [];
const originalDocumentAdd = document.addEventListener.bind(document);
document.addEventListener = (type, handler, opts) => {
    documentListeners.push({ type, handler });
    return originalDocumentAdd(type, handler, opts);
};

const { SYH_STORAGE } = await import('../modules/storage.ts');

const storageChangeHandlers = [];
const originalOnChanged = SYH_STORAGE.onChanged;
SYH_STORAGE.onChanged = function (handler) {
    storageChangeHandlers.push(handler);
    return originalOnChanged ? originalOnChanged.call(this, handler) : undefined;
};

const readyStateAtImport = document.readyState;

const ytContent = await import('../youtube/youtube_content.ts');

describe('youtube_content — підключення при завантаженні скрипта', () => {
    test('підписується на зміни у сховищі своїм обробником', () => {
        assert.equal(storageChangeHandlers.length, 1, 'має бути рівно одна підписка');
        assert.equal(
            storageChangeHandlers[0],
            ytContent.handleStorageChange,
            'підписка має вести саме на handleStorageChange, а не на анонімний колбек'
        );
    });

    test('слухає SPA-навігацію YouTube (yt-navigate-finish)', () => {
        const navListeners = windowListeners.filter(l => l.type === 'yt-navigate-finish');

        assert.equal(navListeners.length, 1, 'YouTube — SPA: без цього слухача кнопки зникнуть після переходу');
        assert.equal(typeof navListeners[0].handler, 'function');
    });

    test('старт прив\'язаний до готовності DOM', () => {
        const domReadyListeners = documentListeners.filter(l => l.type === 'DOMContentLoaded');

        if (readyStateAtImport === 'loading') {
            assert.equal(domReadyListeners.length, 1, 'DOM ще вантажився — мав з\'явитись слухач DOMContentLoaded');
        } else {
            assert.equal(domReadyListeners.length, 0, 'DOM уже готовий — ініціалізація мала піти одразу, без слухача');
        }
    });

    test('віддає назовні обидві точки входу модуля', () => {
        assert.equal(typeof ytContent.initializeYouTubeModule, 'function');
        assert.equal(typeof ytContent.handleStorageChange, 'function');
    });
});

describe('youtube_content — падіння ініціалізації не лишається без обробки', () => {
    let unhandled = [];
    let consoleErrors = [];
    let originalConsoleError;

    function onUnhandled(reason) {
        unhandled.push(reason);
    }

    beforeEach(() => {
        unhandled = [];
        consoleErrors = [];
        originalConsoleError = console.error;
        console.error = (...args) => { consoleErrors.push(args.map(String).join(' ')); };
        process.on('unhandledRejection', onUnhandled);
    });

    afterEach(() => {
        console.error = originalConsoleError;
        process.off('unhandledRejection', onUnhandled);
    });

    /**
     * Ламає `initializeYouTubeModule` так, щоб він ГАРАНТОВАНО відхилився.
     *
     * `document.querySelectorAll` зачіпається на обох гілках функції — і коли
     * канал дозволений, і коли ні (`cleanupYouTubeUI`). Через сховище зламати
     * не вийшло б: у happy-dom гейт каналу не пропускає далі, і тест мовчки
     * проходив би вхолосту.
     */
    function breakYouTubeInit() {
        const original = document.querySelectorAll.bind(document);
        document.querySelectorAll = () => { throw new Error('DOM недоступний'); };
        return () => { document.querySelectorAll = original; };
    }

    test('заглушка справді відхиляє ініціалізацію (тест не проходить вхолосту)', async () => {
        const restore = breakYouTubeInit();
        let rejected = false;

        try {
            await ytContent.initializeYouTubeModule();
        } catch {
            rejected = true;
        } finally {
            restore();
        }

        assert.equal(rejected, true, 'без відхилення наступний тест нічого не перевіряв би');
    });

    // Обробник навігації викликає `initializeYouTubeModule().catch(...)`.
    // Приберіть `.catch` — і кожна невдала SPA-навігація дає необроблене
    // відхилення проміса, яке в контент-скрипті нікому не видно.
    test('відхилення init після SPA-навігації логується, а не спливає нагору', async () => {
        const navHandler = windowListeners.find(l => l.type === 'yt-navigate-finish').handler;
        const restore = breakYouTubeInit();

        try {
            navHandler(new window.Event('yt-navigate-finish'));
            // Дати мікрозадачам відпрацювати — і `.catch`, і потенційний unhandled.
            await new Promise(resolve => setTimeout(resolve, 20));
        } finally {
            restore();
        }

        assert.deepEqual(unhandled, [], 'відхилення проміса лишилось необробленим — немає .catch');
        assert.ok(
            consoleErrors.some(m => m.includes('[SYH YT] Init error')),
            'падіння має бути залоговане'
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────

const { initializeStudioModule } = await import('../youtube/studio/studio_init.ts');
const { SYH_COMMENT_ASSISTANT } = await import('../modules/comment_assistant/index.ts');
const { RetentionService } = await import('../modules/retention_service.ts');

describe('studio_init — підняття модуля YouTube Studio', () => {
    let initCalls;
    let originalAssistantInit;
    let originalCleanup;

    beforeEach(() => {
        initCalls = [];
        originalAssistantInit = SYH_COMMENT_ASSISTANT.init;
        SYH_COMMENT_ASSISTANT.init = (config) => { initCalls.push(config); };
        originalCleanup = RetentionService.runGlobalCleanup;
        RetentionService.runGlobalCleanup = () => Promise.resolve();
    });

    afterEach(() => {
        SYH_COMMENT_ASSISTANT.init = originalAssistantInit;
        RetentionService.runGlobalCleanup = originalCleanup;
    });

    test('асистент коментарів піднімається із СЕЛЕКТОРАМИ STUDIO, а не StreamYard', async () => {
        await initializeStudioModule();

        assert.equal(initCalls.length, 1);
        assert.deepEqual(initCalls[0].SELECTORS, {
            commentBlock: 'ytcp-comment',
            commentText: '#content-text'
        });
    });

    test('тригерні слова беруться зі спільного конфігу', async () => {
        const { SYH_CONFIG } = await import('../modules/config.ts');

        await initializeStudioModule();

        assert.equal(initCalls[0].TRIGGER_WORDS_QUESTION, SYH_CONFIG.TRIGGER_WORDS_QUESTION);
        assert.equal(initCalls[0].TRIGGER_WORDS_PRAYER, SYH_CONFIG.TRIGGER_WORDS_PRAYER);
        assert.equal(initCalls[0].TRIGGER_WORDS, SYH_CONFIG.TRIGGER_WORDS);
    });

    test('повертає інформацію про канал', async () => {
        const info = await initializeStudioModule();

        assert.equal(typeof info, 'object');
        assert.ok(info !== undefined, 'модуль має повернути дані каналу');
    });

    // Прибирання стану — обслуговування, а не умова роботи. Його падіння не
    // має заважати модулю піднятись: `.catch` у `initializeStudioModule`.
    test('падіння прибирання стану не зупиняє підняття модуля', async () => {
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
        RetentionService.runGlobalCleanup = () => Promise.reject(new Error('cleanup впав'));

        let info;
        try {
            info = await initializeStudioModule();
        } finally {
            console.warn = originalWarn;
        }

        assert.equal(initCalls.length, 1, 'асистент усе одно піднявся');
        assert.ok(info !== undefined, 'модуль усе одно повернув дані каналу');
        assert.ok(
            warnings.some(w => w.includes('[SYH Studio]')),
            'падіння прибирання має бути залоговане, а не проковтнуте мовчки'
        );
    });

    test('асистент піднімається ДО прибирання стану', async () => {
        const order = [];
        SYH_COMMENT_ASSISTANT.init = () => { order.push('assistant.init'); };
        RetentionService.runGlobalCleanup = () => { order.push('cleanup'); return Promise.resolve(); };

        await initializeStudioModule();

        assert.deepEqual(order, ['assistant.init', 'cleanup']);
    });
});
