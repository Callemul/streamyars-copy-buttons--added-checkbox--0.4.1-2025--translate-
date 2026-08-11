// tests/video_copier_ui_injection.test.js
//
// Характеристичні тести шару ін'єкції `modules/video_copier_ui.ts`.
// Написані ПЕРЕД декомпозицією файлу (371 рядок / cyclomatic 68) і покривають
// саме те, чого не торкався `tests/video_copier.test.js`: чотири ін'єктори
// (заголовок / модалка Share / список карток / майстер-кнопка), їхню
// ідемпотентність, hover-стилі, тимчасові підписи та реєстр `VIDEO_COPIER_INJECTIONS`.
//
// Тести працюють на реальному happy-dom, тому фіксують і розмітку, і побічні ефекти.

import test, { describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const clipboardWrites = [];
const { CommentService } = await import('../modules/comment_service.ts');

// Маршрутизуємо копіювання через SSOT-сервіс (як у продакшні), щоб фіксувати
// і запис у буфер, і булевий результат успіху/невдачі.
let copyResult = true;
CommentService.copyToClipboard = async (text) => {
    clipboardWrites.push(text);
    return copyResult;
};

beforeEach(() => { copyResult = true; });

const UI = await import('../modules/video_copier_ui.ts');

const {
    LABELS,
    MASTER_BUTTON_ID,
    MODAL_BUTTON_ID,
    TITLE_BUTTON_CLASS,
    LIST_CONTROLS_CLASS,
    PROCESSED_CARD_CLASS,
    FEEDBACK_DELAY_MS,
    STREAMYARD_BASE_URL,
    SHARE_TEXT_PREFIX,
    TITLE_WRAPPER_SELECTOR,
    SHARE_MODAL_SELECTOR,
    LIST_WRAP_SELECTOR,
    VIDEO_COPIER_INJECTIONS,
    applyHoverColors,
    buildCardControls,
    copyAndFlash,
    findShareInputWrapper,
    injectListButtons,
    injectMasterDownloadButton,
    injectModalButton,
    injectTitleButton,
    tempLabelChange
} = UI;

function resetDom(html = '') {
    document.body.innerHTML = html;
    clipboardWrites.length = 0;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- Константи публічного контракту -----------------------------------------

describe('video_copier_ui — публічні константи', () => {
    test('1. підписи кнопок зафіксовані', () => {
        assert.deepEqual({ ...LABELS }, {
            copyTitle: '📋 Копіювати назву',
            copied: '✅ Скопійовано!',
            copyUrl: '🚀 Копіювати URL + Текст (Видео в хорошем качестве)',
            copyUrlDone: '✅ Успішно скопійовано!',
            copyFailed: '⚠️ Не вдалося скопіювати',
            copyUrlFailed: '⚠️ Не вдалося скопіювати URL',
            downloadAll: '📥 Завантажити всі свіжі відео (Video Only)',
            downloadRunning: '⏳ Запускаю завантаження... Не чіпайте мишку!',
            downloadDone: '✅ Всі завантаження ініційовано!'
        });
    });

    test('2. ідентифікатори, класи та базові константи не змінилися', () => {
        assert.equal(STREAMYARD_BASE_URL, 'https://streamyard.com');
        assert.equal(SHARE_TEXT_PREFIX, 'Видео (в хорошем качестве)');
        assert.equal(MODAL_BUTTON_ID, 'syh-url-btn');
        assert.equal(MASTER_BUTTON_ID, 'syh-master-download-btn');
        assert.equal(TITLE_BUTTON_CLASS, 'syh-title-btn');
        assert.equal(LIST_CONTROLS_CLASS, 'syh-list-controls');
        assert.equal(PROCESSED_CARD_CLASS, 'syh-processed');
        assert.equal(FEEDBACK_DELAY_MS, 2000);
    });

    test('3. VIDEO_COPIER_INJECTIONS описує рівно 4 точки у сталому порядку', () => {
        assert.equal(VIDEO_COPIER_INJECTIONS.length, 4);
        assert.deepEqual(VIDEO_COPIER_INJECTIONS.map(i => i.selector), [
            'div[class*="TitleWrapper"]',
            'div[aria-label="embed-modal-content-share"]',
            'a.media-item-card',
            'div[class*="ListWrap"]'
        ]);
        VIDEO_COPIER_INJECTIONS.forEach(entry => assert.equal(typeof entry.inject, 'function'));
    });

    test('4. кожен інжектор реєстру — це саме експортована функція модуля', () => {
        assert.equal(VIDEO_COPIER_INJECTIONS[0].inject, injectTitleButton);
        assert.equal(VIDEO_COPIER_INJECTIONS[1].inject, injectModalButton);
        assert.equal(VIDEO_COPIER_INJECTIONS[2].inject, injectListButtons);
        assert.equal(VIDEO_COPIER_INJECTIONS[3].inject, injectMasterDownloadButton);
    });
});

// --- UI-примітиви -----------------------------------------------------------

describe('video_copier_ui — примітиви зворотного звʼязку', () => {
    test('5. applyHoverColors перемикає фон на mouseover/mouseout', () => {
        resetDom('<button id="b"></button>');
        const btn = document.getElementById('b');

        applyHoverColors(btn, '#111', '#222');
        btn.onmouseover();
        assert.equal(btn.style.backgroundColor, '#222');

        btn.onmouseout();
        assert.equal(btn.style.backgroundColor, '#111');
    });

    test('6. tempLabelChange показує тимчасовий підпис і повертає вихідний', async () => {
        resetDom('<button id="b"></button>');
        const btn = document.getElementById('b');
        btn.innerText = 'Base';

        tempLabelChange(btn, 'Temp', 'Base', 5);
        assert.equal(btn.innerText, 'Temp');

        await sleep(25);
        assert.equal(btn.innerText, 'Base');
    });

    test('7. copyAndFlash спершу пише в буфер, потім кличе колбек', async () => {
        resetDom();
        const order = [];
        const onCopied = mock.fn(() => order.push('callback'));

        await copyAndFlash('payload', onCopied);

        assert.deepEqual(clipboardWrites, ['payload']);
        assert.equal(onCopied.mock.callCount(), 1);
        assert.deepEqual(order, ['callback']);
    });
});

// --- Кнопка біля заголовка --------------------------------------------------

describe('video_copier_ui — кнопка біля заголовка H2', () => {
    const wrapperHtml = '<div class="TitleWrapper-abc"><h2>  Проповедь  </h2></div>';

    test('8. injectTitleButton додає кнопку і розкладає контейнер у flex', () => {
        resetDom(wrapperHtml);

        injectTitleButton();

        const wrap = document.querySelector(TITLE_WRAPPER_SELECTOR);
        const btn = wrap.querySelector(`.${TITLE_BUTTON_CLASS}`);

        assert.ok(btn, 'кнопку вставлено');
        assert.equal(btn.innerText, LABELS.copyTitle);
        assert.equal(wrap.style.display, 'flex');
        assert.equal(wrap.style.alignItems, 'center');
        assert.equal(wrap.style.gap, '15px');
    });

    test('9. injectTitleButton ідемпотентний — другий виклик не дублює кнопку', () => {
        resetDom(wrapperHtml);

        injectTitleButton();
        injectTitleButton();

        assert.equal(document.querySelectorAll(`.${TITLE_BUTTON_CLASS}`).length, 1);
    });

    test('10. без H2 кнопка не вставляється і контейнер не чіпається', () => {
        resetDom('<div class="TitleWrapper-abc"><span>no heading</span></div>');

        injectTitleButton();

        const wrap = document.querySelector(TITLE_WRAPPER_SELECTOR);
        assert.equal(wrap.querySelector(`.${TITLE_BUTTON_CLASS}`), null);
        assert.equal(wrap.style.display, '');
    });

    test('11. клік копіює обрізаний текст H2 і показує тимчасовий підпис', async () => {
        resetDom(wrapperHtml);
        injectTitleButton();

        const btn = document.querySelector(`.${TITLE_BUTTON_CLASS}`);
        const preventDefault = mock.fn();
        btn.onclick({ preventDefault });

        await sleep(0);

        assert.equal(preventDefault.mock.callCount(), 1);
        assert.deepEqual(clipboardWrites, ['Проповедь']);
        assert.equal(btn.innerText, LABELS.copied);
    });

    test('12. injectTitleButton обробляє всі контейнери на сторінці', () => {
        resetDom(`
            <div class="TitleWrapper-a"><h2>A</h2></div>
            <div class="TitleWrapper-b"><h2>B</h2></div>
        `);

        injectTitleButton();

        assert.equal(document.querySelectorAll(`.${TITLE_BUTTON_CLASS}`).length, 2);
    });
});

// --- Кнопка в модалці Share -------------------------------------------------

describe('video_copier_ui — кнопка в модалці Share', () => {
    const modalHtml = `
        <div aria-label="embed-modal-content-share">
            <div class="CopyInputWrapper-x">
                <input readonly value="https://streamyard.com/abc123">
            </div>
        </div>
    `;

    test('13. findShareInputWrapper знаходить обгортку інпуту всередині модалки', () => {
        resetDom(modalHtml);

        const wrapper = findShareInputWrapper();

        assert.ok(wrapper);
        assert.equal(wrapper.querySelector('input[readonly]').value, 'https://streamyard.com/abc123');
    });

    test('14. findShareInputWrapper повертає null без модалки і поважає переданий root', () => {
        resetDom('<div class="CopyInputWrapper-x"><input readonly value="x"></div>');
        assert.equal(findShareInputWrapper(), null);

        resetDom(modalHtml);
        const scoped = document.createElement('div');
        assert.equal(findShareInputWrapper(scoped), null);
    });

    test('15. injectModalButton вставляє кнопку одразу після обгортки інпуту', () => {
        resetDom(modalHtml);

        injectModalButton();

        const btn = document.getElementById(MODAL_BUTTON_ID);
        assert.ok(btn);
        assert.equal(btn.innerText, LABELS.copyUrl);

        const container = btn.parentElement;
        const wrapper = document.querySelector(SHARE_MODAL_SELECTOR).querySelector('div[class*="CopyInputWrapper"]');
        assert.equal(container.previousElementSibling, wrapper);
        assert.equal(container.style.width, '100%');
    });

    test('16. injectModalButton ідемпотентний за id кнопки', () => {
        resetDom(modalHtml);

        injectModalButton();
        injectModalButton();

        assert.equal(document.querySelectorAll(`#${MODAL_BUTTON_ID}`).length, 1);
    });

    test('17. без модалки injectModalButton — тихий no-op', () => {
        resetDom('<div></div>');
        assert.doesNotThrow(() => injectModalButton());
        assert.equal(document.getElementById(MODAL_BUTTON_ID), null);
    });

    test('18. клік копіює URL із префіксом і перемикає підпис', async () => {
        resetDom(modalHtml);
        injectModalButton();

        const btn = document.getElementById(MODAL_BUTTON_ID);
        btn.onclick({ preventDefault: () => {} });
        await sleep(0);

        assert.deepEqual(clipboardWrites, [`${SHARE_TEXT_PREFIX}\n\nhttps://streamyard.com/abc123`]);
        assert.equal(btn.innerText, LABELS.copyUrlDone);
    });

    test('19. порожній readonly-інпут не запускає копіювання', async () => {
        resetDom(`
            <div aria-label="embed-modal-content-share">
                <div class="CopyInputWrapper-x"><input readonly value=""></div>
            </div>
        `);
        injectModalButton();

        const btn = document.getElementById(MODAL_BUTTON_ID);
        btn.onclick({ preventDefault: () => {} });
        await sleep(0);

        assert.deepEqual(clipboardWrites, []);
        assert.equal(btn.innerText, LABELS.copyUrl);
    });
});

// --- Кнопки в списку відео --------------------------------------------------

describe('video_copier_ui — кнопки в картці списку', () => {
    function cardHtml(dateText, title = 'ПРОПОВЕДЬ') {
        return `
            <a class="media-item-card" href="/abc123">
                <span class="MediaTitle-x">${title}</span>
                <div data-testid="library-media-subtitle">${dateText}</div>
                <div class="MediaCardMenu-x"></div>
            </a>
        `;
    }

    function todayLabel() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}, 10:00`;
    }

    test('20. buildCardControls містить дві квадратні кнопки і глушить навігацію', () => {
        resetDom(cardHtml(todayLabel()));
        const card = document.querySelector('a.media-item-card');

        const controls = buildCardControls(card);

        assert.equal(controls.className, LIST_CONTROLS_CLASS);
        assert.equal(controls.children.length, 2);
        assert.equal(controls.children[0].dataset.action, 'copier-action');
        assert.equal(controls.children[0].title, 'Копіювати назву');
        assert.equal(controls.children[1].title, 'Копіювати посилання');
    });

    test('21. клік по контейнеру кнопок гасить перехід по картці', () => {
        resetDom(cardHtml(todayLabel()));
        const card = document.querySelector('a.media-item-card');
        const controls = buildCardControls(card);
        document.body.appendChild(controls);

        const evt = new window.MouseEvent('click', { bubbles: true, cancelable: true });
        controls.dispatchEvent(evt);

        assert.equal(evt.defaultPrevented, true);
    });

    test('22. кнопка «копіювати назву» кладе в буфер саме назву картки', async () => {
        resetDom(cardHtml(todayLabel(), 'Субботняя школа'));
        const card = document.querySelector('a.media-item-card');
        const controls = buildCardControls(card);

        controls.children[0].click();
        await sleep(0);

        assert.deepEqual(clipboardWrites, ['Субботняя школа']);
    });

    test('23. кнопка «копіювати посилання» використовує повний URL із префіксом', async () => {
        resetDom(cardHtml(todayLabel()));
        const card = document.querySelector('a.media-item-card');
        const controls = buildCardControls(card);

        controls.children[1].click();
        await sleep(0);

        assert.deepEqual(clipboardWrites, [`${SHARE_TEXT_PREFIX}\n\n${STREAMYARD_BASE_URL}/abc123`]);
    });

    test('24. injectListButtons додає контролі свіжій картці й мітить її обробленою', () => {
        resetDom(cardHtml(todayLabel()));

        injectListButtons();

        const card = document.querySelector('a.media-item-card');
        assert.equal(card.classList.contains(PROCESSED_CARD_CLASS), true);
        assert.equal(card.querySelectorAll(`.${LIST_CONTROLS_CLASS}`).length, 1);
    });

    test('25. injectListButtons не чіпає стару картку, але мітить її обробленою', () => {
        resetDom(cardHtml('Jan 1, 2020, 10:00'));

        injectListButtons();

        const card = document.querySelector('a.media-item-card');
        assert.equal(card.classList.contains(PROCESSED_CARD_CLASS), true);
        assert.equal(card.querySelectorAll(`.${LIST_CONTROLS_CLASS}`).length, 0);
    });

    test('26. повторний прохід не дублює контролі', () => {
        resetDom(cardHtml(todayLabel()));

        injectListButtons();
        injectListButtons();

        assert.equal(document.querySelectorAll(`.${LIST_CONTROLS_CLASS}`).length, 1);
    });

    test('27. у межах одного проходу друга «Суботня школа» відкидається', () => {
        const label = todayLabel();
        resetDom(cardHtml(label, 'СУББОТНЯЯ ШКОЛА 1') + cardHtml(label, 'СУББОТНЯЯ ШКОЛА 2'));

        injectListButtons();

        const cards = document.querySelectorAll('a.media-item-card');
        assert.equal(cards[0].querySelectorAll(`.${LIST_CONTROLS_CLASS}`).length, 1);
        assert.equal(cards[1].querySelectorAll(`.${LIST_CONTROLS_CLASS}`).length, 0);
    });
});

// --- Майстер-кнопка масового завантаження -----------------------------------

describe('video_copier_ui — майстер-кнопка завантаження', () => {
    const listHtml = '<div class="wrap"><div class="ListWrap-x"></div></div>';

    test('28. injectMasterDownloadButton вставляє кнопку перед контейнером списку', () => {
        resetDom(listHtml);

        injectMasterDownloadButton();

        const btn = document.getElementById(MASTER_BUTTON_ID);
        assert.ok(btn);
        assert.equal(btn.innerText, LABELS.downloadAll);
        assert.equal(btn.nextElementSibling, document.querySelector(LIST_WRAP_SELECTOR));
    });

    test('29. injectMasterDownloadButton ідемпотентний', () => {
        resetDom(listHtml);

        injectMasterDownloadButton();
        injectMasterDownloadButton();

        assert.equal(document.querySelectorAll(`#${MASTER_BUTTON_ID}`).length, 1);
    });

    test('30. без контейнера списку — тихий no-op', () => {
        resetDom('<div></div>');
        assert.doesNotThrow(() => injectMasterDownloadButton());
        assert.equal(document.getElementById(MASTER_BUTTON_ID), null);
    });

    test('31. hover перефарбовує майстер-кнопку у фірмові кольори', () => {
        resetDom(listHtml);
        injectMasterDownloadButton();
        const btn = document.getElementById(MASTER_BUTTON_ID);

        btn.onmouseover();
        assert.equal(btn.style.backgroundColor, '#0047cc');
        btn.onmouseout();
        assert.equal(btn.style.backgroundColor, '#005DF7');
    });

    test('32. клік переводить кнопку у стан «виконується» і блокує її', async () => {
        resetDom(listHtml);
        injectMasterDownloadButton();
        const btn = document.getElementById(MASTER_BUTTON_ID);

        // Без свіжих карток `downloadAllFreshVideos` показує alert і виходить.
        const originalAlert = global.alert;
        global.alert = mock.fn();

        btn.onclick({ preventDefault: () => {} });

        assert.equal(btn.innerText, LABELS.downloadRunning);
        assert.equal(btn.disabled, true);
        assert.equal(btn.style.backgroundColor, '#f39c12');

        await sleep(10);

        assert.equal(btn.innerText, LABELS.downloadDone);
        assert.equal(btn.style.backgroundColor, '#28a745');

        global.alert = originalAlert;
    });
});

