// tests/streamyard_adapter.test.js
//
// Тести адаптера поверхні StreamYard (`modules/streamyard_adapter.ts`, T7).
//
// Це характеризаційні тести: вони фіксують ту саму поведінку, яку давав
// паралельний конвеєр `modules/streamyard_comments/*` — три типи кліку по 🙏,
// `data-syh-just-added`, стан чекбокса за текстом коментаря. Якщо вони падають,
// значить міграція змінила поведінку, а не лише архітектуру.

import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

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
        }
    }
});

const { StreamYardCommentAdapter } = await import('../modules/streamyard/comments/streamyard_adapter.ts');
const { CommentInjector } = await import('../modules/comments/comment_injector.ts');
const { CommentService } = await import('../modules/comments/comment_service.ts');
const { SYH_BUS } = await import('../modules/core/event_bus.ts');

const SELECTORS = {
    commentBlock: '.comment-block',
    commentAuthor: '.comment-author',
    commentText: '.comment-text',
    starButton: '.star-btn'
};

/** Картка коментаря з нашою панеллю кнопок — так її будує `addButtonsToComment`. */
function buildComment({ author = '@John', text = 'Hello world', starred = null } = {}) {
    const block = document.createElement('div');
    block.className = 'comment-block';
    block.innerHTML = `
        <span class="comment-author">${author}</span>
        <span class="comment-text">${text}</span>
        ${starred === null ? '' : `<button class="star-btn" aria-selected="${starred}"></button>`}
        <div class="syh-custom-buttons-comment">
            <button class="syh-button" data-type="comment" data-action="copy-comment"></button>
            <button class="syh-button" data-type="comment" data-action="copy-author-comment"></button>
            <button class="syh-button" data-type="comment" data-action="copy-prayer"></button>
            <input type="checkbox" class="syh-checkbox" data-type="comment">
        </div>
    `;
    document.body.appendChild(block);
    return block;
}

/** Мінімальний UI-фасад: збирає виклики, які робить конвеєр дії. */
function makeUiSpy() {
    return {
        visuals: [],
        prayersCache: [],
        updateCommentVisuals(node, type) { this.visuals.push({ node, type }); },
        filterStarredComments() {}
    };
}

function makeUtilsSpy() {
    return {
        banners: [],
        copyAndShowBanner(textToCopy, bannerMessage) { this.banners.push({ textToCopy, bannerMessage }); }
    };
}

function makeAdapter(extra = {}) {
    const ui = makeUiSpy();
    const utils = makeUtilsSpy();
    const adapter = new StreamYardCommentAdapter({ selectors: SELECTORS, ui, utils, ...extra });
    return { adapter, ui, utils };
}

const EMPTY_CACHES = () => ({ buttonStates: {}, checkboxStates: {} });

/** Виклик дії так, як це робить `CommentInjector`: подія + опис дії з реєстру. */
async function fireAction(adapter, block, actionId, mouseButton = 0) {
    const { getCommentAction } = await import('../modules/comments/comment_actions.ts');
    const action = getCommentAction(actionId);
    const button = block.querySelector(`.syh-button[data-action="${action.platforms.streamyard.domAction}"]`);

    let defaultPrevented = false;
    const event = {
        button: mouseButton,
        preventDefault: () => { defaultPrevented = true; }
    };

    await adapter.runAction({
        action,
        event,
        button,
        buttons: adapter.getButtons(block),
        element: block,
        caches: EMPTY_CACHES()
    });

    return { defaultPrevented };
}

