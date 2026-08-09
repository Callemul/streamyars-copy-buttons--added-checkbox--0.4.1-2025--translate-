import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки для Node (jsdom у проєкті не використовується)
// ---------------------------------------------------------------------------

function makeEl(tag = 'div') {
    return {
        tagName: String(tag).toUpperCase(),
        style: {},
        className: '',
        textContent: '',
        children: [],
        attrs: {},
        insertedHtml: [],
        setAttribute(name, value) { this.attrs[name] = String(value); },
        getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
        append(...nodes) { this.children.push(...nodes); },
        appendChild(node) { this.children.push(node); return node; },
        insertAdjacentHTML(position, html) { this.insertedHtml.push({ position, html }); }
    };
}

function findByClass(root, className) {
    if (root.className === className) return root;
    for (const child of root.children || []) {
        const hit = findByClass(child, className);
        if (hit) return hit;
    }
    return null;
}

function flatten(root, acc = []) {
    acc.push(root);
    for (const child of root.children || []) flatten(child, acc);
    return acc;
}

global.window = global;
global.document = { createElement: (tag) => makeEl(tag) };

let queriedTabs = [];
import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({ runtimeImpl: { id: 'test-extension-id' } });
global.chrome.tabs = {
    query: (_opts, cb) => cb(queriedTabs)
};

const {
    NON_ROOM_PATHS,
    ROOM_WARNING_HTML,
    extractRoomId,
    isRoomPath,
    resolveRoomContext,
    findForeignPrayers,
    shouldWarnAboutForeignPrayers,
    canQueryActiveTab,
    renderRoomWarning,
    checkRoomWarning,
    buildAuthorHeader,
    buildPrayerRow
} = await import('../popup/prayer_render_helpers.ts');

const ROOM_URL = 'https://streamyard.com/abcd-efgh-ijk';
const CURRENT_ROOM = 'abcd-efgh-ijk';

function prayer(author, text, roomId, type = 'prayer') {
    return { id: `${author}-${text}`, author, text, type, roomId, icon: '🙏🙏🙏' };
}

describe('prayer_render_helpers — room guard (pure API)', () => {
    beforeEach(() => { queriedTabs = []; });

    test('1. extractRoomId прибирає слеші, порожній pathname -> ""', () => {
        assert.equal(extractRoomId('/abcd-efgh-ijk/'), 'abcd-efgh-ijk');
        assert.equal(extractRoomId('/broadcasts'), 'broadcasts');
        assert.equal(extractRoomId('/'), '');
        assert.equal(extractRoomId(''), '');
    });

    test('2. isRoomPath відрізняє ефірну кімнату від службових сторінок', () => {
        assert.equal(isRoomPath(CURRENT_ROOM), true);
        assert.equal(isRoomPath(''), false);
        for (const servicePath of NON_ROOM_PATHS.filter(Boolean)) {
            assert.equal(isRoomPath(servicePath), false, `"${servicePath}" не є кімнатою`);
        }
        // регістронезалежність
        assert.equal(isRoomPath('BROADCASTS'), false);
    });

    test('3. resolveRoomContext: кімната StreamYard, службова сторінка, чужий домен, битий URL', () => {
        assert.deepEqual(resolveRoomContext(ROOM_URL), { isStudioRoom: true, roomId: CURRENT_ROOM });
        assert.deepEqual(resolveRoomContext('https://streamyard.com/broadcasts'), { isStudioRoom: false, roomId: 'broadcasts' });
        assert.deepEqual(resolveRoomContext('https://youtube.com/abcd-efgh-ijk'), { isStudioRoom: false, roomId: CURRENT_ROOM });
        assert.deepEqual(resolveRoomContext('not-a-url'), { isStudioRoom: false, roomId: '' });
    });

    test('4. findForeignPrayers бере лише type=prayer з іншим roomId', () => {
        const list = [
            prayer('A', 'з цієї кімнати', CURRENT_ROOM),
            prayer('B', 'з минулого ефіру', 'old-room-111'),
            prayer('C', 'питання з минулого ефіру', 'old-room-111', 'question'),
            prayer('D', 'без кімнати', undefined)
        ];

        const foreign = findForeignPrayers(list, CURRENT_ROOM);
        assert.equal(foreign.length, 1);
        assert.equal(foreign[0].author, 'B');

        assert.deepEqual(findForeignPrayers([], CURRENT_ROOM), []);
        assert.deepEqual(findForeignPrayers(null, CURRENT_ROOM), []);
    });

    test('5. shouldWarnAboutForeignPrayers — попереджаємо лише в ефірній кімнаті з чужими молитвами', () => {
        const foreign = [prayer('B', 'стара молитва', 'old-room-111')];
        const own = [prayer('A', 'своя молитва', CURRENT_ROOM)];

        assert.equal(shouldWarnAboutForeignPrayers(ROOM_URL, foreign), true);
        assert.equal(shouldWarnAboutForeignPrayers(ROOM_URL, own), false);
        assert.equal(shouldWarnAboutForeignPrayers('https://streamyard.com/broadcasts', foreign), false);
        assert.equal(shouldWarnAboutForeignPrayers('https://youtube.com/', foreign), false);
    });
});

