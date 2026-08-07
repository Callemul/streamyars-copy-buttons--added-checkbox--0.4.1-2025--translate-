import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

// Мокаємо global.window для Node.js середовища
global.window = global;
global.prompt = mock.fn(() => 'test text');
global.document = {
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    querySelectorAll: mock.fn(() => []),
    getElementById: mock.fn(),
    createElement: mock.fn(() => ({
        addEventListener: mock.fn(),
        setAttribute: mock.fn(),
        getAttribute: mock.fn(),
        style: {},
        classList: { add: mock.fn(), remove: mock.fn(), contains: mock.fn() }
    }))
};

const { isAllowedBannerAction } = await import('../modules/event_banners/mouse_handlers.ts');
const { handleBannerMouseUp } = await import('../modules/event_banners/mouseup_handler.ts');

describe('Event Banners MouseUp Handler tests', () => {

    test('isAllowedBannerAction returns true for valid create-from-text action', () => {
        assert.strictEqual(isAllowedBannerAction('create-from-text', undefined), true);
    });

    test('isAllowedBannerAction returns true for valid delete-selected-banners action', () => {
        assert.strictEqual(isAllowedBannerAction('delete-selected-banners', undefined), true);
    });

    test('isAllowedBannerAction returns true for valid copy-banner action', () => {
        assert.strictEqual(isAllowedBannerAction('copy-banner', 'banner'), true);
    });

    test('isAllowedBannerAction returns true for mark-stream action', () => {
        assert.strictEqual(isAllowedBannerAction('mark-stream', undefined), true);
    });

    test('isAllowedBannerAction returns true for mark-audience action', () => {
        assert.strictEqual(isAllowedBannerAction('mark-audience', undefined), true);
    });

    test('isAllowedBannerAction returns true for mark-prayer action', () => {
        assert.strictEqual(isAllowedBannerAction('mark-prayer', undefined), true);
    });

    test('isAllowedBannerAction returns false for invalid action', () => {
        assert.strictEqual(isAllowedBannerAction('invalid-action', undefined), false);
    });

    test('isAllowedBannerAction returns false for copy-banner without banner type', () => {
        assert.strictEqual(isAllowedBannerAction('copy-banner', 'other'), false);
    });

    test('handleBannerMouseUp calls preventDefault and stopPropagation for valid button', () => {
        const mockButton = {
            dataset: { action: 'create-from-text' },
            closest: mock.fn(() => mockButton)
        };

        const mockEvent = {
            target: mockButton,
            button: 0,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const mockSelf = {
            BANNER_CREATOR: { processAndCreateBanners: mock.fn() },
            SELECTORS: {},
            UI: {},
            UTILS: {}
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 1);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 1);
    });

    test('handleBannerMouseUp does nothing for right click (button !== 0)', () => {
        const mockButton = {
            dataset: { action: 'create-from-text' },
            closest: mock.fn(() => mockButton)
        };

        const mockEvent = {
            target: mockButton,
            button: 2,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const mockSelf = {
            BANNER_CREATOR: {},
            SELECTORS: {},
            UI: {},
            UTILS: {}
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 0);
    });

    test('handleBannerMouseUp does nothing when button not found', () => {
        const mockEvent = {
            target: null,
            button: 0,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const mockSelf = {
            BANNER_CREATOR: {},
            SELECTORS: {},
            UI: {},
            UTILS: {}
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 0);
    });

    test('handleBannerMouseUp does nothing for disallowed action', () => {
        const mockButton = {
            dataset: { action: 'invalid-action' },
            closest: mock.fn(() => mockButton)
        };

        const mockEvent = {
            target: mockButton,
            button: 0,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const mockSelf = {
            BANNER_CREATOR: {},
            SELECTORS: {},
            UI: {},
            UTILS: {}
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 0);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 0);
    });
});