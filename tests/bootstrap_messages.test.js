import assert from 'node:assert/strict';
import { test, describe, mock } from 'node:test';

// --- Мінімальний DOM-стаб ---------------------------------------------------

function createFakeElement({ text = null, starred = null, children = {} } = {}) {
    const attributes = {};
    if (starred !== null) attributes['aria-selected'] = String(starred);

    const el = {
        textContent: text,
        getAttribute: key => (key in attributes ? attributes[key] : null),
        setAttribute: (key, value) => { attributes[key] = value; },
        click: mock.fn(),
        querySelector: selector => children[selector] ?? null,
        querySelectorAll: () => []
    };

    return el;
}

function createRoot(blocks) {
    return {
        querySelectorAll: () => blocks,
        querySelector: () => null
    };
}

global.window = global;
global.window.location = { pathname: '/room-42' };
global.document = createRoot([]);

const {
    DEFAULT_PRAYER_AUTHOR,
    PRAYER_ICON,
    PRAYER_SELECTORS,
    collectStarredPrayers,
    createPrayerId,
    extractPrayer,
    findCommentBlockByText,
    getRoomId,
    handleFetchPrayersMessage,
    handleUnstarCommentMessage,
    isStarred,
    normalizeAuthorName,
    normalizeText,
    readCommentText,
    readPrayerAuthor,
    readPrayerText,
    resolveMessageHandler,
    routeSyhMessage,
    unstarCommentBlock
} = await import('../modules/bootstrap_messages.ts');

const COMMENT_SELECTORS = {
    commentBlock: '[class*="PlatformComment__Wrap"]',
    commentText: '[class*="ContentSpan"]',
    starButton: '[class*="StarButton"]'
};

function makeCommentBlock({ text, starred = true }) {
    return createFakeElement({
        children: {
            [COMMENT_SELECTORS.commentText]: createFakeElement({ text }),
            [COMMENT_SELECTORS.starButton]: createFakeElement({ starred })
        }
    });
}

function makePrayerBlock({ author, text, starred = true }) {
    return createFakeElement({
        children: {
            [PRAYER_SELECTORS.star]: createFakeElement({ starred }),
            [PRAYER_SELECTORS.author]: createFakeElement({ text: author }),
            [PRAYER_SELECTORS.text]: createFakeElement({ text })
        }
    });
}

// --- Дрібні чисті хелпери ---------------------------------------------------

describe('bootstrap_messages — нормалізація', () => {
    test('normalizeText безпечно обробляє null/undefined', () => {
        assert.equal(normalizeText('  привіт  '), 'привіт');
        assert.equal(normalizeText(null), '');
        assert.equal(normalizeText(undefined), '');
        assert.equal(normalizeText(''), '');
    });

    test('normalizeAuthorName зрізає всі провідні @ і має фолбек', () => {
        assert.equal(normalizeAuthorName('@@John'), 'John');
        assert.equal(normalizeAuthorName('  @Mary '), 'Mary');
        assert.equal(normalizeAuthorName('Peter'), 'Peter');
        assert.equal(normalizeAuthorName('@'), DEFAULT_PRAYER_AUTHOR);
        assert.equal(normalizeAuthorName(null), DEFAULT_PRAYER_AUTHOR);
    });

    test('isStarred читає лише aria-selected="true"', () => {
        assert.equal(isStarred(createFakeElement({ starred: true })), true);
        assert.equal(isStarred(createFakeElement({ starred: false })), false);
        assert.equal(isStarred(createFakeElement()), false);
        assert.equal(isStarred(null), false);
        assert.equal(isStarred(undefined), false);
    });

    test('getRoomId прибирає всі слеші з pathname', () => {
        assert.equal(getRoomId('/room-42'), 'room-42');
        assert.equal(getRoomId('/a/b/c'), 'abc');
        assert.equal(getRoomId('/'), '');
    });

    test('createPrayerId детермінований за поданого random', () => {
        const id = createPrayerId(1700000000000, () => 0.5);

        assert.ok(id.startsWith('p_1700000000000_'));
        assert.equal(createPrayerId(1700000000000, () => 0.5), id);
    });
});