describe('StreamYardCommentAdapter — контекст і кнопки', () => {
    beforeEach(() => {
        mockStorageStore = {};
        document.body.innerHTML = '';
    });

    test('1. ключ коментаря — його текст, автор без провідних @', () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ author: '@@Jane ', text: 'Prayer request' });

        const ctx = adapter.getCommentContext(block);
        assert.equal(ctx.id, 'Prayer request');
        assert.equal(ctx.text, 'Prayer request');
        assert.equal(ctx.author, 'Jane');
    });

    test('2. картка без тексту дає контекст, а не null (кнопки все одно прив\'язуються)', () => {
        const { adapter } = makeAdapter();
        const block = document.createElement('div');
        block.className = 'comment-block';
        document.body.appendChild(block);

        const ctx = adapter.getCommentContext(block);
        assert.ok(ctx, 'контекст має бути, інакше CommentInjector не навісить слухачі');
        assert.equal(ctx.id, '');
    });

    test('3. кнопки добираються за data-action із реєстру', () => {
        const { adapter } = makeAdapter();
        const block = buildComment();

        const buttons = adapter.getButtons(block);
        assert.equal(buttons.actionButtons.copy.dataset.action, 'copy-comment');
        assert.equal(buttons.actionButtons.question.dataset.action, 'copy-author-comment');
        assert.equal(buttons.actionButtons.prayer.dataset.action, 'copy-prayer');
        assert.equal(buttons.copyBtn, buttons.actionButtons.copy, 'історичні слоти лишаються сумісними');
        assert.ok(buttons.checkboxEl);
    });

    test('4. bodyEl порожній — ПКМ по картці не перехоплюється інжектором', () => {
        const { adapter } = makeAdapter();
        assert.equal(adapter.getButtons(buildComment()).bodyEl, null);
    });
});

describe('StreamYardCommentAdapter — прив\'язка слухачів', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    test('5. маркер прив\'язки живе на контейнері кнопок', () => {
        const { adapter } = makeAdapter();
        const block = buildComment();

        assert.equal(adapter.isEventsBound(block), false);
        adapter.markEventsBound(block);
        assert.equal(adapter.isEventsBound(block), true);
        adapter.unmarkEventsBound(block);
        assert.equal(adapter.isEventsBound(block), false);
    });

    test('6. перемальована панель вважається неприв\'язаною (кнопки без слухачів не лишаються)', () => {
        const { adapter } = makeAdapter();
        const block = buildComment();
        adapter.markEventsBound(block);

        // StreamYard замінив вміст картки — контейнер кнопок новий.
        block.querySelector('.syh-custom-buttons-comment').remove();
        const fresh = document.createElement('div');
        fresh.className = 'syh-custom-buttons-comment';
        block.appendChild(fresh);

        assert.equal(adapter.isEventsBound(block), false);
    });
});

