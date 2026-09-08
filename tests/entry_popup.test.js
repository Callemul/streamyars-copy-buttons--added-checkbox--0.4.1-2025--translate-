// tests/entry_popup.test.js
//
// Тести entry point попапу (T19): `popup/popup_init.ts` + `popup/popup_listeners.ts`.
//
// `initPopup()` виконується просто при завантаженні модуля і складається з
// ~18 кроків, кожен у власному `try/catch` (error boundaries). Сенс саме в
// тому, що попап МАЄ відкритися навіть коли частина стану битa: краще вікно
// без відновленого тексту, ніж порожній білий прямокутник.
//
// Тому головний тест тут ламає читання сховища ДО імпорту entry point'а і
// перевіряє, що слухачі інтерфейсу все одно навісились. Приберіть `try/catch`
// навколо `SYH_STORAGE.get` у `popup_init.ts` — падає рівно він.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({ runtimeImpl: { id: 'test-id' } });

const { SYH_STORAGE } = await import('../modules/storage.ts');
const { getAllSheetIds } = await import('../modules/sheets.ts');

const SID = getAllSheetIds()[0];

/**
 * Розмітка попапу — рівно ті елементи, які шукають кроки ініціалізації.
 * Решту вони мають переживати мовчки (`if (!el) return`).
 */
const POPUP_SHELL = `
    <div class="tab-link" data-tab="tabTelegram"></div>
    <div class="tab-content" id="tabTelegram"></div>
    <button class="subtab-button" data-sheet="${SID}" aria-selected="false"></button>
    <textarea id="textArea1_oldText"></textarea>
    <textarea id="textArea2_generatedRuText"></textarea>
    <input id="sschoolName" type="text">
    <button id="sschoolNameBtn"></button>
    <input id="preachNameInput" type="text">
    <button id="preachNameBtn"></button>
    <button id="openOptionsPageBtn"></button>
    <div id="sheet-contents-container"></div>
`;

const consoleErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => { consoleErrors.push(args.map(String).join(' ')); };

// ── Ламаємо сховище ДО імпорту: `initPopup()` спрацює прямо на імпорті,
//    іншої нагоди перевірити його error boundaries не буде.
const originalGet = SYH_STORAGE.get;
SYH_STORAGE.get = () => { throw new Error('сховище недоступне'); };

document.body.innerHTML = POPUP_SHELL;

const optionsBtnListeners = [];
const optionsBtn = document.getElementById('openOptionsPageBtn');
const originalBtnAdd = optionsBtn.addEventListener.bind(optionsBtn);
optionsBtn.addEventListener = (type, handler, opts) => {
    optionsBtnListeners.push(type);
    return originalBtnAdd(type, handler, opts);
};

let importThrew = null;
try {
    await import('../popup/popup_init.ts');
    if (document.readyState === 'loading') {
        document.dispatchEvent(new window.Event('DOMContentLoaded'));
    }
} catch (e) {
    importThrew = e;
}

SYH_STORAGE.get = originalGet;
console.error = originalConsoleError;

