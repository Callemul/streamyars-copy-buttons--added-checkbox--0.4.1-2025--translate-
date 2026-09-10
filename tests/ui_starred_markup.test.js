import assert from 'node:assert';
import { test, describe } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const {
    buildStarredControlsMarkup,
    STARRED_EMPTY_STATE_MARKUP
} = await import('../modules/streamyard/ui/ui_starred_markup.ts');
const { escapeHtml, escapeAttr } = await import('../modules/escape_html.ts');

/**
 * Юніт-тести чистого білдера розмітки, винесеного з `addStarredTabControls`
 * (CRAP-хотспот: cyc=15, cog=26).
 *
 * Байт-у-байт відповідність повного innerHTML перевіряють golden-тести в
 * `tests/ui_comments_starred_controls.test.js`. Тут перевіряється сам контракт
 * чистої функції: детермінованість, відсутність доступу до DOM/стану, коректне
 * екранування вхідних даних та збережені «дивацтва» оригінальної розмітки.
 */

const FILTERS = ['all', 'question', 'prayer', 'other'];

describe('ui_starred_markup — buildStarredControlsMarkup', () => {

    test('1. функція чиста: два виклики з тими самими аргументами дають ідентичний рядок', () => {
        const a = buildStarredControlsMarkup('all', '');
        const b = buildStarredControlsMarkup('all', '');
        assert.strictEqual(a, b);
    });

    test('2. не залежить від DOM: працює при порожньому document.body', () => {
        document.body.innerHTML = '';
        const html = buildStarredControlsMarkup('prayer', 'x');
        assert.ok(html.includes('syh-starred-controls'));
        assert.strictEqual(document.body.innerHTML, '', 'білдер не має чіпати DOM');
    });

    test('3. рендерить рівно 4 вкладки у фіксованому порядку', () => {
        const html = buildStarredControlsMarkup('all', '');
        const order = [...html.matchAll(/data-filter="([a-z]+)"/g)].map(m => m[1]);
        assert.deepStrictEqual(order, FILTERS);
    });

    test('3b. екранує searchQuery у value інпута (захист від HTML-ін\'єкції / self-XSS)', () => {
        const malicious = '" onfocus="alert(1)" x="';
        const html = buildStarredControlsMarkup('all', malicious);
        const host = document.createElement('div');
        host.innerHTML = html;
        const search = host.querySelector('#syh-starred-search');
        // Лапка не вирвається з атрибуту: окремий onfocus НЕ зʼявляється,
        // а введення зберігається як текст значення.
        assert.equal(search.getAttribute('onfocus'), null, 'інʼєкція onfocus відсутня');
        assert.equal(search.getAttribute('value'), malicious, 'value містить введення як текст');
    });

    test('3c. escapeAttr/escapeHtml нейтралізують < > & " \' (вектор <img onerror>)', () => {
        const malicious = '<img src=x onerror=alert(1)>';
        assert.equal(escapeHtml(malicious), '&lt;img src=x onerror=alert(1)&gt;');
        assert.equal(escapeAttr('a"b'), 'a&quot;b');
    });

    test('4. рівно одна вкладка активна для кожного відомого фільтра', () => {
        for (const f of FILTERS) {
            const html = buildStarredControlsMarkup(f, '');
            const selectedTrue = [...html.matchAll(/aria-selected="true"/g)].length;
            const activeCls = [...html.matchAll(/class="syh-filter-btn active"/g)].length;
            assert.strictEqual(selectedTrue, 1, `фільтр ${f}: має бути 1 aria-selected="true"`);
            assert.strictEqual(activeCls, 1, `фільтр ${f}: має бути 1 клас active`);
            assert.ok(
                html.includes(`class="syh-filter-btn active" data-filter="${f}"`),
                `фільтр ${f}: активним має бути саме він`
            );
        }
    });

    test('5. невідомий фільтр не активує жодної вкладки (характеристика 1-в-1)', () => {
        const html = buildStarredControlsMarkup('невідомий', '');
        assert.strictEqual([...html.matchAll(/aria-selected="true"/g)].length, 0);
        assert.strictEqual([...html.matchAll(/class="syh-filter-btn "/g)].length, 4);
    });

    test('6. неактивна вкладка зберігає ХВОСТОВИЙ пробіл у class (зафіксоване дивацтво)', () => {
        const html = buildStarredControlsMarkup('all', '');
        assert.ok(html.includes('class="syh-filter-btn " data-filter="question"'));
        assert.ok(html.includes('class="syh-filter-btn " data-filter="prayer"'));
    });

    test('7. вкладка "other" завжди має inline style="display: none;", навіть коли активна', () => {
        for (const f of FILTERS) {
            const html = buildStarredControlsMarkup(f, '');
            assert.ok(
                html.includes('id="syh-comment-filter-other" style="display: none;"'),
                `фільтр ${f}: "other" має лишатися прихованою`
            );
        }
    });

    test('8. інші вкладки НЕ отримують inline-стилю прихованості', () => {
        const html = buildStarredControlsMarkup('all', '');
        for (const f of ['all', 'question', 'prayer']) {
            assert.ok(html.includes(`id="syh-comment-filter-${f}">`), `${f} має закриватися одразу після id`);
        }
    });

    test('9. searchQuery потрапляє у value інпута', () => {
        const html = buildStarredControlsMarkup('all', 'текст пошуку');
        assert.ok(html.includes('id="syh-starred-search" value="текст пошуку"'));
    });

    test('10. кнопка очищення прихована без запиту і показана із запитом', () => {
        assert.ok(buildStarredControlsMarkup('all', '').includes('class="syh-clear-search" style="display: none;"'));
        assert.ok(buildStarredControlsMarkup('all', 'q').includes('class="syh-clear-search" style="display: flex;"'));
    });

    test('11. рядок-роздільник між пошуком і tablist — рівно 16 пробілів', () => {
        const html = buildStarredControlsMarkup('all', '');
        assert.ok(
            html.includes('                </div>\n                \n                <div role="tablist"'),
            'порожній рядок із 16 пробілів має зберігатися 1-в-1'
        );
    });

    test('12. кожна вкладка має свій емодзі та підпис', () => {
        const html = buildStarredControlsMarkup('all', '');
        assert.ok(html.includes('<span>⭐</span><span class="tab-text">Всі</span>'));
        assert.ok(html.includes('<span>❓</span><span class="tab-text">Питання</span>'));
        assert.ok(html.includes('<span>🙏</span><span class="tab-text">Молитви</span>'));
        assert.ok(html.includes('<span>📝</span><span class="tab-text">Інші</span>'));
    });

    test('13. кожна вкладка має порожній лічильник .tab-count', () => {
        const html = buildStarredControlsMarkup('all', '');
        assert.strictEqual([...html.matchAll(/<span class="tab-count"><\/span>/g)].length, 4);
    });

    test('14. aria-label присутній у пошуку, кнопках і кожній вкладці', () => {
        const html = buildStarredControlsMarkup('all', '');
        assert.ok(html.includes('aria-label="Пошук по імені або тексту"'));
        assert.ok(html.includes('aria-label="Очистити пошук коментарів"'));
        assert.ok(html.includes('aria-label="Повернутися до коментаря на екрані"'));
        assert.ok(html.includes('aria-label="Показати всі коментарі"'));
        assert.ok(html.includes('aria-label="Показати інші коментарі"'));
    });

    test('15. розмітка парситься у валідне DOM-дерево з очікуваною структурою', () => {
        const host = document.createElement('div');
        host.innerHTML = buildStarredControlsMarkup('question', 'abc');

        const root = host.querySelector('.syh-starred-controls');
        assert.ok(root, 'кореневий контейнер має існувати');
        assert.strictEqual(host.querySelectorAll('.syh-filter-btn').length, 4);
        assert.strictEqual(host.querySelector('[role="tablist"]').getAttribute('aria-label'), 'Фільтри коментарів');
        assert.strictEqual(
            host.querySelector('#syh-comment-filter-question').getAttribute('aria-selected'),
            'true'
        );
    });
});

describe('ui_starred_markup — STARRED_EMPTY_STATE_MARKUP', () => {

    test('16. містить контейнер і обидва слоти порожнього стану', () => {
        const host = document.createElement('div');
        host.innerHTML = STARRED_EMPTY_STATE_MARKUP;

        const msg = host.querySelector('#syh-empty-state-msg');
        assert.ok(msg);
        assert.strictEqual(msg.className, 'syh-empty-state');
        assert.ok(msg.querySelector('#syh-empty-query'));
        assert.ok(msg.querySelector('#syh-empty-suggestion'));
    });

    test('17. підказка стартує прихованою', () => {
        const host = document.createElement('div');
        host.innerHTML = STARRED_EMPTY_STATE_MARKUP;
        const hint = host.querySelector('#syh-empty-suggestion');
        assert.ok(hint.getAttribute('style').includes('display:none'));
    });

    test('18. константа незмінна між зверненнями', () => {
        assert.strictEqual(STARRED_EMPTY_STATE_MARKUP, STARRED_EMPTY_STATE_MARKUP);
        assert.strictEqual(typeof STARRED_EMPTY_STATE_MARKUP, 'string');
    });
});
