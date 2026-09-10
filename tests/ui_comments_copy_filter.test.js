import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

/**
 * Характеризаційні тести для CRAP-хотспотів `modules/ui_comments.ts`:
 *   - обробник кнопки копіювання у вкладці Starred (рядок 95, CRAP 31.6, 59 LOC);
 *   - тіло циклу `filterCommentListItems` (рядок 219, CRAP 49.5, cyclomatic 13).
 *
 * Написані ДО рефакторингу і фіксують поведінку 1-в-1 через публічний API
 * модуля. Після винесення збирача коментарів і класифікатора рядків у окремі
 * файли ці тести мають лишитися зеленими без правок.
 *
 * Навмисно зафіксовані «дивацтва» чинної реалізації:
 *   - фолбек на `prayersCache` спрацьовує лише якщо у DOM НЕ знайдено жодного
 *     придатного коментаря (порожній список або всі приховані/видалені);
 *   - іконка перемикається на ✅ навіть тоді, коли копіювання не вдалося;
 *   - `updateListItemOrdering` для невідомого тексту ставить order 9999.
 */

const { SYH_UI_STATE } = await import('../modules/streamyard/ui/ui_state.ts');
const { SYH_UTILS } = await import('../modules/utils.ts');
const { CommentService } = await import('../modules/comment_service.ts');
const {
    addButtonsToComment,
    addStarredTabCopyButton,
    filterCommentListItems,
    updateCommentTabCounts,
    renderCommentEmptyState
} = await import('../modules/streamyard/ui/ui_comments.ts');

const SELECTORS = {
    commentBlock: '.cmt',
    commentText: '.cmt-text',
    commentAuthor: '.cmt-author',
    commentButtonContainer: '.cmt-actions',
    starredList: '#starred-list'
};

/** Перехоплює виклики copyAndShowBanner + буфер обміну. */
function installSpies() {
    const banners = [];
    const clipboard = [];

    const originalBanner = SYH_UTILS.copyAndShowBanner;
    const originalCopy = CommentService.copyToClipboard;

    SYH_UTILS.copyAndShowBanner = (text, title) => { banners.push([text, title]); };
    CommentService.copyToClipboard = async (text) => { clipboard.push(text); return true; };

    return {
        banners,
        clipboard,
        setCopyResult(result) {
            CommentService.copyToClipboard = async (text) => { clipboard.push(text); return result; };
        },
        restore() {
            SYH_UTILS.copyAndShowBanner = originalBanner;
            CommentService.copyToClipboard = originalCopy;
        }
    };
}

/** Будує <li> зі структурою коментаря StreamYard. */
function makeCommentLi({ author = '', text = '', deleted = false, hidden = false, withBlock = true } = {}) {
    const li = document.createElement('li');
    if (deleted) li.setAttribute('data-syh-deleted', 'true');
    if (hidden) li.style.display = 'none';

    if (withBlock) {
        const block = document.createElement('div');
        block.className = 'cmt';

        const authorEl = document.createElement('span');
        authorEl.className = 'cmt-author';
        authorEl.textContent = author;

        const textEl = document.createElement('span');
        textEl.className = 'cmt-text';
        textEl.textContent = text;

        block.appendChild(authorEl);
        block.appendChild(textEl);
        li.appendChild(block);
    }
    return li;
}

function makeStarredList(items) {
    const list = document.createElement('ul');
    list.id = 'starred-list';
    items.forEach(li => list.appendChild(li));
    document.body.appendChild(list);
    return list;
}

