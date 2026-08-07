import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

global.window = global;
global.document = {
    querySelectorAll: mock.fn(() => []),
    body: {}
};

// Import the module first to get the actual object
const messagingModule = await import('../modules/messaging.ts');
const { sendUnstarMessage, sendUnstarMessagesForList } = await import('../popup/prayer_messaging.ts');

describe('Popup Prayer Messaging tests', () => {
    let originalSendToActiveTab;
    let mockSendToActiveTab;

    beforeEach(() => {
        // Save original and replace with mock
        originalSendToActiveTab = messagingModule.SYH_MESSAGING.sendToActiveTab;
        mockSendToActiveTab = mock.fn();
        messagingModule.SYH_MESSAGING.sendToActiveTab = mockSendToActiveTab;
    });

    test('sendUnstarMessage returns early for empty text', () => {
        sendUnstarMessage('');
        sendUnstarMessage(null);
        sendUnstarMessage(undefined);
        assert.strictEqual(mockSendToActiveTab.mock.callCount(), 0);
    });

    test('sendUnstarMessage sends unstar_comment action', () => {
        sendUnstarMessage('test prayer text');
        assert.strictEqual(mockSendToActiveTab.mock.callCount(), 1);
        assert.deepStrictEqual(mockSendToActiveTab.mock.calls[0].arguments[0], {
            action: 'unstar_comment',
            text: 'test prayer text'
        });
    });

    test('sendUnstarMessagesForList returns early for empty list', () => {
        sendUnstarMessagesForList([]);
        sendUnstarMessagesForList(null);
        assert.strictEqual(mockSendToActiveTab.mock.callCount(), 0);
    });

    test('sendUnstarMessagesForList sends unstar for each item with text', () => {
        const prayers = [
            { text: 'prayer 1', author: 'author1' },
            { text: 'prayer 2', author: 'author2' },
            { text: '', author: 'author3' }
        ];
        sendUnstarMessagesForList(prayers);
        assert.strictEqual(mockSendToActiveTab.mock.callCount(), 2);
        assert.deepStrictEqual(mockSendToActiveTab.mock.calls[0].arguments[0], {
            action: 'unstar_comment',
            text: 'prayer 1'
        });
        assert.deepStrictEqual(mockSendToActiveTab.mock.calls[1].arguments[0], {
            action: 'unstar_comment',
            text: 'prayer 2'
        });
    });
});