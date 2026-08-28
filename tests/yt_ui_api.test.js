// tests/yt_ui_api.test.js
//
// Характерні (characterization) тести публічного API `youtube/yt_ui.ts`
// (фасад-бочка після декомпозиції на identity / panel / visual_state).
//
// Модуль раніше НЕ мав прямих тестів, хоча `extractCommentId` — одна з
// найскладніших функцій усього `youtube/*` (CC 13). Тести написані ДО
// розбиття, щоб зафіксувати поведінку 1-в-1: після перенесу логіки у
// `yt_comment_identity.ts`, `yt_comment_panel.ts`, `yt_comment_visual_state.ts`
// ці очікування лишаються істинними без змін.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const {
    extractCommentId,
    extractCommentData,
    addButtonsToYTComment,
    applyButtonVisualState,
    applyCheckboxStateFromCache,
    restoreButtonState,
    restoreCheckboxState
} = await import('../youtube/yt_ui.ts');
const { getVideoId } = await import('../youtube/yt_video_id.ts');
const { getVideoId: getVideoIdFromEvents } = await import('../youtube/yt_events.ts');

function withMockWindow(mockWindow, callback) {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    assert.ok(originalDescriptor, 'happy-dom має надавати globalThis.window');

    Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        configurable: true,
        writable: true
    });

    try {
        callback();
    } finally {
        Object.defineProperty(globalThis, 'window', originalDescriptor);
    }
}

// --- Мінімальний DOM для YouTube-коментаря --------------------------------
// Структура віддзеркалює YT_SELECTORS: #header-author, #body, #content-text,
// #published-time-text a[href*="lc="] тощо.
function makeComment(overrides = {}) {
    const node = document.createElement('div');

    const header = document.createElement('div');
    header.setAttribute('id', 'header-author');
    node.appendChild(header);

    const link = document.createElement('a');
    link.setAttribute('href', 'https://www.youtube.com/watch?v=abc#lc=XYZ123');
    const published = document.createElement('div');
    published.setAttribute('id', 'published-time-text');
    published.appendChild(link);
    node.appendChild(published);

    const author = document.createElement('span');
    author.setAttribute('id', 'author-text');
    author.textContent = '@TestAuthor';
    header.appendChild(author);

    const body = document.createElement('div');
    body.setAttribute('id', 'body');
    const text = document.createElement('span');
    text.setAttribute('id', 'content-text');
    text.textContent = 'Some comment text';
    body.appendChild(text);
    node.appendChild(body);

    for (const [key, value] of Object.entries(overrides)) {
        if (key === 'href') {
            link.setAttribute('href', value);
        } else if (key === 'id') {
            node.setAttribute('id', value);
        } else if (key === 'dataCid') {
            node.setAttribute('data-cid', value);
        } else if (key === 'authorText') {
            author.textContent = value;
        } else if (key === 'commentText') {
            text.textContent = value;
        } else if (key === 'missingLink') {
            if (value) published.removeChild(link);
        } else if (key === 'missingHeader') {
            if (value) node.removeChild(header);
        }
    }

    return node;
}

describe('getVideoId', () => {
    test('повертає параметр v та зберігає export через yt_events', () => {
        assert.equal(getVideoIdFromEvents, getVideoId);
        withMockWindow({ location: { search: '?feature=share&v=video-123' } }, () => {
            assert.equal(getVideoId(), 'video-123');
            assert.equal(getVideoIdFromEvents(), 'video-123');
        });
    });

    test('повертає порожній рядок без параметра v або window', () => {
        withMockWindow({ location: { search: '?feature=share' } }, () => {
            assert.equal(getVideoId(), '');
        });
        withMockWindow(undefined, () => {
            assert.equal(getVideoId(), '');
        });
    });

    test('повертає порожній рядок для відсутнього або throwing location', () => {
        withMockWindow({}, () => {
            assert.equal(getVideoId(), '');
        });

        const throwingWindow = {};
        Object.defineProperty(throwingWindow, 'location', {
            configurable: true,
            get() {
                throw new Error('location unavailable');
            }
        });
        withMockWindow(throwingWindow, () => {
            assert.equal(getVideoId(), '');
        });
    });
});

