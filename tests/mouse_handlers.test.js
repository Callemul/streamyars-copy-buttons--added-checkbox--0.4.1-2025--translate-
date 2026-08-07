import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

// Mock DOM
global.window = global;
global.document = {
    getElementById: mock.fn(),
    querySelectorAll: mock.fn(() => []),
    querySelector: mock.fn(),
    createElement: mock.fn(() => ({
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        setAttribute: mock.fn(),
        removeAttribute: mock.fn(),
        appendChild: mock.fn(),
        classList: { add: mock.fn(), remove: mock.fn(), contains: mock.fn(() => false) },
        closest: mock.fn(),
        querySelector: mock.fn(),
        querySelectorAll: mock.fn(() => []),
        dispatchEvent: mock.fn()
    }))
};

// Mock event
global.Event = class Event {
    constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.target = null;
        this.currentTarget = null;
        this.defaultPrevented = false;
        this.preventDefault = () => { this.defaultPrevented = true; };
        this.stopPropagation = mock.fn();
    }
};

// Import the module under test
const { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction } = await import('../modules/event_banners/mouse_handlers.ts');

describe('mouse_handlers tests', () => {
    beforeEach(() => {
        mock.fn.mockImplementation(() => {});
    });

    describe('handleBannerContextMenu', () => {
        test('should do nothing if target is null', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            event.target = null;
            
            assert.doesNotThrow(() => handleBannerContextMenu(event, { bannerBlock: '.banner' }));
        });

        test('should do nothing if selectors or bannerBlock is null', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            event.target = document.createElement('div');
            
            assert.doesNotThrow(() => handleBannerContextMenu(event, null));
            assert.doesNotThrow(() => handleBannerContextMenu(event, {}));
            assert.doesNotThrow(() => handleBannerContextMenu(event, { bannerBlock: null }));
        });

        test('should do nothing if bannerBlock not found', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            const target = document.createElement('div');
            target.closest = mock.fn(() => null);
            event.target = target;
            
            handleBannerContextMenu(event, { bannerBlock: '.banner' });
            
            assert.ok(target.closest.mock.calls.length > 0);
        });

        test('should prevent default and toggle checkbox for valid banner', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            const target = document.createElement('div');
            const bannerBlock = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = false;
            checkbox.className = 'syh-checkbox';
            checkbox.setAttribute('data-type', 'banner');
            checkbox.dispatchEvent = mock.fn();
            
            target.closest = mock.fn((selector) => {
                if (selector === '.banner') return bannerBlock;
                if (selector === 'input, textarea, .syh-button') return null;
                if (selector.includes('button:has(svg.lucide-pencil)')) return null;
                return null;
            });
            
            bannerBlock.querySelector = mock.fn(() => checkbox);
            event.target = target;
            
            handleBannerContextMenu(event, { bannerBlock: '.banner' });
            
            assert.ok(event.defaultPrevented);
            assert.ok(event.stopPropagation.mock.calls.length > 0);
            assert.strictEqual(checkbox.checked, true);
            assert.ok(checkbox.dispatchEvent.mock.calls.length > 0);
        });

        test('should do nothing if target is input or textarea', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            const target = document.createElement('input');
            const bannerBlock = document.createElement('div');
            
            target.closest = mock.fn((selector) => {
                if (selector === '.banner') return bannerBlock;
                if (selector === 'input, textarea, .syh-button') return target; // It's an input
                return null;
            });
            
            bannerBlock.querySelector = mock.fn(() => null);
            event.target = target;
            
            handleBannerContextMenu(event, { bannerBlock: '.banner' });
            
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should do nothing if target is system edit/delete button', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            const target = document.createElement('button');
            const bannerBlock = document.createElement('div');
            
            target.closest = mock.fn((selector) => {
                if (selector === '.banner') return bannerBlock;
                if (selector === 'input, textarea, .syh-button') return null;
                if (selector.includes('button:has(svg.lucide-pencil)')) return target; // It's an edit button
                return null;
            });
            
            bannerBlock.querySelector = mock.fn(() => null);
            event.target = target;
            
            handleBannerContextMenu(event, { bannerBlock: '.banner' });
            
            assert.strictEqual(event.defaultPrevented, false);
        });
    });

    describe('handleBannerMouseDown', () => {
        test('should do nothing if target is null', () => {
            const event = new MouseEvent('mousedown', { button: 1 });
            event.target = null;
            
            assert.doesNotThrow(() => handleBannerMouseDown(event));
        });

        test('should prevent default for middle click on syh-button', () => {
            const event = new MouseEvent('mousedown', { button: 1 }); // Middle click
            const target = document.createElement('button');
            target.className = 'syh-button';
            target.setAttribute('data-type', 'banner');
            
            target.closest = mock.fn((selector) => {
                if (selector === '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') return target;
                return null;
            });
            
            event.target = target;
            
            handleBannerMouseDown(event);
            
            assert.ok(event.defaultPrevented);
        });

        test('should prevent default for middle click on create-from-text button', () => {
            const event = new MouseEvent('mousedown', { button: 1 });
            const target = document.createElement('button');
            target.className = 'syh-button';
            target.setAttribute('data-action', 'create-from-text');
            
            target.closest = mock.fn((selector) => {
                if (selector === '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') return target;
                return null;
            });
            
            event.target = target;
            
            handleBannerMouseDown(event);
            
            assert.ok(event.defaultPrevented);
        });

        test('should prevent default for middle click on delete-selected-banners button', () => {
            const event = new MouseEvent('mousedown', { button: 1 });
            const target = document.createElement('button');
            target.className = 'syh-button';
            target.setAttribute('data-action', 'delete-selected-banners');
            
            target.closest = mock.fn((selector) => {
                if (selector === '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') return target;
                return null;
            });
            
            event.target = target;
            
            handleBannerMouseDown(event);
            
            assert.ok(event.defaultPrevented);
        });

        test('should not prevent default for left click', () => {
            const event = new MouseEvent('mousedown', { button: 0 }); // Left click
            const target = document.createElement('button');
            target.className = 'syh-button';
            target.setAttribute('data-type', 'banner');
            
            target.closest = mock.fn(() => target);
            event.target = target;
            
            handleBannerMouseDown(event);
            
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should not prevent default for right click', () => {
            const event = new MouseEvent('mousedown', { button: 2 }); // Right click
            const target = document.createElement('button');
            target.className = 'syh-button';
            target.setAttribute('data-type', 'banner');
            
            target.closest = mock.fn(() => target);
            event.target = target;
            
            handleBannerMouseDown(event);
            
            assert.strictEqual(event.defaultPrevented, false);
        });

        test('should not prevent default for non-matching button', () => {
            const event = new MouseEvent('mousedown', { button: 1 });
            const target = document.createElement('button');
            target.className = 'other-button';
            
            target.closest = mock.fn(() => null);
            event.target = target;
            
            handleBannerMouseDown(event);
            
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