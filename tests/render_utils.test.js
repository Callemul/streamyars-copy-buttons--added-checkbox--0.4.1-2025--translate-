import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { batchRenderItems } from '../modules/render_utils.ts';

function createMockElement(tagName = 'div') {
    const children = [];
    return {
        tagName,
        children,
        style: {},
        innerHTML: '',
        appendChild(child) {
            if (child.nodeType === 11) { // DocumentFragment
                children.push(...child.children);
            } else {
                children.push(child);
            }
        },
        nodeType: 1
    };
}

function createMockFragment() {
    const children = [];
    return {
        nodeType: 11,
        children,
        appendChild(child) {
            children.push(child);
        }
    };
}

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        createElement: createMockElement,
        createDocumentFragment: createMockFragment
    };
}

describe('batchRenderItems Tests', () => {
    test('1. batchRenderItems renders initial batch synchronously and clears container', () => {
        const container = createMockElement();
        container.parentNode = createMockElement();
        const items = Array.from({ length: 50 }, (_, i) => `item_${i}`);

        const cancel = batchRenderItems(
            container,
            items,
            (item) => {
                const el = createMockElement('span');
                el.textContent = item;
                return el;
            },
            { batchSize: 10, clearContainer: true }
        );

        assert.equal(container.children.length, 10);
        assert.equal(container.children[0].textContent, 'item_0');
        assert.equal(container.children[9].textContent, 'item_9');

        cancel();
    });

    test('2. cancel stops further batch execution', () => {
        const container = createMockElement();
        container.parentNode = createMockElement();
        const items = Array.from({ length: 100 }, (_, i) => `item_${i}`);

        const cancel = batchRenderItems(
            container,
            items,
            (item) => {
                const el = createMockElement('span');
                el.textContent = item;
                return el;
            },
            { batchSize: 20 }
        );

        assert.equal(container.children.length, 20);
        cancel();

        // After cancel, no more items should be added
        assert.equal(container.children.length, 20);
    });
});
