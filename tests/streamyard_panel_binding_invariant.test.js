// tests/streamyard_panel_binding_invariant.test.js
//
// ІНВАРІАНТ (запобіжник до T7): де вставляється панель кнопок коментаря
// (`SYH_UI.addButtonsToComment`), там ОБОВ'ЯЗКОВО має бути прив'язка слухачів
// (`bindStreamYardComment`).
//
// Чому окремий тест: якщо панель вставлено без прив'язки, кнопки стоять на
// місці, виглядають робочими і мовчки нічого не роблять. Ані typecheck, ані
// lint, ані тести панелі цього не бачать — панель же побудована правильно.
//
// Правило: docs/rules/dom-selectors.md → «Панель кнопок і прив'язка — нерозривна пара».

import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { DOM_REGISTRATIONS } = await import('../modules/streamyard/bootstrap/bootstrap_dom.ts');
const { STREAMYARD_COMMENT_ADAPTER } = await import('../modules/streamyard/comments/streamyard_comment_binding.ts');
const { SYH_UI_STATE } = await import('../modules/streamyard/ui/ui_state.ts');

const PANEL_SELECTOR = '.syh-custom-buttons-comment';

/** Селектори тестової картки — ті самі ключі, що й у `SYH_CONFIG.SELECTORS`. */
const SELECTORS = {
    commentBlock: '.cmt',
    commentButtonContainer: '.cmt-actions',
    commentAuthor: '.cmt-author',
    commentText: '.cmt-text'
};

/** Картка коментаря StreamYard до втручання розширення. */
function buildBareComment() {
    const node = document.createElement('div');
    node.className = 'cmt';
    node.innerHTML = `
        <span class="cmt-author">@John</span>
        <span class="cmt-text">текст коментаря</span>
        <div class="cmt-actions"></div>
    `;
    document.body.appendChild(node);
    return node;
}

describe('Інваріант: панель кнопок коментаря завжди прив\'язана', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        SYH_UI_STATE.SELECTORS = { ...SELECTORS };
        SYH_UI_STATE.prayersCache = [];
    });

    // Головна перевірка. Формулювання навмисно умовне: «якщо після обробника
    // на картці з'явилась панель — слухачі мусять бути навішані». Так тест
    // автоматично покриє будь-яку НОВУ зону, додану в `DOM_REGISTRATIONS`,
    // а не лише сьогоднішній `commentBlock`.
    for (const reg of DOM_REGISTRATIONS) {
        test(`зона «${reg.selectorKey}»: вставлена панель означає навішані слухачі`, () => {
            const node = buildBareComment();

            reg.onAdded(node);

            const panel = node.querySelector(PANEL_SELECTOR);
            if (!panel) return; // зона панель не вставляє — інваріанту не стосується

            assert.equal(
                STREAMYARD_COMMENT_ADAPTER.isEventsBound(node),
                true,
                `Зона «${reg.selectorKey}» вставила панель кнопок, але не викликала ` +
                'bindStreamYardComment(). Кнопки будуть на місці й мовчки не працюватимуть. ' +
                'Див. docs/rules/dom-selectors.md.'
            );
        });
    }

    test('щонайменше одна зона справді вставляє панель — інваріант не порожній', () => {
        const zonesWithPanel = DOM_REGISTRATIONS.filter(reg => {
            document.body.innerHTML = '';
            const node = buildBareComment();
            reg.onAdded(node);
            return node.querySelector(PANEL_SELECTOR) !== null;
        });

        assert.ok(
            zonesWithPanel.length > 0,
            'Жодна зона не вставляє панель — тест перестав щось перевіряти'
        );
    });

    test('після прив\'язки клік по кнопці справді доходить до адаптера', async () => {
        const node = buildBareComment();
        const commentZone = DOM_REGISTRATIONS.find(r => r.selectorKey === 'commentBlock');

        commentZone.onAdded(node);

        const { getCommentAction } = await import('../modules/comments/comment_actions.ts');
        const copyAction = getCommentAction('copy');
        const btn = node.querySelector(`[data-action="${copyAction.platforms.streamyard.domAction}"]`);
        assert.ok(btn, 'кнопка копіювання має бути в панелі');

        let reached = false;
        const originalRunAction = STREAMYARD_COMMENT_ADAPTER.runAction;
        STREAMYARD_COMMENT_ADAPTER.runAction = async () => { reached = true; };

        try {
            btn.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
            await new Promise(resolve => setTimeout(resolve, 0));
        } finally {
            STREAMYARD_COMMENT_ADAPTER.runAction = originalRunAction;
        }

        assert.equal(reached, true, 'слухач кнопки не навішаний — панель не прив\'язана');
    });

    test('зняття картки з DOM знімає й прив\'язку (пара симетрична)', () => {
        const node = buildBareComment();
        const commentZone = DOM_REGISTRATIONS.find(r => r.selectorKey === 'commentBlock');

        commentZone.onAdded(node);
        assert.equal(STREAMYARD_COMMENT_ADAPTER.isEventsBound(node), true);

        commentZone.onRemoved(node);
        assert.equal(STREAMYARD_COMMENT_ADAPTER.isEventsBound(node), false);
    });
});

