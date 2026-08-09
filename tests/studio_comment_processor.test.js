import assert from 'node:assert';
import { test, describe, beforeEach, afterEach } from 'node:test';

// happy-dom (tests/setup/happy-dom.ts) вже надає window/document/global.
const { StudioCommentProcessor } = await import('../youtube/studio/studio_comment_processor.ts');

const origQuerySelectorAll = document.querySelectorAll.bind(document);

describe('studio_comment_processor — StudioCommentProcessor (характеризація)', () => {

    let processor;

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        if (processor) {
            processor.stopModule();
            processor = undefined;
        }
        document.querySelectorAll = origQuerySelectorAll;
    });

    function makeProcessor(opts = {}) {
        const caches = opts.caches || {
            videoSheetMap: {},
            buttonStates: {},
            checkboxStates: {},
            collectedItems: []
        };
        const sheetStatsMap = opts.sheetStatsMap || {};
        const isCommentsPage = opts.isCommentsPage || (() => true);
        const p = new StudioCommentProcessor(caches, sheetStatsMap, isCommentsPage);
        if (opts.enabled === false) p.setEnabled(false);
        return p;
    }

    test('1. конструктор не кидає і створює екземпляр', () => {
        processor = makeProcessor();
        assert.ok(processor);
    });

    test('2. processVisibleComments рано повертається, якщо enabled === false', () => {
        processor = makeProcessor({ enabled: false });
        assert.doesNotThrow(() => processor.processVisibleComments());
    });

    test('3. processVisibleComments рано повертається, якщо не на сторінці коментарів', () => {
        processor = makeProcessor({ isCommentsPage: () => false });
        assert.doesNotThrow(() => processor.processVisibleComments());
    });

    test('4. processVisibleComments не кидає при увімкненому стані на сторінці коментарів', () => {
        processor = makeProcessor();
        processor.setEnabled(true);
        assert.doesNotThrow(() => processor.processVisibleComments());
    });

    test('5. scheduleProcessComments дедуплікує rAF: повторний виклик не ставить другий кадр', () => {
        processor = makeProcessor();
        processor.setEnabled(true);

        processor.scheduleProcessComments(false);
        const frameScheduled1 = processor.frameId;
        processor.scheduleProcessComments(false); // має бути проігноровано
        processor.scheduleProcessComments(false);
        const frameScheduled2 = processor.frameId;

        assert.notStrictEqual(frameScheduled1, null, 'rAF заплановано');
        assert.strictEqual(frameScheduled2, frameScheduled1, 'другий rAF НЕ ставиться, допоки перший не виконано');
    });

    test('6. stopModule на свіжому екземплярі не кидає', () => {
        processor = makeProcessor();
        assert.doesNotThrow(() => processor.stopModule());
    });

    test('7. stopModule видаляє ін’єктовані Studio-елементи (включно з syh-studio-comment-checked)', () => {
        const btn = document.createElement('div'); btn.className = 'syh-studio-btn';
        const meta = document.createElement('div'); meta.className = 'syh-studio-video-meta';
        const wrap = document.createElement('div'); wrap.className = 'syh-header-counters-wrapper';
        const checked = document.createElement('div'); checked.className = 'syh-studio-comment-checked';
        [btn, meta, wrap, checked].forEach(n => document.body.appendChild(n));

        processor = makeProcessor();
        processor.stopModule();

        assert.strictEqual(document.querySelector('.syh-studio-btn'), null, 'syh-studio-btn видалено');
        assert.strictEqual(document.querySelector('.syh-studio-video-meta'), null, 'syh-studio-video-meta видалено');
        assert.strictEqual(document.querySelector('.syh-header-counters-wrapper'), null, 'syh-header-counters-wrapper видалено');
        assert.strictEqual(document.querySelector('.syh-studio-comment-checked'), null, 'syh-studio-comment-checked також видаляється (cleanupInjectedUI)');
    });

    test('8. stopModule після scheduleProcessComments скасовує запланований кадр', () => {
        processor = makeProcessor();
        processor.setEnabled(true);
        processor.scheduleProcessComments(false);
        assert.notStrictEqual(processor.frameId, null);
        processor.stopModule();
        assert.strictEqual(processor.frameId, null, 'frameId скинуто в null після stopModule');
    });

    test('9. updateHeaderCounters не кидає при увімкненому стані', () => {
        processor = makeProcessor();
        processor.setEnabled(true);
        assert.doesNotThrow(() => processor.updateHeaderCounters());
    });

    test('10. setCaches / setSheetStatsMap не кидають', () => {
        processor = makeProcessor();
        const caches = { videoSheetMap: { x: 'y' }, buttonStates: {}, checkboxStates: {}, collectedItems: [] };
        assert.doesNotThrow(() => processor.setCaches(caches));
        assert.doesNotThrow(() => processor.setSheetStatsMap({ s1: { questions: 1, prayers: 2 } }));
    });

    test('11. destroy делегує в stopModule', () => {
        processor = makeProcessor();
        document.body.innerHTML = '<div class="syh-studio-btn">x</div>';
        assert.doesNotThrow(() => processor.destroy());
        assert.strictEqual(document.querySelector('.syh-studio-btn'), null);
    });
});
