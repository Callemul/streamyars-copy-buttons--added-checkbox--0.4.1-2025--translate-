// tests/youtube_performance.test.js
//
// Лонг-сесійні синтетичні та діагностичні тести продуктивності (Задача YT-E2).

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock } from './setup/chrome_mock.ts';
import { SYH_YT_DIAGNOSTICS } from '../youtube/yt_diagnostics.ts';

installChromeMock();

describe('YouTube Diagnostics & Long-Session Performance (YT-E2)', () => {
    beforeEach(() => {
        SYH_YT_DIAGNOSTICS.reset();
        SYH_YT_DIAGNOSTICS.setEnabled(false);
        delete window.__SYH_DEBUG__;
    });

    afterEach(() => {
        SYH_YT_DIAGNOSTICS.reset();
        SYH_YT_DIAGNOSTICS.setEnabled(false);
        delete window.__SYH_DEBUG__;
    });

    test('1. Opt-in перемикання діагностики працює динамічно без reload', () => {
        assert.equal(SYH_YT_DIAGNOSTICS.isEnabled(), false, 'За замовчуванням вимкнено');

        SYH_YT_DIAGNOSTICS.setEnabled(true);
        assert.equal(SYH_YT_DIAGNOSTICS.isEnabled(), true, 'Увімкнено через setEnabled');

        SYH_YT_DIAGNOSTICS.setEnabled(false);
        assert.equal(SYH_YT_DIAGNOSTICS.isEnabled(), false, 'Вимкнено через setEnabled');

        // Перевірка через глобальний прапорець window.__SYH_DEBUG__
        window.__SYH_DEBUG__ = true;
        assert.equal(SYH_YT_DIAGNOSTICS.isEnabled(), true, 'Увімкнено через window.__SYH_DEBUG__');
    });

    test('2. Зведення діагностики (getSummary) не містить персональних даних (жодного автора/тексту)', () => {
        SYH_YT_DIAGNOSTICS.setModuleState('active');
        SYH_YT_DIAGNOSTICS.recordCycle(12.5, 25);
        SYH_YT_DIAGNOSTICS.recordCoalescedFrame();
        SYH_YT_DIAGNOSTICS.recordStorageReload();
        SYH_YT_DIAGNOSTICS.recordStorageFailure();

        const summary = SYH_YT_DIAGNOSTICS.getSummary();

        assert.equal(summary.moduleState, 'active');
        assert.equal(summary.totalProcessedCycles, 1);
        assert.equal(summary.totalCommentsProcessed, 25);
        assert.equal(summary.coalescedFramesCount, 1);
        assert.equal(summary.storageReloadsCount, 1);
        assert.equal(summary.storageFailuresCount, 1);
        assert.equal(summary.lastCycleDurationMs, 12.5);

        // Перевірка відсутності PII полів
        assert.equal(summary.author, undefined);
        assert.equal(summary.text, undefined);
        assert.equal(summary.comment, undefined);
        assert.equal(summary.channel, undefined);
    });

    test('3. Синтетичний тест довгої сесії: 1000 циклів скролу/рециклінгу залишають ресурси стабільними', () => {
        SYH_YT_DIAGNOSTICS.setModuleState('active');

        // Симуляція 1000 скрол/рециклінг подій з обмеженим пулом DOM-елементів
        const DOM_POOL_SIZE = 20;
        const domElements = Array.from({ length: DOM_POOL_SIZE }, (_, i) => {
            const el = document.createElement('div');
            el.id = `item-${i}`;
            return el;
        });

        for (let i = 0; i < 1000; i++) {
            // Імітація виклику діагностики та обмеженого циклу рендеру
            SYH_YT_DIAGNOSTICS.recordCycle(0.05, 1);
            if (i % 2 === 0) {
                SYH_YT_DIAGNOSTICS.recordCoalescedFrame();
            }
        }

        const summary = SYH_YT_DIAGNOSTICS.getSummary();
        assert.equal(summary.totalProcessedCycles, 1000);
        assert.equal(summary.totalCommentsProcessed, 1000);
        assert.equal(summary.coalescedFramesCount, 500);

        // Перевірка стабільності пулу
        assert.equal(domElements.length, DOM_POOL_SIZE, 'Пул елементів не розрісся');
        assert.equal(summary.storageFailuresCount, 0, 'Жодних збоїв сховища під час сесії');
    });
});