describe('prayer_render_helpers — checkRoomWarning (chrome.tabs інтеграція)', () => {
    beforeEach(() => {
        queriedTabs = [];
        global.chrome = { runtime: { id: 'test-extension-id' }, tabs: { query: (_o, cb) => cb(queriedTabs) } };
    });

    test('6. renderRoomWarning вставляє банер лише за наявності чужих молитов', () => {
        const output = makeEl('div');
        renderRoomWarning([prayer('A', 'своя', CURRENT_ROOM)], output, ROOM_URL);
        assert.equal(output.insertedHtml.length, 0);

        renderRoomWarning([prayer('B', 'чужа', 'old-room')], output, ROOM_URL);
        assert.equal(output.insertedHtml.length, 1);
        assert.equal(output.insertedHtml[0].position, 'beforebegin');
        assert.ok(output.insertedHtml[0].html.includes('syh-room-warning'));
        assert.equal(output.insertedHtml[0].html, ROOM_WARNING_HTML);
    });

    test('7. checkRoomWarning показує банер для активної вкладки з чужими молитвами', () => {
        queriedTabs = [{ url: ROOM_URL }];
        const output = makeEl('div');

        checkRoomWarning([prayer('B', 'чужа', 'old-room')], output);

        assert.equal(output.insertedHtml.length, 1);
        assert.ok(output.insertedHtml[0].html.includes('syh-wipe-prayers'));
        assert.ok(output.insertedHtml[0].html.includes('syh-keep-prayers'));
    });

    test('8. checkRoomWarning не падає на вкладці без url / порожньому списку вкладок', () => {
        const output = makeEl('div');

        queriedTabs = [];
        checkRoomWarning([prayer('B', 'чужа', 'old-room')], output);
        assert.equal(output.insertedHtml.length, 0);

        queriedTabs = [{}];
        checkRoomWarning([prayer('B', 'чужа', 'old-room')], output);
        assert.equal(output.insertedHtml.length, 0);
    });

    test('9. canQueryActiveTab/checkRoomWarning — no-op без chrome.tabs API', () => {
        global.chrome = { runtime: { id: 'test-extension-id' } };
        assert.equal(canQueryActiveTab(), false);

        const output = makeEl('div');
        checkRoomWarning([prayer('B', 'чужа', 'old-room')], output);
        assert.equal(output.insertedHtml.length, 0);
    });
});

describe('prayer_render_helpers — DOM builders', () => {
    test('10. buildAuthorHeader агрегує іконку автора та створює кнопки керування', () => {
        const mixed = buildAuthorHeader('Іван', [
            { id: '1', text: 'a', icon: '🙏🙏🙏' },
            { id: '2', text: 'b', icon: '❤️❤️❤️' }
        ]);
        assert.equal(mixed.authorIcon, '🙏❤️🙏');

        const thanksOnly = buildAuthorHeader('Іван', [{ id: '1', text: 'a', icon: '❤️❤️❤️' }]);
        assert.equal(thanksOnly.authorIcon, '❤️❤️❤️');

        const prayersOnly = buildAuthorHeader('Іван', [{ id: '1', text: 'a', icon: '🙏🙏🙏' }]);
        assert.equal(prayersOnly.authorIcon, '🙏🙏🙏');

        const { header } = prayersOnly;
        const authorSpan = findByClass(header, 'editable-author');
        assert.ok(authorSpan, 'є contenteditable-поле автора');
        assert.equal(authorSpan.textContent, 'Іван');
        assert.equal(authorSpan.getAttribute('contenteditable'), 'true');

        const delAuthorBtn = findByClass(header, 'del-author-btn');
        assert.ok(delAuthorBtn, 'є кнопка видалення автора');
        assert.equal(delAuthorBtn.getAttribute('data-author'), 'Іван');
        assert.ok(findByClass(header, 'edit-prayer-btn'), 'є кнопка редагування');
    });

    test('11. buildPrayerRow нумерує рядок лише коли передано idx', () => {
        const numbered = buildPrayerRow({ id: 'p1', text: 'Прохання' }, 0);
        const numberedTexts = flatten(numbered).map(el => el.textContent);
        assert.ok(numberedTexts.includes('1) '), 'нумерація 1) присутня');
        assert.equal(numbered.style.marginBottom, '4px');

        const plain = buildPrayerRow({ id: 'p2', text: 'Прохання' });
        const plainTexts = flatten(plain).map(el => el.textContent);
        assert.ok(!plainTexts.some(t => /^\d+\) $/.test(t)), 'без нумерації');
        assert.equal(plain.style.marginBottom, undefined);
    });

    test('12. buildPrayerRow проставляє data-id на текст і кнопку видалення', () => {
        const row = buildPrayerRow({ id: 'prayer-42', text: 'Молюсь за здоровʼя' }, 3);

        const textSpan = findByClass(row, 'editable-prayer');
        assert.ok(textSpan);
        assert.equal(textSpan.textContent, 'Молюсь за здоровʼя');
        assert.equal(textSpan.getAttribute('data-id'), 'prayer-42');
        assert.equal(textSpan.getAttribute('contenteditable'), 'true');

        const delBtn = findByClass(row, 'del-prayer-btn');
        assert.ok(delBtn);
        assert.equal(delBtn.getAttribute('data-id'), 'prayer-42');
        assert.equal(delBtn.textContent, '❌');
    });
});