describe('popup_init — попап відкривається навіть із битим сховищем', () => {
    test('падіння читання сховища не валить ініціалізацію попапу', () => {
        assert.equal(
            importThrew,
            null,
            'виняток зі сховища вилетів назовні — попап не відкрився б узагалі'
        );
    });

    test('падіння залоговане, а не проковтнуте мовчки', () => {
        assert.ok(
            consoleErrors.some(m => m.includes('[SYH Popup]')),
            `очікувався лог помилки попапу, отримано: ${JSON.stringify(consoleErrors)}`
        );
    });

    // Кроки після читання сховища — саме те, що загубилось би без boundary.
    test('слухачі інтерфейсу навісились попри падіння сховища', () => {
        assert.ok(
            optionsBtnListeners.includes('click'),
            'кнопка «Налаштування» лишилась без обробника — кроки після сховища не виконались'
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────

const {
    setupPopupTabListeners,
    setupSheetInputListeners,
    setupTranslitListeners,
    setupTitleAndOptionsListeners,
    openExtensionOptionsPage,
    saveTitleFromInput
} = await import('../popup/popup_listeners.ts');

describe('popup_listeners — кроки ініціалізації переживають відсутню розмітку', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // У попапі частина розмітки з'являється лише на певних вкладках. Крок,
    // що падає на відсутньому елементі, забрав би з собою всі наступні.
    const STEPS = [
        { name: 'setupPopupTabListeners', run: () => setupPopupTabListeners() },
        { name: 'setupSheetInputListeners', run: () => setupSheetInputListeners() },
        { name: 'setupTranslitListeners', run: () => setupTranslitListeners() },
        { name: 'setupTitleAndOptionsListeners', run: () => setupTitleAndOptionsListeners() }
    ];

    for (const step of STEPS) {
        test(`${step.name} не кидає винятку на порожньому DOM`, () => {
            assert.doesNotThrow(step.run);
        });
    }

    test('усі кроки поспіль на порожньому DOM теж проходять', () => {
        assert.doesNotThrow(() => STEPS.forEach(s => s.run()));
    });
});

describe('popup_listeners — прив\'язка на повній розмітці', () => {
    beforeEach(() => {
        document.body.innerHTML = POPUP_SHELL;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('кнопки заголовків і налаштувань отримують обробник кліку', () => {
        const seen = [];
        ['sschoolNameBtn', 'preachNameBtn', 'openOptionsPageBtn'].forEach(id => {
            const el = document.getElementById(id);
            const original = el.addEventListener.bind(el);
            el.addEventListener = (type, handler, opts) => {
                if (type === 'click') seen.push(id);
                return original(type, handler, opts);
            };
        });

        setupTitleAndOptionsListeners();

        assert.deepEqual(seen.sort(), ['openOptionsPageBtn', 'preachNameBtn', 'sschoolNameBtn']);
    });

    test('поля транслітерації отримують обробник вводу', () => {
        const seen = [];
        ['textArea1_oldText', 'textArea2_generatedRuText'].forEach(id => {
            const el = document.getElementById(id);
            const original = el.addEventListener.bind(el);
            el.addEventListener = (type, handler, opts) => {
                if (type === 'input') seen.push(id);
                return original(type, handler, opts);
            };
        });

        setupTranslitListeners();

        assert.deepEqual(seen.sort(), ['textArea1_oldText', 'textArea2_generatedRuText']);
    });

    test('saveTitleFromInput бере значення з поля і не падає на відсутньому', () => {
        document.getElementById('sschoolName').value = 'Новий заголовок';

        assert.doesNotThrow(() => saveTitleFromInput('sschoolName', 'newTitleSS'));
        assert.doesNotThrow(() => saveTitleFromInput('немаєТакогоПоля', 'newTitlePreach'));
    });

    test('openExtensionOptionsPage іде через chrome.runtime.openOptionsPage', () => {
        let opened = 0;
        const original = chrome.runtime.openOptionsPage;
        chrome.runtime.openOptionsPage = () => { opened++; };

        try {
            openExtensionOptionsPage();
        } finally {
            chrome.runtime.openOptionsPage = original;
        }

        assert.equal(opened, 1);
    });

    // Фолбек для середовищ, де API сторінки налаштувань недоступне.
    test('без openOptionsPage відкривається сторінка за URL', () => {
        const originalOpen = chrome.runtime.openOptionsPage;
        const originalGetURL = chrome.runtime.getURL;
        const originalWindowOpen = window.open;

        const openedUrls = [];
        delete chrome.runtime.openOptionsPage;
        chrome.runtime.getURL = (path) => `chrome-extension://test/${path}`;
        window.open = (url) => { openedUrls.push(url); };

        try {
            openExtensionOptionsPage();
        } finally {
            chrome.runtime.openOptionsPage = originalOpen;
            chrome.runtime.getURL = originalGetURL;
            window.open = originalWindowOpen;
        }

        assert.deepEqual(openedUrls, ['chrome-extension://test/options/options.html']);
    });
});
