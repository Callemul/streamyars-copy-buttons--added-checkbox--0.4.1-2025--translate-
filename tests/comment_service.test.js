import test from 'node:test';
import assert from 'node:assert/strict';

// Mock storage for Node environment before importing CommentService
global.window = global;
let mockStorageStore = {};

global.chrome = {
    runtime: { id: 'test-id' },
    storage: {
        local: {
            get: (keys, cb) => {
                const res = {};
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => { res[k] = mockStorageStore[k]; });
                if (cb) cb(res);
            },
            set: (items, cb) => {
                Object.assign(mockStorageStore, items);
                if (cb) cb();
            },
            remove: (keys, cb) => {
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => { delete mockStorageStore[k]; });
                if (cb) cb();
            }
        }
    }
};

const { CommentService } = await import('../modules/comment_service.ts');

test('CommentService.formatForClipboard correctly formats author and comment text', () => {
    assert.equal(
        CommentService.formatForClipboard('@JohnDoe', 'Hello World'),
        '@JohnDoe\n\nHello World'
    );
    assert.equal(
        CommentService.formatForClipboard('Jane', 'Testing'),
        '@Jane\n\nTesting'
    );
    assert.equal(
        CommentService.formatForClipboard('', 'Anonymous comment'),
        'Anonymous comment'
    );
});

test('CommentService.saveCollectedComment deduplicates items and returns updated list', async () => {
    mockStorageStore = {};
    const item1 = { id: 'c1', author: 'Alex', text: 'Q1', type: 'question' };
    const list1 = await CommentService.saveCollectedComment('vp_ss', item1);
    assert.equal(list1.length, 1);
    assert.equal(list1[0].text, 'Q1');

    // Duplicate item by ID
    const item2 = { id: 'c1', author: 'Alex', text: 'Q1 Updated', type: 'question' };
    const list2 = await CommentService.saveCollectedComment('vp_ss', item2);
    assert.equal(list2.length, 1);
    assert.equal(list2[0].text, 'Q1 Updated');

    // Duplicate item by author + text + type
    const item3 = { id: 'c2_different_id', author: 'Alex', text: 'Q1 Updated', type: 'question' };
    const list3 = await CommentService.saveCollectedComment('vp_ss', item3);
    assert.equal(list3.length, 1);
});

test('CommentService.saveButtonState and saveCheckboxState update state and storage correctly', async () => {
    mockStorageStore = {};
    const buttonStates = {};
    const checkboxStates = {};

    await CommentService.saveButtonState('test_btn_key', buttonStates, 'comment_1', 'question');
    assert.equal(buttonStates['comment_1'], 'question');
    assert.equal(mockStorageStore['test_btn_key']['comment_1'], 'question');

    await CommentService.saveButtonState('test_btn_key', buttonStates, 'comment_1', null);
    assert.equal(buttonStates['comment_1'], undefined);
    assert.equal(mockStorageStore['test_btn_key']['comment_1'], undefined);

    await CommentService.saveCheckboxState('test_cb_key', checkboxStates, 'comment_1', true);
    assert.equal(checkboxStates['comment_1'].checked, true);
    assert.equal(mockStorageStore['test_cb_key']['comment_1'].checked, true);
});

test('CommentService.savePrayerRecord and removePrayerRecord properly update storage', async () => {
    mockStorageStore = {};
    const record = {
        author: 'John',
        text: 'Prayer request text',
        type: 'prayer',
        icon: '🙏🙏🙏',
        roomId: 'room123',
        timestamp: Date.now()
    };

    const savedList = await CommentService.savePrayerRecord(record);
    assert.equal(savedList.length, 1);
    assert.equal(savedList[0].author, 'John');

    const afterRemove = await CommentService.removePrayerRecord('Prayer request text');
    assert.equal(afterRemove.length, 0);
});
