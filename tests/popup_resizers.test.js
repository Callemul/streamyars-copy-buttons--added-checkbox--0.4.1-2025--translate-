import test, { describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

// NOTE: This suite previously re-implemented the resizer logic inline and asserted against
// hand-rolled element stubs, so it never exercised popup/popup_resizers.ts at all. It now imports
// the real module and drives it through the Happy DOM globals registered in tests/setup/happy-dom.ts.

/** @type {Record<string, any>} */
let storageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            /** @type {Record<string, any>} */
            const res = {};
            for (const k of list) {
                if (k in storageStore) res[k] = storageStore[k];
            }
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(storageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageStore[k];
            if (cb) cb();
        }
    }
});

// Happy DOM ships a ResizeObserver, but it has no layout engine to fire it. Swap in a
// controllable double so tests can trigger observer callbacks deterministically.
/** @type {TestResizeObserver[]} */
const resizeObserverInstances = [];

class TestResizeObserver {
    constructor(callback) {
        this.callback = callback;
        this.observed = [];
        resizeObserverInstances.push(this);
    }
    observe(el) { this.observed.push(el); }
    unobserve(el) { this.observed = this.observed.filter(e => e !== el); }
    disconnect() { this.observed = []; }
    /** Manually invoke the observer callback with fake entries. */
    trigger(entries) { this.callback(entries, this); }
}

const OriginalResizeObserver = globalThis.ResizeObserver;
globalThis.ResizeObserver = TestResizeObserver;

const { getAllSheetIds } = await import('../modules/registry/sheets.ts');
const { POPUP_SHEET_KEYS, STORAGE_KEYS } = await import('../modules/storage/storage.ts');
const {
    initStep3Resizers,
    setupStep3ResizerEvents,
    setupResizeObserver,
    getTextareaIds,
    calculateDragPercent,
    applyDragPercent,
    saveDividerPosition,
    getActiveResizer,
    setActiveResizer
} = await import('../popup/popup_resizers.ts');

const SHEET_IDS = getAllSheetIds();
const CONTAINER_WIDTH = 800;
const CONTAINER_LEFT = 0;

function fakeRect(width, left) {
    return {
        width, left, x: left, right: left + width,
        top: 0, y: 0, bottom: 0, height: 0,
        toJSON() { return this; }
    };
}

/** Builds a real step-3 column layout (left | divider | right) per sheet. */
function buildResizerDom({ width = CONTAINER_WIDTH, left = CONTAINER_LEFT, sheetIds = SHEET_IDS } = {}) {
    /** @type {Record<string, {columns: HTMLElement, left: HTMLElement, divider: HTMLElement, right: HTMLElement}>} */
    const created = {};

    for (const sId of sheetIds) {
        const columns = document.createElement('div');
        columns.id = `step3Columns__${sId}`;

        const leftEl = document.createElement('div');
        leftEl.id = `step3Left__${sId}`;
        const divider = document.createElement('div');
        divider.id = `step3Divider__${sId}`;
        const rightEl = document.createElement('div');
        rightEl.id = `step3Right__${sId}`;

        columns.appendChild(leftEl);
        columns.appendChild(divider);
        columns.appendChild(rightEl);
        document.body.appendChild(columns);

        // Happy DOM has no layout engine, so getBoundingClientRect() is all zeros.
        // Stub it to a realistic 800px-wide container.
        mock.method(columns, 'getBoundingClientRect', () => fakeRect(width, left));

        created[sId] = { columns, left: leftEl, divider, right: rightEl };
    }
    return created;
}

/** Builds a real textarea per id tracked by the resize observer. */
function buildTextareaDom() {
    /** @type {Record<string, HTMLTextAreaElement>} */
    const created = {};
    for (const id of getTextareaIds()) {
        const ta = document.createElement('textarea');
        ta.id = id;
        document.body.appendChild(ta);
        created[id] = ta;
    }
    return created;
}

