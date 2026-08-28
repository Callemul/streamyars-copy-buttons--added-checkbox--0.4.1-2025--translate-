import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

const { StudioSPAHandler } = await import('../youtube/studio/studio_spa_handler.ts');

describe('Studio SPA Handler tests', () => {
    let originalLocation;
    let originalSetInterval;
    let originalClearInterval;
    let originalAddEventListener;
    let originalRemoveEventListener;

    beforeEach(() => {
        // Setup global window
        global.window = global;
        
        // Save originals
        originalLocation = global.window.location;
        originalSetInterval = global.window.setInterval;
        originalClearInterval = global.window.clearInterval;
        originalAddEventListener = global.window.addEventListener;
        originalRemoveEventListener = global.window.removeEventListener;

        // Mock window.location
        Object.defineProperty(global.window, 'location', {
            value: { pathname: '/comments/' },
            writable: true,
            configurable: true
        });

        global.window.setInterval = mock.fn(() => 123);
        global.window.clearInterval = mock.fn();
        global.window.addEventListener = mock.fn();
        global.window.removeEventListener = mock.fn();
    });

    test('StudioSPAHandler constructs with callback', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        assert.ok(handler);
    });

    test('start sets up listeners and poll interval', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        handler.start();
        assert.strictEqual(global.window.addEventListener.mock.callCount(), 2);
        assert.strictEqual(global.window.setInterval.mock.callCount(), 1);
    });

    test('stop clears poll interval and removes event listeners', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        handler.start();
        handler.stop();
        assert.strictEqual(global.window.clearInterval.mock.callCount(), 1);
        assert.strictEqual(global.window.removeEventListener.mock.callCount(), 2);
    });

    test('start is idempotent and does not register duplicate listeners', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        handler.start();
        handler.start();
        assert.strictEqual(global.window.addEventListener.mock.callCount(), 2);
        assert.strictEqual(global.window.setInterval.mock.callCount(), 1);
    });

    test('checkPathChange calls callback when path changes', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        handler.start();
        
        global.window.location.pathname = '/comments/';
        handler.checkPathChange();
        assert.strictEqual(callback.mock.callCount(), 0);
        
        global.window.location.pathname = '/other/';
        handler.checkPathChange();
        assert.strictEqual(callback.mock.callCount(), 1);
    });

    test('checkPathChange does not call callback when path unchanged', () => {
        const callback = mock.fn();
        const handler = new StudioSPAHandler(callback);
        handler.start();
        
        global.window.location.pathname = '/comments/';
        handler.checkPathChange();
        handler.checkPathChange();
        assert.strictEqual(callback.mock.callCount(), 0);
    });
});