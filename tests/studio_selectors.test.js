import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// Характеризаційні (golden-master) тести публічного API `youtube/studio/studio_selectors.ts`.
//
// Модуль мав fan_in=7 і НУЛЬ прямих тестів, тому спершу фіксуємо поточну поведінку
// 1-в-1 (включно з квірками), і лише потім рефакторимо.
//
// Виконуються під happy-dom (`tests/setup/happy-dom.ts`), тож `document` — справжній DOM.

const {
    STUDIO_SELECTORS,
    getCommentHeaderLabelElement,
    getCommentHeaderElement,
    getChannelNameElement,
    getCommentThreads,
    getToolbarElement,
    getMetadataElement,
    getVideoThumbnailElement,
    getVideoTitleText,
    getVideoLinkHref,
    getAuthorNameText,
    getCommentText,
    getCommentTextAreaElement
} = await import('../youtube/studio/studio_selectors.ts');

/**
 * Мінімальний зліпок DOM YouTube Studio: тред із батьківським коментарем
 * та вкладеною відповіддю (у відповіді НЕМАЄ ні #video-title, ні посилання).
 */
const THREAD_FIXTURE = `
<div id="comments-content">
  <div id="items">
    <ytcp-comment-thread class="ytcp-comment-thread" id="thread-1">
      <ytcp-comment id="comment" class="parent-comment">
        <div id="metadata"><div id="name"><span class="author-text">  Автор Один  </span></div></div>
        <div id="expander-container">
          <div id="content-text">Привіт <img alt="😀"> світ</div>
        </div>
        <ytcp-comment-action-buttons><div id="toolbar"></div></ytcp-comment-action-buttons>
        <ytcp-comment-video-thumbnail>
          <div id="video-title">  Батьківське відео  </div>
          <a id="body" href="/watch?v=PARENT"></a>
        </ytcp-comment-video-thumbnail>
      </ytcp-comment>
      <ytcp-comment-replies>
        <ytcp-comment is-reply class="reply-comment">
          <div id="metadata"><div id="name"><span class="author-text">Автор Два</span></div></div>
          <div id="expander-container">
            <div id="content-text">Відповідь</div>
          </div>
          <ytcp-comment-action-buttons><div id="toolbar"></div></ytcp-comment-action-buttons>
          <ytcp-comment-video-thumbnail></ytcp-comment-video-thumbnail>
        </ytcp-comment>
      </ytcp-comment-replies>
    </ytcp-comment-thread>
  </div>
</div>
<div id="entity-label-container"><div id="entity-name">Канал Тест</div></div>
<ytcp-comments-section>
  <div id="comment-header"><span class="ytcp-comments-section">Коментарі (12)</span></div>
</ytcp-comments-section>
`;

/** @returns {HTMLElement} */
const q = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

describe('studio_selectors — STUDIO_SELECTORS (константи-контракт)', () => {
    test('1. усі ключі селекторів присутні та є непорожніми масивами рядків', () => {
        const expectedKeys = [
            'CHANNEL_NAME', 'COMMENT_THREAD', 'COMMENT', 'COMMENT_TEXT_AREA', 'CONTENT_TEXT',
            'AUTHOR_NAME', 'ACTION_TOOLBAR', 'METADATA', 'VIDEO_THUMBNAIL', 'VIDEO_TITLE',
            'VIDEO_LINK', 'COMMENTS_ITEMS_CONTAINER', 'COMMENT_HEADER_SPAN', 'COMMENT_HEADER'
        ];
        assert.deepEqual(Object.keys(STUDIO_SELECTORS).sort(), [...expectedKeys].sort());

        for (const key of expectedKeys) {
            const value = STUDIO_SELECTORS[key];
            assert.ok(Array.isArray(value), `${key} має бути масивом`);
            assert.ok(value.length > 0, `${key} не має бути порожнім`);
            assert.ok(value.every(s => typeof s === 'string' && s.length > 0), `${key} має містити лише непорожні рядки`);
        }
    });

    test('2. порядок фолбеків зафіксовано (перший = найточніший)', () => {
        assert.deepEqual(STUDIO_SELECTORS.AUTHOR_NAME, [
            '#metadata #name .author-text', '#metadata #name', '#name .author-text', '#name'
        ]);
        assert.deepEqual(STUDIO_SELECTORS.VIDEO_LINK, [
            'ytcp-comment-video-thumbnail a#body', '#video-title a', 'a.ytcp-comment-video-thumbnail'
        ]);
        assert.deepEqual(STUDIO_SELECTORS.COMMENT, ['ytcp-comment#comment', 'ytcp-comment']);
    });
});