// --- Друга лінія оборони: жоден МОДУЛЬ не викликає вставку панелі без прив'язки ---
//
// Поведінковий тест вище бачить лише зони з `DOM_REGISTRATIONS`. Якщо панель
// почнуть вставляти десь іще (Auto-Heal, новий плагін), він цього не помітить —
// тому тут ми йдемо по джерелах.

const PANEL_INSERTER = 'addButtonsToComment';
const BINDER = 'bindStreamYardComment';

/** Оголошення, а не виклик: `export function addButtonsToComment(...)`. */
const DECLARATION_RE = new RegExp(`function\\s+${PANEL_INSERTER}\\s*\\(`);
/** Член інтерфейсу: `addButtonsToComment(commentNode: Element): void;`. */
const INTERFACE_MEMBER_RE = new RegExp(`^\\s*${PANEL_INSERTER}\\s*\\([^)]*\\)\\s*:\\s*\\w+\\s*;`);
/** Виклик: `SYH_UI.addButtonsToComment(el)` або `addButtonsToComment(el)`. */
const CALL_RE = new RegExp(`${PANEL_INSERTER}\\s*\\(`);

function collectTsFiles(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) collectTsFiles(full, acc);
        else if (entry.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

describe('Інваріант (джерела): виклик addButtonsToComment тягне за собою bindStreamYardComment', () => {
    test('кожен модуль, що вставляє панель, поруч її і прив\'язує', () => {
        const files = [...collectTsFiles('modules'), 'main.ts'];
        const offenders = [];

        for (const file of files) {
            const source = readFileSync(file, 'utf8');
            const callLines = source
                .split('\n')
                .filter(line => CALL_RE.test(line))
                .filter(line => !DECLARATION_RE.test(line))
                .filter(line => !INTERFACE_MEMBER_RE.test(line));

            if (callLines.length === 0) continue;
            if (source.includes(`${BINDER}(`)) continue;

            offenders.push(`${file}: ${callLines.map(l => l.trim()).join(' | ')}`);
        }

        assert.deepEqual(
            offenders,
            [],
            'Ці модулі вставляють панель кнопок, але не викликають ' +
            `${BINDER}() — кнопки будуть на місці й мовчки не працюватимуть:\n` +
            offenders.join('\n')
        );
    });

    test('перевірка джерел справді знаходить наявний виклик (не проходить вхолосту)', () => {
        const source = readFileSync('modules/streamyard/bootstrap/bootstrap_dom.ts', 'utf8');

        assert.ok(CALL_RE.test(source), 'bootstrap_dom має викликати вставку панелі');
        assert.ok(source.includes(`${BINDER}(`), 'bootstrap_dom має викликати прив\'язку');
    });
});
