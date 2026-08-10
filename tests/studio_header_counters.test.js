// tests/studio_header_counters.test.js
//
// Характеристичні (characterization) тести для публічного API
// `youtube/studio/studio_header_counters.ts`.
//
// Мета: зафіксувати поведінку 1-в-1 ПЕРЕД рефакторингом CRAP/unit-size хотспоту
// `renderStudioHeaderCounters` (103 LOC — найбільша production-функція за звітом
// Fallow health). Кожен тест описує спостережуваний контракт, а не реалізацію,
// тож він має лишатися зеленим після розбиття модуля на менші файли.

import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const {
    getSheetsForChannel,
    formatCategoryLabel,
    renderStudioHeaderCounters
} = await import('../youtube/studio/studio_header_counters.ts');

function makeHost(html = '') {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
}

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('studio_header_counters — getSheetsForChannel', () => {
    test('1. канал "vp" -> [vp_ss, oparin] у стабільному порядку', () => {
        assert.deepEqual(getSheetsForChannel('vp'), ['vp_ss', 'oparin']);
    });

    test('2. канал "slovo" -> [molchanov_ss, molchanov_preach] у стабільному порядку', () => {
        assert.deepEqual(getSheetsForChannel('slovo'), ['molchanov_ss', 'molchanov_preach']);
    });

    test('3. "unknown" та нерозпізнані ключі -> порожній список', () => {
        assert.deepEqual(getSheetsForChannel('unknown'), []);
        assert.deepEqual(getSheetsForChannel(''), []);
        assert.deepEqual(getSheetsForChannel('somethingElse'), []);
    });

    test('4. повертає новий масив на кожен виклик (немає спільної мутабельної константи)', () => {
        const a = getSheetsForChannel('vp');
        const b = getSheetsForChannel('vp');
        assert.notStrictEqual(a, b);
        a.push('mutated');
        assert.deepEqual(getSheetsForChannel('vp'), ['vp_ss', 'oparin']);
    });
});

describe('studio_header_counters — formatCategoryLabel', () => {
    test('5. точні збіги для чотирьох канонічних міток', () => {
        assert.equal(formatCategoryLabel('Время перемен СШ'), 'Время перемен <b>СШ</b>');
        assert.equal(formatCategoryLabel('Молчанов СШ'), 'Молчанов <b>СШ</b>');
        assert.equal(formatCategoryLabel('Опарин проповеди'), 'Опарин <b>проповеди</b>');
        assert.equal(formatCategoryLabel('Молчанов проповеди'), 'Молчанов <b>проповеди</b>');
    });

    test('6. українські варіанти "проповіді" нормалізуються до російського "проповеди"', () => {
        // Зафіксовано як є: точний збіг українського запису повертає РОСІЙСЬКЕ слово.
        assert.equal(formatCategoryLabel('Опарин проповіді'), 'Опарин <b>проповеди</b>');
        assert.equal(formatCategoryLabel('Молчанов проповіді'), 'Молчанов <b>проповеди</b>');
    });

    test('7. часткові збіги: підсвічується лише перше входження ключового слова', () => {
        assert.equal(formatCategoryLabel('Гість проповеди 2026'), 'Гість <b>проповеди</b> 2026');
        assert.equal(formatCategoryLabel('Гість проповіді 2026'), 'Гість <b>проповіді</b> 2026');
        assert.equal(formatCategoryLabel('Новий СШ клас'), 'Новий <b>СШ</b> клас');
    });

    test('8. пріоритет правил: "проповеди" перевіряється раніше за "СШ"', () => {
        assert.equal(formatCategoryLabel('СШ проповеди'), 'СШ <b>проповеди</b>');
    });

    test('9. мітка без ключових слів повертається без змін', () => {
        assert.equal(formatCategoryLabel('Просто мітка'), 'Просто мітка');
        assert.equal(formatCategoryLabel(''), '');
    });
});