describe('extractCommentId', () => {
    test('1. пріоритет — параметр lc= у посиланні', () => {
        const node = makeComment({ href: 'https://youtube.com/watch?v=1#lc=ID_FROM_LINK' });
        assert.equal(extractCommentId(node), 'ID_FROM_LINK');
    });

    test('2. фолбек — id вузла, коли посилання немає', () => {
        const node = makeComment({ missingLink: true, id: 'node-id-99' });
        assert.equal(extractCommentId(node), 'node-id-99');
    });

    test('3. фолбек — data-cid, коли немає id вузла', () => {
        const node = makeComment({ missingLink: true, dataCid: 'cid-77' });
        assert.equal(extractCommentId(node), 'cid-77');
    });

    test('4. data-cid пріоритетніше за порожній id вузла', () => {
        const node = makeComment({ missingLink: true, id: '', dataCid: 'cid-12' });
        assert.equal(extractCommentId(node), 'cid-12');
    });

    test('5. фолбек за автором+текстом — стійкий хеш (детермінований)', () => {
        const node = makeComment({ missingLink: true, id: '', dataCid: '', authorText: '@Bob', commentText: 'Hello world' });
        const id1 = extractCommentId(node);
        const id2 = extractCommentId(makeComment({ missingLink: true, id: '', dataCid: '', authorText: '@Bob', commentText: 'Hello world' }));

        assert.ok(id1.startsWith('yt_'));
        assert.equal(id1, id2); // один і той самий коментар -> один і той самий id
    });

    test('6. різні автор/текст -> різні хеші (висока ймовірність)', () => {
        const a = extractCommentId(makeComment({ missingLink: true, id: '', dataCid: '', authorText: '@Bob', commentText: 'AAA' }));
        const b = extractCommentId(makeComment({ missingLink: true, id: '', dataCid: '', authorText: '@Bob', commentText: 'BBB' }));
        assert.notEqual(a, b);
    });

    test('7. null/undefined вузол -> порожній рядок', () => {
        assert.equal(extractCommentId(null), '');
        assert.equal(extractCommentId(undefined), '');
    });
});

describe('extractCommentData', () => {
    test('8. зрізає @ з автора і бере текст з data-syh-original-text за наявності', () => {
        const node = makeComment({ authorText: '@TestAuthor' });
        const dataEl = node.querySelector('#content-text');
        dataEl.setAttribute('data-syh-original-text', 'Original text');
        dataEl.textContent = 'Changed text';

        const { author, text } = extractCommentData(node);
        assert.equal(author, 'TestAuthor');
        assert.equal(text, 'Original text');
    });

    test('9. без data-syh-original-text бере textContent (з обрізанням)', () => {
        const node = makeComment({ authorText: '  @TestAuthor  ', commentText: '  Plain text  ' });
        const { author, text } = extractCommentData(node);
        assert.equal(author, 'TestAuthor');
        assert.equal(text, 'Plain text');
    });

    test('10. дефолти, коли автор/текст відсутні', () => {
        const node = document.createElement('div');
        const { author, text } = extractCommentData(node);
        assert.equal(author, 'Автор');
        assert.equal(text, '');
    });
});

describe('addButtonsToYTComment', () => {
    test('11. повертає контейнер з трьома кнопками + чекбокс', () => {
        const node = makeComment();
        const container = addButtonsToYTComment(node);

        assert.ok(container instanceof HTMLElement);
        assert.equal(container.querySelectorAll('button').length, 3);
        assert.equal(container.querySelectorAll('.syh-yt-checkbox-wrap').length, 1);
    });

    test('12. ідемпотентність — повторний виклик не додає дубль', () => {
        const node = makeComment();
        addButtonsToYTComment(node);
        addButtonsToYTComment(node);

        const all = node.querySelectorAll('.syh-yt-buttons');
        assert.equal(all.length, 1);
    });

    test('13. без шапки автора — не вставляє кнопки (повертає null)', () => {
        const node = makeComment({ missingHeader: true });
        assert.equal(addButtonsToYTComment(node), null);
    });

    test('14. на тіло коментаря вішається клас syh-yt-comment-body', () => {
        const node = makeComment();
        addButtonsToYTComment(node);
        const body = node.querySelector('#body');
        assert.ok(body.classList.contains('syh-yt-comment-body'));
    });
});

