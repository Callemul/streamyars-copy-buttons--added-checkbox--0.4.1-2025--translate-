// tests/comment_actions.test.js
//
// Тести реєстру дій над коментарем (`modules/comment_actions.ts`) — SSOT,
// з якого будуються панелі всіх трьох поверхонь (T1 аудиту 2026-09-08).
//
// Головне, що тут перевіряється, — реєстр описує ТУ САМУ поведінку, що була
// в трьох окремих описах: ті самі `data-action`, іконки, підписи, класи й
// порядок кнопок. Будь-яка розбіжність = зламаний UI на одній із платформ.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
    COMMENT_ACTIONS,
    PLATFORM_ACTION_ORDER,
    getCommentAction,
    getPlatformActions,
    resolveActionId,
    getActionStateType,
    buildActionButtonConfig,
    buildPlatformButtonConfigs,
    getActionEvents,
    DEFAULT_ACTION_EVENTS
} from '../modules/comment_actions.ts';

describe('comment_actions — цілісність реєстру', () => {
    test('1. реєстр містить три канонічні дії з унікальними id', () => {
        const ids = COMMENT_ACTIONS.map(a => a.id);
        assert.deepEqual(ids, ['copy', 'question', 'prayer']);
        assert.equal(new Set(ids).size, ids.length);
    });

    test('2. кожна дія описана для всіх трьох поверхонь', () => {
        for (const action of COMMENT_ACTIONS) {
            for (const platform of ['streamyard', 'youtube', 'studio']) {
                assert.ok(action.platforms[platform],
                    `дія ${action.id} не описана для поверхні ${platform}`);
            }
        }
    });

    test('3. data-action унікальний у межах кожної поверхні', () => {
        for (const platform of ['streamyard', 'youtube', 'studio']) {
            const domActions = COMMENT_ACTIONS
                .map(a => a.platforms[platform]?.domAction)
                .filter(Boolean);
            assert.equal(new Set(domActions).size, domActions.length,
                `дублікат data-action на поверхні ${platform}`);
        }
    });

    test('4. stateType дії — це саме той union, що використовує кеш кнопок', () => {
        const allowed = new Set(['question', 'prayer', null]);
        for (const action of COMMENT_ACTIONS) {
            assert.ok(allowed.has(action.stateType), `несподіваний stateType у ${action.id}`);
        }
        assert.equal(getActionStateType('copy'), null, 'копіювання не змінює стан кнопок');
        assert.equal(getActionStateType('question'), 'question');
        assert.equal(getActionStateType('prayer'), 'prayer');
    });

    test('5. порядок кнопок описано для кожної поверхні і він покриває всі дії', () => {
        for (const platform of ['streamyard', 'youtube', 'studio']) {
            const order = PLATFORM_ACTION_ORDER[platform];
            assert.equal(order.length, COMMENT_ACTIONS.length);
            assert.deepEqual([...order].sort(), COMMENT_ACTIONS.map(a => a.id).sort());
        }
    });
});

