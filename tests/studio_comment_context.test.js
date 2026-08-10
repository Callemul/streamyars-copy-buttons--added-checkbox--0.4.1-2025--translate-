// tests/studio_comment_context.test.js
//
// Характеристичні тести публічного API `youtube/studio/comment_context.ts`.
//
// Навіщо: за звітом Fallow цей файл має один із найнижчих індексів
// підтримуваності у проєкті (MI 81.3, complexity density 0.44) і дві функції
// severity=critical: `getCommentContextForRestore` (cyclomatic 13 / 50 LOC)
// та вкладена стрілка обходу вузлів (cyclomatic 11 / cognitive 15).
// Модуль не мав жодного власного тесту. Тести фіксують поведінку 1-в-1
// перед декомпозицією.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { getCommentContextForRestore } = await import('../youtube/studio/comment_context.ts');

/** Заглушка `getStudioUI`, що завжди повертає непорожній UI. */
const uiFound = () => ({ questionBtn: null, prayerBtn: null, checkboxEl: null, badgeEl: null });
/** Заглушка `getStudioUI`, що не знайшла UI. */
const uiMissing = () => null;

const EMPTY_CACHES = { buttonStates: {}, checkboxStates: {}, collectedItems: [], videoSheetMap: {} };

/** Будує елемент коментаря з довільного HTML через happy-dom. */
function buildComment(html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el;
}

function callContext(element, { commentKey = 'key-1', channelKey = 'channel-1', getStudioUI = uiFound } = {}) {
    return getCommentContextForRestore(element, commentKey, channelKey, EMPTY_CACHES, getStudioUI);
}

describe('studio/comment_context — вихід за відсутнім UI', () => {
    test('1. повертає null, якщо getStudioUI не знайшов UI', () => {
        const el = buildComment('<div id="content-text">текст</div>');
        assert.strictEqual(callContext(el, { getStudioUI: uiMissing }), null);
    });

    test('2. getStudioUI викликається саме з переданим елементом', () => {
        const el = buildComment('');
        const seen = [];
        callContext(el, { getStudioUI: (arg) => { seen.push(arg); return uiFound(); } });
        assert.ok(seen.length >= 1);
        assert.strictEqual(seen[0], el);
    });
});

describe('studio/comment_context — автор', () => {
    test('3. читає автора з "#metadata #name .author-text"', () => {
        const el = buildComment('<div id="metadata"><div id="name"><span class="author-text">  Марія  </span></div></div>');
        assert.strictEqual(callContext(el).author, 'Марія');
    });

    test('4. фолбек на "#name", коли .author-text відсутній', () => {
        const el = buildComment('<div id="name">  Петро  </div>');
        assert.strictEqual(callContext(el).author, 'Петро');
    });

    test('5. без жодного елемента автора повертає порожній рядок', () => {
        const el = buildComment('<div id="content-text">текст</div>');
        assert.strictEqual(callContext(el).author, '');
    });

    test('6. порожній textContent автора дає порожній рядок', () => {
        const el = buildComment('<div id="name">   </div>');
        assert.strictEqual(callContext(el).author, '');
    });
});