describe('studio_header_counters — renderStudioHeaderCounters (розміщення wrapper)', () => {
    test('10. створює wrapper і повертає його; повторний виклик перевикористовує той самий вузол', () => {
        const host = makeHost();
        const first = renderStudioHeaderCounters(host, 'vp', {});
        const second = renderStudioHeaderCounters(host, 'vp', {});

        assert.ok(first.classList.contains('syh-header-counters-wrapper'));
        assert.strictEqual(first, second, 'wrapper має перевикористовуватись, а не дублюватись');
        assert.equal(host.querySelectorAll('.syh-header-counters-wrapper').length, 1);
    });

    test('11. parent із id="comment-header": wrapper вставляється одразу після span', () => {
        const host = makeHost('<span class="ytcp-comments-section">Коментар</span><i>tail</i>');
        host.id = 'comment-header';

        const wrapper = renderStudioHeaderCounters(host, 'vp', {});
        const span = host.querySelector('span.ytcp-comments-section');

        assert.strictEqual(span.nextSibling, wrapper, 'wrapper має стояти безпосередньо після span');
        assert.strictEqual(wrapper.parentElement, host);
    });

    test('12. parent є SPAN: wrapper кладеться у батька span, одразу після нього', () => {
        const host = makeHost('<span id="label">Коментар</span><i>tail</i>');
        const span = host.querySelector('#label');

        const wrapper = renderStudioHeaderCounters(span, 'vp', {});

        assert.strictEqual(wrapper.parentElement, host, 'targetParent = parentElement span-а');
        assert.strictEqual(span.nextSibling, wrapper);
    });

    test('13. загальний контейнер: знаходить вкладений span.ytcp-comments-section', () => {
        const host = makeHost('<div id="comment-header"><span class="ytcp-comments-section">Коментар</span></div>');
        const inner = host.querySelector('#comment-header');
        const span = host.querySelector('span.ytcp-comments-section');

        const wrapper = renderStudioHeaderCounters(host, 'vp', {});

        assert.strictEqual(wrapper.parentElement, inner, 'targetParent = батько знайденого span');
        assert.strictEqual(span.nextSibling, wrapper);
    });

    test('14. контейнер без span: wrapper просто додається в кінець', () => {
        const host = makeHost('<div class="plain"></div>');
        const wrapper = renderStudioHeaderCounters(host, 'vp', {});

        assert.strictEqual(wrapper.parentElement, host);
        assert.strictEqual(host.lastElementChild, wrapper);
    });
});

