// tests/banner_modal_draft.test.js
//
// Прямі юніт-тести чернетки модалки банерів (`modules/banner_modal_draft.ts`).
// Модуль винесено з `banner_modal.ts` під час розбиття God Object, і досі він
// перевірявся лише опосередковано — через DOM-сценарії модалки. Тут покрито
// сам контракт, включно з гілками `catch`, які й роблять модуль безпечним
// у приватному режимі браузера (де `sessionStorage` кидає виняток).

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    SESSION_DRAFT_KEY,
    saveDraft,
    restoreDraft,
    clearDraft
} from '../modules/banners/banner_modal_draft.ts';

/**
 * Підміна глобального `sessionStorage`.
 * Пряме присвоєння заборонено (happy-dom віддає рід-онлі геттер), тому лише
 * через `Object.defineProperty` — див. правило Happy DOM Mocking у AGENTS.md.
 */
function replaceSessionStorage(stub) {
    Object.defineProperty(globalThis, 'sessionStorage', {
        value: stub,
        configurable: true,
        writable: true
    });
}

describe('banner_modal_draft — збереження чернетки', () => {
    let originalSessionStorage;

    beforeEach(() => {
        originalSessionStorage = globalThis.sessionStorage;
        sessionStorage.clear();
    });

    afterEach(() => {
        replaceSessionStorage(originalSessionStorage);
        sessionStorage.clear();
    });

    test('1. saveDraft кладе текст під очікуваним ключем', () => {
        saveDraft('чернетка банера');
        assert.equal(sessionStorage.getItem(SESSION_DRAFT_KEY), 'чернетка банера');
    });

    test('2. restoreDraft повертає збережений текст', () => {
        saveDraft('1. Питання перше');
        assert.equal(restoreDraft(), '1. Питання перше');
    });

    test('3. restoreDraft повертає null, коли чернетки немає', () => {
        assert.equal(restoreDraft(), null);
    });

    test('4. clearDraft прибирає ключ, а не лише спорожнює його', () => {
        saveDraft('текст');
        clearDraft();
        assert.equal(sessionStorage.getItem(SESSION_DRAFT_KEY), null);
        assert.equal(restoreDraft(), null);
    });

    test('5. saveDraft перезаписує попередню чернетку', () => {
        saveDraft('перша');
        saveDraft('друга');
        assert.equal(restoreDraft(), 'друга');
    });

    test('6. порожній рядок зберігається як порожній рядок, а не як відсутність', () => {
        saveDraft('');
        assert.equal(restoreDraft(), '');
    });

    test('7. sessionStorage, що кидає виняток, не ламає жодну з операцій', () => {
        replaceSessionStorage({
            setItem() { throw new Error('QuotaExceededError'); },
            getItem() { throw new Error('SecurityError'); },
            removeItem() { throw new Error('SecurityError'); }
        });

        assert.doesNotThrow(() => saveDraft('текст'));
        assert.doesNotThrow(() => clearDraft());
        assert.equal(restoreDraft(), null, 'помилка читання дає null, а не виняток');
    });

    test('8. відсутній sessionStorage (середовище без нього) не ламає операції', () => {
        replaceSessionStorage(undefined);

        assert.doesNotThrow(() => saveDraft('текст'));
        assert.doesNotThrow(() => clearDraft());
        assert.equal(restoreDraft(), null);
    });
});
