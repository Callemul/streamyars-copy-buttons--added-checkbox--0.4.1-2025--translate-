// Характеристичні тести публічного API `SYH_MESSAGING` (modules/messaging.ts).
//
// Написані ДО декомпозиції модуля і працюють виключно через експортований фасад,
// тому лишаються дійсними після розбиття на `messaging_context` / `messaging_senders`
// / `messaging_listener`. Будь-яке розходження в поведінці 1-в-1 валить саме їх.
//
// happy-dom дає window/document, але нічого не знає про chrome.* — рантайм розширення
// сідаємо через спільний `installChromeMock`.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_MESSAGING } = await import('../modules/messaging.ts');

/** Прибирає шум console.warn/error, які модуль пише у except-гілках. */
function silenceConsole() {
    const warn = console.warn;
    const error = console.error;
    console.warn = () => {};
    console.error = () => {};
    return () => {
        console.warn = warn;
        console.error = error;
    };
}

let restoreConsole = () => {};

beforeEach(() => {
    installChromeMock();
    restoreConsole = silenceConsole();
});

afterEach(() => {
    restoreConsole();
});

// ---------------------------------------------------------------------------

describe('messaging — isExtensionValid', () => {
    test('1. true, коли chrome.runtime.id доступний', () => {
        assert.equal(SYH_MESSAGING.isExtensionValid(), true);
    });

    test('2. false, коли chrome.runtime відсутній', () => {
        installChromeMock({ runtimeImpl: null });
        assert.equal(SYH_MESSAGING.isExtensionValid(), false);
    });

    test('3. false, коли chrome.runtime.id порожній (контекст вивантажено)', () => {
        installChromeMock({ runtimeImpl: { id: '', lastError: null } });
        assert.equal(SYH_MESSAGING.isExtensionValid(), false);
    });

    test('4. false, коли chrome взагалі недоступний', () => {
        globalThis.chrome = undefined;
        assert.equal(SYH_MESSAGING.isExtensionValid(), false);
    });

    test('5. false, коли доступ до chrome.runtime кидає "Extension context invalidated"', () => {
        const chrome = {};
        Object.defineProperty(chrome, 'runtime', {
            configurable: true,
            get() {
                throw new Error('Extension context invalidated.');
            }
        });
        globalThis.chrome = chrome;

        assert.equal(SYH_MESSAGING.isExtensionValid(), false, 'виняток має бути проковтнутий');
    });
});

// ---------------------------------------------------------------------------

describe('messaging — sendToBackground', () => {
    test('6. невалідний контекст -> null і жодного звернення до sendMessage', async () => {
        let called = false;
        installChromeMock({
            runtimeImpl: { id: '', sendMessage: () => { called = true; } }
        });

        assert.equal(await SYH_MESSAGING.sendToBackground({ action: 'PING' }), null);
        assert.equal(called, false, 'мертвий контекст не має торкатись рантайму');
    });

    test('7. відсутній chrome.runtime.sendMessage -> null', async () => {
        installChromeMock({ runtimeImpl: { id: 'x', lastError: null } });
        assert.equal(await SYH_MESSAGING.sendToBackground({ action: 'PING' }), null);
    });

    test('8. передає повідомлення 1-в-1 і повертає відповідь', async () => {
        let seen = null;
        globalThis.chrome.runtime.sendMessage = (message, cb) => {
            seen = message;
            cb({ ok: true });
        };

        const message = { action: 'GET_PRAYERS', text: 'привіт' };
        const result = await SYH_MESSAGING.sendToBackground(message);

        assert.deepEqual(result, { ok: true });
        assert.equal(seen, message, 'повідомлення передається без копіювання/мутації');
    });

    test('9. chrome.runtime.lastError -> null (а не reject)', async () => {
        globalThis.chrome.runtime.sendMessage = (_m, cb) => {
            globalThis.chrome.runtime.lastError = { message: 'Receiving end does not exist.' };
            cb({ ok: true });
        };

        assert.equal(await SYH_MESSAGING.sendToBackground({ action: 'PING' }), null);
    });

    test('10. undefined-відповідь нормалізується у null', async () => {
        globalThis.chrome.runtime.sendMessage = (_m, cb) => cb(undefined);
        assert.equal(await SYH_MESSAGING.sendToBackground({ action: 'PING' }), null);
    });

    test('11. синхронний виняток у sendMessage -> null, промис не відхиляється', async () => {
        globalThis.chrome.runtime.sendMessage = () => {
            throw new Error('Extension context invalidated.');
        };

        assert.equal(await SYH_MESSAGING.sendToBackground({ action: 'PING' }), null);
    });

    test('12. поважає ПЕРЕВИЗНАЧЕНИЙ this.isExtensionValid (пізнє зв’язування)', async () => {
        globalThis.chrome.runtime.sendMessage = (_m, cb) => cb({ ok: true });

        const original = SYH_MESSAGING.isExtensionValid;
        SYH_MESSAGING.isExtensionValid = () => false;
        try {
            assert.equal(
                await SYH_MESSAGING.sendToBackground({ action: 'PING' }),
                null,
                'гард має читатись через this, а не через модульний імпорт'
            );
        } finally {
            SYH_MESSAGING.isExtensionValid = original;
        }
    });
});

