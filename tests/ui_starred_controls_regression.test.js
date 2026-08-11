import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_UI_STATE } = await import('../modules/ui_state.ts');
const { bindStarredControls } = await import('../modules/ui_starred_controls.ts');

/**
 * Регресійні тести на баг накопичення делегованих `document`-слухачів у вкладці
 * Starred (див. docs/audits/active/audit_2026-08-11_CLAUDE_starred-doc-click-listener-accumulation.md).
 *
 * Без виправлення кожен повторний виклик `bindStarredControls` (який спрацьовує
 * при кожному перемонтуванні шапки Starred через `SYH_DOM_OBSERVER`) додавав
 * ще один `document.addEventListener('click', ...)`, а `onFilterSelect` тримав
 * замикання над СТАРИМ `#syh-starred-search`.
 */

describe('ui_starred_controls — регресія накопичення document-click слухачів', () => {

    beforeEach(() => {
        installChromeMock();
        SYH_UI_STATE.activeFilter = 'all';
        SYH_UI_STATE.searchQuery = '';
        document.body.innerHTML = '';
    });

    test('повторний bindStarredControls не додає другий делегований click-слухач на document', () => {
        const clickHandlers = [];
        const origAdd = document.addEventListener.bind(document);
        const spy = mock.method(document, 'addEventListener', function (type, handler, opts) {
            if (type === 'click') clickHandlers.push(handler);
            return origAdd(type, handler, opts);
        });

        bindStarredControls();
        const afterFirst = clickHandlers.length;
        bindStarredControls();
        const delta = clickHandlers.length - afterFirst;

        spy.mock.restore();
        assert.strictEqual(
            delta,
            0,
            'другий виклик bindStarredControls не повинен дублювати слухач на document'
        );
    });

    test('onFilterSelect пульсує ПОТОЧНИЙ #syh-starred-search, а не відірваний після перемонтування', () => {
        document.body.innerHTML =
            '<input id="syh-starred-search">' +
            '<button class="syh-filter-btn" data-filter="all">all</button>';

        SYH_UI_STATE.searchQuery = 'abc';

        bindStarredControls();

        // Симулюємо remount шапки: старий інпут «відривається», зʼявляється новий.
        const oldInput = document.getElementById('syh-starred-search');
        oldInput.id = 'old-starred-search';
        const newInput = document.createElement('input');
        newInput.id = 'syh-starred-search';
        document.body.appendChild(newInput);

        const btn = document.querySelector('.syh-filter-btn');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        assert.ok(
            newInput.classList.contains('syh-search-pulse'),
            'пульсація має застосовуватися до актуального інпуту пошуку'
        );
        assert.ok(
            !oldInput.classList.contains('syh-search-pulse'),
            'пульсація не повинна застосовуватися до відірваного (старого) інпуту'
        );
    });
});
