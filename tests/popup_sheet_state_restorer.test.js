// Характеризаційні тести для CRAP-хотспота `restoreSheetLog`
// (`popup/popup_sheet_state_restorer.ts`, cyclomatic 10 / cognitive 16 —
// ЄДИНА продакшн-знахідка складності у звіті Fallow 3.14 `health --max-crap 30`).
//
// Тестуємо ЧОРНОЮ СКРИНЬКОЮ — через єдиний публічний експорт модуля
// `restoreSingleSheetState(sId, result)`. Завдяки цьому тести не залежать від
// того, як саме поділено код усередині, і лишаються зеленими після розбиття
// файла на `popup_sheet_log_restorer.ts` + `popup_sheet_field_restorer.ts`.
//
// Навмисно зафіксовані «дивацтва» чинної реалізації (поведінка 1-в-1):
//   - `rawCount` рахується через `Number()`, тож рядок "7" стає числом 7;
//   - лічильник рядків береться з DOM ПІСЛЯ підстановки html;
//   - для «чистого» лога віднімається рядок заголовка таблиці (`tr` - 1);
//   - `dividerPos` має «легасі»-фолбек, ідентичний канонічному ключу.
//
// Лічильник журналу після виправлення
// (`audit_2026-08-10_KILO_sheet-log-counter-lost-on-restore.md`):
//   - «(N)» пишеться ЗАВЖДИ, включно з «(0)» — як у живому рендері;
//   - збережений `0`/`NaN`/відсутність значення → фолбек на підрахунок із DOM.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

/** @type {Record<string, any>} */
let storageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            /** @type {Record<string, any>} */
            const res = {};
            for (const k of list) {
                if (k in storageStore) res[k] = storageStore[k];
            }
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(storageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageStore[k];
            if (cb) cb();
        }
    }
});

const { POPUP_SHEET_KEYS } = await import('../modules/storage/storage.ts');
const { renderSheetTemplates } = await import('../popup/popup_sheet_renderer.ts');
const { restoreSingleSheetState } = await import('../popup/popup_sheet_state_restorer.ts');
const { renderTelegramDeletedLog } = await import('../popup/popup_telegram_renderers.ts');

const SID = 'vp_ss';

// Дзеркалить `#sheet-content-template` з popup/popup.html (лише ті гачки, які
// переписує renderSheetTemplates() і які потім шукають відновлювачі).
const SHEET_TEMPLATE_HTML = `
<template id="sheet-content-template">
    <div class="sheet-content" role="tabpanel">
        <label class="section-title"><span class="js-old-total-count"></span></label>
        <textarea class="js-old-list"></textarea>
        <input type="text" class="js-answered-ids">
        <span class="js-tg-total-count-all"></span>
        <div class="step3-columns js-step3-columns">
            <div class="step3-col js-step3-left">
                <span class="js-tg-total-count-left"></span>
                <textarea class="js-new-telegram"></textarea>
            </div>
            <div class="step3-divider js-step3-divider"></div>
            <div class="step3-col js-step3-right">
                <span class="js-tg-total-count-right"></span>
                <button class="js-clear-yt-collected"></button>
                <div class="yt-collected-list js-yt-collected-list"></div>
            </div>
        </div>
        <div class="stats-bar js-stats-bar">
            <div class="stats-row">
                <div class="stat-item old">Залишилось старих: <b class="js-count-old">0</b></div>
                <div class="stat-item del">Видалено: <b class="js-count-del">0</b></div>
            </div>
            <div class="stats-row new-row">
                <div class="stat-item new">Нові з лівої: <span class="js-count-new-left">0</span></div>
                <div class="stat-item new-yt">Нові з YouTube: <b class="js-count-new-yt">0</b></div>
            </div>
            <div class="stats-row total-row">
                <div class="stat-item total">Разом: <b class="js-count-total">0</b></div>
            </div>
        </div>
        <div class="rich-editor js-final-result-div" contenteditable="true"></div>
        <details class="js-deleted-log-details">
            <summary><span class="log-count js-deleted-log-count"></span></summary>
            <div class="deleted-log js-deleted-log"></div>
        </details>
        <details class="js-cleaned-log-details">
            <summary><span class="log-count js-cleaned-log-count"></span></summary>
            <div class="cleaned-log js-cleaned-log"></div>
        </details>
    </div>
</template>
<div id="sheet-contents-container"></div>
`;

const SHELL_HTML = `
<div class="subtabs">
    <button class="subtab-button" data-sheet="${SID}" aria-selected="false">${SID}</button>
</div>
`;