describe('ui_comments — addStarredTabCopyButton (характеризація)', () => {
    let spies;

    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
        SYH_UI_STATE.SELECTORS = { ...SELECTORS };
        SYH_UI_STATE.prayersCache = [];
        spies = installSpies();
    });

    test('1. створює кнопку копіювання з очікуваними атрибутами', () => {
        const tab = document.createElement('div');
        document.body.appendChild(tab);

        addStarredTabCopyButton(tab);

        const btn = tab.querySelector('.syh-starred-tab-copy-btn');
        assert.ok(btn, 'кнопка має бути створена');
        assert.strictEqual(btn.type, 'button');
        assert.strictEqual(btn.title, 'Скопіює всі списки зі Starred');
        assert.strictEqual(btn.getAttribute('aria-label'), 'Скопіює всі списки зі Starred');
        assert.strictEqual(btn.innerHTML, '<span class="syh-starred-copy-icon">📋</span>');
        spies.restore();
    });

    test('2. підганяє позиціонування вкладки під абсолютну кнопку', () => {
        const staticTab = document.createElement('div');
        staticTab.style.position = 'static';
        document.body.appendChild(staticTab);

        addStarredTabCopyButton(staticTab);

        // position перемикається на relative лише для явно static-вкладки
        assert.strictEqual(staticTab.style.position, 'relative');
        assert.strictEqual(staticTab.style.paddingRight, '28px');

        const positionedTab = document.createElement('div');
        positionedTab.style.position = 'absolute';
        document.body.appendChild(positionedTab);

        addStarredTabCopyButton(positionedTab);

        // вже спозиційована вкладка лишається як є, але відступ додається завжди
        assert.strictEqual(positionedTab.style.position, 'absolute');
        assert.strictEqual(positionedTab.style.paddingRight, '28px');
        spies.restore();
    });

    test('3. повторний виклик не дублює кнопку', () => {
        const tab = document.createElement('div');
        document.body.appendChild(tab);

        addStarredTabCopyButton(tab);
        addStarredTabCopyButton(tab);

        assert.strictEqual(tab.querySelectorAll('.syh-starred-tab-copy-btn').length, 1);
        spies.restore();
    });

    test('4. порожній вузол вкладки не ламає виклик', () => {
        assert.doesNotThrow(() => addStarredTabCopyButton(null));
        spies.restore();
    });

    test('5. клік копіює видимі коментарі у форматі CommentService', async () => {
        makeStarredList([
            makeCommentLi({ author: '@Іван', text: 'Перший' }),
            makeCommentLi({ author: 'Марія', text: 'Другий' })
        ]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, ['@Іван\n\nПерший\n\n@Марія\n\nДругий']);
        assert.deepStrictEqual(spies.banners, [['@Іван\n\nПерший\n\n@Марія\n\nДругий', 'Скопійовано коментарів: 2 📋']]);
        spies.restore();
    });

    test('5b. РЕГРЕС: при невдалому копіюванні НЕ показується оманлива ✅, а лише попередження', async () => {
        spies.setCopyResult(false);
        makeStarredList([
            makeCommentLi({ author: '@Іван', text: 'Перший' })
        ]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        const iconSpan = tab.querySelector('.syh-starred-copy-icon');

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, ['@Іван\n\nПерший']);
        assert.ok(!iconSpan.classList.contains('syh-copied-anim'), 'не має бути анімації успіху');
        assert.strictEqual(iconSpan.textContent, '📋', 'іконка лишається у стані спокою (не ✅)');
        assert.deepStrictEqual(
            spies.banners,
            [['', '⚠️ Не вдалося скопіювати в буфер обміну']],
            'має бути лише попереджувальний тост'
        );
        spies.restore();
    });

    test('6. пропускає видалені (data-syh-deleted) та приховані (display:none) записи', async () => {
        makeStarredList([
            makeCommentLi({ author: 'A', text: 'видимий' }),
            makeCommentLi({ author: 'B', text: 'видалений', deleted: true }),
            makeCommentLi({ author: 'C', text: 'прихований', hidden: true })
        ]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, ['@A\n\nвидимий']);
        spies.restore();
    });

    test('7. пропускає записи з порожнім текстом', async () => {
        makeStarredList([
            makeCommentLi({ author: 'A', text: '   ' }),
            makeCommentLi({ author: 'B', text: 'є текст' })
        ]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, ['@B\n\nє текст']);
        spies.restore();
    });

    test('8. порожній список у DOM -> фолбек на prayersCache', async () => {
        makeStarredList([]);
        SYH_UI_STATE.prayersCache = [
            { author: '@Петро', text: 'Молитва 1', type: 'prayer' },
            { author: '', text: 'Молитва 2', type: 'prayer' }
        ];
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, ['@Петро\n\nМолитва 1\n\nМолитва 2']);
        spies.restore();
    });

    test('9. нічого копіювати -> банер-попередження і жодного звернення до буфера', async () => {
        makeStarredList([]);
        SYH_UI_STATE.prayersCache = [];
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);

        await tab.querySelector('.syh-starred-tab-copy-btn').click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.clipboard, []);
        assert.deepStrictEqual(spies.banners, [['', 'Немає коментарів для копіювання']]);
        spies.restore();
    });

    test('10. після копіювання іконка перемикається на ✅ і додається клас анімації', async () => {
        makeStarredList([makeCommentLi({ author: 'A', text: 'text' })]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);
        const btn = tab.querySelector('.syh-starred-tab-copy-btn');

        await btn.click();
        await new Promise(r => setTimeout(r, 0));

        assert.strictEqual(btn.querySelector('.syh-starred-copy-icon').textContent, '✅');
        assert.ok(btn.classList.contains('syh-copied-anim'));
        spies.restore();
    });

    test('11. РЕГРЕС: невдале копіювання більше НЕ перемикає іконку на ✅ (лише попередження)', async () => {
        makeStarredList([makeCommentLi({ author: 'A', text: 'text' })]);
        spies.setCopyResult(false);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        addStarredTabCopyButton(tab);
        const btn = tab.querySelector('.syh-starred-tab-copy-btn');

        await btn.click();
        await new Promise(r => setTimeout(r, 0));

        assert.deepStrictEqual(spies.banners, [['', '⚠️ Не вдалося скопіювати в буфер обміну']]);
        assert.strictEqual(btn.querySelector('.syh-starred-copy-icon').textContent, '📋');
        assert.ok(!btn.querySelector('.syh-starred-copy-icon').classList.contains('syh-copied-anim'));
        spies.restore();
    });

    test('12. клік не спливає до вкладки (stopPropagation + preventDefault)', async () => {
        makeStarredList([makeCommentLi({ author: 'A', text: 'text' })]);
        const tab = document.createElement('div');
        document.body.appendChild(tab);
        let bubbled = 0;
        tab.addEventListener('click', () => { bubbled++; });
        addStarredTabCopyButton(tab);

        tab.querySelector('.syh-starred-tab-copy-btn').dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true })
        );
        await new Promise(r => setTimeout(r, 0));

        assert.strictEqual(bubbled, 0);
        spies.restore();
    });
});

