import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { batchRenderItems } from '../popup/render_utils.ts';

// NOTE: These tests run under the Happy DOM global registrator (see tests/setup/happy-dom.ts).
// `batchRenderItems` uses `document.createDocumentFragment()` internally, so the elements produced
// by `renderItem` must be real DOM nodes - plain object stubs cannot be appended to a real fragment.

/** Creates a real detached container attached to the document so layout APIs behave normally. */
function createContainer() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return container;
}

function createItemRenderer() {
    return (item) => {
        const el = document.createElement('span');
        el.textContent = item;
        return el;
    };
}

describe('batchRenderItems Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('1. batchRenderItems renders initial batch synchronously and clears container', () => {
        const container = createContainer();
        container.innerHTML = '<span>stale</span>';
        const items = Array.from({ length: 50 }, (_, i) => `item_${i}`);

        const cancel = batchRenderItems(
            container,
            items,
            createItemRenderer(),
            { batchSize: 10, clearContainer: true }
        );

        try {
            assert.equal(container.children.length, 10);
            assert.equal(container.children[0].textContent, 'item_0');
            assert.equal(container.children[9].textContent, 'item_9');
        } finally {
            cancel();
        }
    });

    test('2. cancel stops further batch execution', async () => {
        const container = createContainer();
        const items = Array.from({ length: 100 }, (_, i) => `item_${i}`);

        const cancel = batchRenderItems(
            container,
            items,
            createItemRenderer(),
            { batchSize: 20 }
        );

        assert.equal(container.children.length, 20);
        cancel();

        // Give any already-scheduled frame/timeout a chance to (not) run.
        await new Promise((resolve) => setTimeout(resolve, 20));

        // After cancel, no more items should be added
        assert.equal(container.children.length, 20);
    });

    test('3. renders every item across batches and fires onComplete', async () => {
        const container = createContainer();
        const items = Array.from({ length: 45 }, (_, i) => `item_${i}`);

        const completed = await new Promise((resolve) => {
            batchRenderItems(
                container,
                items,
                createItemRenderer(),
                { batchSize: 10, onComplete: () => resolve(true) }
            );
        });

        assert.equal(completed, true);
        assert.equal(container.children.length, 45);
        assert.equal(container.children[44].textContent, 'item_44');
    });

    test('4. empty item list clears container and completes immediately', () => {
        const container = createContainer();
        container.innerHTML = '<span>stale</span>';

        let completeCalls = 0;
        const cancel = batchRenderItems(
            container,
            [],
            createItemRenderer(),
            { onComplete: () => { completeCalls += 1; } }
        );

        assert.equal(completeCalls, 1);
        assert.equal(container.children.length, 0);
        cancel();
    });

    test('5. null elements returned by renderItem are skipped', () => {
        const container = createContainer();
        const items = Array.from({ length: 10 }, (_, i) => i);

        const cancel = batchRenderItems(
            container,
            items,
            (item) => {
                if (item % 2 !== 0) return null;
                const el = document.createElement('span');
                el.textContent = `item_${item}`;
                return el;
            },
            { batchSize: 10 }
        );

        try {
            assert.equal(container.children.length, 5);
            assert.equal(container.children[0].textContent, 'item_0');
            assert.equal(container.children[4].textContent, 'item_8');
        } finally {
            cancel();
        }
    });
});
