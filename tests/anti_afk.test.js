import assert from 'node:assert';
import { test, describe } from 'node:test';

const { checkAndClickAntiAfk, startAntiAfk, stopAntiAfk } = await import('../modules/anti_afk.ts');

/**
 * Simple DOM element mock for testing Anti-AFK without heavy JSDOM dependency
 */
function createMockNode(tagName, attrs = {}, children = [], textContent = '') {
    let clicked = false;
    const attributes = { ...attrs };

    const node = {
        tagName: tagName.toUpperCase(),
        textContent,
        children,
        get wasClicked() {
            return clicked;
        },
        click() {
            clicked = true;
        },
        getAttribute(name) {
            return attributes[name] !== undefined ? attributes[name] : null;
        },
        setAttribute(name, value) {
            attributes[name] = value;
        },
        querySelector(selector) {
            const res = this.querySelectorAll(selector);
            return res.length > 0 ? res[0] : null;
        },
        querySelectorAll(selector) {
            const results = [];
            function walk(current) {
                for (const child of current.children) {
                    if (matches(child, selector)) {
                        results.push(child);
                    }
                    walk(child);
                }
            }
            walk(this);
            return results;
        }
    };
    return node;
}

function matches(el, selector) {
    if (selector === 'button') {
        return el.tagName === 'BUTTON';
    }
    if (selector === 'div[role="dialog"][aria-label="Are you still there?"]') {
        return el.tagName === 'DIV' && el.getAttribute('role') === 'dialog' && el.getAttribute('aria-label') === 'Are you still there?';
    }
    if (selector === 'div[role="dialog"]') {
        return el.tagName === 'DIV' && el.getAttribute('role') === 'dialog';
    }
    if (selector === '[aria-modal="true"]') {
        return el.getAttribute('aria-modal') === 'true';
    }
    if (selector === 'div[class*="modal"]') {
        return el.tagName === 'DIV' && (el.getAttribute('class') || '').includes('modal');
    }
    if (selector === 'div[class*="Dialog"]') {
        return el.tagName === 'DIV' && (el.getAttribute('class') || '').includes('Dialog');
    }
    return false;
}

describe('Anti-AFK Module Tests', () => {

    test('1. Intercepts AFK modal with exact "Stay in the studio" button', () => {
        const stayButton = createMockNode('button', {}, [], 'Stay in the studio');
        const dialog = createMockNode('div', { role: 'dialog', 'aria-label': 'Are you still there?' }, [stayButton]);
        const root = createMockNode('div', {}, [dialog]);

        const result = checkAndClickAntiAfk(root);
        assert.strictEqual(result, true, 'checkAndClickAntiAfk should return true');
        assert.strictEqual(stayButton.wasClicked, true, 'Stay in the studio button should be clicked');
    });

    test('2. Intercepts AFK modal with "Stay in studio" (short variant)', () => {
        const stayButton = createMockNode('button', {}, [], 'Stay in studio');
        const dialog = createMockNode('div', { role: 'dialog' }, [stayButton]);
        const root = createMockNode('div', {}, [dialog]);

        const result = checkAndClickAntiAfk(root);
        assert.strictEqual(result, true);
        assert.strictEqual(stayButton.wasClicked, true);
    });

    test('3. Intercepts AFK modal with extra whitespace and mixed casing', () => {
        const stayButton = createMockNode('button', {}, [], '  STAY IN THE STUDIO  \n');
        const dialog = createMockNode('div', { 'aria-modal': 'true' }, [stayButton]);
        const root = createMockNode('div', {}, [dialog]);

        const result = checkAndClickAntiAfk(root);
        assert.strictEqual(result, true);
        assert.strictEqual(stayButton.wasClicked, true);
    });

    test('4. Intercepts Ukrainian localized button text "Залишитися в студії"', () => {
        const stayButton = createMockNode('button', {}, [], 'Залишитися в студії');
        const dialog = createMockNode('div', { role: 'dialog' }, [stayButton]);
        const root = createMockNode('div', {}, [dialog]);

        const i18nMock = {
            getMessage: (key) => key === 'stayInStudio' ? 'Залишитися в студії' : ''
        };

        const result = checkAndClickAntiAfk(root, i18nMock);
        assert.strictEqual(result, true);
        assert.strictEqual(stayButton.wasClicked, true);
    });

    test('5. Intercepts Russian localized button text "Остаться в студии"', () => {
        const stayButton = createMockNode('button', {}, [], 'Остаться в студии');
        const dialog = createMockNode('div', { role: 'dialog' }, [stayButton]);
        const root = createMockNode('div', {}, [dialog]);

        const result = checkAndClickAntiAfk(root);
        assert.strictEqual(result, true);
        assert.strictEqual(stayButton.wasClicked, true);
    });

    test('6. Returns false when no modal or stay button is present', () => {
        const otherButton = createMockNode('button', {}, [], 'Cancel Stream');
        const root = createMockNode('div', {}, [otherButton]);

        const result = checkAndClickAntiAfk(root);
        assert.strictEqual(result, false);
        assert.strictEqual(otherButton.wasClicked, false);
    });

    test('7. Returns false gracefully for null or empty document', () => {
        assert.strictEqual(checkAndClickAntiAfk(null), false);
    });

    test('8. startAntiAfk initializes MutationObserver and handles added nodes', () => {
        let observerCallback = null;
        let observerObserved = false;
        let observerDisconnected = false;

        class MockMutationObserver {
            constructor(callback) {
                observerCallback = callback;
            }
            observe(target, options) {
                observerObserved = true;
            }
            disconnect() {
                observerDisconnected = true;
            }
        }

        global.MutationObserver = MockMutationObserver;

        const stayButton = createMockNode('button', {}, [], 'Stay in the studio');
        const dialog = createMockNode('div', { role: 'dialog' }, [stayButton]);
        const rootNode = createMockNode('div', {}, [dialog]);

        startAntiAfk({}, null, null, rootNode);
        assert.strictEqual(observerObserved, true, 'MutationObserver should start observing target node');

        if (observerCallback) {
            observerCallback([{ addedNodes: [dialog] }]);
        }

        assert.strictEqual(stayButton.wasClicked, true, 'Button should be clicked when MutationObserver fires');

        stopAntiAfk();
        assert.strictEqual(observerDisconnected, true, 'stopAntiAfk should disconnect MutationObserver');
    });

});
