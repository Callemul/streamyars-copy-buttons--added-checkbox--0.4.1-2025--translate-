import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import {
    SLIDE_WIDTH,
    SLIDE_HEIGHT,
    renderStatsSlideToCanvas,
    generateSlideBlob
} from '../modules/stats/stats_slide_generator.ts';

function createMockReport() {
    return {
        overall: { min: 40, max: 250, avg: 180, median: 190 },
        initialViewers: 65,
        st1: { min: 40, max: 180, avg: 120, median: 130 },
        st2: { min: 110, max: 250, avg: 220, median: 215 },
        st3: { min: 90, max: 200, avg: 160, median: 165 }
    };
}

describe('modules/stats_slide_generator.ts', () => {
    test('константи розмірів відповідають стандарту 16:9 Full HD', () => {
        assert.equal(SLIDE_WIDTH, 1920);
        assert.equal(SLIDE_HEIGHT, 1080);
    });

    test('renderStatsSlideToCanvas встановлює розміри та малює ключові текстові мітки', () => {
        const textCalls = [];
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({
                createLinearGradient: () => ({ addColorStop: () => {} }),
                fillRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                arcTo: () => {},
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                save: () => {},
                restore: () => {},
                fillText: (txt, x, y) => textCalls.push({ txt, x, y }),
                set fillStyle(_v) {},
                set strokeStyle(_v) {},
                set lineWidth(_v) {},
                set font(_v) {},
                set textAlign(_v) {},
                set textBaseline(_v) {}
            })
        };

        const report = createMockReport();
        renderStatsSlideToCanvas(report, '2026-08-29', 'Канал Перемен', canvas);

        assert.equal(canvas.width, 1920);
        assert.equal(canvas.height, 1080);

        const renderedTexts = textCalls.map(t => String(t.txt));
        assert.ok(renderedTexts.some(t => t.includes('Канал Перемен')));
        assert.ok(renderedTexts.some(t => t.includes('2026-08-29')));
        assert.ok(renderedTexts.some(t => t.includes('65'))); // initialViewers
        assert.ok(renderedTexts.some(t => t.includes('Суботня школа')));
        assert.ok(renderedTexts.some(t => t.includes('Питання')));
        assert.ok(renderedTexts.some(t => t.includes('Молитви')));
        assert.ok(renderedTexts.some(t => t.includes('250'))); // max
        assert.ok(renderedTexts.some(t => t.includes('180'))); // avg
    });

    test('generateSlideBlob повертає об’єкт Blob із типом image/png', async () => {
        const mockBlob = new Blob(['mock-png-data'], { type: 'image/png' });
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({
                createLinearGradient: () => ({ addColorStop: () => {} }),
                fillRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                arcTo: () => {},
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                save: () => {},
                restore: () => {},
                fillText: () => {},
                set fillStyle(_v) {},
                set strokeStyle(_v) {},
                set lineWidth(_v) {},
                set font(_v) {},
                set textAlign(_v) {},
                set textBaseline(_v) {}
            }),
            toBlob: (cb, mime) => {
                assert.equal(mime, 'image/png');
                cb(mockBlob);
            }
        };

        const report = createMockReport();
        const blob = await generateSlideBlob(report, '2026-08-29', 'Канал Перемен', canvas);

        assert.ok(blob);
        assert.equal(blob.type, 'image/png');
    });
});