// --- Збір молитов -----------------------------------------------------------

describe('bootstrap_messages — збір зіркованих молитов', () => {
    test('readPrayerText / readPrayerAuthor мають безпечні фолбеки', () => {
        const block = makePrayerBlock({ author: '@Anna', text: 'Молюсь за здоровʼя' });

        assert.equal(readPrayerText(block), 'Молюсь за здоровʼя');
        assert.equal(readPrayerAuthor(block), 'Anna');

        const empty = createFakeElement();
        assert.equal(readPrayerText(empty), '');
        assert.equal(readPrayerAuthor(empty), DEFAULT_PRAYER_AUTHOR);
    });

    test('extractPrayer будує повний елемент молитви', () => {
        const block = makePrayerBlock({ author: '@Anna', text: 'Молюсь за здоровʼя' });
        const prayer = extractPrayer(block, 'room-42', 1700000000000);

        assert.equal(prayer.author, 'Anna');
        assert.equal(prayer.text, 'Молюсь за здоровʼя');
        assert.equal(prayer.type, 'prayer');
        assert.equal(prayer.icon, PRAYER_ICON);
        assert.equal(prayer.roomId, 'room-42');
        assert.equal(prayer.timestamp, 1700000000000);
        assert.ok(prayer.id.startsWith('p_1700000000000_'));
    });

    test('extractPrayer відкидає незірковані та порожні коментарі', () => {
        const notStarred = makePrayerBlock({ author: 'Anna', text: 'Текст', starred: false });
        assert.equal(extractPrayer(notStarred, 'room', 1), null);

        const emptyText = makePrayerBlock({ author: 'Anna', text: '' });
        assert.equal(extractPrayer(emptyText, 'room', 1), null);
    });

    test('collectStarredPrayers повертає лише валідні молитви', () => {
        const root = createRoot([
            makePrayerBlock({ author: '@Anna', text: 'Перша' }),
            makePrayerBlock({ author: 'Bob', text: 'Друга', starred: false }),
            makePrayerBlock({ author: '', text: 'Третя' }),
            makePrayerBlock({ author: 'Dan', text: '' })
        ]);

        const prayers = collectStarredPrayers(root, 'room-42', 1700000000000);

        assert.equal(prayers.length, 2);
        assert.deepEqual(prayers.map(p => p.author), ['Anna', DEFAULT_PRAYER_AUTHOR]);
        assert.deepEqual(prayers.map(p => p.text), ['Перша', 'Третя']);
    });

    test('handleFetchPrayersMessage відповідає масивом і повертає true (async-контракт)', () => {
        const root = createRoot([makePrayerBlock({ author: '@Anna', text: 'Перша' })]);
        const sendResponse = mock.fn();

        const result = handleFetchPrayersMessage(sendResponse, root);

        assert.equal(result, true, 'chrome.runtime.onMessage потребує true для асинхронної відповіді');
        assert.equal(sendResponse.mock.callCount(), 1);

        const [payload] = sendResponse.mock.calls[0].arguments;
        assert.equal(payload.length, 1);
        assert.equal(payload[0].roomId, 'room-42');
    });

    test('handleFetchPrayersMessage не падає без sendResponse', () => {
        assert.doesNotThrow(() => handleFetchPrayersMessage(undefined, createRoot([])));
    });
});

// --- Зняття зірки -----------------------------------------------------------