describe('comment_actions — історичні контракти поверхонь', () => {
    // Значення нижче зафіксовані з коду, який працював до введення реєстру.
    // Якщо тест впав — на відповідній платформі зміниться DOM або поведінка.

    test('6. StreamYard: імена дій і data-type збережені 1-в-1', () => {
        const configs = buildPlatformButtonConfigs('streamyard');

        assert.deepEqual(configs.map(c => c.action),
            ['copy-comment', 'copy-author-comment', 'copy-prayer']);
        assert.ok(configs.every(c => c.type === 'comment'),
            'обробник StreamYard добирає кнопки селектором [data-type="comment"]');
        assert.deepEqual(configs.map(c => c.icon), ['📄', '❓', '🙏']);
        assert.equal(configs[1].title, 'Відмітити як Питання');
        assert.equal(configs[2].title, 'ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️');
    });

    test('7. YouTube: порядок питання → молитва → копіювання і текстові підписи', () => {
        const configs = buildPlatformButtonConfigs('youtube');

        assert.deepEqual(configs.map(c => c.action),
            ['add-question', 'add-prayer', 'copy-comment']);
        assert.deepEqual(configs.map(c => c.icon),
            ['Додати до питань', 'Додати до молитов', '📄']);
        assert.deepEqual(configs.map(c => c.className),
            ['syh-yt-btn syh-yt-btn-question', 'syh-yt-btn syh-yt-btn-prayer', 'syh-yt-btn-copy']);
        assert.ok(configs.every(c => c.type === undefined),
            'на YouTube кнопки не мають data-type');
    });

    test('8. Studio: власний префікс класів і власні іконки', () => {
        const configs = buildPlatformButtonConfigs('studio');

        assert.deepEqual(configs.map(c => c.action),
            ['studio-copy', 'studio-question', 'studio-prayer']);
        assert.deepEqual(configs.map(c => c.icon), ['📋', '❓', '🙏']);
        assert.deepEqual(configs.map(c => c.className), [
            'syh-studio-btn syh-studio-btn-copy',
            'syh-studio-btn syh-studio-btn-question',
            'syh-studio-btn syh-studio-btn-prayer'
        ]);
        assert.equal(configs[0].title, 'Скопіювати автора та текст коментаря в буфер');
    });

    test('9. підпис копіювання на YouTube зберігає екрановані переноси рядка', () => {
        const copyConfig = buildActionButtonConfig('youtube', 'copy');
        assert.equal(copyConfig.title, 'Копіювати текст коментаря (@автор\\n\\nтекст)');
    });
});

describe('comment_actions — пошук і фолбеки', () => {
    test('10. resolveActionId перетворює data-action кожної поверхні на канонічний id', () => {
        assert.equal(resolveActionId('streamyard', 'copy-author-comment'), 'question');
        assert.equal(resolveActionId('youtube', 'add-question'), 'question');
        assert.equal(resolveActionId('studio', 'studio-question'), 'question');
        assert.equal(resolveActionId('streamyard', 'copy-prayer'), 'prayer');
        assert.equal(resolveActionId('studio', 'studio-copy'), 'copy');
    });

    test('11. resolveActionId не плутає імена різних поверхонь', () => {
        assert.equal(resolveActionId('youtube', 'studio-question'), null);
        assert.equal(resolveActionId('streamyard', 'add-prayer'), null);
    });

    test('12. resolveActionId на порожньому вході повертає null', () => {
        assert.equal(resolveActionId('youtube', undefined), null);
        assert.equal(resolveActionId('youtube', null), null);
        assert.equal(resolveActionId('youtube', ''), null);
    });

    test('13. getCommentAction повертає опис за id і undefined для невідомого', () => {
        assert.equal(getCommentAction('prayer').stateType, 'prayer');
        assert.equal(getCommentAction('unknown-action'), undefined);
    });

    test('14. getPlatformActions віддає описи у порядку панелі', () => {
        assert.deepEqual(getPlatformActions('youtube').map(a => a.id),
            ['question', 'prayer', 'copy']);
        assert.deepEqual(getPlatformActions('studio').map(a => a.id),
            ['copy', 'question', 'prayer']);
    });

    test('15. buildActionButtonConfig повертає null для дії, відсутньої на поверхні', () => {
        assert.equal(buildActionButtonConfig('youtube', 'unknown-action'), null);
    });
});

describe('comment_actions — події кнопок за поверхнями (T7)', () => {
    test('16. YouTube і Studio лишаються на click', () => {
        for (const id of ['copy', 'question', 'prayer']) {
            assert.deepEqual(getActionEvents('youtube', id), ['click']);
            assert.deepEqual(getActionEvents('studio', id), ['click']);
        }
        assert.deepEqual([...DEFAULT_ACTION_EVENTS], ['click']);
    });

    test('17. StreamYard слухає mouseup — інакше 🙏 не відрізнить кнопку миші', () => {
        for (const id of ['copy', 'question', 'prayer']) {
            assert.deepEqual(getActionEvents('streamyard', id), ['mouseup'],
                `дія ${id} на StreamYard має слухати mouseup`);
        }
    });

    test('18. невідома дія отримує подію за замовчуванням, а не порожній список', () => {
        assert.deepEqual(getActionEvents('streamyard', 'unknown-action'), ['click']);
    });
});
