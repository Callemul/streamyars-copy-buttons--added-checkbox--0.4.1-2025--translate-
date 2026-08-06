import assert from 'node:assert';
import { test, describe } from 'node:test';

// Мокаємо window для Node.js
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}

const { getPrayerIcon, stripLeadingAt, formatCopyPayload } = await import('../modules/event_comments.ts');

describe('SYH_EVENT_COMMENTS Helper Tests', () => {
    test('getPrayerIcon returns correct emoji set for button index', () => {
        assert.strictEqual(getPrayerIcon(0), "🙏🙏🙏");
        assert.strictEqual(getPrayerIcon(1), "🙏❤️🙏");
        assert.strictEqual(getPrayerIcon(2), "❤️❤️❤️");
        assert.strictEqual(getPrayerIcon(3), "🙏🙏🙏");
    });

    test('stripLeadingAt strips leading @ symbols and trims author name', () => {
        assert.strictEqual(stripLeadingAt('@JohnDoe'), 'JohnDoe');
        assert.strictEqual(stripLeadingAt('@@@JaneDoe  '), 'JaneDoe');
        assert.strictEqual(stripLeadingAt('PlainAuthor'), 'PlainAuthor');
        assert.strictEqual(stripLeadingAt(null), '');
        assert.strictEqual(stripLeadingAt(undefined), '');
    });

    test('formatCopyPayload creates correct payload structure for copy-comment', () => {
        const result = formatCopyPayload('copy-comment', 'John', 'Hello world', 0);
        assert.deepStrictEqual(result, {
            header: "📄 Комент (без автора)",
            textToCopy: "Hello world",
            actionType: 'copy'
        });
    });

    test('formatCopyPayload creates correct payload for copy-author-comment', () => {
        const result = formatCopyPayload('copy-author-comment', 'John', 'Hello world', 0);
        assert.deepStrictEqual(result, {
            header: "📑 Автор і його ❓ питання",
            textToCopy: "@John\n\nHello world",
            actionType: 'question'
        });
    });

    test('formatCopyPayload creates correct payload for copy-prayer', () => {
        const result = formatCopyPayload('copy-prayer', 'John', 'Prayer request', 1);
        assert.deepStrictEqual(result, {
            header: "📑 Автор і його 🙏❤️🙏",
            textToCopy: "\n\n\n🙏❤️🙏 @John\n\nPrayer request",
            actionType: 'prayer',
            prayerIcon: "🙏❤️🙏"
        });
    });

    test('formatCopyPayload returns empty defaults for unknown action', () => {
        const result = formatCopyPayload('unknown', 'John', 'Test', 0);
        assert.deepStrictEqual(result, { header: '', textToCopy: '', actionType: null });
    });
});
