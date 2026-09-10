import assert from 'node:assert/strict';
import { test, describe, mock } from 'node:test';

// Мінімальний DOM-стаб: `bootstrap_dom` лише резолвить селектори, реальний DOM не потрібен.
global.window = global;
global.document = {
    querySelector: mock.fn(() => null),
    querySelectorAll: mock.fn(() => []),
    createElement: () => ({
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, contains: () => false },
        setAttribute() {},
        addEventListener() {},
        appendChild() {}
    }),
    body: { tagName: 'BODY' }
};

const {
    DOM_REGISTRATIONS,
    OBSERVER_CONTAINER_SELECTORS,
    resolveObserverContainer,
    setupDomRegistration
} = await import('../modules/streamyard/bootstrap/bootstrap_dom.ts');

function createObserverSpy() {
    const calls = [];
    return {
        calls,
        register: (selector, onAdded, onRemoved) => {
            calls.push({ selector, onAdded, onRemoved });
            return () => {};
        }
    };
}

describe('bootstrap_dom — реєстрація DOM-спостерігачів', () => {
    test('таблиця реєстрацій покриває всі шість зон StreamYard', () => {
        assert.deepEqual(
            DOM_REGISTRATIONS.map(r => r.selectorKey),
            ['commentBlock', 'bannerBlock', 'bannerHeader', 'starredHeaderWrap', 'starredTabButton', 'rightTabButtons']
        );
    });

    test('коментарі та банери мають і onAdded, і onRemoved', () => {
        const withCleanup = DOM_REGISTRATIONS.filter(r => typeof r.onRemoved === 'function');

        assert.deepEqual(withCleanup.map(r => r.selectorKey), ['commentBlock', 'bannerBlock']);
        for (const reg of DOM_REGISTRATIONS) {
            assert.equal(typeof reg.onAdded, 'function', `${reg.selectorKey} має мати onAdded`);
        }
    });

    test('setupDomRegistration резолвить перший селектор із масиву-фолбеку', () => {
        const observer = createObserverSpy();
        const selectors = {
            commentBlock: ['[data-primary]', '[data-fallback]'],
            bannerBlock: '.banner'
        };

        const registered = setupDomRegistration(observer, selectors, DOM_REGISTRATIONS.slice(0, 2));

        assert.equal(registered, 2);
        assert.deepEqual(observer.calls.map(c => c.selector), ['[data-primary]', '.banner']);
    });

    test('setupDomRegistration пропускає відсутні селектори замість реєстрації undefined', () => {
        const observer = createObserverSpy();

        const registered = setupDomRegistration(observer, { bannerBlock: '.banner' }, DOM_REGISTRATIONS.slice(0, 3));

        assert.equal(registered, 1);
        assert.equal(observer.calls.length, 1);
        assert.equal(observer.calls[0].selector, '.banner');
    });

    test('setupDomRegistration із реальним конфігом реєструє всі шість зон', () => {
        const observer = createObserverSpy();

        const registered = setupDomRegistration(observer);

        assert.equal(registered, DOM_REGISTRATIONS.length);
        for (const call of observer.calls) {
            assert.equal(typeof call.selector, 'string');
            assert.ok(call.selector.length > 0);
        }
    });

    test('resolveObserverContainer бере перший знайдений контейнер за пріоритетом', () => {
        const chat = { tagName: 'DIV', name: 'chat' };
        const app = { tagName: 'DIV', name: 'app' };

        const root = {
            querySelector: selector => {
                if (selector === '[data-testid="chat-container"]') return chat;
                if (selector === '#app') return app;
                return null;
            }
        };

        assert.equal(OBSERVER_CONTAINER_SELECTORS[0], '[data-testid="chat-container"]');
        assert.equal(resolveObserverContainer(root), chat);
    });

    test('resolveObserverContainer падає назад на #app, коли чату немає', () => {
        const app = { tagName: 'DIV', name: 'app' };
        const root = { querySelector: selector => (selector === '#app' ? app : null) };

        assert.equal(resolveObserverContainer(root), app);
    });

    test('resolveObserverContainer падає назад на document.body', () => {
        const root = { querySelector: () => null };

        assert.equal(resolveObserverContainer(root), document.body);
    });
});