const $id = (id) => document.getElementById(id);

/** Три рядки `.del-row` для перевірки підрахунку з DOM. */
const DEL_ROWS_HTML = '<div class="del-row">a</div><div class="del-row">b</div><div class="del-row">c</div>';
/** Таблиця «чистого» лога: 1 заголовок + 2 рядки даних. */
const CLEAN_TABLE_HTML = '<table class="clean-table"><tr><th>h</th></tr><tr><td>1</td></tr><tr><td>2</td></tr></table>';

describe('popup_sheet_state_restorer — restoreSingleSheetState (характеризація)', () => {
    beforeEach(() => {
        storageStore = {};
        document.body.innerHTML = SHELL_HTML + SHEET_TEMPLATE_HTML;
        renderSheetTemplates();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('прості поля: канонічні та легасі ключі', () => {
        test('1. канонічні ключі наповнюють textarea/input/rich-editor', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.oldList(SID)]: 'старий список',
                [POPUP_SHEET_KEYS.answered(SID)]: '1, 2, 3',
                [POPUP_SHEET_KEYS.newTelegram(SID)]: 'новий телеграм',
                [POPUP_SHEET_KEYS.finalResultHtml(SID)]: '<b>фінал</b>'
            });

            assert.equal($id(`oldList__${SID}`).value, 'старий список');
            assert.equal($id(`answeredIds__${SID}`).value, '1, 2, 3');
            assert.equal($id(`newTelegram__${SID}`).value, 'новий телеграм');
            assert.equal($id(`finalResultDiv__${SID}`).innerHTML, '<b>фінал</b>');
        });

        test('2. легасі-ключі `tg_*__<sheet>` працюють як фолбек', () => {
            restoreSingleSheetState(SID, {
                [`tg_oldList__${SID}`]: 'легасі список',
                [`tg_answered__${SID}`]: '7',
                [`tg_newTelegram__${SID}`]: 'легасі телеграм',
                [`tg_finalResultHtml__${SID}`]: '<i>легасі</i>'
            });

            assert.equal($id(`oldList__${SID}`).value, 'легасі список');
            assert.equal($id(`answeredIds__${SID}`).value, '7');
            assert.equal($id(`newTelegram__${SID}`).value, 'легасі телеграм');
            assert.equal($id(`finalResultDiv__${SID}`).innerHTML, '<i>легасі</i>');
        });

        test('3. канонічний ключ має пріоритет над легасі', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.oldList(SID)]: 'канонічний',
                [`tg_oldList__${SID}`]: 'легасі'
            });

            assert.equal($id(`oldList__${SID}`).value, 'канонічний');
        });

        test('4. порожній result лишає поля незмінними і не кидає виняток', () => {
            assert.doesNotThrow(() => restoreSingleSheetState(SID, {}));

            assert.equal($id(`oldList__${SID}`).value, '');
            assert.equal($id(`answeredIds__${SID}`).value, '');
            assert.equal($id(`finalResultDiv__${SID}`).innerHTML, '');
        });

        test('5. КВІРК: порожній рядок як значення трактується як «немає даних»', () => {
            $id(`oldList__${SID}`).value = 'до відновлення';

            restoreSingleSheetState(SID, { [POPUP_SHEET_KEYS.oldList(SID)]: '' });

            assert.equal($id(`oldList__${SID}`).value, 'до відновлення');
        });
    });

    describe('статистична панель', () => {
        test('6. statsVisible + statsHtml → html підставлено, панель показана', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.statsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.statsHtml(SID)]: '<div class="stats-row">S</div>'
            });

            const bar = $id(`statsBar__${SID}`);
            assert.match(bar.innerHTML, /stats-row/);
            assert.equal(bar.style.display, '');
        });

        test('7. statsVisible=false → панель не чіпається', () => {
            const bar = $id(`statsBar__${SID}`);
            bar.style.display = 'none';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.statsVisible(SID)]: false,
                [POPUP_SHEET_KEYS.statsHtml(SID)]: '<div>ігнор</div>'
            });

            assert.equal(bar.style.display, 'none');
        });

        test('8. легасі `tg_statsVisible__` теж вмикає панель', () => {
            const bar = $id(`statsBar__${SID}`);
            bar.style.display = 'none';

            restoreSingleSheetState(SID, { [`tg_statsVisible__${SID}`]: true });

            assert.equal(bar.style.display, '');
        });
    });

    describe('лог видалених: лічильник і стан <details>', () => {
        test('9. явний rawCount виводиться як "(N)" і відкриває <details>', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 5,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID)]: true
            });

            assert.equal($id(`deletedLog__${SID}`).innerHTML, DEL_ROWS_HTML);
            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(5)');
            assert.ok($id(`deletedLogDetails__${SID}`).hasAttribute('open'));
            assert.equal($id(`deletedLogDetails__${SID}`).style.display, '');
        });

        test('10. rawCount відсутній → рахуються `.del-row` у щойно вставленому html', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(3)');
        });

        test('11. rawCount відсутній і html відсутній → порожній журнал показує "(0)"', () => {
            $id(`deletedLogCount__${SID}`).textContent = '(старе)';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(0)');
        });

        test('12. rawCount === 0 без html перезаписує старий текст на "(0)"', () => {
            $id(`deletedLogCount__${SID}`).textContent = '(99)';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 0
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(0)');
        });

        test('13. КВІРК: rawCount у вигляді рядка приводиться через Number()', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: '7'
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(7)');
        });

        test('14. нечисловий rawCount → фолбек на підрахунок із DOM', () => {
            $id(`deletedLogCount__${SID}`).textContent = '(до)';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 'abc'
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(3)');
        });

        test('15. detailsOpen=false → атрибут open знімається, блок лишається показаним', () => {
            const details = $id(`deletedLogDetails__${SID}`);
            details.setAttribute('open', 'open');
            details.style.display = 'none';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID)]: false
            });

            assert.equal(details.hasAttribute('open'), false);
            assert.equal(details.style.display, '');
        });

        test('16. лог невидимий → лічильник очищується у порожній рядок', () => {
            $id(`deletedLogCount__${SID}`).textContent = '(42)';

            restoreSingleSheetState(SID, {});

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '');
        });

        test('17. легасі-ключі лога видалених працюють цілим набором', () => {
            restoreSingleSheetState(SID, {
                [`tg_deletedLogDetailsVisible__${SID}`]: true,
                [`tg_deletedLogHtml__${SID}`]: DEL_ROWS_HTML,
                [`tg_deletedLogCount__${SID}`]: 4,
                [`tg_deletedLogDetailsOpen__${SID}`]: true
            });

            assert.equal($id(`deletedLog__${SID}`).innerHTML, DEL_ROWS_HTML);
            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(4)');
            assert.ok($id(`deletedLogDetails__${SID}`).hasAttribute('open'));
        });
    });

    describe('лог очищених: власний резолвер лічильника', () => {
        test('18. rawCount відсутній → `.clean-table tr` мінус рядок заголовка', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml(SID)]: CLEAN_TABLE_HTML
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(2)');
        });

        test('19. html без таблиці → 0 рядків, лічильник показує "(0)"', () => {
            $id(`cleanedLogCount__${SID}`).textContent = '(до)';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml(SID)]: '<p>без таблиці</p>'
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(0)');
        });

        test('20. явний rawCount перекриває підрахунок із DOM', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml(SID)]: CLEAN_TABLE_HTML,
                [POPUP_SHEET_KEYS.cleanedLogCount(SID)]: 11
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(11)');
        });

        test('21. лог очищених невидимий → лічильник очищується', () => {
            $id(`cleanedLogCount__${SID}`).textContent = '(9)';

            restoreSingleSheetState(SID, {});

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '');
        });

        test('22. легасі-ключі лога очищених працюють цілим набором', () => {
            restoreSingleSheetState(SID, {
                [`tg_cleanedLogDetailsVisible__${SID}`]: true,
                [`tg_cleanedLogHtml__${SID}`]: CLEAN_TABLE_HTML,
                [`tg_cleanedLogCount__${SID}`]: 6,
                [`tg_cleanedLogDetailsOpen__${SID}`]: true
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(6)');
            assert.ok($id(`cleanedLogDetails__${SID}`).hasAttribute('open'));
        });

        test('23. два логи відновлюються незалежно один від одного', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 3,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID)]: true
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(3)');
            assert.ok($id(`deletedLogDetails__${SID}`).hasAttribute('open'));
            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '');
            assert.equal($id(`cleanedLogDetails__${SID}`).hasAttribute('open'), false);
        });
    });

    describe('позиція роздільника', () => {
        test('24. dividerPos розкладає flex-basis на 60/40', () => {
            restoreSingleSheetState(SID, { [POPUP_SHEET_KEYS.dividerPos(SID)]: 60 });

            assert.equal($id(`step3Left__${SID}`).style.flexBasis, '60%');
            assert.equal($id(`step3Right__${SID}`).style.flexBasis, '40%');
        });

        test('25. КВІРК: «легасі»-ключ роздільника ідентичний канонічному', () => {
            assert.equal(POPUP_SHEET_KEYS.dividerPos(SID), `syh:popup:divider_pos:${SID}`);

            restoreSingleSheetState(SID, { [`syh:popup:divider_pos:${SID}`]: 25 });

            assert.equal($id(`step3Left__${SID}`).style.flexBasis, '25%');
            assert.equal($id(`step3Right__${SID}`).style.flexBasis, '75%');
        });

        test('26. відсутній dividerPos лишає колонки без inline-стилю', () => {
            restoreSingleSheetState(SID, {});

            assert.equal($id(`step3Left__${SID}`).style.flexBasis, '');
            assert.equal($id(`step3Right__${SID}`).style.flexBasis, '');
        });
    });

    describe('зібрані елементи YouTube', () => {
        test('27. порожнє сховище → рендериться заглушка порожнього стану', () => {
            restoreSingleSheetState(SID, {});

            const list = $id(`ytCollectedList__${SID}`);
            assert.equal(list.children.length, 1);
            assert.equal(list.children[0].className, 'yt-empty-msg');
        });

        test('28. відновлення завжди підтягує зібране з YouTube (навіть без result)', () => {
            storageStore[`syh:popup:collected:${SID}`] = [
                { id: 'c1', type: 'question', author: 'Ганна', text: 'Питання' },
                { id: 'c2', type: 'prayer', author: 'Богдан', text: 'Молитва' }
            ];

            restoreSingleSheetState(SID, {});

            const list = $id(`ytCollectedList__${SID}`);
            assert.equal(list.children.length, 2);
            assert.ok(list.children[0].classList.contains('is-question'));
            assert.ok(list.children[1].classList.contains('is-prayer'));
        });
    });

    describe('стійкість до відсутніх елементів DOM', () => {
        test('29. повністю порожній DOM не спричиняє винятку', () => {
            document.body.innerHTML = '';

            assert.doesNotThrow(() => restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.oldList(SID)]: 'x',
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML,
                [POPUP_SHEET_KEYS.dividerPos(SID)]: 50
            }));
        });

        test('30. невідомий sheetId обробляється мовчки', () => {
            assert.doesNotThrow(() => restoreSingleSheetState('not-a-sheet', {
                'syh:popup:sheet:not-a-sheet:oldList': 'x'
            }));
        });
    });

    // Регресія до `audit_2026-08-10_KILO_sheet-log-counter-lost-on-restore.md`:
    // лічильник журналу більше не «зникає» на нулі та не мовчить на `NaN`.
    describe('лічильник журналу після відновлення (регресія)', () => {
        test('31. збережений count = 0 при 3 рядках у html → показує "(3)"', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: DEL_ROWS_HTML,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 0
            });

            assert.equal($id(`deletedLog__${SID}`).innerHTML, DEL_ROWS_HTML);
            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(3)');
        });

        test('32. зіпсований count без html → "(0)", а не мовчазний NaN', () => {
            $id(`deletedLogCount__${SID}`).textContent = '(до)';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 'abc'
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, '(0)');
        });

        test('33. порожній журнал показує "(0)" і в живому рендері, і після відновлення', () => {
            renderTelegramDeletedLog($id(`deletedLog__${SID}`), [], SID);

            const liveText = $id(`deletedLogCount__${SID}`).textContent;
            assert.equal(liveText, '(0)', 'живий рендер');

            const emptyLogHtml = $id(`deletedLog__${SID}`).innerHTML;
            $id(`deletedLogCount__${SID}`).textContent = '';

            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml(SID)]: emptyLogHtml,
                [POPUP_SHEET_KEYS.deletedLogCount(SID)]: 0
            });

            assert.equal($id(`deletedLogCount__${SID}`).textContent, liveText, 'після відновлення');
        });

        test('34. лог очищених: count = 0 при таблиці на 2 рядки → "(2)" (заголовок віднято)', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml(SID)]: CLEAN_TABLE_HTML,
                [POPUP_SHEET_KEYS.cleanedLogCount(SID)]: 0
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(2)');
        });

        test('35. лог очищених: таблиця лише із заголовком → "(0)", ніколи "(-1)"', () => {
            restoreSingleSheetState(SID, {
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible(SID)]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml(SID)]: '<table class="clean-table"><tr><th>h</th></tr></table>'
            });

            assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(0)');
        });
    });
});
