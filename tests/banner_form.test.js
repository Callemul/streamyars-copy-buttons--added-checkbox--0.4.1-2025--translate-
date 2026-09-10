import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

/**
 * Характеризаційні (golden) тести для CRAP-хотспота `createSingleBanner`
 * (`modules/banner_creator.ts`, CRAP 63.6 / cyclomatic 15 за звітом Fallow).
 *
 * Тести написані ДО рефакторингу і фіксують поведінку 1-в-1 через публічний
 * контракт `SYH_BANNER_CREATOR`. Після винесення кроків у `modules/banner_form.ts`
 * вони мають лишитися зеленими без жодної правки.
 *
 * Навмисно зафіксовані «дивацтва» чинної реалізації:
 *   - кнопка створення шукається через `document.querySelector` (НЕ `resolveSelector`),
 *     тож масив-селектор (`SelectorValue = string | string[]`) не отримує
 *     пріоритетного перебору — див. аудит про розбіжність із `ensureCleanStart`;
 *   - `addButton.click()` викликається навіть якщо кнопка лишилась `disabled`
 *     після додаткової паузи 200 мс;
 *   - фінальний cancel-клік залежить від того, чи форма ЩЕ в документі.
 */

const { SYH_BANNER_CREATOR } = await import('../modules/banners/banner_creator.ts');
const { executeBannerCreationLoop } = await import('../modules/banners/banner_executor.ts');

const SELECTORS = {
    createBannerButton: '#syh-create-banner-btn',
    createBannerForm: 'form#syh-create-banner-form'
};

function makeUtils(overrides = {}) {
    const calls = {
        waitForElement: [],
        waitForNewBanner: [],
        copyAndShowBanner: [],
        saveBannerCategory: []
    };
    return {
        calls,
        cleanTelegramHeaders: (text) => text,
        waitForElement: async (selector, timeout) => {
            calls.waitForElement.push([selector, timeout]);
            return null;
        },
        waitForNewBanner: async (text, timeout) => {
            calls.waitForNewBanner.push([text, timeout]);
        },
        copyAndShowBanner: (text, title) => {
            calls.copyAndShowBanner.push([text, title]);
        },
        saveBannerCategory: async (text, category) => {
            calls.saveBannerCategory.push([text, category]);
        },
        ...overrides
    };
}

/**
 * Будує форму створення банера. Повертає елементи + журнал викликів,
 * щоб перевіряти точний порядок дій над textarea.
 */
