import assert from 'node:assert/strict';
import { test, describe, beforeEach, after, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { StudioModuleController, studioController } = await import('../youtube/studio/studio_content.ts');
const { CommentInjector } = await import('../modules/comments/comment_injector.ts');
const { STORAGE_KEYS } = await import('../modules/storage_keys.ts');

describe('studio_content_lifecycle — StudioModuleController & Lifecycle', () => {
    after(() => {
        studioController.destroy();
    });

    beforeEach(() => {
        installChromeMock({
            storageData: {
                [STORAGE_KEYS.STUDIO_ENABLED]: true
            }
        });
        document.body.innerHTML = '';
        Object.defineProperty(window, 'location', {
            value: { pathname: '/comments/', href: 'https://studio.youtube.com/channel/UC123/comments/' },
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('1. StudioModuleController instantiates and initializes without throwing', async () => {
        const ctrl = new StudioModuleController();
        assert.ok(ctrl);
        await ctrl.init();
        ctrl.destroy();
    });

    test('2. Multiple init() calls are idempotent', async () => {
        const ctrl = new StudioModuleController();
        await ctrl.init();
        // Second call should return immediately and not re-register or throw
        await ctrl.init();
        ctrl.destroy();
    });

    test('3. destroy() cleans up listeners and allows subsequent re-init', async () => {
        const ctrl = new StudioModuleController();
        await ctrl.init();
        ctrl.destroy();

        // Re-init should work cleanly after destroy
        await ctrl.init();
        ctrl.destroy();
    });

    test('4. CommentInjector.dispose aborts listeners and cleans bound attribute', () => {
        const el = document.createElement('div');
        el.setAttribute('data-syh-test-bound', 'true');

        const fakeAdapter = {
            isEventsBound: () => false,
            markEventsBound: () => {},
            getCommentContext: () => ({ id: 'c1', author: 'Author', text: 'Text' }),
            getButtons: () => ({
                questionBtn: el,
                prayerBtn: null,
                copyBtn: null,
                checkboxEl: null,
                bodyEl: null
            })
        };
        const fakeCaches = { buttonStates: {}, checkboxStates: {} };
        const injector = new CommentInjector(fakeAdapter, fakeCaches);

        injector.bindCommentEvents(el, 'c1');

        // Disposing element cleans attribute
        CommentInjector.dispose(el, 'data-syh-test-bound');
        assert.equal(el.getAttribute('data-syh-test-bound'), null);
    });
});