describe('studio_header_counters — renderStudioHeaderCounters (вміст баджів)', () => {
    test('15. канал "unknown" -> єдиний бадж "Канал не розпізнано" і жодного лічильника', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'unknown', { vp_ss: { questions: 9, prayers: 9 } });

        assert.ok(wrapper.innerHTML.includes('Канал не розпізнано'));
        assert.ok(wrapper.querySelector('.syh-header-counter-unknown'));
        assert.equal(wrapper.querySelectorAll('[data-sheet-id]').length, 0);
    });

    test('16. рендерить рівно один бадж на аркуш каналу, у порядку getSheetsForChannel', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'slovo', {
            molchanov_ss: { questions: 5, prayers: 1 },
            molchanov_preach: { questions: 2, prayers: 0 }
        });

        const badges = [...wrapper.querySelectorAll('.syh-header-counter-badge')];
        assert.equal(badges.length, 2);
        assert.deepEqual(badges.map(b => b.dataset.sheetId), ['molchanov_ss', 'molchanov_preach']);
    });

    test('17. total = questions + prayers, а окремі лічильники не змішуються', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'vp', {
            vp_ss: { questions: 3, prayers: 4 },
            oparin: { questions: 1, prayers: 0 }
        });

        const vp = wrapper.querySelector('[data-sheet-id="vp_ss"]');
        assert.equal(vp.querySelector('.syh-counter-num-total').textContent, '7');
        assert.equal(vp.querySelector('.syh-counter-num-q').textContent, '3');
        assert.equal(vp.querySelector('.syh-counter-num-p').textContent, '4');

        const oparin = wrapper.querySelector('[data-sheet-id="oparin"]');
        assert.equal(oparin.querySelector('.syh-counter-num-total').textContent, '1');
        assert.equal(oparin.querySelector('.syh-counter-num-p').textContent, '0');
    });

    test('18. числова (legacy) статистика трактується як questions, prayers = 0', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'vp', { vp_ss: 6, oparin: 0 });

        const vp = wrapper.querySelector('[data-sheet-id="vp_ss"]');
        assert.equal(vp.querySelector('.syh-counter-num-q').textContent, '6');
        assert.equal(vp.querySelector('.syh-counter-num-p').textContent, '0');
        assert.equal(vp.querySelector('.syh-counter-num-total').textContent, '6');
    });

    test('19. відсутні / null / частково заповнені записи дають нулі без винятків', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'vp', {
            vp_ss: null,
            oparin: { questions: undefined, prayers: 2 }
        });

        const vp = wrapper.querySelector('[data-sheet-id="vp_ss"]');
        assert.equal(vp.querySelector('.syh-counter-num-total').textContent, '0');
        assert.equal(vp.querySelector('.syh-counter-num-q').textContent, '0');

        const oparin = wrapper.querySelector('[data-sheet-id="oparin"]');
        assert.equal(oparin.querySelector('.syh-counter-num-q').textContent, '0');
        assert.equal(oparin.querySelector('.syh-counter-num-p').textContent, '2');
        assert.equal(oparin.querySelector('.syh-counter-num-total').textContent, '2');
    });

    test('20. клас "syh-header-badge-preach" лише для проповідницьких аркушів', () => {
        const host = makeHost();

        const vpWrapper = renderStudioHeaderCounters(host, 'vp', {});
        assert.ok(!vpWrapper.querySelector('[data-sheet-id="vp_ss"]').classList.contains('syh-header-badge-preach'));
        assert.ok(vpWrapper.querySelector('[data-sheet-id="oparin"]').classList.contains('syh-header-badge-preach'));

        const slovoWrapper = renderStudioHeaderCounters(makeHost(), 'slovo', {});
        assert.ok(!slovoWrapper.querySelector('[data-sheet-id="molchanov_ss"]').classList.contains('syh-header-badge-preach'));
        assert.ok(slovoWrapper.querySelector('[data-sheet-id="molchanov_preach"]').classList.contains('syh-header-badge-preach'));
    });

    test('21. кожен бадж має мітку, роздільник і кнопку видалення', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'slovo', {});
        const badge = wrapper.querySelector('[data-sheet-id="molchanov_ss"]');

        assert.equal(badge.querySelector('.syh-header-sheet-label').innerHTML, 'Молчанов <b>СШ</b>');
        assert.ok(badge.querySelector('.syh-header-stat-divider'));
        assert.ok(badge.querySelector('.syh-stat-del'));
        assert.ok(badge.querySelector('.syh-stat-total'));
    });

    test('22. повторний рендер оновлює числа й не накопичує баджі', () => {
        const host = makeHost();
        renderStudioHeaderCounters(host, 'vp', { vp_ss: { questions: 1, prayers: 0 } });
        const wrapper = renderStudioHeaderCounters(host, 'vp', { vp_ss: { questions: 8, prayers: 2 } });

        assert.equal(wrapper.querySelectorAll('.syh-header-counter-badge').length, 2);
        const vp = wrapper.querySelector('[data-sheet-id="vp_ss"]');
        assert.equal(vp.querySelector('.syh-counter-num-total').textContent, '10');
    });

    test('23. перехід vp -> unknown замінює лічильники на "Канал не розпізнано"', () => {
        const host = makeHost();
        renderStudioHeaderCounters(host, 'vp', { vp_ss: { questions: 1, prayers: 1 } });
        const wrapper = renderStudioHeaderCounters(host, 'unknown', {});

        assert.equal(wrapper.querySelectorAll('.syh-header-counter-badge').length, 1);
        assert.ok(wrapper.textContent.includes('Канал не розпізнано'));
    });
});