describe('StreamYardCommentAdapter — дія над коментарем', () => {
    beforeEach(() => {
        mockStorageStore = {};
        document.body.innerHTML = '';
    });

    test('7. копіювання: банер без автора, без запису в базу', async () => {
        const { adapter, ui, utils } = makeAdapter();
        const block = buildComment({ text: 'Hello world' });

        await fireAction(adapter, block, 'copy');

        assert.deepEqual(utils.banners, [{ textToCopy: 'Hello world', bannerMessage: '📄 Комент (без автора)' }]);
        assert.deepEqual(ui.visuals, [], 'копіювання не фарбує коментар');
        assert.equal(mockStorageStore['syh:popup:prayers'], undefined);
        assert.equal(block.getAttribute('data-syh-just-added'), null,
            'копіювання не ставить позначку «щойно додано»');
    });

    test('8. питання: запис у базу, візуал question і позначка «щойно додано»', async () => {
        const { adapter, ui, utils } = makeAdapter();
        const block = buildComment({ author: '@John', text: 'Why?' });

        await fireAction(adapter, block, 'question');

        assert.equal(block.getAttribute('data-syh-just-added'), 'true');
        assert.deepEqual(ui.visuals.map(v => v.type), ['question']);
        assert.deepEqual(utils.banners, [{
            textToCopy: '@John\n\nWhy?',
            bannerMessage: '📑 Автор і його ❓ питання'
        }]);

        const stored = mockStorageStore['syh:popup:prayers'];
        assert.equal(stored.length, 1);
        assert.equal(stored[0].type, 'question');
        assert.equal(stored[0].icon, '❓');
    });

    test('9. молитва: ЛКМ / коліщатко / ПКМ дають три різні іконки', async () => {
        const cases = [
            [0, '🙏🙏🙏'],
            [1, '🙏❤️🙏'],
            [2, '❤️❤️❤️']
        ];

        for (const [mouseButton, icon] of cases) {
            mockStorageStore = {};
            document.body.innerHTML = '';
            const { adapter, utils } = makeAdapter();
            const block = buildComment({ author: '@John', text: `Prayer ${mouseButton}` });

            await fireAction(adapter, block, 'prayer', mouseButton);

            assert.equal(utils.banners[0].bannerMessage, `📑 Автор і його ${icon}`,
                `кнопка миші ${mouseButton} має дати ${icon}`);
            assert.equal(utils.banners[0].textToCopy, `\n\n\n${icon} @John\n\nPrayer ${mouseButton}`);
            assert.equal(mockStorageStore['syh:popup:prayers'][0].icon, icon);
        }
    });

    test('10. коліщатко і ПКМ по не-молитовних кнопках ігноруються', async () => {
        for (const actionId of ['copy', 'question']) {
            for (const mouseButton of [1, 2]) {
                mockStorageStore = {};
                document.body.innerHTML = '';
                const { adapter, utils } = makeAdapter();
                const block = buildComment();

                const { defaultPrevented } = await fireAction(adapter, block, actionId, mouseButton);

                assert.equal(utils.banners.length, 0,
                    `${actionId} не має реагувати на кнопку миші ${mouseButton}`);
                assert.equal(defaultPrevented, true,
                    'браузерна дія все одно гаситься — як і в конвеєрі до міграції');
            }
        }
    });

    test('11. дія відмічає чекбокс картки і ставить зірку, якщо її не було', async () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ text: 'Prayer request', starred: 'false' });
        const starBtn = block.querySelector('.star-btn');
        let starClicks = 0;
        starBtn.addEventListener('click', () => { starClicks++; });

        await fireAction(adapter, block, 'prayer');

        assert.equal(block.querySelector('.syh-checkbox').checked, true);
        assert.equal(starClicks, 1, 'зірка ставиться лише коли aria-selected="false"');
        assert.equal(CommentService.getStreamYardCheckboxState('Prayer request'), true);
    });

    test('12. молитва повідомляє шину подій', async () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ author: '@John', text: 'Prayer for health' });

        const marked = [];
        const commentActions = [];
        const offMarked = SYH_BUS.on('PRAYER_MARKED', d => marked.push(d));
        const offAction = SYH_BUS.on('COMMENT_ACTION', d => commentActions.push(d));

        await fireAction(adapter, block, 'prayer');

        offMarked();
        offAction();

        assert.equal(marked.length, 1);
        assert.equal(marked[0].icon, '🙏🙏🙏');
        assert.deepEqual(commentActions.map(a => a.type), ['prayer']);
    });

    test('13. позначка «щойно додано» знімається через 2 секунди', async () => {
        const { adapter } = makeAdapter();
        const block = buildComment();

        await fireAction(adapter, block, 'question');
        assert.equal(block.getAttribute('data-syh-just-added'), 'true');

        await new Promise(resolve => setTimeout(resolve, 2100));
        assert.equal(block.getAttribute('data-syh-just-added'), null);
    });
});

describe('StreamYardCommentAdapter — стан «опрацьовано»', () => {
    beforeEach(() => {
        mockStorageStore = {};
        document.body.innerHTML = '';
    });

    test('14. перемикання чекбокса пише стан за текстом коментаря', () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ text: 'Some comment' });

        adapter.onCheckboxToggled(block, adapter.getButtons(block), true);
        assert.equal(CommentService.getStreamYardCheckboxState('Some comment'), true);

        adapter.onCheckboxToggled(block, adapter.getButtons(block), false);
        assert.equal(CommentService.getStreamYardCheckboxState('Some comment'), false);
    });

    test('15. markChecked / unmarkChecked синхронізують DOM і стан', async () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ text: 'Another comment' });

        await adapter.markChecked(block, 'Another comment', EMPTY_CACHES());
        assert.equal(block.querySelector('.syh-checkbox').checked, true);
        assert.equal(CommentService.getStreamYardCheckboxState('Another comment'), true);

        await adapter.unmarkChecked(block, 'Another comment', EMPTY_CACHES());
        assert.equal(block.querySelector('.syh-checkbox').checked, false);
        assert.equal(CommentService.getStreamYardCheckboxState('Another comment'), false);
    });

    test('16. поверхня не має аркушів і ключів сховища — стандартний конвеєр не запуститься', () => {
        const { adapter } = makeAdapter();
        const block = buildComment();

        assert.equal(adapter.getSheetId(adapter.getCommentContext(block), block), '');
        assert.equal(adapter.getButtonStatesKey(), '');
        assert.equal(adapter.getCheckboxStatesKey(), '');
    });
});