describe('studio/comment_context — текст коментаря', () => {
    test('7. склеює текстові вузли без обрізання пробілів', () => {
        const el = buildComment('<div id="content-text"> привіт світ </div>');
        assert.strictEqual(callContext(el).text, ' привіт світ ');
    });

    test('8. підставляє alt прямої картинки замість самої картинки', () => {
        const el = buildComment('<div id="content-text">я <img alt="😀"> тут</div>');
        assert.strictEqual(callContext(el).text, 'я 😀 тут');
    });

    test('9. знаходить вкладену img[alt] усередині елемента-дитини', () => {
        const el = buildComment('<div id="content-text">а<span><img alt="🔥"></span>б</div>');
        assert.strictEqual(callContext(el).text, 'а🔥б');
    });

    test('10. елемент-дитина без img[alt] віддає власний textContent', () => {
        const el = buildComment('<div id="content-text">а<span>ХХ</span>б</div>');
        assert.strictEqual(callContext(el).text, 'аХХб');
    });

    test('11. img без alt трактується як звичайний елемент (textContent = "")', () => {
        const el = buildComment('<div id="content-text">а<img>б</div>');
        assert.strictEqual(callContext(el).text, 'аб');
    });

    test('12. коментарі та інші вузли (nodeType 8) ігноруються', () => {
        const el = buildComment('<div id="content-text">а<!-- прихований -->б</div>');
        assert.strictEqual(callContext(el).text, 'аб');
    });

    test('13. фолбек-селектор ".content-text" також працює', () => {
        const el = buildComment('<div class="content-text">через клас</div>');
        assert.strictEqual(callContext(el).text, 'через клас');
    });

    test('14. відсутній контейнер тексту дає підстановку "[comment]"', () => {
        const el = buildComment('<div id="name">Автор</div>');
        assert.strictEqual(callContext(el).text, '[comment]');
    });

    test('15. порожній контейнер тексту також дає "[comment]"', () => {
        const el = buildComment('<div id="content-text"></div>');
        assert.strictEqual(callContext(el).text, '[comment]');
    });

    test('16. елемент-заглушка без querySelector падає у гілку textContent', () => {
        // Захисна гілка оригіналу: `typeof elem.querySelector === 'function'`.
        const stubChild = { nodeType: 1, tagName: 'SPAN', textContent: 'заглушка' };
        const contentEl = { childNodes: [stubChild], textContent: 'заглушка' };
        const element = {
            querySelector: (selector) => (selector.includes('content-text') ? contentEl : null)
        };

        const ctx = getCommentContextForRestore(element, 'k', 'c', EMPTY_CACHES, uiFound);
        assert.strictEqual(ctx.text, 'заглушка');
    });
});

describe('studio/comment_context — відео', () => {
    test('17. читає та тримає videoTitle з "#video-title"', () => {
        const el = buildComment('<div id="video-title">  Урок 3  </div>');
        assert.strictEqual(callContext(el).videoTitle, 'Урок 3');
    });

    test('18. videoId будується з pathname + search посилання', () => {
        const el = buildComment('<ytcp-comment-video-thumbnail><a id="body" href="/video/abc/comments?filter=x"></a></ytcp-comment-video-thumbnail>');
        assert.strictEqual(callContext(el).videoId, '/video/abc/comments?filter=x');
    });

    test('19. pathname без query не отримує зайвого "?"', () => {
        const el = buildComment('<ytcp-comment-video-thumbnail><a id="body" href="/video/abc"></a></ytcp-comment-video-thumbnail>');
        assert.strictEqual(callContext(el).videoId, '/video/abc');
    });

    test('20. абсолютне посилання на інший домен теж розбирається', () => {
        const el = buildComment('<a class="ytcp-comment-video-thumbnail" href="https://studio.youtube.com/video/zzz/comments"></a>');
        assert.strictEqual(callContext(el).videoId, '/video/zzz/comments');
    });

    test('21. без посилання videoId дорівнює videoTitle', () => {
        const el = buildComment('<div id="video-title">Назва відео</div>');
        const ctx = callContext(el);
        assert.strictEqual(ctx.videoId, 'Назва відео');
        assert.strictEqual(ctx.videoTitle, 'Назва відео');
    });

    test('22. ні посилання, ні назви — videoId і videoTitle порожні', () => {
        const el = buildComment('<div id="content-text">текст</div>');
        const ctx = callContext(el);
        assert.strictEqual(ctx.videoId, '');
        assert.strictEqual(ctx.videoTitle, '');
    });

    test('23. фолбек-селектор ".video-title-text" для назви', () => {
        const el = buildComment('<span class="video-title-text">Альт-назва</span>');
        assert.strictEqual(callContext(el).videoTitle, 'Альт-назва');
    });
});

describe('studio/comment_context — форма результату', () => {
    test('24. id дорівнює переданому commentKey', () => {
        const el = buildComment('<div id="content-text">т</div>');
        assert.strictEqual(callContext(el, { commentKey: 'my-key' }).id, 'my-key');
    });

    test('25. повний контракт CommentContext для типового коментаря', () => {
        const el = buildComment([
            '<div id="metadata"><div id="name"><span class="author-text">Ганна</span></div></div>',
            '<div id="content-text">Питання <img alt="❓"></div>',
            '<div id="video-title">Ефір 12</div>',
            '<ytcp-comment-video-thumbnail><a id="body" href="/video/v12/comments"></a></ytcp-comment-video-thumbnail>'
        ].join(''));

        assert.deepStrictEqual(callContext(el, { commentKey: 'ck' }), {
            id: 'ck',
            author: 'Ганна',
            text: 'Питання ❓',
            videoId: '/video/v12/comments',
            videoTitle: 'Ефір 12'
        });
    });
});