describe('studio_selectors — document-scoped геттери', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('3. getChannelNameElement знаходить #entity-name за замовчуванням у document', () => {
        const el = getChannelNameElement();
        assert.ok(el);
        assert.equal(el.textContent, 'Канал Тест');
    });

    test('4. getChannelNameElement приймає власний корінь пошуку', () => {
        const scoped = q('#entity-label-container');
        assert.equal(getChannelNameElement(scoped)?.textContent, 'Канал Тест');

        // корінь без збігів -> null
        assert.equal(getChannelNameElement(q('#items')), null);
    });

    test('5. getCommentHeaderElement / getCommentHeaderLabelElement читають заголовок секції', () => {
        assert.equal(getCommentHeaderElement()?.id, 'comment-header');
        assert.equal(getCommentHeaderLabelElement()?.textContent, 'Коментарі (12)');
    });

    test('6. геттери заголовка повертають null, коли розмітки немає', () => {
        document.body.innerHTML = '<div></div>';
        assert.equal(getCommentHeaderElement(), null);
        assert.equal(getCommentHeaderLabelElement(), null);
    });

    test('7. getCommentThreads повертає МАСИВ усіх ytcp-comment (і батьків, і reply)', () => {
        const threads = getCommentThreads();
        assert.ok(Array.isArray(threads));
        assert.equal(threads.length, 2);
        assert.ok(threads[0].classList.contains('parent-comment'));
        assert.ok(threads[1].classList.contains('reply-comment'));
    });

    test('8. getCommentThreads на порожньому DOM повертає порожній масив, а не null', () => {
        document.body.innerHTML = '';
        const threads = getCommentThreads();
        assert.ok(Array.isArray(threads));
        assert.equal(threads.length, 0);
    });
});

describe('studio_selectors — thread-scoped геттери елементів', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('9. getToolbarElement повертає #toolbar саме всередині свого коментаря', () => {
        const parent = q('.parent-comment');
        const reply = q('.reply-comment');

        const parentToolbar = getToolbarElement(parent);
        const replyToolbar = getToolbarElement(reply);

        assert.ok(parentToolbar);
        assert.ok(replyToolbar);
        assert.notEqual(parentToolbar, replyToolbar);
        assert.ok(parent.contains(parentToolbar));
        assert.ok(reply.contains(replyToolbar));
    });

    test('10. getMetadataElement / getVideoThumbnailElement скоуповані по треду', () => {
        const parent = q('.parent-comment');
        assert.equal(getMetadataElement(parent)?.id, 'metadata');
        assert.equal(getVideoThumbnailElement(parent)?.tagName.toLowerCase(), 'ytcp-comment-video-thumbnail');
    });

    test('11. геттери елементів повертають null, коли всередині треду нічого немає', () => {
        const empty = document.createElement('ytcp-comment');
        assert.equal(getToolbarElement(empty), null);
        assert.equal(getMetadataElement(empty), null);
        assert.equal(getVideoThumbnailElement(empty), null);
        assert.equal(getCommentTextAreaElement(empty), null);
    });

    test('12. getCommentTextAreaElement віддає #expander-container (перший за пріоритетом)', () => {
        const parent = q('.parent-comment');
        assert.equal(getCommentTextAreaElement(parent)?.id, 'expander-container');
    });
});

