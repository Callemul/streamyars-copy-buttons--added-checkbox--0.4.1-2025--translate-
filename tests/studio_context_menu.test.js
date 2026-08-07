import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

global.window = global;
global.document = {
    querySelectorAll: mock.fn(() => []),
    body: {}
};

const { createContextMenuHandler } = await import('../youtube/studio/studio_context_menu.ts');

describe('Studio Context Menu tests', () => {

    test('createContextMenuHandler returns a function', () => {
        const handler = createContextMenuHandler({ current: true }, () => true);
        assert.strictEqual(typeof handler, 'function');
    });

    test('handler returns early when disabled', () => {
        const handler = createContextMenuHandler({ current: false }, () => true);
        const mockEvent = {
            preventDefault: mock.fn(),
            stopPropagation: mock.fn(),
            stopImmediatePropagation: mock.fn(),
            target: null
        };
        handler(mockEvent);
        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
    });

    test('handler returns early when not on comments page', () => {
        const handler = createContextMenuHandler({ current: true }, () => false);
        const mockEvent = {
            preventDefault: mock.fn(),
            stopPropagation: mock.fn(),
            stopImmediatePropagation: mock.fn(),
            target: {}
        };
        handler(mockEvent);
        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
    });

    test('handler returns early when target is null', () => {
        const handler = createContextMenuHandler({ current: true }, () => true);
        const mockEvent = {
            preventDefault: mock.fn(),
            stopPropagation: mock.fn(),
            stopImmediatePropagation: mock.fn(),
            target: null
        };
        handler(mockEvent);
        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
    });

    test('handler returns early when no thread element found', () => {
        const handler = createContextMenuHandler({ current: true }, () => true);
        const mockTarget = {
            closest: mock.fn(() => null)
        };
        const mockEvent = {
            preventDefault: mock.fn(),
            stopPropagation: mock.fn(),
            stopImmediatePropagation: mock.fn(),
            target: mockTarget
        };
        handler(mockEvent);
        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
    });

    test('handler returns early when target is a button', () => {
        const handler = createContextMenuHandler({ current: true }, () => true);
        const mockButton = { tagName: 'BUTTON' };
        const mockTarget = {
            closest: mock.fn((selector) => selector.includes('button') ? mockButton : null)
        };
        const mockEvent = {
            preventDefault: mock.fn(),
            stopPropagation: mock.fn(),
            stopImmediatePropagation: mock.fn(),
            target: mockTarget
        };
        handler(mockEvent);
        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
    });
});