// --- Відгук при невдачі буфера обміну (SSOT-маршрутизація) -----------------

describe('video_copier_ui — відгук при невдачі буфера обміну', () => {
    test('33. copyAndFlash при успіху кличе onCopied і повертає true', async () => {
        const order = [];
        const onCopied = mock.fn(() => order.push('copied'));
        const onFailed = mock.fn(() => order.push('failed'));

        const result = await copyAndFlash('payload', onCopied, onFailed);

        assert.equal(result, true);
        assert.equal(onCopied.mock.callCount(), 1);
        assert.equal(onFailed.mock.callCount(), 0);
        assert.deepEqual(order, ['copied']);
        assert.deepEqual(clipboardWrites, ['payload']);
    });

    test('34. copyAndFlash при невдачі кличе onFailed (не onCopied) і повертає false', async () => {
        copyResult = false;
        const order = [];
        const onCopied = mock.fn(() => order.push('copied'));
        const onFailed = mock.fn(() => order.push('failed'));

        const result = await copyAndFlash('payload', onCopied, onFailed);

        assert.equal(result, false);
        assert.equal(onCopied.mock.callCount(), 0);
        assert.equal(onFailed.mock.callCount(), 1);
        assert.deepEqual(order, ['failed']);
    });

    test('35. кнопка біля заголовка при невдачі показує LABELS.copyFailed', async () => {
        const wrapperHtml = '<div class="TitleWrapper-abc"><h2>  Проповедь  </h2></div>';
        resetDom(wrapperHtml);
        injectTitleButton();

        const btn = document.querySelector(`.${TITLE_BUTTON_CLASS}`);
        copyResult = false;
        btn.onclick({ preventDefault: () => {} });

        await sleep(0);

        assert.equal(btn.innerText, LABELS.copyFailed);
    });

    function cardHtml(dateText, title = 'ПРОПОВЕДЬ') {
        return `
            <a class="media-item-card" href="/abc123">
                <span class="MediaTitle-x">${title}</span>
                <div data-testid="library-media-subtitle">${dateText}</div>
                <div class="MediaCardMenu-x"></div>
            </a>
        `;
    }

    function todayLabel() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}, 10:00`;
    }

    test('37. кнопка «копіювати назву» у картці при невдачі показує ❌', async () => {
        copyResult = false;
        resetDom(cardHtml(todayLabel(), 'Субботняя школа'));
        const card = document.querySelector('a.media-item-card');
        const controls = buildCardControls(card);

        controls.children[0].click();
        await sleep(0);

        assert.equal(controls.children[0].innerHTML, '❌');
    });

    test('38. кнопка «копіювати посилання» у картці при невдачі показує ❌', async () => {
        copyResult = false;
        resetDom(cardHtml(todayLabel()));
        const card = document.querySelector('a.media-item-card');
        const controls = buildCardControls(card);

        controls.children[1].click();
        await sleep(0);

        assert.equal(controls.children[1].innerHTML, '❌');
    });
});