describe('studio_selectors — getVideoTitleText (REPLY INHERITANCE)', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('13. батьківський коментар: текст назви відео обрізається (trim)', () => {
        assert.equal(getVideoTitleText(q('.parent-comment')), 'Батьківське відео');
    });

    test('14. reply: назва успадковується через closest(".ytcp-comment-thread")', () => {
        assert.equal(getVideoTitleText(q('.reply-comment')), 'Батьківське відео');
    });

    test('15. відірваний від треду вузол -> порожній рядок (не кидає)', () => {
        const orphan = document.createElement('ytcp-comment');
        assert.equal(getVideoTitleText(orphan), '');
    });

    test('16. тред без назви взагалі -> порожній рядок', () => {
        document.body.innerHTML = `
            <ytcp-comment-thread class="ytcp-comment-thread">
              <ytcp-comment class="c"><ytcp-comment-video-thumbnail></ytcp-comment-video-thumbnail></ytcp-comment>
            </ytcp-comment-thread>`;
        assert.equal(getVideoTitleText(q('.c')), '');
    });

    test('17. КВІРК: фолбек прив\'язаний до КЛАСУ .ytcp-comment-thread, а не до тега', () => {
        // Тег без класу -> успадкування не спрацьовує (зафіксовано як є).
        document.body.innerHTML = `
            <ytcp-comment-thread>
              <ytcp-comment-video-thumbnail><div id="video-title">Назва треду</div></ytcp-comment-video-thumbnail>
              <ytcp-comment-replies><ytcp-comment class="r"></ytcp-comment></ytcp-comment-replies>
            </ytcp-comment-thread>`;
        assert.equal(getVideoTitleText(q('.r')), '');
    });

    test('18. thread без методу closest не ламає функцію (захисна гілка)', () => {
        const fakeThread = { querySelector: () => null };
        assert.equal(getVideoTitleText(fakeThread), '');
    });
});

describe('studio_selectors — getVideoLinkHref', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('19. батьківський коментар: віддає значення АТРИБУТА href (не абсолютний .href)', () => {
        assert.equal(getVideoLinkHref(q('.parent-comment')), '/watch?v=PARENT');
    });

    test('20. reply: посилання успадковується від треду', () => {
        assert.equal(getVideoLinkHref(q('.reply-comment')), '/watch?v=PARENT');
    });

    test('21. немає жодного <a> ні в треді, ні у батька -> null', () => {
        document.body.innerHTML = `
            <ytcp-comment-thread class="ytcp-comment-thread">
              <ytcp-comment class="c"><ytcp-comment-video-thumbnail></ytcp-comment-video-thumbnail></ytcp-comment>
            </ytcp-comment-thread>`;
        assert.equal(getVideoLinkHref(q('.c')), null);
    });

    test('22. відірваний вузол -> null', () => {
        assert.equal(getVideoLinkHref(document.createElement('ytcp-comment')), null);
    });

    test('23. КВІРК: <a> БЕЗ атрибута href повертає порожній рядок, а не null', () => {
        // `(getAttribute('href')) || a.href` -> null || '' -> ''
        document.body.innerHTML = `
            <ytcp-comment-thread class="ytcp-comment-thread">
              <ytcp-comment class="c">
                <ytcp-comment-video-thumbnail><a id="body"></a></ytcp-comment-video-thumbnail>
              </ytcp-comment>
            </ytcp-comment-thread>`;
        assert.equal(getVideoLinkHref(q('.c')), '');
    });

    test('24. фолбек на .href, коли getAttribute відсутній (stub-елемент)', () => {
        const fakeAnchor = { href: 'https://youtu.be/STUB' };
        const fakeThread = { querySelector: () => fakeAnchor };
        assert.equal(getVideoLinkHref(fakeThread), 'https://youtu.be/STUB');
    });

    test('25. thread без closest і без збігів -> null', () => {
        const fakeThread = { querySelector: () => null };
        assert.equal(getVideoLinkHref(fakeThread), null);
    });
});

describe('studio_selectors — getAuthorNameText', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('26. обрізає пробіли навколо імені автора', () => {
        assert.equal(getAuthorNameText(q('.parent-comment')), 'Автор Один');
    });

    test('27. reply має власного автора (без успадкування)', () => {
        assert.equal(getAuthorNameText(q('.reply-comment')), 'Автор Два');
    });

    test('28. немає автора -> порожній рядок', () => {
        assert.equal(getAuthorNameText(document.createElement('ytcp-comment')), '');
    });
});