// ---------------------------------------------------------------------------

describe('messaging — sendToActiveTab', () => {
    test('13. невалідний контекст -> null', async () => {
        installChromeMock({ runtimeImpl: { id: '' } });
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('14. відсутній chrome.tabs.query -> null', async () => {
        installChromeMock({ withTabs: false });
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('15. немає активної вкладки -> null', async () => {
        globalThis.chrome.tabs.query = (_q, cb) => cb([]);
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);

        globalThis.chrome.tabs.query = (_q, cb) => cb(undefined);
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('16. вкладка без id -> null', async () => {
        globalThis.chrome.tabs.query = (_q, cb) => cb([{ url: 'https://streamyard.com' }]);
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('17. шле повідомлення саме в активну вкладку і повертає відповідь', async () => {
        let seenQuery = null;
        let seenTabId = null;
        let seenMessage = null;

        globalThis.chrome.tabs.query = (query, cb) => {
            seenQuery = query;
            cb([{ id: 42 }, { id: 99 }]);
        };
        globalThis.chrome.tabs.sendMessage = (tabId, message, cb) => {
            seenTabId = tabId;
            seenMessage = message;
            cb({ pong: true });
        };

        const message = { action: 'COPY_PRAYER', text: 'молитва' };
        const result = await SYH_MESSAGING.sendToActiveTab(message);

        assert.deepEqual(seenQuery, { active: true, currentWindow: true });
        assert.equal(seenTabId, 42, 'береться перша вкладка зі списку');
        assert.equal(seenMessage, message);
        assert.deepEqual(result, { pong: true });
    });

    test('18. lastError від вкладки -> null', async () => {
        globalThis.chrome.tabs.query = (_q, cb) => cb([{ id: 7 }]);
        globalThis.chrome.tabs.sendMessage = (_id, _m, cb) => {
            globalThis.chrome.runtime.lastError = { message: 'no receiver' };
            cb({ pong: true });
        };

        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('19. виняток у tabs.query -> null', async () => {
        globalThis.chrome.tabs.query = () => {
            throw new Error('boom');
        };
        assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
    });

    test('20. поважає ПЕРЕВИЗНАЧЕНИЙ this.isExtensionValid', async () => {
        globalThis.chrome.tabs.query = (_q, cb) => cb([{ id: 1 }]);
        globalThis.chrome.tabs.sendMessage = (_id, _m, cb) => cb({ pong: true });

        const original = SYH_MESSAGING.isExtensionValid;
        SYH_MESSAGING.isExtensionValid = () => false;
        try {
            assert.equal(await SYH_MESSAGING.sendToActiveTab({ action: 'PING' }), null);
        } finally {
            SYH_MESSAGING.isExtensionValid = original;
        }
    });
});

// ---------------------------------------------------------------------------

describe('messaging — onMessage', () => {
    /** Мінімальний реєстр слухачів поверх chrome.runtime.onMessage. */
    function trackListeners() {
        const listeners = [];
        globalThis.chrome.runtime.onMessage = {
            addListener: (fn) => listeners.push(fn),
            removeListener: (fn) => {
                const i = listeners.indexOf(fn);
                if (i !== -1) listeners.splice(i, 1);
            }
        };
        return listeners;
    }

    test('21. невалідний контекст -> no-op відписка і жодної реєстрації', () => {
        installChromeMock({ runtimeImpl: { id: '' } });
        let added = 0;
        globalThis.chrome.runtime.onMessage = { addListener: () => { added += 1; } };

        const unsubscribe = SYH_MESSAGING.onMessage(() => {});

        assert.equal(typeof unsubscribe, 'function');
        assert.equal(added, 0);
        assert.doesNotThrow(() => unsubscribe());
    });

    test('22. відсутній chrome.runtime.onMessage -> no-op відписка', () => {
        installChromeMock({ runtimeImpl: { id: 'x', lastError: null } });
        const unsubscribe = SYH_MESSAGING.onMessage(() => {});
        assert.equal(typeof unsubscribe, 'function');
        assert.doesNotThrow(() => unsubscribe());
    });

    test('23. реєструє слухача і прокидає (message, sender, sendResponse)', () => {
        const listeners = trackListeners();
        const seen = [];

        SYH_MESSAGING.onMessage((message, sender, sendResponse) => {
            seen.push({ message, sender, sendResponse });
        });

        assert.equal(listeners.length, 1);

        const message = { action: 'PING' };
        const sender = { tab: { id: 5 } };
        const sendResponse = () => {};
        listeners[0](message, sender, sendResponse);

        assert.equal(seen.length, 1);
        assert.equal(seen[0].message, message);
        assert.equal(seen[0].sender, sender);
        assert.equal(seen[0].sendResponse, sendResponse);
    });

    test('24. повертає результат колбека (true тримає канал для async-відповіді)', () => {
        const listeners = trackListeners();
        SYH_MESSAGING.onMessage(() => true);

        assert.equal(listeners[0]({ action: 'PING' }, {}, () => {}), true);
    });

    test('25. виняток у колбеку проковтується і повертається false', () => {
        const listeners = trackListeners();
        SYH_MESSAGING.onMessage(() => {
            throw new Error('listener boom');
        });

        assert.equal(listeners[0]({ action: 'PING' }, {}, () => {}), false);
    });

    test('26. відписка знімає рівно того самого слухача', () => {
        const listeners = trackListeners();

        const unsubscribeA = SYH_MESSAGING.onMessage(() => 'A');
        SYH_MESSAGING.onMessage(() => 'B');
        assert.equal(listeners.length, 2);

        unsubscribeA();

        assert.equal(listeners.length, 1);
        assert.equal(listeners[0]({}, {}, () => {}), 'B', 'лишився саме другий слухач');
    });

    test('27. відписка безпечна, якщо контекст став невалідним', () => {
        const listeners = trackListeners();
        const unsubscribe = SYH_MESSAGING.onMessage(() => {});
        assert.equal(listeners.length, 1);

        globalThis.chrome.runtime.id = '';

        assert.doesNotThrow(() => unsubscribe());
        assert.equal(listeners.length, 1, 'мертвий контекст не знімає слухача');
    });

    test('28. виняток у addListener не валить onMessage і лишає робочу відписку', () => {
        globalThis.chrome.runtime.onMessage = {
            addListener: () => {
                throw new Error('cannot add');
            },
            removeListener: () => {}
        };

        let unsubscribe;
        assert.doesNotThrow(() => {
            unsubscribe = SYH_MESSAGING.onMessage(() => {});
        });
        assert.equal(typeof unsubscribe, 'function');
        assert.doesNotThrow(() => unsubscribe());
    });

    test('29. виняток у removeListener проковтується', () => {
        globalThis.chrome.runtime.onMessage = {
            addListener: () => {},
            removeListener: () => {
                throw new Error('cannot remove');
            }
        };

        const unsubscribe = SYH_MESSAGING.onMessage(() => {});
        assert.doesNotThrow(() => unsubscribe());
    });
});

// ---------------------------------------------------------------------------

describe('messaging — контракт фасаду', () => {
    test('30. SYH_MESSAGING експонує рівно чотири методи сервісу', () => {
        assert.deepEqual(
            Object.keys(SYH_MESSAGING).sort(),
            ['isExtensionValid', 'onMessage', 'sendToActiveTab', 'sendToBackground']
        );
        for (const key of Object.keys(SYH_MESSAGING)) {
            assert.equal(typeof SYH_MESSAGING[key], 'function', `${key} має бути функцією`);
        }
    });
});

// ---------------------------------------------------------------------------
// Одиниці, що з'явилися після декомпозиції modules/messaging.ts.
// ---------------------------------------------------------------------------

describe('messaging — декомпозовані одиниці', () => {
    test('31. isExtensionValid — це напряму isExtensionContextValid, без обгортки', async () => {
        const { isExtensionContextValid } = await import('../modules/messaging_context.ts');
        assert.equal(SYH_MESSAGING.isExtensionValid, isExtensionContextValid);
    });

    test('32. sendRuntimeMessage поважає переданий гард і не смикає рантайм', async () => {
        const { sendRuntimeMessage } = await import('../modules/messaging_senders.ts');

        let called = false;
        globalThis.chrome.runtime.sendMessage = (_m, cb) => {
            called = true;
            cb({ ok: true });
        };

        assert.equal(await sendRuntimeMessage(() => false, { action: 'PING' }), null);
        assert.equal(called, false, 'гард false -> жодного виклику');

        assert.deepEqual(await sendRuntimeMessage(() => true, { action: 'PING' }), { ok: true });
        assert.equal(called, true);
    });

    test('33. sendActiveTabMessage поважає переданий гард', async () => {
        const { sendActiveTabMessage } = await import('../modules/messaging_senders.ts');

        globalThis.chrome.tabs.query = (_q, cb) => cb([{ id: 3 }]);
        globalThis.chrome.tabs.sendMessage = (_id, _m, cb) => cb({ pong: true });

        assert.equal(await sendActiveTabMessage(() => false, { action: 'PING' }), null);
        assert.deepEqual(await sendActiveTabMessage(() => true, { action: 'PING' }), { pong: true });
    });

    test('34. registerMessageListener: гард читається і на реєстрації, і на відписці', async () => {
        const { registerMessageListener } = await import('../modules/messaging_listener.ts');

        const listeners = [];
        globalThis.chrome.runtime.onMessage = {
            addListener: (fn) => listeners.push(fn),
            removeListener: (fn) => {
                const i = listeners.indexOf(fn);
                if (i !== -1) listeners.splice(i, 1);
            }
        };

        // Гард false на реєстрації -> слухач не додається.
        registerMessageListener(() => false, () => {});
        assert.equal(listeners.length, 0);

        // Гард, що «вмирає» між реєстрацією та відпискою.
        let alive = true;
        const unsubscribe = registerMessageListener(() => alive, () => {});
        assert.equal(listeners.length, 1);

        alive = false;
        unsubscribe();
        assert.equal(listeners.length, 1, 'мертвий контекст не знімає слухача');

        alive = true;
        unsubscribe();
        assert.equal(listeners.length, 0, 'живий контекст знімає слухача');
    });
});
