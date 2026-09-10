import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { SYH_STATS_EXPORTER } from '../modules/stats/stats_exporter.ts';

describe('SYH_STATS_EXPORTER Tests', () => {
    describe('parseTimeToSeconds', () => {
        test('should parse HH:MM:SS and MM:SS correctly', () => {
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds('00:30'), 30);
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds('10:00'), 600);
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds('01:15:30'), 4530);
        });

        test('should handle spaces and invalid input gracefully', () => {
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds('  05:20  '), 320);
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds(''), 0);
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds(undefined), 0);
            assert.equal(SYH_STATS_EXPORTER.parseTimeToSeconds(null), 0);
        });
    });

    describe('calcStats', () => {
        test('should return zeroes for empty or null array', () => {
            assert.deepEqual(SYH_STATS_EXPORTER.calcStats([]), { min: 0, max: 0, avg: 0, median: 0 });
        });

        test('should calculate min, max, avg, median correctly for odd length', () => {
            const result = SYH_STATS_EXPORTER.calcStats([10, 50, 30]);
            assert.equal(result.min, 10);
            assert.equal(result.max, 50);
            assert.equal(result.avg, 30);
            assert.equal(result.median, 30);
        });

        test('should calculate median correctly for even length', () => {
            const result = SYH_STATS_EXPORTER.calcStats([10, 20, 30, 40]);
            assert.equal(result.min, 10);
            assert.equal(result.max, 40);
            assert.equal(result.avg, 25);
            assert.equal(result.median, 25);
        });
    });

    describe('calculatePhaseStats', () => {
        test('should correctly segment viewers into phases', () => {
            const sessionData = {
                data: [
                    { time: '00:10', viewers: 100 },
                    { time: '00:20', viewers: 150 },
                    { time: '00:40', viewers: 200 }, // Question phase start: 00:30
                    { time: '01:10', viewers: 120 }  // Prayer phase start: 01:00
                ],
                phase_questions_start: '00:30',
                phase_prayers_start: '01:00',
                initial_viewers: 90
            };

            const stats = SYH_STATS_EXPORTER.calculatePhaseStats(sessionData);
            assert.equal(stats.initialViewers, 90);
            assert.equal(stats.overall.max, 200);
            assert.equal(stats.st1.avg, 125); // [100, 150]
            assert.equal(stats.st2.avg, 200); // [200]
            assert.equal(stats.st3.avg, 120); // [120]
        });
    });

    describe('formatSummaryMarkdown', () => {
        test('should return empty string if no data provided', () => {
            assert.equal(SYH_STATS_EXPORTER.formatSummaryMarkdown(null, '2026-08-06', 'TestBrand'), '');
            assert.equal(SYH_STATS_EXPORTER.formatSummaryMarkdown({ data: [] }, '2026-08-06', 'TestBrand'), '');
        });

        test('should format stream report in Markdown', () => {
            const sessionData = {
                data: [
                    { time: '00:10', viewers: 100 },
                    { time: '00:40', viewers: 200 }
                ],
                phase_questions_start: '00:30',
                initial_viewers: 80
            };

            const md = SYH_STATS_EXPORTER.formatSummaryMarkdown(sessionData, '2026-08-06', 'Канал Перемен');
            assert.ok(md.includes('# 📊 Підсумкова аналітика ефіру: Канал Перемен'));
            assert.ok(md.includes('**Дата:** 2026-08-06'));
            assert.ok(md.includes('**Глядачів на старті:** 80'));
            assert.ok(md.includes('- **Пік онлайн:** 200'));
            assert.ok(md.includes('| 📖 Суботня школа | 100 | 100 | 100 | 100 |'));
            assert.ok(md.includes('| ❓ Питання | 200 | 200 | 200 | 200 |'));
        });
    });

    describe('formatSummaryHTML', () => {
        test('should return empty string if no data provided', () => {
            assert.equal(SYH_STATS_EXPORTER.formatSummaryHTML(null, '2026-08-06', 'TestBrand'), '');
            assert.equal(SYH_STATS_EXPORTER.formatSummaryHTML({ data: [] }, '2026-08-06', 'TestBrand'), '');
        });

        test('should format stream report in HTML', () => {
            const sessionData = {
                data: [
                    { time: '00:10', viewers: 100 },
                    { time: '00:40', viewers: 200 }
                ],
                phase_questions_start: '00:30',
                initial_viewers: 80
            };

            const html = SYH_STATS_EXPORTER.formatSummaryHTML(sessionData, '2026-08-06', 'Канал Перемен');
            assert.ok(html.includes('<div class="syh-summary-report">'));
            assert.ok(html.includes('<h2>📊 Підсумкова аналітика ефіру: Канал Перемен</h2>'));
            assert.ok(html.includes('<p><strong>Дата:</strong> 2026-08-06</p>'));
            assert.ok(html.includes('<li><strong>Пік онлайн:</strong> 200</li>'));
            assert.ok(html.includes('<td>📖 Суботня школа</td>'));
            assert.ok(html.includes('<td>100</td>'));
        });
    });
});
