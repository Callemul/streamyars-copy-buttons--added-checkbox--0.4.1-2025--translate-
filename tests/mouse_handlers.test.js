import assert from 'node:assert';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

// NOTE: These tests run under the Happy DOM global registrator (see tests/setup/happy-dom.ts),
// which supplies a real `document`, `Event` and `MouseEvent`. The module under test relies on
// `Element.closest()` (including `:has()` selectors) and on re-dispatching a real `change` event,
// so we build a real DOM tree and dispatch real events rather than hand-rolling element stubs.

const { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction } =
    await import('../modules/event_banners/mouse_handlers.ts');

const SELECTORS = { bannerBlock: '.banner' };

/** Builds the banner fixture and returns the interesting nodes. */
function buildFixture() {
    document.body.innerHTML = `
        <div id="root">
            <div class="banner">
                <input type="checkbox" class="syh-checkbox" data-type="banner">
                <input type="text" class="text-field">
                <textarea class="text-area"></textarea>
                <button class="syh-button" data-type="banner">Custom banner</button>
                <button class="syh-button" data-action="create-from-text">From text</button>
                <button class="syh-button" data-action="delete-selected-banners">Delete</button>
                <button class="edit-btn"><svg class="lucide-pencil"></svg></button>
                <button class="delete-btn"><svg class="lucide-trash-2"></svg></button>
                <span class="plain">plain area</span>
            </div>
            <span class="outside">outside any banner</span>
        </div>
    `;

    const $ = (sel) => document.querySelector(sel);
    return {
        root: $('#root'),
        banner: $('.banner'),
        checkbox: $('.syh-checkbox[data-type="banner"]'),
        textField: $('.text-field'),
        textArea: $('.text-area'),
        customButton: $('.syh-button[data-type="banner"]'),
        createFromText: $('.syh-button[data-action="create-from-text"]'),
        deleteSelected: $('.syh-button[data-action="delete-selected-banners"]'),
        editIcon: $('.edit-btn svg'),
        deleteIcon: $('.delete-btn svg'),
        plain: $('.plain'),
        outside: $('.outside')
    };
}

/**
 * Dispatches a real event on `el` so the DOM assigns `event.target` naturally,
 * runs `handler` as the listener, and returns the event plus whether it
 * propagated up to `#root` (i.e. whether stopPropagation() was called).
 */
function dispatchTo(el, event, handler) {
    let reachedRoot = false;
    const rootListener = () => { reachedRoot = true; };
    const root = document.getElementById('root');

    root.addEventListener(event.type, rootListener);
    el.addEventListener(event.type, handler);
    el.dispatchEvent(event);
    el.removeEventListener(event.type, handler);
    root.removeEventListener(event.type, rootListener);

    return { event, reachedRoot };
}

const contextMenuEvent = () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
const mouseDownEvent = (button) => new MouseEvent('mousedown', { button, bubbles: true, cancelable: true });

