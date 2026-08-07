import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { 
    getEffectiveButtonState, 
    getEffectiveCheckboxState 
} = await import('../youtube/studio/studio_state_helpers.ts');

const { generateCommentKey } = await import('../youtube/studio/studio_comment_key.ts');

describe('studio_state_helpers tests', () => {
    function createMockCaches(overrides = {}) {
        return {
            buttonStates: {},
            checkboxStates: {},
            collectedItems: [],
            videoSheetMap: {},
            ...overrides
        };
    }

    function getFallbackKey(ctx) {
        return generateCommentKey('', ctx.author, ctx.text);
    }

    describe('getEffectiveButtonState', () => {
        test('returns null when no state found', () => {
            const caches = createMockCaches();
            const result = getEffectiveButtonState('key1', null, caches);
            assert.strictEqual(result, null);
        });

        test('returns state from buttonStates cache', () => {
            const caches = createMockCaches({ buttonStates: { 'key1': 'question' } });
            const result = getEffectiveButtonState('key1', null, caches);
            assert.strictEqual(result, 'question');
        });

        test('falls back to fallback key when primary key missing', () => {
            const ctx = { author: 'Author', text: 'Text' };
            const fallbackKey = getFallbackKey(ctx);
            const caches = createMockCaches({ buttonStates: { [fallbackKey]: 'prayer' } });
            const result = getEffectiveButtonState('missing_key', ctx, caches);
            assert.strictEqual(result, 'prayer');
        });

        test('falls back to collectedItems when cache missing', () => {
            const caches = createMockCaches({ 
                collectedItems: [{ id: 'key1', author: 'Author', text: 'Text', type: 'question', timestamp: 123 }] 
            });
            const ctx = { author: 'Author', text: 'Text' };
            const result = getEffectiveButtonState('key1', ctx, caches);
            assert.strictEqual(result, 'question');
        });

        test('falls back to collectedItems by author/text match', () => {
            const caches = createMockCaches({ 
                collectedItems: [{ id: 'different_id', author: 'Author', text: 'Text', type: 'prayer', timestamp: 123 }] 
            });
            const ctx = { author: 'Author', text: 'Text' };
            const result = getEffectiveButtonState('key1', ctx, caches);
            assert.strictEqual(result, 'prayer');
        });

        test('returns null when ctx is null and no cache', () => {
            const caches = createMockCaches();
            const result = getEffectiveButtonState('key1', null, caches);
            assert.strictEqual(result, null);
        });
    });

    describe('getEffectiveCheckboxState', () => {
        test('returns false when no state found', () => {
            const caches = createMockCaches();
            const result = getEffectiveCheckboxState('key1', null, caches);
            assert.strictEqual(result, false);
        });

        test('returns state from checkboxStates cache', () => {
            const caches = createMockCaches({ checkboxStates: { 'key1': { checked: true } } });
            const result = getEffectiveCheckboxState('key1', null, caches);
            assert.strictEqual(result, true);
        });

        test('falls back to fallback key when primary key missing', () => {
            const ctx = { author: 'Author', text: 'Text' };
            const fallbackKey = getFallbackKey(ctx);
            const caches = createMockCaches({ checkboxStates: { [fallbackKey]: { checked: true } } });
            const result = getEffectiveCheckboxState('missing_key', ctx, caches);
            assert.strictEqual(result, true);
        });

        test('falls back to collectedItems when cache missing', () => {
            const caches = createMockCaches({ 
                collectedItems: [{ id: 'key1', author: 'Author', text: 'Text', type: 'question', timestamp: 123 }] 
            });
            const ctx = { author: 'Author', text: 'Text' };
            const result = getEffectiveCheckboxState('key1', ctx, caches);
            assert.strictEqual(result, true);
        });

        test('falls back to collectedItems by author/text match', () => {
            const caches = createMockCaches({ 
                collectedItems: [{ id: 'different_id', author: 'Author', text: 'Text', type: 'prayer', timestamp: 123 }] 
            });
            const ctx = { author: 'Author', text: 'Text' };
            const result = getEffectiveCheckboxState('key1', ctx, caches);
            assert.strictEqual(result, true);
        });

        test('returns false when no match in collectedItems', () => {
            const caches = createMockCaches({ 
                collectedItems: [{ id: 'other', author: 'Other', text: 'Other', type: 'question', timestamp: 123 }] 
            });
            const ctx = { author: 'Author', text: 'Text' };
            const result = getEffectiveCheckboxState('key1', ctx, caches);
            assert.strictEqual(result, false);
        });
    });
});