describe('ui_comments — filterCommentListItems (характеризація)', () => {
    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
        SYH_UI_STATE.SELECTORS = { ...SELECTORS };
        SYH_UI_STATE.prayersCache = [];
    });

    test('13. рахує абсолютні лічильники за категоріями з кешу', () => {
        const list = makeStarredList([
            makeCommentLi({ author: 'A', text: 'питання' }),
            makeCommentLi({ author: 'B', text: 'молитва' }),
            makeCommentLi({ author: 'C', text: 'інше' })
        ]);
        const cache = [
            { author: 'A', text: 'питання', type: 'question' },
            { author: 'B', text: 'молитва', type: 'prayer' }
        ];

        const res = filterCommentListItems(list, SELECTORS, cache, 'all', '', []);

        assert.deepStrictEqual(res.countAbsolute, { all: 3, question: 1, prayer: 1, other: 1 });
        assert.strictEqual(res.visibleCount, 3);
    });

    test('14. пропускає li з data-syh-deleted="true"', () => {
        const list = makeStarredList([
            makeCommentLi({ author: 'A', text: 'живий' }),
            makeCommentLi({ author: 'B', text: 'мертвий', deleted: true })
        ]);

        const res = filterCommentListItems(list, SELECTORS, [], 'all', '', []);

        assert.strictEqual(res.countAbsolute.all, 1);
        assert.strictEqual(res.visibleCount, 1);
    });

    test('15. пропускає li без блоку коментаря', () => {
        const list = makeStarredList([
            makeCommentLi({ author: 'A', text: 'ок' }),
            makeCommentLi({ withBlock: false })
        ]);

        const res = filterCommentListItems(list, SELECTORS, [], 'all', '', []);

        assert.strictEqual(res.countAbsolute.all, 1);
    });

    test('16. виставляє data-syh-type на блоці коментаря', () => {
        const li1 = makeCommentLi({ author: 'A', text: 'питання' });
        const li2 = makeCommentLi({ author: 'B', text: 'інше' });
        const list = makeStarredList([li1, li2]);
        const cache = [{ author: 'A', text: 'питання', type: 'question' }];

        filterCommentListItems(list, SELECTORS, cache, 'all', '', []);

        assert.strictEqual(li1.querySelector('.cmt').getAttribute('data-syh-type'), 'question');
        assert.strictEqual(li2.querySelector('.cmt').getAttribute('data-syh-type'), null);
    });

    test('17. фільтр за категорією ховає невідповідні елементи', () => {
        const li1 = makeCommentLi({ author: 'A', text: 'питання' });
        const li2 = makeCommentLi({ author: 'B', text: 'молитва' });
        const list = makeStarredList([li1, li2]);
        const cache = [
            { author: 'A', text: 'питання', type: 'question' },
            { author: 'B', text: 'молитва', type: 'prayer' }
        ];

        const res = filterCommentListItems(list, SELECTORS, cache, 'prayer', '', []);

        assert.strictEqual(res.visibleCount, 1);
        assert.strictEqual(li1.style.display, 'none');
        assert.strictEqual(li2.style.display, '');
    });

    test('18. пошук звужує видимість і наповнює countSearch', () => {
        const list = makeStarredList([
            makeCommentLi({ author: 'Іван', text: 'про віру' }),
            makeCommentLi({ author: 'Петро', text: 'про надію' })
        ]);

        const res = filterCommentListItems(list, SELECTORS, [], 'all', 'віру', []);

        assert.strictEqual(res.visibleCount, 1);
        assert.deepStrictEqual(res.countSearch, { all: 1, question: 0, prayer: 0, other: 1 });
        assert.deepStrictEqual(res.countAbsolute, { all: 2, question: 0, prayer: 0, other: 2 });
    });

    test('19. пошук працює і по імені автора', () => {
        const list = makeStarredList([
            makeCommentLi({ author: 'Іван', text: 'aaa' }),
            makeCommentLi({ author: 'Петро', text: 'bbb' })
        ]);

        const res = filterCommentListItems(list, SELECTORS, [], 'all', 'Петро', []);

        assert.strictEqual(res.visibleCount, 1);
    });

    test('19b. регресія Starred: пошук "лидия" / "лиди" / "лідія" знаходить автора @LidiaSplayeva-vw9xr', () => {
        const lidiaLi = makeCommentLi({ author: '@LidiaSplayeva-vw9xr', text: 'Дякую за ефір!' });
        const otherLi = makeCommentLi({ author: '@someone_else', text: 'Інший коментар' });
        const list = makeStarredList([lidiaLi, otherLi]);

        // Повний запит "лидия"
        let res = filterCommentListItems(list, SELECTORS, [], 'all', 'лидия', []);
        assert.strictEqual(res.visibleCount, 1, 'Пошук "лидия" показує коментар Лідії');
        assert.strictEqual(lidiaLi.style.display, '', 'Рядок Лідії видимий');
        assert.strictEqual(otherLi.style.display, 'none', 'Інший рядок прихований');

        // Префікс "лиди" (під час вводу)
        res = filterCommentListItems(list, SELECTORS, [], 'all', 'лиди', []);
        assert.strictEqual(res.visibleCount, 1, 'Пошук "лиди" показує коментар Лідії');
        assert.strictEqual(lidiaLi.style.display, '', 'Рядок Лідії видимий при вказанні префіксу');

        // Український варіант "лідія"
        res = filterCommentListItems(list, SELECTORS, [], 'all', 'лідія', []);
        assert.strictEqual(res.visibleCount, 1, 'Пошук "лідія" показує коментар Лідії');
        assert.strictEqual(lidiaLi.style.display, '', 'Рядок Лідії видимий для українського написання');

        // Латиниця "Lidia"
        res = filterCommentListItems(list, SELECTORS, [], 'all', 'Lidia', []);
        assert.strictEqual(res.visibleCount, 1, 'Пошук "Lidia" показує коментар Лідії');
        assert.strictEqual(lidiaLi.style.display, '', 'Рядок Лідії видимий для латиниці');
    });

    test('20. порядок береться з sortedTexts; КВІРК: order 0 ніколи не записується явно', () => {
        const li1 = makeCommentLi({ author: 'A', text: 'другий' });
        const li2 = makeCommentLi({ author: 'B', text: 'перший' });
        const li3 = makeCommentLi({ author: 'C', text: 'невідомий' });
        const list = makeStarredList([li1, li2, li3]);

        filterCommentListItems(list, SELECTORS, [], 'all', '', ['перший', 'другий']);

        assert.strictEqual(li1.style.order, '1');
        // targetOrder === 0 збігається з parseInt('' || '0'), тож присвоєння пропускається
        // (CSS-дефолт order і так 0 — поведінка коректна, але неочевидна).
        assert.strictEqual(li2.style.order, '');
        assert.strictEqual(li3.style.order, '9999');
    });

    test('21. прихований елемент отримує order 9999 і display none', () => {
        const li = makeCommentLi({ author: 'A', text: 'молитва' });
        const list = makeStarredList([li]);
        const cache = [{ author: 'A', text: 'молитва', type: 'prayer' }];

        filterCommentListItems(list, SELECTORS, cache, 'question', '', ['молитва']);

        assert.strictEqual(li.style.display, 'none');
        assert.strictEqual(li.style.order, '9999');
    });

    test('22. порожній список дає нульові лічильники', () => {
        const list = makeStarredList([]);
        const res = filterCommentListItems(list, SELECTORS, [], 'all', '', []);

        assert.strictEqual(res.visibleCount, 0);
        assert.deepStrictEqual(res.countAbsolute, { all: 0, question: 0, prayer: 0, other: 0 });
        assert.deepStrictEqual(res.countSearch, { all: 0, question: 0, prayer: 0, other: 0 });
    });
});