describe('StreamYard через CommentInjector — наскрізна перевірка (T7)', () => {
    beforeEach(() => {
        mockStorageStore = {};
        document.body.innerHTML = '';
    });

    /** Прив'язує картку тим самим шляхом, що й `bootstrap_dom.onCommentAdded`. */
    function bind(adapter, block) {
        const injector = new CommentInjector(adapter, EMPTY_CACHES(), 'streamyard');
        injector.bindCommentEvents(block, '');
        return injector;
    }

    function dispatchMouseUp(button, mouseButton = 0) {
        const event = new MouseEvent('mouseup', { bubbles: true, button: mouseButton });
        button.dispatchEvent(event);
    }

    test('17. mouseup по 🙏 доходить до адаптера — три кнопки миші, три іконки', async () => {
        for (const [mouseButton, icon] of [[0, '🙏🙏🙏'], [1, '🙏❤️🙏'], [2, '❤️❤️❤️']]) {
            mockStorageStore = {};
            document.body.innerHTML = '';
            const { adapter, utils } = makeAdapter();
            const block = buildComment({ author: '@John', text: `Prayer ${mouseButton}` });
            bind(adapter, block);

            dispatchMouseUp(block.querySelector('[data-action="copy-prayer"]'), mouseButton);
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(utils.banners.length, 1, `кнопка миші ${mouseButton} має спрацювати`);
            assert.equal(utils.banners[0].bannerMessage, `📑 Автор і його ${icon}`);
        }
    });

    test('18. click по кнопці StreamYard нічого не робить — поверхня слухає mouseup', async () => {
        const { adapter, utils } = makeAdapter();
        const block = buildComment();
        bind(adapter, block);

        block.querySelector('[data-action="copy-prayer"]').dispatchEvent(
            new MouseEvent('click', { bubbles: true, button: 0 })
        );
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(utils.banners.length, 0);
    });

    test('19. зміна чекбокса зберігає стан за текстом коментаря', async () => {
        const { adapter } = makeAdapter();
        const block = buildComment({ text: 'Bound comment' });
        bind(adapter, block);

        const checkbox = block.querySelector('.syh-checkbox');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(CommentService.getStreamYardCheckboxState('Bound comment'), true);
    });

    test('20. повторна прив\'язка не дублює обробників', async () => {
        const { adapter, utils } = makeAdapter();
        const block = buildComment({ text: 'Once only' });
        bind(adapter, block);
        bind(adapter, block);

        dispatchMouseUp(block.querySelector('[data-action="copy-comment"]'));
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(utils.banners.length, 1, 'дія має виконатись рівно один раз');
    });

    test('21. після перемальовування панелі кнопки знову отримують обробники', async () => {
        const { adapter, utils } = makeAdapter();
        const block = buildComment({ text: 'Re-rendered' });
        bind(adapter, block);

        // StreamYard замінив панель — старі слухачі пішли разом зі старими кнопками.
        block.querySelector('.syh-custom-buttons-comment').remove();
        const fresh = document.createElement('div');
        fresh.className = 'syh-custom-buttons-comment';
        fresh.innerHTML = '<button class="syh-button" data-type="comment" data-action="copy-comment"></button>';
        block.appendChild(fresh);

        bind(adapter, block);
        dispatchMouseUp(block.querySelector('[data-action="copy-comment"]'));
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(utils.banners.length, 1, 'нова панель має бути прив\'язана');
    });
});