function buildForm({ withTextarea = true, withSubmit = true, disabled = false } = {}) {
    const form = document.createElement('form');
    form.id = 'syh-create-banner-form';

    const order = [];

    let textarea = null;
    if (withTextarea) {
        textarea = document.createElement('textarea');
        textarea.focus = () => order.push('focus');
        textarea.blur = () => order.push('blur');
        textarea.addEventListener('input', (e) => {
            order.push(`input(bubbles=${e.bubbles},value=${textarea.value})`);
        });
        form.appendChild(textarea);
    }

    let submitBtn = null;
    if (withSubmit) {
        submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.disabled = disabled;
        submitBtn.click = () => order.push('submit-click');
        form.appendChild(submitBtn);
    }

    // Кнопка-«таймер», яку clickCancelButton зобов'язана ігнорувати.
    const timerBtn = document.createElement('button');
    timerBtn.type = 'button';
    timerBtn.id = 'banner-timer-dropdown-button';
    timerBtn.click = () => order.push('timer-click');
    form.appendChild(timerBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.click = () => order.push('cancel-click');
    form.appendChild(cancelBtn);

    return { form, textarea, submitBtn, cancelBtn, timerBtn, order };
}

function buildCreateButton() {
    const btn = document.createElement('button');
    btn.id = 'syh-create-banner-btn';
    const clicks = [];
    btn.click = () => clicks.push('create-click');
    return { btn, clicks };
}

describe('banner_creator — createSingleBanner (характеризація CRAP-хотспота)', () => {
    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
        SYH_BANNER_CREATOR.UI = undefined;
    });

    test('1. кидає "Create banner button not found", коли кнопки немає і waitForElement дав null', async () => {
        const utils = makeUtils();
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await assert.rejects(
            () => SYH_BANNER_CREATOR.createSingleBanner('text'),
            /Create banner button not found/
        );
        // Спершу пробує синхронний пошук, потім чекає рівно 2000 мс.
        assert.deepStrictEqual(utils.calls.waitForElement, [[SELECTORS.createBannerButton, 2000]]);
    });

    test('2. кнопка вже в DOM -> waitForElement для кнопки НЕ викликається', async () => {
        const { btn, clicks } = buildCreateButton();
        document.body.appendChild(btn);

        const { form } = buildForm();
        const utils = makeUtils({
            waitForElement: async (selector, timeout) => {
                utils.calls.waitForElement.push([selector, timeout]);
                return form;
            }
        });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('hi');

        assert.deepStrictEqual(clicks, ['create-click']);
        // Єдиний waitForElement — це очікування форми.
        assert.deepStrictEqual(utils.calls.waitForElement, [[SELECTORS.createBannerForm, 2000]]);
    });

    test('3. кидає "Create banner form not found", коли форма не дочекалась', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);

        const utils = makeUtils();
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await assert.rejects(
            () => SYH_BANNER_CREATOR.createSingleBanner('text'),
            /Create banner form not found/
        );
    });

    test('4. кидає "Textarea or submit button not found in form" без textarea', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form } = buildForm({ withTextarea: false });

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await assert.rejects(
            () => SYH_BANNER_CREATOR.createSingleBanner('text'),
            /Textarea or submit button not found in form/
        );
    });

    test('5. кидає ту саму помилку без submit-кнопки', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form } = buildForm({ withSubmit: false });

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await assert.rejects(
            () => SYH_BANNER_CREATOR.createSingleBanner('text'),
            /Textarea or submit button not found in form/
        );
    });

    test('6. заповнює textarea у порядку focus -> value -> input(bubbles) -> blur, потім клікає submit', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form, textarea, order } = buildForm();

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('Привіт');

        assert.deepStrictEqual(order, [
            'focus',
            'input(bubbles=true,value=Привіт)',
            'blur',
            'submit-click'
        ]);
        assert.strictEqual(textarea.value, 'Привіт');
    });

    test('7. викликає waitForNewBanner(text, 5000) після кліку submit', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form } = buildForm();

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('Питання глядача');

        assert.deepStrictEqual(utils.calls.waitForNewBanner, [['Питання глядача', 5000]]);
    });

    test('8. короткий текст (<=50) чекає щонайменше 150 мс перед submit', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form } = buildForm();

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        const started = Date.now();
        await SYH_BANNER_CREATOR.createSingleBanner('a'.repeat(50));
        const elapsed = Date.now() - started;

        assert.ok(elapsed >= 140, `очікували >=140 мс, отримали ${elapsed}`);
        assert.ok(elapsed < 290, `очікували коротку паузу (<290 мс), отримали ${elapsed}`);
    });

    test('9. довгий текст (>50) чекає щонайменше 300 мс перед submit', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form } = buildForm();

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        const started = Date.now();
        await SYH_BANNER_CREATOR.createSingleBanner('a'.repeat(51));
        const elapsed = Date.now() - started;

        assert.ok(elapsed >= 290, `очікували >=290 мс, отримали ${elapsed}`);
    });

    test('10. disabled submit -> додаткова пауза 200 мс, але клік усе одно відбувається', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form, order } = buildForm({ disabled: true });

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        const started = Date.now();
        await SYH_BANNER_CREATOR.createSingleBanner('short');
        const elapsed = Date.now() - started;

        assert.ok(order.includes('submit-click'), 'submit має бути клікнутий навіть у стані disabled');
        assert.ok(elapsed >= 340, `очікували 150+200 мс, отримали ${elapsed}`);
    });

    test('11. форма ЩЕ в документі -> фінальний cancel-клік виконується', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form, order } = buildForm();
        document.body.appendChild(form);

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('text');

        assert.deepStrictEqual(order.filter(o => o.endsWith('-click')), ['submit-click', 'cancel-click']);
    });

    test('12. форми вже немає в документі -> cancel-клік НЕ виконується', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form, order } = buildForm();
        // form навмисно НЕ додано в document

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('text');

        assert.deepStrictEqual(order.filter(o => o.endsWith('-click')), ['submit-click']);
    });

    test('13. відсутній createBannerForm у SELECTORS -> cancel-клік пропускається', async () => {
        const { btn } = buildCreateButton();
        document.body.appendChild(btn);
        const { form, order } = buildForm();
        document.body.appendChild(form);

        const utils = makeUtils({ waitForElement: async () => form });
        SYH_BANNER_CREATOR.init({ SELECTORS: { createBannerButton: SELECTORS.createBannerButton } }, utils, {});

        await SYH_BANNER_CREATOR.createSingleBanner('text');

        assert.deepStrictEqual(order.filter(o => o.endsWith('-click')), ['submit-click']);
    });
});