describe('bootstrap_messages — зняття зірки з коментаря', () => {
    test('readCommentText тримить текст і має фолбек', () => {
        const block = makeCommentBlock({ text: '  Питання  ' });

        assert.equal(readCommentText(block, COMMENT_SELECTORS.commentText), 'Питання');
        assert.equal(readCommentText(createFakeElement(), COMMENT_SELECTORS.commentText), '');
    });

    test('findCommentBlockByText знаходить перший точний збіг', () => {
        const target = makeCommentBlock({ text: 'Друге' });
        const root = createRoot([
            makeCommentBlock({ text: 'Перше' }),
            target,
            makeCommentBlock({ text: 'Друге' })
        ]);

        assert.equal(findCommentBlockByText(root, COMMENT_SELECTORS, 'Друге'), target);
        assert.equal(findCommentBlockByText(root, COMMENT_SELECTORS, 'Нема такого'), null);
    });

    test('unstarCommentBlock клікає лише по активній зірці', () => {
        const starred = makeCommentBlock({ text: 'Питання', starred: true });
        unstarCommentBlock(starred, COMMENT_SELECTORS.starButton, 'Питання');
        assert.equal(starred.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 1);

        const notStarred = makeCommentBlock({ text: 'Питання', starred: false });
        unstarCommentBlock(notStarred, COMMENT_SELECTORS.starButton, 'Питання');
        assert.equal(notStarred.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 0);
    });

    test('handleUnstarCommentMessage знімає зірку саме з потрібного коментаря', () => {
        const first = makeCommentBlock({ text: 'Перше' });
        const second = makeCommentBlock({ text: 'Друге' });
        const root = createRoot([first, second]);

        handleUnstarCommentMessage('Друге', COMMENT_SELECTORS, root);

        assert.equal(first.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 0);
        assert.equal(second.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 1);
    });

    test('handleUnstarCommentMessage ігнорує порожній текст і відсутній збіг', () => {
        const block = makeCommentBlock({ text: 'Перше' });
        const root = createRoot([block]);

        handleUnstarCommentMessage('', COMMENT_SELECTORS, root);
        handleUnstarCommentMessage('Нема такого', COMMENT_SELECTORS, root);

        assert.equal(block.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 0);
    });
});

// --- Маршрутизація повідомлень ---------------------------------------------

describe('bootstrap_messages — маршрутизатор runtime-повідомлень', () => {
    test('resolveMessageHandler знає лише зареєстровані дії', () => {
        assert.equal(typeof resolveMessageHandler({ action: 'unstar_comment' }), 'function');
        assert.equal(typeof resolveMessageHandler({ action: 'FETCH_PRAYERS' }), 'function');
        assert.equal(resolveMessageHandler({ action: 'PING' }), undefined);
        assert.equal(resolveMessageHandler({}), undefined);
        assert.equal(resolveMessageHandler(null), undefined);
        assert.equal(resolveMessageHandler(undefined), undefined);
    });

    test('routeSyhMessage маршрутизує unstar_comment і тримить текст', () => {
        const block = makeCommentBlock({ text: 'Питання' });
        const root = createRoot([block]);

        const result = routeSyhMessage(
            { action: 'unstar_comment', text: '  Питання  ' },
            { selectors: COMMENT_SELECTORS, root }
        );

        assert.equal(block.querySelector(COMMENT_SELECTORS.starButton).click.mock.callCount(), 1);
        assert.equal(result, undefined, 'синхронний обробник не тримає канал відповіді');
    });

    test('routeSyhMessage маршрутизує FETCH_PRAYERS і повертає true', () => {
        const root = createRoot([makePrayerBlock({ author: 'Anna', text: 'Молитва' })]);
        const sendResponse = mock.fn();

        const result = routeSyhMessage({ action: 'FETCH_PRAYERS' }, { selectors: COMMENT_SELECTORS, sendResponse, root });

        assert.equal(result, true);
        assert.equal(sendResponse.mock.callCount(), 1);
    });

    test('routeSyhMessage мовчки ігнорує невідомі та порожні повідомлення', () => {
        const ctx = { selectors: COMMENT_SELECTORS, root: createRoot([]) };

        assert.equal(routeSyhMessage({ action: 'PING' }, ctx), undefined);
        assert.equal(routeSyhMessage({}, ctx), undefined);
        assert.equal(routeSyhMessage(null, ctx), undefined);
        assert.equal(routeSyhMessage(undefined, ctx), undefined);
    });
});