const mouseDown = () => new MouseEvent('mousedown', { bubbles: true, cancelable: true });
const mouseMove = (clientX) => new MouseEvent('mousemove', { clientX, bubbles: true });
const mouseUp = () => new MouseEvent('mouseup', { bubbles: true });

describe('popup_resizers', () => {
    /** @type {ReturnType<typeof mock.method>} */
    let documentAddEventListener;

    beforeEach(() => {
        storageStore = {};
        resizeObserverInstances.length = 0;
        setActiveResizer(null);
        document.body.innerHTML = '';
        document.body.style.userSelect = '';
        // Spy but keep real behavior, so dispatched events still reach the handlers.
        documentAddEventListener = mock.method(document, 'addEventListener');
    });

    afterEach(() => {
        // setupStep3ResizerEvents() never detaches its document listeners; strip them
        // so they do not accumulate on the shared document across tests.
        for (const call of documentAddEventListener.mock.calls) {
            const [type, handler, options] = call.arguments;
            document.removeEventListener(type, handler, options);
        }
        mock.restoreAll();
        setActiveResizer(null);
        document.body.innerHTML = '';
        document.body.style.userSelect = '';
    });

    test('initStep3Resizers sets up mousedown listeners on dividers', () => {
        const dom = buildResizerDom();
        const spies = Object.fromEntries(
            SHEET_IDS.map(sId => [sId, mock.method(dom[sId].divider, 'addEventListener')])
        );

        initStep3Resizers();

        for (const sId of SHEET_IDS) {
            assert.ok(
                spies[sId].mock.calls.some(c => c.arguments[0] === 'mousedown'),
                `divider for ${sId} should listen for mousedown`
            );
        }
    });

    test('initStep3Resizers skips sheets with an incomplete layout', () => {
        const dom = buildResizerDom();
        dom[SHEET_IDS[0]].right.remove();
        const spy = mock.method(dom[SHEET_IDS[0]].divider, 'addEventListener');

        initStep3Resizers();

        assert.equal(spy.mock.calls.length, 0);
    });

    test('mousedown on divider sets activeResizer and adds dragging class', () => {
        const dom = buildResizerDom();
        initStep3Resizers();

        const { divider, left, right } = dom[SHEET_IDS[0]];
        const event = mouseDown();
        divider.dispatchEvent(event);

        const active = getActiveResizer();
        assert.ok(active);
        assert.equal(active.sId, SHEET_IDS[0]);
        assert.equal(active.divider, divider);
        assert.equal(active.left, left);
        assert.equal(active.right, right);
        assert.equal(event.defaultPrevented, true);
        assert.equal(divider.classList.contains('is-dragging'), true);
        assert.equal(document.body.style.userSelect, 'none');
    });

    test('mousemove updates left/right flex when dragging', () => {
        const dom = buildResizerDom();
        initStep3Resizers();
        setupStep3ResizerEvents();

        const { divider, left, right } = dom[SHEET_IDS[0]];
        divider.dispatchEvent(mouseDown());
        document.dispatchEvent(mouseMove(600));

        // 600px out of 800px = 75%. Browsers (and Happy DOM) expand the `flex`
        // shorthand, so assert on the flex-basis longhand.
        assert.equal(left.style.flexBasis, '75%');
        assert.equal(right.style.flexBasis, '25%');
        assert.equal(left.style.flex, '1 1 75%');
        assert.equal(right.style.flex, '1 1 25%');
    });

    test('mousemove does nothing when no resizer is active', () => {
        const dom = buildResizerDom();
        setupStep3ResizerEvents();

        const { left, right } = dom[SHEET_IDS[0]];
        document.dispatchEvent(mouseMove(600));

        assert.equal(left.style.flexBasis, '');
        assert.equal(right.style.flexBasis, '');
    });

    test('mousemove clamps percent to the 15-85 range', () => {
        const dom = buildResizerDom();
        initStep3Resizers();
        setupStep3ResizerEvents();

        const { divider, left, right } = dom[SHEET_IDS[0]];
        divider.dispatchEvent(mouseDown());

        // Left bound: clientX 50 -> 6.25% -> clamped to 15%
        document.dispatchEvent(mouseMove(50));
        assert.equal(left.style.flexBasis, '15%');
        assert.equal(right.style.flexBasis, '85%');

        // Right bound: clientX 750 -> 93.75% -> clamped to 85%
        document.dispatchEvent(mouseMove(750));
        assert.equal(left.style.flexBasis, '85%');
        assert.equal(right.style.flexBasis, '15%');
    });

    test('calculateDragPercent falls back to 50 without a container or width', () => {
        const orphanDivider = document.createElement('div');
        assert.equal(calculateDragPercent(mouseMove(600), orphanDivider), 50);

        const dom = buildResizerDom({ width: 0 });
        assert.equal(calculateDragPercent(mouseMove(600), dom[SHEET_IDS[0]].divider), 50);
    });

    test('calculateDragPercent accounts for the container offset', () => {
        const dom = buildResizerDom({ width: 800, left: 200 });
        // clientX 600 - left 200 = 400px of 800px = 50%
        assert.equal(calculateDragPercent(mouseMove(600), dom[SHEET_IDS[0]].divider), 50);
    });

    test('applyDragPercent writes complementary flex values', () => {
        const left = document.createElement('div');
        const right = document.createElement('div');

        applyDragPercent(left, right, 30);

        assert.equal(left.style.flexBasis, '30%');
        assert.equal(right.style.flexBasis, '70%');
    });

    test('mouseup clears the drag state and saves the divider position', () => {
        const dom = buildResizerDom();
        initStep3Resizers();
        setupStep3ResizerEvents();

        const { divider, left, right } = dom[SHEET_IDS[0]];
        divider.dispatchEvent(mouseDown());
        document.dispatchEvent(mouseMove(600));
        document.dispatchEvent(mouseUp());

        assert.equal(getActiveResizer(), null);
        assert.equal(divider.classList.contains('is-dragging'), false);
        assert.equal(document.body.style.userSelect, '');

        const key = POPUP_SHEET_KEYS.dividerPos(SHEET_IDS[0]);
        assert.ok(key in storageStore, 'divider position should be persisted');
        assert.equal(typeof storageStore[key], 'number');
        // Both keys resolve to the same canonical storage key and must agree.
        assert.equal(storageStore[`syh:popup:divider_pos:${SHEET_IDS[0]}`], storageStore[key]);
    });

    test('mouseup does nothing when no resizer is active', () => {
        buildResizerDom();
        setupStep3ResizerEvents();

        document.dispatchEvent(mouseUp());

        assert.deepEqual(storageStore, {});
    });

    test('saved divider position uses flexBasis so it keeps the dragged percent', () => {
        const dom = buildResizerDom();
        const { left, right } = dom[SHEET_IDS[0]];

        left.style.flex = '60%';
        right.style.flex = '40%';

        // Real browsers serialize these as '1 1 60%' / '1 1 40%'.
        assert.equal(left.style.flex, '1 1 60%');
        assert.equal(right.style.flex, '1 1 40%');

        // Reading `flexBasis` ('60%' / '40%') instead of the expanded `flex` shorthand
        // keeps the actual dragged percentage instead of collapsing to 50.
        assert.equal(left.style.flexBasis, '60%');
        assert.equal(right.style.flexBasis, '40%');

        saveDividerPosition(SHEET_IDS[0], left, right);

        assert.equal(storageStore[POPUP_SHEET_KEYS.dividerPos(SHEET_IDS[0])], 60);
    });

    test('getTextareaIds covers the two shared textareas plus two per sheet', () => {
        const ids = getTextareaIds();

        assert.equal(ids.length, 2 + SHEET_IDS.length * 2);
        assert.ok(ids.includes('textArea1_oldText'));
        assert.ok(ids.includes('textArea2_generatedRuText'));
        for (const sId of SHEET_IDS) {
            assert.ok(ids.includes(`oldList__${sId}`));
            assert.ok(ids.includes(`newTelegram__${sId}`));
        }
    });

    test('setupResizeObserver observes all textareas', () => {
        buildTextareaDom();

        setupResizeObserver(() => true);

        assert.equal(resizeObserverInstances.length, 1);
        assert.equal(resizeObserverInstances[0].observed.length, 2 + SHEET_IDS.length * 2);
    });

    test('setupResizeObserver skips textareas missing from the DOM', () => {
        setupResizeObserver(() => true);

        assert.equal(resizeObserverInstances.length, 1);
        assert.equal(resizeObserverInstances[0].observed.length, 0);
    });

    test('resizeObserver saves textarea sizes to storage', () => {
        const textareas = buildTextareaDom();
        setupResizeObserver(() => true);

        const textarea = textareas.textArea1_oldText;
        textarea.style.width = '300px';
        textarea.style.height = '200px';

        resizeObserverInstances[0].trigger([{ target: textarea }]);

        // SYH_STORAGE.set() migrates the legacy 'tg_textarea_sizes' alias to the canonical key.
        const sizes = storageStore[STORAGE_KEYS.POPUP_TEXTAREA_SIZES];
        assert.ok(sizes, 'textarea sizes should be persisted');
        assert.equal(sizes.textArea1_oldText.width, '300px');
        assert.equal(sizes.textArea1_oldText.height, '200px');
    });

    test('resizeObserver merges sizes for multiple textareas', () => {
        const textareas = buildTextareaDom();
        setupResizeObserver(() => true);

        textareas.textArea1_oldText.style.width = '300px';
        textareas.textArea2_generatedRuText.style.height = '120px';

        resizeObserverInstances[0].trigger([
            { target: textareas.textArea1_oldText },
            { target: textareas.textArea2_generatedRuText }
        ]);

        const sizes = storageStore[STORAGE_KEYS.POPUP_TEXTAREA_SIZES];
        assert.equal(sizes.textArea1_oldText.width, '300px');
        assert.equal(sizes.textArea2_generatedRuText.height, '120px');
    });

    test('resizeObserver ignores entries without an inline size', () => {
        const textareas = buildTextareaDom();
        setupResizeObserver(() => true);

        resizeObserverInstances[0].trigger([{ target: textareas.textArea1_oldText }]);

        assert.equal(storageStore[STORAGE_KEYS.POPUP_TEXTAREA_SIZES], undefined);
    });

    test('resizeObserver does nothing when storage is not loaded', () => {
        const textareas = buildTextareaDom();
        setupResizeObserver(() => false);

        textareas.textArea1_oldText.style.width = '300px';
        resizeObserverInstances[0].trigger([{ target: textareas.textArea1_oldText }]);

        assert.equal(storageStore[STORAGE_KEYS.POPUP_TEXTAREA_SIZES], undefined);
    });

    test('multiple sheets each get their own resizer', () => {
        const dom = buildResizerDom();
        initStep3Resizers();
        setupStep3ResizerEvents();

        for (const sId of SHEET_IDS) {
            dom[sId].divider.dispatchEvent(mouseDown());

            const active = getActiveResizer();
            assert.ok(active, `resizer for ${sId} should activate`);
            assert.equal(active.sId, sId);
            assert.equal(active.divider, dom[sId].divider);

            document.dispatchEvent(mouseUp());
            assert.equal(getActiveResizer(), null);
        }
    });
});

// Restore the environment's original ResizeObserver once the suite is defined.
process.on('exit', () => {
    globalThis.ResizeObserver = OriginalResizeObserver;
});
