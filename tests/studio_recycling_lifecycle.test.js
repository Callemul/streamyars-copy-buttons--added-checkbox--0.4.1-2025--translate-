import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock } from './setup/chrome_mock.ts';

let mockStorageStore = {};

installChromeMock({
    runtimeImpl: { id: 'test-id' },
    storageImpl: {
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
});

const { StudioCommentProcessor } = await import('../youtube/studio/studio_comment_processor.ts');
const { CommentService } = await import('../modules/comments/comment_service.ts');

describe('Studio Recycling Lifecycle', () => {

    let processor;

    beforeEach(() => {
        document.body.innerHTML = '<div id="entity-label-container"><div id="entity-name">Время перемен</div></div>';
        mockStorageStore = {};
        mock.restoreAll();
    });

    afterEach(() => {
        if (processor) {
            processor.stopModule();
            processor = undefined;
        }
    });

    function createProcessor() {
        const caches = {
            videoSheetMap: {
                '/watch?v=123': { sheetId: 'vp_ss', source: 'manual' }
            },
            buttonStates: {},
            checkboxStates: {},
            collectedItems: []
        };
        const sheetStatsMap = {};
        const isCommentsPage = () => true;
        return new StudioCommentProcessor(caches, sheetStatsMap, isCommentsPage);
    }

    function createThread(authorText, textContent) {
        const thread = document.createElement('ytcp-comment-thread');
        
        const comment = document.createElement('ytcp-comment');
        comment.id = 'comment';
        
        const metadata = document.createElement('div');
        metadata.id = 'metadata';
        const nameWrap = document.createElement('div');
        nameWrap.id = 'name';
        const authorSpan = document.createElement('span');
        authorSpan.className = 'author-text';
        authorSpan.textContent = authorText;
        nameWrap.appendChild(authorSpan);
        metadata.appendChild(nameWrap);

        const content = document.createElement('div');
        content.id = 'content-text';
        content.textContent = textContent;

        const actions = document.createElement('ytcp-comment-action-buttons');
        const toolbar = document.createElement('div');
        toolbar.id = 'toolbar';
        actions.appendChild(toolbar);

        const thumb = document.createElement('ytcp-comment-video-thumbnail');
        const vTitle = document.createElement('div');
        vTitle.id = 'video-title';
        vTitle.textContent = 'Video Title';
        const bodyA = document.createElement('a');
        bodyA.id = 'body';
        bodyA.href = '/watch?v=123';
        thumb.appendChild(vTitle);
        thumb.appendChild(bodyA);

        comment.appendChild(metadata);
        comment.appendChild(content);
        comment.appendChild(actions);
        comment.appendChild(thumb);
        
        thread.appendChild(comment);
        return thread;
    }

    test('1. Рециклінг Polymer: повторна прив\'язка не дублює слухачів', async () => {
        processor = createProcessor();
        await processor.startModule();
        
        const thread = createThread('Author A', 'Comment A');
        const items = document.createElement('div');
        items.id = 'items';
        items.appendChild(thread);
        document.body.appendChild(items);
        
        processor.processVisibleComments(true);
        
        let clickCount = 0;
        mock.method(CommentService, 'saveCollectedComment', async () => {
            clickCount++;
        });
        mock.method(CommentService, 'copyToClipboard', async () => true);

        // 1st cycle
        let qBtn = thread.querySelector('.syh-studio-btn[data-action="studio-question"]');
        assert.ok(qBtn, "Кнопка питання не знайдена у 1 циклі");

        // Simulate Polymer recycle to Comment B
        thread.querySelector('.author-text').textContent = 'Author B';
        thread.querySelector('#content-text').textContent = 'Comment B';
        processor.processVisibleComments(true);

        // Simulate Polymer recycle to Comment C
        thread.querySelector('.author-text').textContent = 'Author C';
        thread.querySelector('#content-text').textContent = 'Comment C';
        processor.processVisibleComments(true);

        // Click should only trigger once, because AbortController/dispose removed previous listeners
        qBtn = thread.querySelector('.syh-studio-btn[data-action="studio-question"]');
        assert.ok(qBtn, "Кнопка питання не знайдена у 3 циклі");
        
        qBtn.dispatchEvent(new Event('click'));
        
        // Wait for async handlers
        await new Promise(r => setTimeout(r, 100));

        assert.equal(clickCount, 1, 'Дія має викликатись рівно 1 раз');
    });

    test('2. processor.stopModule() зупиняє observer та listeners', async () => {
        processor = createProcessor();
        await processor.startModule();
        
        const thread = createThread('Author X', 'Text X');
        const items = document.createElement('div');
        items.id = 'items';
        items.appendChild(thread);
        document.body.appendChild(items);
        
        processor.processVisibleComments(true);
        assert.ok(thread.querySelector('.syh-studio-btn'));

        processor.stopModule();

        // Mutation after stop should not inject UI
        const thread2 = createThread('Author Y', 'Text Y');
        document.body.appendChild(thread2);
        
        // Let MutationObserver trigger if it wasn't detached
        await new Promise(r => setTimeout(r, 10));
        
        assert.equal(thread2.querySelector('.syh-studio-btn'), null, 'UI не повинно ін\'єктуватись після stopModule');
    });

    test('3. Послідовність startModule() -> stopModule() -> startModule() працює коректно', async () => {
        processor = createProcessor();
        
        const thread = createThread('Author Z', 'Text Z');
        const items = document.createElement('div');
        items.id = 'items';
        items.appendChild(thread);
        document.body.appendChild(items);
        
        // Start 1
        await processor.startModule();
        processor.processVisibleComments(true);
        let qBtn = thread.querySelector('.syh-studio-btn[data-action="studio-question"]');
        assert.ok(qBtn);
        
        // Stop
        processor.stopModule();
        assert.equal(thread.querySelector('.syh-studio-btn'), null);
        
        // Start 2
        await processor.startModule();
        processor.processVisibleComments(true);
        qBtn = thread.querySelector('.syh-studio-btn[data-action="studio-question"]');
        assert.ok(qBtn, 'Кнопки повинні знову з\'явитись');
        
        let clickCount = 0;
        mock.method(CommentService, 'saveCollectedComment', async () => {
            clickCount++;
        });
        mock.method(CommentService, 'copyToClipboard', async () => true);
        
        qBtn.dispatchEvent(new Event('click'));
        await new Promise(r => setTimeout(r, 100));
        assert.equal(clickCount, 1, 'Кнопка має бути робочою');
    });

    test('4. Очищення UI (cleanupInjectedUI у stopModule) видаляє класи та атрибути', async () => {
        processor = createProcessor();
        await processor.startModule();
        
        const thread = createThread('Author W', 'Text W');
        document.body.appendChild(thread);
        
        processor.processVisibleComments(true);
        
        // Check injected things
        assert.ok(thread.querySelector('.syh-studio-btn'));
        assert.ok(thread.querySelector('.syh-studio-badge-wrapper'));
        assert.ok(thread.querySelector('.syh-studio-checkbox-wrapper'));
        
        // simulate checked
        thread.classList.add('syh-studio-comment-checked');
        
        processor.stopModule();
        
        assert.equal(thread.querySelector('.syh-studio-btn'), null);
        assert.equal(thread.querySelector('.syh-studio-badge-wrapper'), null);
        assert.equal(thread.querySelector('.syh-studio-checkbox-wrapper'), null);
        assert.equal(thread.querySelector('.syh-header-counters-wrapper'), null);
        assert.equal(thread.classList.contains('syh-studio-comment-checked'), false, 'Клас .syh-studio-comment-checked має бути видалений');
        
        // Also check binding attributes
        assert.equal(thread.hasAttribute('data-syh-studio-events-bound'), false, 'Атрибут data-syh-studio-events-bound має бути очищений');
    });

});
