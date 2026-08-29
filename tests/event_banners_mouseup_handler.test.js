import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

// Мокаємо global.window для Node.js середовища
global.window = global;
global.prompt = mock.fn(() => 'test text');
global.document = {
    body: {
        appendChild: mock.fn(),
        removeChild: mock.fn()
    },
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    querySelectorAll: mock.fn(() => []),
    getElementById: mock.fn(),
    createElement: mock.fn(() => ({
        addEventListener: mock.fn(),
        setAttribute: mock.fn(),
        getAttribute: mock.fn(),
        style: {},
        classList: { add: mock.fn(), remove: mock.fn(), contains: mock.fn() },
        querySelector: mock.fn(),
        querySelectorAll: mock.fn(() => [])
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

    test('handleBannerMouseUp executes handleCopyBannerAction on copy-banner', () => {
        const mockCheckbox = {
            checked: false,
            dispatchEvent: mock.fn()
        };
        const mockBannerBlock = {
            querySelector: mock.fn((selector) => {
                if (selector === '.syh-checkbox') return mockCheckbox;
                if (selector === '.banner-text-selector') return { textContent: 'Banner Copied Text' };
                return null;
            })
        };
        const mockButton = {
            dataset: { action: 'copy-banner', type: 'banner' },
            closest: mock.fn((selector) => {
                if (selector === '.syh-button') return mockButton;
                if (selector === '.banner-block-selector') return mockBannerBlock;
                return null;
            })
        };

        const mockEvent = {
            target: mockButton,
            button: 0,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const copyAndShowBannerMock = mock.fn();
        const mockSelf = {
            BANNER_CREATOR: {},
            SELECTORS: {
                bannerBlock: '.banner-block-selector',
                bannerText: '.banner-text-selector'
            },
            UI: {},
            UTILS: {
                copyAndShowBanner: copyAndShowBannerMock
            }
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 1);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 1);
        assert.strictEqual(copyAndShowBannerMock.mock.callCount(), 1);
        const args = copyAndShowBannerMock.mock.calls[0].arguments;
        assert.strictEqual(args[0], 'Banner Copied Text');
        assert.strictEqual(args[1], 'Текст з Банера 🗞');
        assert.strictEqual(mockCheckbox.checked, true);
        assert.strictEqual(mockCheckbox.dispatchEvent.mock.callCount(), 1);
    });

    test('handleBannerMouseUp executes handleMarkBannerCategoryAction on mark-stream', async () => {
        const mockBannerBlock = {
            querySelector: mock.fn((selector) => {
                if (selector === '.banner-text-selector') return { textContent: 'Banner Stream Text' };
                return null;
            })
        };
        const mockButton = {
            dataset: { action: 'mark-stream' },
            closest: mock.fn((selector) => {
                if (selector === '.syh-button') return mockButton;
                if (selector === '.banner-block-selector') return mockBannerBlock;
                return null;
            })
        };

        const mockEvent = {
            target: mockButton,
            button: 0,
            preventDefault: mock.fn(),
            stopPropagation: mock.fn()
        };

        const saveBannerCategoryMock = mock.fn(() => Promise.resolve());
        const filterBannersMock = mock.fn();
        const mockSelf = {
            BANNER_CREATOR: {},
            SELECTORS: {
                bannerBlock: '.banner-block-selector',
                bannerText: '.banner-text-selector'
            },
            UI: {
                bannerCategoriesCache: {},
                filterBanners: filterBannersMock
            },
            UTILS: {
                saveBannerCategory: saveBannerCategoryMock
            }
        };

        handleBannerMouseUp(mockEvent, mockSelf);

        assert.strictEqual(mockEvent.preventDefault.mock.callCount(), 1);
        assert.strictEqual(mockEvent.stopPropagation.mock.callCount(), 1);
        assert.strictEqual(saveBannerCategoryMock.mock.callCount(), 1);
        
        const args = saveBannerCategoryMock.mock.calls[0].arguments;
        assert.strictEqual(args[0], 'Banner Stream Text');
        assert.strictEqual(args[1], 'stream');

        // Wait for the asynchronous saveBannerCategory promise to resolve
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.strictEqual(mockSelf.UI.bannerCategoriesCache['Banner Stream Text'], 'stream');
        assert.strictEqual(filterBannersMock.mock.callCount(), 1);
    });
});