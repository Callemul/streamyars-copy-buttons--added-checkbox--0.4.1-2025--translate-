import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_UI_STATE } = await import('../modules/ui_state.ts');
// `addStarredTabControls` живе в `ui_starred_controls.ts` (винесено з `ui_comments.ts`),
// решта хелперів фільтрації лишилися в `ui_comments.ts`.
const { addStarredTabControls } = await import('../modules/ui_starred_controls.ts');
const {
    buildSortedCommentTexts,
    evalCategoryMatch,
    updateListItemOrdering,
    updateCommentVisuals
} = await import('../modules/ui_comments.ts');

/**
 * Характеризаційні (golden) тести для `addStarredTabControls`.
 *
 * Розмітку зафіксовано ДО рефакторингу CRAP-хотспота (cyc=15, cog=26) прямим
 * дампом `innerHTML` з чинної реалізації. Будь-яка зміна розмітки — навіть
 * пробіл чи порядок атрибутів — завалить ці тести, що й гарантує принцип «1-в-1».
 *
 * Навмисно зафіксовані «дивацтва» чинної розмітки:
 *   - неактивна вкладка має class="syh-filter-btn " із ХВОСТОВИМ пробілом;
 *   - вкладка "other" завжди рендериться з style="display: none;".
 */

const GOLDEN_ALL_EMPTY = "\n            <div class=\"syh-starred-controls\" style=\"margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;\">\n                <div class=\"syh-search-wrapper\">\n                    <input type=\"text\" id=\"syh-starred-search\" value=\"\" placeholder=\"🔍 Пошук по імені або тексту...\" aria-label=\"Пошук по імені або тексту\" style=\"flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;\">\n                    <button id=\"syh-clear-search-btn\" class=\"syh-clear-search\" style=\"display: none;\" title=\"Очистити пошук\" aria-label=\"Очистити пошук коментарів\">✕</button>\n                    <button id=\"syh-scroll-to-active-btn\" class=\"syh-button\" style=\"padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;\" title=\"Повернутися до коментаря на екрані\" aria-label=\"Повернутися до коментаря на екрані\">🎯</button>\n                </div>\n                \n                <div role=\"tablist\" aria-label=\"Фільтри коментарів\" style=\"display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;\">\n                    <button role=\"tab\" aria-selected=\"true\" aria-label=\"Показати всі коментарі\" class=\"syh-filter-btn active\" data-filter=\"all\" id=\"syh-comment-filter-all\">\n                        <span>⭐</span><span class=\"tab-text\">Всі</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати питання\" class=\"syh-filter-btn \" data-filter=\"question\" id=\"syh-comment-filter-question\">\n                        <span>❓</span><span class=\"tab-text\">Питання</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати молитви\" class=\"syh-filter-btn \" data-filter=\"prayer\" id=\"syh-comment-filter-prayer\">\n                        <span>🙏</span><span class=\"tab-text\">Молитви</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати інші коментарі\" class=\"syh-filter-btn \" data-filter=\"other\" id=\"syh-comment-filter-other\" style=\"display: none;\">\n                        <span>📝</span><span class=\"tab-text\">Інші</span><span class=\"tab-count\"></span>\n                    </button>\n                </div>\n            </div>\n        ";
const GOLDEN_PRAYER_QUERY = "\n            <div class=\"syh-starred-controls\" style=\"margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;\">\n                <div class=\"syh-search-wrapper\">\n                    <input type=\"text\" id=\"syh-starred-search\" value=\"abc\" placeholder=\"🔍 Пошук по імені або тексту...\" aria-label=\"Пошук по імені або тексту\" style=\"flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;\">\n                    <button id=\"syh-clear-search-btn\" class=\"syh-clear-search\" style=\"display: flex;\" title=\"Очистити пошук\" aria-label=\"Очистити пошук коментарів\">✕</button>\n                    <button id=\"syh-scroll-to-active-btn\" class=\"syh-button\" style=\"padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;\" title=\"Повернутися до коментаря на екрані\" aria-label=\"Повернутися до коментаря на екрані\">🎯</button>\n                </div>\n                \n                <div role=\"tablist\" aria-label=\"Фільтри коментарів\" style=\"display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;\">\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати всі коментарі\" class=\"syh-filter-btn \" data-filter=\"all\" id=\"syh-comment-filter-all\">\n                        <span>⭐</span><span class=\"tab-text\">Всі</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати питання\" class=\"syh-filter-btn \" data-filter=\"question\" id=\"syh-comment-filter-question\">\n                        <span>❓</span><span class=\"tab-text\">Питання</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"true\" aria-label=\"Показати молитви\" class=\"syh-filter-btn active\" data-filter=\"prayer\" id=\"syh-comment-filter-prayer\">\n                        <span>🙏</span><span class=\"tab-text\">Молитви</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати інші коментарі\" class=\"syh-filter-btn \" data-filter=\"other\" id=\"syh-comment-filter-other\" style=\"display: none;\">\n                        <span>📝</span><span class=\"tab-text\">Інші</span><span class=\"tab-count\"></span>\n                    </button>\n                </div>\n            </div>\n        ";
const GOLDEN_QUESTION = "\n            <div class=\"syh-starred-controls\" style=\"margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;\">\n                <div class=\"syh-search-wrapper\">\n                    <input type=\"text\" id=\"syh-starred-search\" value=\"\" placeholder=\"🔍 Пошук по імені або тексту...\" aria-label=\"Пошук по імені або тексту\" style=\"flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;\">\n                    <button id=\"syh-clear-search-btn\" class=\"syh-clear-search\" style=\"display: none;\" title=\"Очистити пошук\" aria-label=\"Очистити пошук коментарів\">✕</button>\n                    <button id=\"syh-scroll-to-active-btn\" class=\"syh-button\" style=\"padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;\" title=\"Повернутися до коментаря на екрані\" aria-label=\"Повернутися до коментаря на екрані\">🎯</button>\n                </div>\n                \n                <div role=\"tablist\" aria-label=\"Фільтри коментарів\" style=\"display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;\">\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати всі коментарі\" class=\"syh-filter-btn \" data-filter=\"all\" id=\"syh-comment-filter-all\">\n                        <span>⭐</span><span class=\"tab-text\">Всі</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"true\" aria-label=\"Показати питання\" class=\"syh-filter-btn active\" data-filter=\"question\" id=\"syh-comment-filter-question\">\n                        <span>❓</span><span class=\"tab-text\">Питання</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати молитви\" class=\"syh-filter-btn \" data-filter=\"prayer\" id=\"syh-comment-filter-prayer\">\n                        <span>🙏</span><span class=\"tab-text\">Молитви</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати інші коментарі\" class=\"syh-filter-btn \" data-filter=\"other\" id=\"syh-comment-filter-other\" style=\"display: none;\">\n                        <span>📝</span><span class=\"tab-text\">Інші</span><span class=\"tab-count\"></span>\n                    </button>\n                </div>\n            </div>\n        ";
const GOLDEN_OTHER = "\n            <div class=\"syh-starred-controls\" style=\"margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;\">\n                <div class=\"syh-search-wrapper\">\n                    <input type=\"text\" id=\"syh-starred-search\" value=\"zz\" placeholder=\"🔍 Пошук по імені або тексту...\" aria-label=\"Пошук по імені або тексту\" style=\"flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;\">\n                    <button id=\"syh-clear-search-btn\" class=\"syh-clear-search\" style=\"display: flex;\" title=\"Очистити пошук\" aria-label=\"Очистити пошук коментарів\">✕</button>\n                    <button id=\"syh-scroll-to-active-btn\" class=\"syh-button\" style=\"padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;\" title=\"Повернутися до коментаря на екрані\" aria-label=\"Повернутися до коментаря на екрані\">🎯</button>\n                </div>\n                \n                <div role=\"tablist\" aria-label=\"Фільтри коментарів\" style=\"display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;\">\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати всі коментарі\" class=\"syh-filter-btn \" data-filter=\"all\" id=\"syh-comment-filter-all\">\n                        <span>⭐</span><span class=\"tab-text\">Всі</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати питання\" class=\"syh-filter-btn \" data-filter=\"question\" id=\"syh-comment-filter-question\">\n                        <span>❓</span><span class=\"tab-text\">Питання</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"false\" aria-label=\"Показати молитви\" class=\"syh-filter-btn \" data-filter=\"prayer\" id=\"syh-comment-filter-prayer\">\n                        <span>🙏</span><span class=\"tab-text\">Молитви</span><span class=\"tab-count\"></span>\n                    </button>\n                    <button role=\"tab\" aria-selected=\"true\" aria-label=\"Показати інші коментарі\" class=\"syh-filter-btn active\" data-filter=\"other\" id=\"syh-comment-filter-other\" style=\"display: none;\">\n                        <span>📝</span><span class=\"tab-text\">Інші</span><span class=\"tab-count\"></span>\n                    </button>\n                </div>\n            </div>\n        ";