describe('mouse_handlers tests', () => {
    let dom;

    beforeEach(() => {
        mock.reset();
        dom = buildFixture();
    });

    afterEach(() => {
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    describe('handleBannerContextMenu', () => {
        test('should do nothing if target is null', () => {
            // A detached event never dispatched has a null target.
            const event = contextMenuEvent();
            assert.strictEqual(event.target, null);
            assert.doesNotThrow(() => handleBannerContextMenu(event, SELECTORS));
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should do nothing if selectors or bannerBlock is null', () => {
            for (const selectors of [null, {}, { bannerBlock: null }]) {
                const { event } = dispatchTo(dom.plain, contextMenuEvent(), (e) => {
                    assert.doesNotThrow(() => handleBannerContextMenu(e, selectors));
                });
                assert.strictEqual(event.defaultPrevented, false);
            }
        });

        test('should do nothing if bannerBlock not found', () => {
            const { event, reachedRoot } = dispatchTo(dom.outside, contextMenuEvent(), (e) => {
                handleBannerContextMenu(e, SELECTORS);
            });

            assert.strictEqual(event.defaultPrevented, false);
            assert.strictEqual(reachedRoot, true, 'event should keep propagating');
            assert.strictEqual(dom.checkbox.checked, false);
        });

        test('should prevent default and toggle checkbox for valid banner', () => {
            const changeEvents = [];
            dom.checkbox.addEventListener('change', (e) => changeEvents.push(e));
            assert.strictEqual(dom.checkbox.checked, false);

            const { event, reachedRoot } = dispatchTo(dom.plain, contextMenuEvent(), (e) => {
                handleBannerContextMenu(e, SELECTORS);
            });

            assert.strictEqual(event.defaultPrevented, true);
            assert.strictEqual(reachedRoot, false, 'stopPropagation() should stop the event');
            assert.strictEqual(dom.checkbox.checked, true);
            assert.strictEqual(changeEvents.length, 1);
            assert.strictEqual(changeEvents[0].bubbles, true);
        });

        test('should toggle the checkbox back off on a second context menu', () => {
            dispatchTo(dom.plain, contextMenuEvent(), (e) => handleBannerContextMenu(e, SELECTORS));
            assert.strictEqual(dom.checkbox.checked, true);

            dispatchTo(dom.plain, contextMenuEvent(), (e) => handleBannerContextMenu(e, SELECTORS));
            assert.strictEqual(dom.checkbox.checked, false);
        });

        test('should do nothing if target is input or textarea', () => {
            for (const target of [dom.textField, dom.textArea, dom.customButton]) {
                const { event } = dispatchTo(target, contextMenuEvent(), (e) => {
                    handleBannerContextMenu(e, SELECTORS);
                });

                assert.strictEqual(event.defaultPrevented, false);
                assert.strictEqual(dom.checkbox.checked, false);
            }
        });

        test('should do nothing if target is system edit/delete button', () => {
            for (const target of [dom.editIcon, dom.deleteIcon]) {
                const { event } = dispatchTo(target, contextMenuEvent(), (e) => {
                    handleBannerContextMenu(e, SELECTORS);
                });

                assert.strictEqual(event.defaultPrevented, false);
                assert.strictEqual(dom.checkbox.checked, false);
            }
        });

        test('should not throw when the banner has no checkbox', () => {
            dom.checkbox.remove();

            const { event } = dispatchTo(dom.plain, contextMenuEvent(), (e) => {
                assert.doesNotThrow(() => handleBannerContextMenu(e, SELECTORS));
            });

            assert.strictEqual(event.defaultPrevented, true);
        });
    });

    describe('handleBannerMouseDown', () => {
        test('should do nothing if target is null', () => {
            const event = mouseDownEvent(1);
            assert.strictEqual(event.target, null);
            assert.doesNotThrow(() => handleBannerMouseDown(event));
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should prevent default for middle click on syh-button', () => {
            const { event } = dispatchTo(dom.customButton, mouseDownEvent(1), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, true);
        });

        test('should prevent default for middle click on create-from-text button', () => {
            const { event } = dispatchTo(dom.createFromText, mouseDownEvent(1), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, true);
        });

        test('should prevent default for middle click on delete-selected-banners button', () => {
            const { event } = dispatchTo(dom.deleteSelected, mouseDownEvent(1), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, true);
        });

        test('should prevent default for middle click on a child of a matching button', () => {
            const icon = document.createElement('span');
            dom.customButton.appendChild(icon);

            const { event } = dispatchTo(icon, mouseDownEvent(1), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, true);
        });

        test('should not prevent default for left click', () => {
            const { event } = dispatchTo(dom.customButton, mouseDownEvent(0), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should not prevent default for right click', () => {
            const { event } = dispatchTo(dom.customButton, mouseDownEvent(2), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should not prevent default for non-matching button', () => {
            const { event } = dispatchTo(dom.outside, mouseDownEvent(1), handleBannerMouseDown);
            assert.strictEqual(event.defaultPrevented, false);
        });
    });

    describe('isAllowedBannerAction', () => {
        test('should return true for create-from-text action', () => {
            assert.strictEqual(isAllowedBannerAction('create-from-text', ''), true);
        });

        test('should return true for delete-selected-banners action', () => {
            assert.strictEqual(isAllowedBannerAction('delete-selected-banners', ''), true);
        });

        test('should return true for mark-stream action', () => {
            assert.strictEqual(isAllowedBannerAction('mark-stream', ''), true);
        });

        test('should return true for mark-audience action', () => {
            assert.strictEqual(isAllowedBannerAction('mark-audience', ''), true);
        });

        test('should return true for mark-prayer action', () => {
            assert.strictEqual(isAllowedBannerAction('mark-prayer', ''), true);
        });

        test('should return true for banner type', () => {
            assert.strictEqual(isAllowedBannerAction('', 'banner'), true);
            assert.strictEqual(isAllowedBannerAction('some-action', 'banner'), true);
        });

        test('should return false for other actions and types', () => {
            assert.strictEqual(isAllowedBannerAction('other-action', 'other-type'), false);
            assert.strictEqual(isAllowedBannerAction('', ''), false);
            assert.strictEqual(isAllowedBannerAction(undefined, undefined), false);
        });
    });
});