describe('banner_creator — clickCancelButton (характеризація)', () => {
    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
    });

    test('14. обирає першу не-submit кнопку, пропускаючи banner-timer-dropdown-button', () => {
        const { form, order } = buildForm();
        SYH_BANNER_CREATOR.clickCancelButton(form);
        assert.deepStrictEqual(order, ['cancel-click']);
    });

    test('15. ігнорує кнопку, вкладену в #banner-timer-dropdown-button', () => {
        const form = document.createElement('form');
        const order = [];

        const wrapper = document.createElement('div');
        wrapper.id = 'banner-timer-dropdown-button';
        const inner = document.createElement('button');
        inner.type = 'button';
        inner.click = () => order.push('inner-click');
        wrapper.appendChild(inner);
        form.appendChild(wrapper);

        const real = document.createElement('button');
        real.type = 'button';
        real.click = () => order.push('real-click');
        form.appendChild(real);

        SYH_BANNER_CREATOR.clickCancelButton(form);
        assert.deepStrictEqual(order, ['real-click']);
    });

    test('16. немає кандидата -> нічого не падає і нічого не клікається', () => {
        const form = document.createElement('form');
        const submit = document.createElement('button');
        submit.type = 'submit';
        let clicked = false;
        submit.click = () => { clicked = true; };
        form.appendChild(submit);

        assert.doesNotThrow(() => SYH_BANNER_CREATOR.clickCancelButton(form));
        assert.strictEqual(clicked, false);
    });
});

describe('banner_creator — ensureCleanStart / finalCleanup (характеризація)', () => {
    beforeEach(() => {
        installChromeMock();
        document.body.innerHTML = '';
    });

    test('17. ensureCleanStart закриває вже відкриту форму', async () => {
        const { form, order } = buildForm();
        document.body.appendChild(form);

        SYH_BANNER_CREATOR.init({ SELECTORS }, makeUtils(), {});
        await SYH_BANNER_CREATOR.ensureCleanStart();

        assert.deepStrictEqual(order, ['cancel-click']);
    });

    test('18. ensureCleanStart без форми нічого не робить', async () => {
        SYH_BANNER_CREATOR.init({ SELECTORS }, makeUtils(), {});
        await assert.doesNotReject(() => SYH_BANNER_CREATOR.ensureCleanStart());
    });

    test('19. finalCleanup закриває форму, якщо вона лишилась відкритою', async () => {
        const { form, order } = buildForm();
        document.body.appendChild(form);

        SYH_BANNER_CREATOR.init({ SELECTORS }, makeUtils(), {});
        await SYH_BANNER_CREATOR.finalCleanup();

        assert.deepStrictEqual(order, ['cancel-click']);
    });

    test('20. ensureCleanStart/finalCleanup читають форму через resolveSelector (масив селекторів працює)', async () => {
        const { form, order } = buildForm();
        document.body.appendChild(form);

        SYH_BANNER_CREATOR.init(
            { SELECTORS: { createBannerForm: ['form#not-here', 'form#syh-create-banner-form'] } },
            makeUtils(),
            {}
        );
        await SYH_BANNER_CREATOR.finalCleanup();

        assert.deepStrictEqual(order, ['cancel-click']);
    });

    test('21. РЕГРЕС: збій створення окремого банера не перериває цикл і викликає finalCleanup (контракт, рівний сепаратору)', async () => {
        let finalCleanupCalled = 0;
        const creator = {
            log: () => {},
            UTILS: { saveBannerCategory: async () => {} },
            createSingleBanner: async (text) => {
                if (text === 'впав') throw new Error('boom');
            },
            finalCleanup: async () => { finalCleanupCalled++; }
        };
        const banners = [
            { text: 'ок', category: 'audience' },
            { text: 'впав', category: 'audience' },
            { text: 'ок2', category: 'prayer' }
        ];
        const count = await executeBannerCreationLoop(creator, banners);
        assert.strictEqual(count, 2, 'підраховано лише успішні банери');
        assert.strictEqual(finalCleanupCalled, 1, 'finalCleanup викликано при збої банера');
    });
});