describe('applyButtonVisualState', () => {
    function makeBtns() {
        const q = document.createElement('button');
        const p = document.createElement('button');
        return { q, p };
    }

    test('15. стан question -> кнопка питання "Додано", молитва скинута', () => {
        const { q, p } = makeBtns();
        applyButtonVisualState(q, p, 'question');
        assert.equal(q.dataset.state, 'added');
        assert.equal(q.innerText, 'Додано до питань');
        assert.equal(p.dataset.state, '');
        assert.equal(p.innerText, 'Додати до молитов');
    });

    test('16. стан prayer -> кнопка молитви "Додано", питання скинуто', () => {
        const { q, p } = makeBtns();
        applyButtonVisualState(q, p, 'prayer');
        assert.equal(p.dataset.state, 'added');
        assert.equal(p.innerText, 'Додано до молитов');
        assert.equal(q.dataset.state, '');
        assert.equal(q.innerText, 'Додати до питань');
    });

    test('17. стан null/undefined -> обидві кнопки в дефолтному вигляді', () => {
        const { q, p } = makeBtns();
        applyButtonVisualState(q, p, null);
        assert.equal(q.innerText, 'Додати до питань');
        assert.equal(p.innerText, 'Додати до молитов');
    });

    test('18. null питання/молитва -> достроковий вихід без винятку', () => {
        assert.doesNotThrow(() => applyButtonVisualState(null, null, 'question'));
    });
});

describe('applyCheckboxStateFromCache', () => {
    test('19. позначений запис -> чекбокс checked + клас', () => {
        const node = document.createElement('div');
        const cb = document.createElement('input');
        cb.className = 'syh-checkbox';
        cb.dataset.type = 'yt-comment';
        node.appendChild(cb);

        applyCheckboxStateFromCache(node, 'c1', { c1: { checked: true, timestamp: 1 } });

        assert.equal(cb.checked, true);
        assert.ok(node.classList.contains('syh-yt-comment-checked'));
    });

    test('20. непозначений запис -> чекбокс пустий, клас знято', () => {
        const node = document.createElement('div');
        const cb = document.createElement('input');
        cb.className = 'syh-checkbox';
        cb.dataset.type = 'yt-comment';
        node.appendChild(cb);

        applyCheckboxStateFromCache(node, 'c1', { c1: { checked: false, timestamp: 1 } });

        assert.equal(cb.checked, false);
        assert.ok(!node.classList.contains('syh-yt-comment-checked'));
    });

    test('21. без чекбокса у контейнері — достроковий вихід', () => {
        const node = document.createElement('div');
        assert.doesNotThrow(() => applyCheckboxStateFromCache(node, 'c1', { c1: { checked: true, timestamp: 1 } }));
    });
});

describe('restoreButtonState / restoreCheckboxState', () => {
    test('22. restoreButtonState делегує у applyButtonVisualState', () => {
        const node = makeComment();
        addButtonsToYTComment(node);
        restoreButtonState(node, 'c1', { c1: 'question' });

        const q = node.querySelector('.syh-yt-btn-question');
        const p = node.querySelector('.syh-yt-btn-prayer');
        assert.equal(q.dataset.state, 'added');
        assert.equal(p.dataset.state, '');
    });

    test('23. restoreCheckboxState на реальній розмітці панелі відновлює галочку', () => {
        const node = makeComment();
        addButtonsToYTComment(node);
        restoreCheckboxState(node, 'c1', { c1: { checked: true, timestamp: 1 } });

        const cb = node.querySelector('.syh-checkbox[data-type="yt-comment"]');
        assert.ok(cb, 'чекбокс знайдено за реальним селектором');
        assert.equal(cb.checked, true);
        assert.ok(node.classList.contains('syh-yt-comment-checked'));
    });

    test('24. невідомий id коментаря скидає кнопки у дефолт', () => {
        const node = makeComment();
        addButtonsToYTComment(node);
        restoreButtonState(node, 'unknown', { c1: 'question' });

        const q = node.querySelector('.syh-yt-btn-question');
        assert.equal(q.dataset.state, '');
        assert.equal(q.innerText, 'Додати до питань');
    });
});