describe('studio_header_counters — обробники подій баджів', () => {
    test('24. бадж отримує cursor:pointer', () => {
        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'vp', {});
        assert.equal(wrapper.querySelector('[data-sheet-id="vp_ss"]').style.cursor, 'pointer');
    });

    test('25. клік по баджу пише активну вкладку/підвкладку у storage і шле OPEN_SHEET_POPUP', () => {
        const written = [];
        const messages = [];
        const chrome = installChromeMock();
        chrome.storage.local.set = (items, cb) => { written.push(items); if (cb) cb(); };
        chrome.runtime.sendMessage = (msg) => { messages.push(msg); };

        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'slovo', {});
        wrapper.querySelector('[data-sheet-id="molchanov_preach"]').click();

        assert.equal(written.length, 1);
        assert.equal(written[0]['syh:popup:active_tab'], 'tab-telegram');
        // ЗАФІКСОВАНО ЯК Є: сюди пишеться сирий рядок, хоча схема оголошує
        // Record<string, string>. Це відомий борг —
        // docs/audits/active/audit_2026-08-10_KILO_popup-active-subtab-schema-type-mismatch.md
        // Рефакторинг зобов'язаний зберегти цю поведінку 1-в-1.
        assert.equal(written[0]['syh:popup:active_subtab'], 'molchanov_preach');
        assert.deepEqual(messages, [{ action: 'OPEN_SHEET_POPUP', sheetId: 'molchanov_preach' }]);
    });

    test('26. збій chrome.runtime.sendMessage не пробивається назовні', () => {
        const chrome = installChromeMock();
        chrome.storage.local.set = (items, cb) => { if (cb) cb(); };
        chrome.runtime.sendMessage = () => { throw new Error('Extension context invalidated'); };

        const host = makeHost();
        const wrapper = renderStudioHeaderCounters(host, 'vp', {});
        assert.doesNotThrow(() => wrapper.querySelector('[data-sheet-id="vp_ss"]').click());
    });

    test('27. кнопка 🗑️ при підтвердженні очищає аркуш і НЕ відкриває попап', async () => {
        const written = [];
        const messages = [];
        const chrome = installChromeMock({ storageData: { 'syh:popup:collected:oparin': [{ id: 'c1' }] } });
        const store = { 'syh:popup:collected:oparin': [{ id: 'c1' }] };
        chrome.storage.local.get = (keys, cb) => {
            const out = {};
            for (const k of keys) if (k in store) out[k] = store[k];
            cb(out);
        };
        chrome.storage.local.set = (items, cb) => { written.push(items); Object.assign(store, items); if (cb) cb(); };
        chrome.runtime.sendMessage = (msg) => { messages.push(msg); };

        const originalConfirm = globalThis.confirm;
        globalThis.confirm = () => true;
        try {
            const host = makeHost();
            const wrapper = renderStudioHeaderCounters(host, 'vp', {});
            wrapper.querySelector('[data-sheet-id="oparin"] .syh-stat-del').click();
            await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
            globalThis.confirm = originalConfirm;
        }

        const cleared = written.find(w => Array.isArray(w['syh:popup:collected:oparin']));
        assert.ok(cleared, 'аркуш має бути очищений');
        assert.deepEqual(cleared['syh:popup:collected:oparin'], []);
        assert.equal(messages.length, 0, 'stopPropagation має заблокувати клік по баджу');
    });

    test('28. кнопка 🗑️ при скасуванні нічого не змінює', async () => {
        const written = [];
        const chrome = installChromeMock();
        chrome.storage.local.set = (items, cb) => { written.push(items); if (cb) cb(); };

        const originalConfirm = globalThis.confirm;
        globalThis.confirm = () => false;
        try {
            const host = makeHost();
            const wrapper = renderStudioHeaderCounters(host, 'vp', {});
            wrapper.querySelector('[data-sheet-id="oparin"] .syh-stat-del').click();
            await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
            globalThis.confirm = originalConfirm;
        }

        assert.equal(written.length, 0);
    });
});