function renderControls(filter, query) {
    SYH_UI_STATE.activeFilter = filter;
    SYH_UI_STATE.searchQuery = query;
    document.body.innerHTML = '<div id="hdr"></div>';
    const hdr = document.getElementById('hdr');
    addStarredTabControls(hdr);
    return hdr;
}

describe('ui_comments — addStarredTabControls (golden markup)', () => {

    beforeEach(() => {
        installChromeMock();
        SYH_UI_STATE.prayersCache = [];
    });

    test('1. фільтр "all" без пошуку рендериться байт-у-байт як до рефакторингу', () => {
        assert.strictEqual(renderControls('all', '').innerHTML, GOLDEN_ALL_EMPTY);
    });

    test('2. фільтр "prayer" із пошуковим запитом рендериться байт-у-байт', () => {
        assert.strictEqual(renderControls('prayer', 'abc').innerHTML, GOLDEN_PRAYER_QUERY);
    });

    test('3. фільтр "question" рендериться байт-у-байт', () => {
        assert.strictEqual(renderControls('question', '').innerHTML, GOLDEN_QUESTION);
    });

    test('4. фільтр "other" із запитом рендериться байт-у-байт', () => {
        assert.strictEqual(renderControls('other', 'zz').innerHTML, GOLDEN_OTHER);
    });

    test('5. активна вкладка позначається aria-selected="true" і класом active', () => {
        const hdr = renderControls('prayer', '');
        const active = hdr.querySelector('#syh-comment-filter-prayer');
        assert.strictEqual(active.getAttribute('aria-selected'), 'true');
        assert.ok(active.className.includes('active'));

        const inactive = hdr.querySelector('#syh-comment-filter-all');
        assert.strictEqual(inactive.getAttribute('aria-selected'), 'false');
        assert.ok(!inactive.className.includes('active'));
    });

    test('6. неактивна вкладка зберігає хвостовий пробіл у class (характеристика 1-в-1)', () => {
        const hdr = renderControls('all', '');
        const inactive = hdr.querySelector('#syh-comment-filter-question');
        assert.strictEqual(inactive.getAttribute('class'), 'syh-filter-btn ');
    });

    test('7. кнопка очищення пошуку прихована без запиту і показана із запитом', () => {
        const empty = renderControls('all', '');
        assert.strictEqual(empty.querySelector('#syh-clear-search-btn').getAttribute('style'), 'display: none;');

        const filled = renderControls('all', 'query');
        assert.strictEqual(filled.querySelector('#syh-clear-search-btn').getAttribute('style'), 'display: flex;');
    });

    test('8. пошуковий інпут отримує поточний searchQuery у value', () => {
        const hdr = renderControls('all', 'текст пошуку');
        assert.strictEqual(hdr.querySelector('#syh-starred-search').getAttribute('value'), 'текст пошуку');
    });

    test('9. рендеряться рівно 4 вкладки фільтрів у фіксованому порядку', () => {
        const hdr = renderControls('all', '');
        const filters = Array.from(hdr.querySelectorAll('.syh-filter-btn')).map(b => b.dataset.filter);
        assert.deepStrictEqual(filters, ['all', 'question', 'prayer', 'other']);
    });

    test('10. повторний виклик на тому самому вузлі не дублює контроли', () => {
        const hdr = renderControls('all', '');
        const before = hdr.innerHTML;
        addStarredTabControls(hdr);
        assert.strictEqual(hdr.innerHTML, before);
        assert.strictEqual(hdr.querySelectorAll('.syh-starred-controls').length, 1);
    });

    test('11. блок empty-state додається після starredList, якщо його ще немає', () => {
        SYH_UI_STATE.activeFilter = 'all';
        SYH_UI_STATE.searchQuery = '';
        document.body.innerHTML =
            '<div id="hdr"></div><div class="StarredCommentList__List"></div>';
        addStarredTabControls(document.getElementById('hdr'));

        const empty = document.querySelector('#syh-empty-state-msg');
        assert.ok(empty, 'empty-state має бути вставлений');
        assert.ok(empty.querySelector('#syh-empty-query'));
        assert.ok(empty.querySelector('#syh-empty-suggestion'));
    });

    test('12. empty-state не дублюється, якщо вже присутній у DOM', () => {
        SYH_UI_STATE.activeFilter = 'all';
        SYH_UI_STATE.searchQuery = '';
        document.body.innerHTML =
            '<div id="hdr"></div><div class="StarredCommentList__List"></div>' +
            '<div id="syh-empty-state-msg"></div>';
        addStarredTabControls(document.getElementById('hdr'));

        assert.strictEqual(document.querySelectorAll('#syh-empty-state-msg').length, 1);
    });

    test('13. без starredList у DOM empty-state не вставляється, помилки немає', () => {
        SYH_UI_STATE.activeFilter = 'all';
        SYH_UI_STATE.searchQuery = '';
        document.body.innerHTML = '<div id="hdr"></div>';
        addStarredTabControls(document.getElementById('hdr'));

        assert.strictEqual(document.querySelector('#syh-empty-state-msg'), null);
        assert.ok(document.querySelector('.syh-starred-controls'));
    });
});