describe('studio_selectors — getCommentText (склеювання тексту та emoji-alt)', () => {
    beforeEach(() => {
        document.body.innerHTML = THREAD_FIXTURE;
    });

    test('29. текстові вузли + alt прямого <img> склеюються в один рядок', () => {
        assert.equal(getCommentText(q('.parent-comment')), 'Привіт 😀 світ');
    });

    test('30. простий текст без картинок', () => {
        assert.equal(getCommentText(q('.reply-comment')), 'Відповідь');
    });

    test('31. немає #content-text -> порожній рядок', () => {
        assert.equal(getCommentText(document.createElement('ytcp-comment')), '');
    });

    test('32. вкладений <img alt> усередині елемента підставляє alt ЗАМІСТЬ тексту елемента', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="content-text">A<span>ігнор<img alt="[емодзі]"></span>B</div>
            </ytcp-comment>`;
        assert.equal(getCommentText(q('.c')), 'A[емодзі]B');
    });

    test('33. елемент без <img alt> віддає свій textContent', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="content-text">A<span>текст</span>B</div>
            </ytcp-comment>`;
        assert.equal(getCommentText(q('.c')), 'AтекстB');
    });

    test('34. <img> без alt не додає нічого (порожній alt), лишається текст сусідів', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="content-text">A<img>B</div>
            </ytcp-comment>`;
        assert.equal(getCommentText(q('.c')), 'AB');
    });

    test('35. коментарі/інші типи вузлів ігноруються', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="content-text">A<!-- прихований -->B</div>
            </ytcp-comment>`;
        assert.equal(getCommentText(q('.c')), 'AB');
    });

    test('36. результат обрізається по краях', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="content-text">   рядок з пробілами   </div>
            </ytcp-comment>`;
        assert.equal(getCommentText(q('.c')), 'рядок з пробілами');
    });

    test('37. захисна гілка: елемент-вузол без querySelector віддає textContent', () => {
        const fakeEl = {
            childNodes: [{ nodeType: 1, tagName: 'SPAN', textContent: 'зі stub-а' }],
            textContent: 'ігнорується'
        };
        const fakeThread = { querySelector: () => fakeEl };
        assert.equal(getCommentText(fakeThread), 'зі stub-а');
    });

    test('38. фолбек на textContent, коли обхід дітей дав порожній результат', () => {
        const fakeEl = { childNodes: [], textContent: '  резервний текст  ' };
        const fakeThread = { querySelector: () => fakeEl };
        assert.equal(getCommentText(fakeThread), 'резервний текст');
    });

    test('39. відсутній childNodes не ламає обхід', () => {
        const fakeEl = { textContent: 'без дітей' };
        const fakeThread = { querySelector: () => fakeEl };
        assert.equal(getCommentText(fakeThread), 'без дітей');
    });
});

describe('studio_selectors — Sequential Fallback Priority (YT-D3)', () => {
    test('40. порядок селекторів у масиві має справжній пріоритет над порядком у DOM', async () => {
        // У DOM вузол з класом 'generic' стоїть РАНІШЕ, ніж вузол з класом 'specific'
        document.body.innerHTML = `
            <div id="container">
              <div class="generic" id="first-in-dom">Generic</div>
              <div class="specific" id="second-in-dom">Specific</div>
            </div>`;
        const container = q('#container');

        // Імпортуємо queryOne
        const { queryOne } = await import('../youtube/studio/studio_selector_queries.ts');

        // Якщо specific першим у масиві -> повертається specific, хоча він пізніше в DOM!
        const result = queryOne(container, ['.specific', '.generic']);
        assert.equal(result?.id, 'second-in-dom', 'Повинен перемагати перший селектор у масиві');

        // Якщо generic першим -> повертається generic
        const reverseResult = queryOne(container, ['.generic', '.specific']);
        assert.equal(reverseResult?.id, 'first-in-dom');
    });

    test('41. getToolbarElement віддає ytcp-comment-action-buttons #toolbar перевагу перед generic #toolbar', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="toolbar" class="unrelated-toolbar">Unrelated</div>
              <ytcp-comment-action-buttons>
                <div id="toolbar" class="correct-toolbar">Action Toolbar</div>
              </ytcp-comment-action-buttons>
            </ytcp-comment>`;
        const comment = q('.c');
        const toolbar = getToolbarElement(comment);
        assert.ok(toolbar);
        assert.ok(toolbar.classList.contains('correct-toolbar'), 'Має вибратися action-buttons toolbar');
    });

    test('42. getAuthorNameText віддає перевагу .author-text навіть якщо #name стоїть раніше в DOM', () => {
        document.body.innerHTML = `
            <ytcp-comment class="c">
              <div id="metadata">
                <div id="name">
                  <span class="unrelated">Зайвий текст</span>
                  <span class="author-text">Справжній Автор</span>
                </div>
              </div>
            </ytcp-comment>`;
        const comment = q('.c');
        assert.equal(getAuthorNameText(comment), 'Справжній Автор');
    });
});

