import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

global.window = global;
global.document = {
    querySelectorAll: mock.fn(() => []),
    body: {}
};

const { getSortedCommentThreads, isReplyThread } = await import('../youtube/studio/studio_thread_sorter.ts');

describe('Studio Thread Sorter tests', () => {

    test('getSortedCommentThreads returns empty array when no threads', () => {
        const result = getSortedCommentThreads();
        assert.deepStrictEqual(result, []);
    });

    test('isReplyThread returns true for element with is-reply attribute', () => {
        const mockElement = {
            hasAttribute: mock.fn((attr) => attr === 'is-reply')
        };
        assert.strictEqual(isReplyThread(mockElement), true);
    });

    test('isReplyThread returns false for element without is-reply attribute', () => {
        const mockElement = {
            hasAttribute: mock.fn(() => false)
        };
        assert.strictEqual(isReplyThread(mockElement), false);
    });
});