describe('ui_comments — чисті хелпери фільтрації (характеризація)', () => {

    test('14. buildSortedCommentTexts групує тексти за автором без префікса @', () => {
        const cache = [
            { author: '@ivan', text: 'a', type: 'prayer' },
            { author: 'petro', text: 'b', type: 'question' },
            { author: '@@ivan', text: 'c', type: 'prayer' }
        ];
        assert.deepStrictEqual(buildSortedCommentTexts(cache, 'all'), ['a', 'c', 'b']);
    });

    test('15. buildSortedCommentTexts для "prayer" лишає лише молитви', () => {
        const cache = [
            { author: 'ivan', text: 'a', type: 'prayer' },
            { author: 'ivan', text: 'b', type: 'question' }
        ];
        assert.deepStrictEqual(buildSortedCommentTexts(cache, 'prayer'), ['a']);
    });

    test('16. buildSortedCommentTexts для "other" завжди повертає порожній список', () => {
        const cache = [{ author: 'ivan', text: 'a', type: 'none' }];
        assert.deepStrictEqual(buildSortedCommentTexts(cache, 'other'), []);
    });

    test('17. evalCategoryMatch зіставляє тип коментаря з активним фільтром', () => {
        assert.strictEqual(evalCategoryMatch('prayer', 'all'), true);
        assert.strictEqual(evalCategoryMatch('prayer', 'prayer'), true);
        assert.strictEqual(evalCategoryMatch('question', 'prayer'), false);
        assert.strictEqual(evalCategoryMatch('none', 'other'), true);
        assert.strictEqual(evalCategoryMatch('prayer', 'other'), false);
    });

    test('18. updateListItemOrdering ховає невидимі елементи і скидає order у 9999', () => {
        document.body.innerHTML = '<li id="li"></li>';
        const li = document.getElementById('li');

        updateListItemOrdering(li, true, 3);
        assert.strictEqual(li.style.display, '');
        assert.strictEqual(li.style.order, '3');

        updateListItemOrdering(li, false, 3);
        assert.strictEqual(li.style.display, 'none');
        assert.strictEqual(li.style.order, '9999');
    });

    test('19. updateListItemOrdering для orderIndex === -1 ставить 9999', () => {
        document.body.innerHTML = '<li id="li"></li>';
        const li = document.getElementById('li');
        updateListItemOrdering(li, true, -1);
        assert.strictEqual(li.style.order, '9999');
    });

    test('20. updateCommentVisuals виставляє і знімає data-syh-type', () => {
        document.body.innerHTML = '<div id="c"></div>';
        const el = document.getElementById('c');

        updateCommentVisuals(el, 'prayer');
        assert.strictEqual(el.getAttribute('data-syh-type'), 'prayer');

        updateCommentVisuals(el, 'question');
        assert.strictEqual(el.getAttribute('data-syh-type'), 'question');

        updateCommentVisuals(el, 'none');
        assert.strictEqual(el.hasAttribute('data-syh-type'), false);
    });
});