describe('ui_comments — addButtonsToComment / лічильники / empty-state', () => {
    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
        SYH_UI_STATE.SELECTORS = { ...SELECTORS };
        SYH_UI_STATE.prayersCache = [];
    });

    test('23. додає три кнопки дій і чекбокс у контейнер', () => {
        const node = document.createElement('div');
        node.innerHTML = '<div class="cmt-actions"></div><span class="cmt-text">текст</span>';
        document.body.appendChild(node);

        addButtonsToComment(node);

        const container = node.querySelector('.syh-custom-buttons-comment');
        assert.ok(container);
        const actions = Array.from(container.querySelectorAll('button')).map(b => b.dataset.action);
        assert.deepStrictEqual(actions, ['copy-comment', 'copy-author-comment', 'copy-prayer']);
        assert.strictEqual(container.querySelectorAll('input.syh-checkbox').length, 1);
    });

    test('24. повторний виклик не дублює блок кнопок', () => {
        const node = document.createElement('div');
        node.innerHTML = '<div class="cmt-actions"></div><span class="cmt-text">текст</span>';
        document.body.appendChild(node);

        addButtonsToComment(node);
        addButtonsToComment(node);

        assert.strictEqual(node.querySelectorAll('.syh-custom-buttons-comment').length, 1);
    });

    test('25. без контейнера дій нічого не додається', () => {
        const node = document.createElement('div');
        node.innerHTML = '<span class="cmt-text">текст</span>';
        document.body.appendChild(node);

        addButtonsToComment(node);

        assert.strictEqual(node.querySelectorAll('.syh-custom-buttons-comment').length, 0);
    });

    test('26. застосовує збережену мітку типу з prayersCache', () => {
        SYH_UI_STATE.prayersCache = [{ author: 'A', text: 'текст', type: 'prayer' }];
        const node = document.createElement('div');
        node.innerHTML = '<div class="cmt-actions"></div><span class="cmt-text">текст</span>';
        document.body.appendChild(node);

        addButtonsToComment(node);

        assert.strictEqual(node.getAttribute('data-syh-type'), 'prayer');
    });

    test('27. updateCommentTabCounts пише лічильники у вкладки', () => {
        document.body.innerHTML = `
            <div id="syh-comment-filter-all"><span class="tab-count"></span></div>
            <div id="syh-comment-filter-question"><span class="tab-count"></span></div>
            <div id="syh-comment-filter-prayer"><span class="tab-count"></span></div>
            <div id="syh-comment-filter-other"><span class="tab-count"></span></div>
        `;

        updateCommentTabCounts({ all: 7, question: 3, prayer: 2, other: 2 });

        assert.strictEqual(document.querySelector('#syh-comment-filter-all .tab-count').textContent, ' (7)');
        assert.strictEqual(document.querySelector('#syh-comment-filter-question .tab-count').textContent, ' (3)');
        assert.strictEqual(document.querySelector('#syh-comment-filter-prayer .tab-count').textContent, ' (2)');
        assert.strictEqual(document.querySelector('#syh-comment-filter-other .tab-count').textContent, ' (2)');
    });

    test('28. renderCommentEmptyState показує підказку пошуку і ховає її за наявності результатів', () => {
        document.body.innerHTML = `
            <div id="syh-empty-state-msg" style="display:none;"><div id="syh-empty-query"></div></div>
        `;

        renderCommentEmptyState(0, 'abc', 'all', { all: 0, question: 0, prayer: 0, other: 0 });
        const emptyState = document.getElementById('syh-empty-state-msg');
        assert.strictEqual(emptyState.style.display, 'block');
        assert.match(document.getElementById('syh-empty-query').innerHTML, /Нічого не знайдено за запитом/);

        renderCommentEmptyState(3, 'abc', 'all', { all: 3, question: 0, prayer: 0, other: 3 });
        assert.strictEqual(emptyState.style.display, 'none');
    });

    test('29. renderCommentEmptyState без пошуку показує назву активної категорії', () => {
        document.body.innerHTML = `
            <div id="syh-empty-state-msg" style="display:none;"><div id="syh-empty-query"></div></div>
        `;

        renderCommentEmptyState(0, '', 'prayer', { all: 0, question: 0, prayer: 0, other: 0 });

        assert.match(
            document.getElementById('syh-empty-query').innerHTML,
            /Тут ще немає коментарів для категорії "🙏 Молитви"/
        );
    });
});
