import assert from 'node:assert/strict';
import { test, describe, mock } from 'node:test';

// --- Мінімальний DOM-стаб ---------------------------------------------------

function createFakeElement(tag = 'div') {
    const classes = new Set();
    const attributes = {};
    const listeners = {};

    const el = {
        tagName: tag.toUpperCase(),
        children: [],
        dataset: {},
        style: { cssText: '' },
        innerHTML: '',
        innerText: '',
        id: '',
        className: '',
        title: '',
        disabled: false,
        parentNode: null,
        nextSibling: null,
        listeners,
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        setAttribute: (key, value) => { attributes[key] = value; },
        getAttribute: key => (key in attributes ? attributes[key] : null),
        appendChild: child => { el.children.push(child); child.parentNode = el; return child; },
        insertBefore: mock.fn(child => { el.children.push(child); return child; }),
        addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
        querySelector: () => null,
        querySelectorAll: () => [],
        closest: () => null,
        click: mock.fn()
    };

    return el;
}

global.window = global;
// Node 24 віддає `navigator` лише через getter — підміняємо через defineProperty.
Object.defineProperty(global, 'navigator', {
    value: { clipboard: { writeText: mock.fn(async () => {}) } },
    configurable: true,
    writable: true
});
global.KeyboardEvent = class KeyboardEvent {
    constructor(type, init = {}) {
        this.type = type;
        this.key = init.key;
    }
};
global.document = {
    createElement: tag => createFakeElement(tag),
    querySelector: mock.fn(() => null),
    querySelectorAll: mock.fn(() => []),
    getElementById: mock.fn(() => null),
    dispatchEvent: mock.fn(),
    body: createFakeElement('body')
};

const {
    FRESH_WINDOW_DAYS,
    SABBATH_SCHOOL_MARKER,
    collectFreshVideoCards,
    createFreshScanState,
    isDuplicateSabbathSchool,
    isFreshVideoCard,
    isWithinFreshWindow,
    parseCardDate,
    readVideoCardInfo,
    startOfToday
} = await import('../modules/video_copier_fresh.ts');

const {
    appendButtonsToCard,
    buildVideoUrl,
    createSquareButton,
    formatVideoShareText,
    processVideoCard,
    readCardTitleText,
    readShareUrl,
    tempIconChange
} = await import('../modules/video_copier_ui.ts');

const {
    DOWNLOAD_DELAYS,
    closeDownloadModal,
    findDownloadMenuItem,
    matchesDownloadLabel,
    openCardMenu,
    wait
} = await import('../modules/video_copier_downloader.ts');

const { SYH_VIDEO_COPIER, SYH_VIDEO_COPIER_PLUGIN } = await import('../modules/video_copier.ts');
const { SYH_DOM_OBSERVER } = await import('../modules/dom_observer.ts');

// --- Хелпери-фікстури -------------------------------------------------------

const DATE_SELECTOR = '[data-testid="library-media-subtitle"]';
const TITLE_SELECTOR = 'span[class*="MediaTitle"]';
const MENU_SELECTOR = 'div[class*="MediaCardMenu"]';

function makeCard({ title, dateText, href = '/abc123', menu = true, hasControls = false } = {}) {
    const card = createFakeElement('a');
    const titleEl = title === undefined ? null : Object.assign(createFakeElement('span'), { innerText: title });
    const dateEl = dateText === undefined ? null : Object.assign(createFakeElement('div'), { innerText: dateText });

    const menuEl = menu ? createFakeElement('div') : null;
    if (menuEl) menuEl.parentNode = createFakeElement('div');

    card.setAttribute('href', href);
    card.querySelector = selector => {
        if (selector === TITLE_SELECTOR) return titleEl;
        if (selector === DATE_SELECTOR) return dateEl;
        if (selector === MENU_SELECTOR) return menuEl;
        if (selector === '.syh-list-controls') return hasControls ? createFakeElement('div') : null;
        return null;
    };
    card.menuEl = menuEl;

    return card;
}

const NOW = new Date('2026-08-09T00:00:00');

// --- video_copier_fresh -----------------------------------------------------

describe('video_copier_fresh — правила відбору свіжих відео', () => {
    test('parseCardDate бере лише дату й рік і нормалізує до опівночі', () => {
        const parsed = parseCardDate('Aug 5, 2026, 20:44');

        assert.ok(parsed instanceof Date);
        assert.equal(parsed.getFullYear(), 2026);
        assert.equal(parsed.getMonth(), 7);
        assert.equal(parsed.getDate(), 5);
        assert.equal(parsed.getHours(), 0);
        assert.equal(parsed.getMinutes(), 0);
    });

    test('parseCardDate повертає null для непарсабельного рядка', () => {
        assert.equal(parseCardDate('not a date'), null);
        assert.equal(parseCardDate(''), null);
    });

    test('isWithinFreshWindow охоплює рівно 5 днів включно, в обидва боки', () => {
        assert.equal(FRESH_WINDOW_DAYS, 5);
        assert.equal(isWithinFreshWindow(new Date('2026-08-09T00:00:00'), NOW), true);
        assert.equal(isWithinFreshWindow(new Date('2026-08-04T00:00:00'), NOW), true);
        assert.equal(isWithinFreshWindow(new Date('2026-08-03T00:00:00'), NOW), false);
        // Модуль порівнює за модулем різниці, тож майбутні дати теж вважаються свіжими.
        assert.equal(isWithinFreshWindow(new Date('2026-08-14T00:00:00'), NOW), true);
        assert.equal(isWithinFreshWindow(new Date('2026-08-15T00:00:00'), NOW), false);
    });

    test('isDuplicateSabbathSchool пропускає лише перший запис і мутує стан', () => {
        const state = createFreshScanState();
        assert.equal(state.foundSS, false);

        assert.equal(isDuplicateSabbathSchool('ПРОПОВЕДЬ', state), false);
        assert.equal(state.foundSS, false, 'звичайне відео не займає слот суботньої школи');

        assert.equal(isDuplicateSabbathSchool(`${SABBATH_SCHOOL_MARKER} 01.08`, state), false);
        assert.equal(state.foundSS, true);

        assert.equal(isDuplicateSabbathSchool(`${SABBATH_SCHOOL_MARKER} 08.08`, state), true);
    });

    test('readVideoCardInfo повертає null, якщо бракує назви або дати', () => {
        assert.equal(readVideoCardInfo(makeCard({ title: 'Проповедь' })), null);
        assert.equal(readVideoCardInfo(makeCard({ dateText: 'Aug 5, 2026, 20:44' })), null);
        assert.equal(readVideoCardInfo(makeCard({ title: 'Проповедь', dateText: 'garbage' })), null);
    });

    test('readVideoCardInfo нормалізує назву у верхній регістр', () => {
        const info = readVideoCardInfo(makeCard({ title: 'Субботняя школа', dateText: 'Aug 5, 2026, 20:44' }));

        assert.equal(info.title, 'СУББОТНЯЯ ШКОЛА');
        assert.equal(info.date.getDate(), 5);
    });

    test('isFreshVideoCard: свіже відео проходить, старе — ні', () => {
        const state = createFreshScanState();

        assert.equal(isFreshVideoCard(makeCard({ title: 'Проповедь', dateText: 'Aug 7, 2026, 10:00' }), NOW, state), true);
        assert.equal(isFreshVideoCard(makeCard({ title: 'Проповедь', dateText: 'Jul 1, 2026, 10:00' }), NOW, state), false);
    });

    test('isFreshVideoCard відкидає другу «Суботню школу» в одному проході', () => {
        const state = createFreshScanState();
        const first = makeCard({ title: 'СУББОТНЯЯ ШКОЛА 1', dateText: 'Aug 8, 2026, 10:00' });
        const second = makeCard({ title: 'СУББОТНЯЯ ШКОЛА 2', dateText: 'Aug 7, 2026, 10:00' });

        assert.equal(isFreshVideoCard(first, NOW, state), true);
        assert.equal(isFreshVideoCard(second, NOW, state), false);
    });

    test('collectFreshVideoCards фільтрує список з єдиним спільним станом', () => {
        const cards = [
            makeCard({ title: 'СУББОТНЯЯ ШКОЛА A', dateText: 'Aug 8, 2026, 10:00' }),
            makeCard({ title: 'СУББОТНЯЯ ШКОЛА B', dateText: 'Aug 7, 2026, 10:00' }),
            makeCard({ title: 'ПРОПОВЕДЬ', dateText: 'Aug 6, 2026, 10:00' }),
            makeCard({ title: 'СТАРОЕ ВИДЕО', dateText: 'Jan 1, 2026, 10:00' }),
            makeCard({ dateText: 'Aug 6, 2026, 10:00' })
        ];

        const fresh = collectFreshVideoCards(cards, NOW);

        assert.equal(fresh.length, 2);
        assert.equal(fresh[0], cards[0]);
        assert.equal(fresh[1], cards[2]);
    });

    test('startOfToday обнуляє час', () => {
        const start = startOfToday(new Date('2026-08-09T18:30:45'));

        assert.equal(start.getHours(), 0);
        assert.equal(start.getMinutes(), 0);
        assert.equal(start.getSeconds(), 0);
        assert.equal(start.getMilliseconds(), 0);
    });
});

// --- video_copier_ui --------------------------------------------------------

describe('video_copier_ui — чисті хелпери та ін’єкція кнопок', () => {
    test('formatVideoShareText додає підпис перед посиланням', () => {
        assert.equal(
            formatVideoShareText('https://streamyard.com/abc'),
            'Видео (в хорошем качестве)\n\nhttps://streamyard.com/abc'
        );
    });

    test('buildVideoUrl будує повний URL із href і захищає від порожнього id', () => {
        assert.equal(buildVideoUrl('/abc123'), 'https://streamyard.com/abc123');
        assert.equal(buildVideoUrl('https://streamyard.com/xyz'), 'https://streamyard.com/xyz');
        assert.equal(buildVideoUrl(''), null);
        assert.equal(buildVideoUrl(null), null);
        assert.equal(buildVideoUrl('/'), null);
    });

    test('readCardTitleText має явний фолбек', () => {
        assert.equal(readCardTitleText(makeCard({ title: '  Проповедь  ' })), 'Проповедь');
        assert.equal(readCardTitleText(makeCard()), 'Назву не знайдено');
    });

    test('readShareUrl читає значення readonly-інпуту', () => {
        const withInput = createFakeElement('div');
        withInput.querySelector = () => Object.assign(createFakeElement('input'), { value: 'https://sy/1' });
        assert.equal(readShareUrl(withInput), 'https://sy/1');

        assert.equal(readShareUrl(createFakeElement('div')), null);
    });

    test('tempIconChange показує тимчасову іконку і повертає початкову', async () => {
        const btn = createFakeElement('button');
        btn.innerHTML = '<span>📝</span>';

        tempIconChange(btn, '✅', 5);
        assert.equal(btn.innerHTML, '✅');

        await wait(20);
        assert.equal(btn.innerHTML, '<span>📝</span>');
    });

    test('createSquareButton повертає кнопку з підказкою та обробником кліку', () => {
        const onClick = mock.fn();
        const btn = createSquareButton('🔗', 'Копіювати посилання', onClick);

        assert.equal(btn.title, 'Копіювати посилання');
        assert.equal(btn.getAttribute('aria-label'), 'Копіювати посилання');
        assert.equal(btn.dataset.action, 'copier-action');
        assert.ok(btn.className.includes('syh-square-btn'));

        btn.listeners.click[0]({});
        assert.equal(onClick.mock.callCount(), 1);
    });

    test('appendButtonsToCard вставляє контейнер із двома кнопками перед меню картки', () => {
        const card = makeCard({ title: 'Проповедь', dateText: 'Aug 7, 2026, 10:00' });

        appendButtonsToCard(card);

        const insertBefore = card.menuEl.parentNode.insertBefore;
        assert.equal(insertBefore.mock.callCount(), 1);

        const [wrap, anchor] = insertBefore.mock.calls[0].arguments;
        assert.equal(anchor, card.menuEl);
        assert.equal(wrap.className, 'syh-list-controls');
        assert.equal(wrap.children.length, 2);
        assert.equal(typeof wrap.listeners.click[0], 'function');
    });

    test('appendButtonsToCard нічого не робить без контейнера меню', () => {
        const card = makeCard({ title: 'Проповедь', dateText: 'Aug 7, 2026, 10:00', menu: false });
        assert.doesNotThrow(() => appendButtonsToCard(card));
    });

    test('processVideoCard позначає картку обробленою й не обробляє її двічі', () => {
        const card = makeCard({ title: 'Проповедь', dateText: 'Aug 7, 2026, 10:00' });
        const state = createFreshScanState();

        processVideoCard(card, NOW, state);
        assert.equal(card.classList.contains('syh-processed'), true);
        assert.equal(card.menuEl.parentNode.insertBefore.mock.callCount(), 1);

        processVideoCard(card, NOW, state);
        assert.equal(card.menuEl.parentNode.insertBefore.mock.callCount(), 1);
    });

    test('processVideoCard не додає кнопки до несвіжої картки та до картки з кнопками', () => {
        const stale = makeCard({ title: 'Старое', dateText: 'Jan 1, 2026, 10:00' });
        processVideoCard(stale, NOW, createFreshScanState());
        assert.equal(stale.menuEl.parentNode.insertBefore.mock.callCount(), 0);
        assert.equal(stale.classList.contains('syh-processed'), true);

        const already = makeCard({ title: 'Проповедь', dateText: 'Aug 7, 2026, 10:00', hasControls: true });
        processVideoCard(already, NOW, createFreshScanState());
        assert.equal(already.menuEl.parentNode.insertBefore.mock.callCount(), 0);
    });
});

// --- video_copier_downloader ------------------------------------------------

describe('video_copier_downloader — сценарій завантаження', () => {
    test('matchesDownloadLabel враховує локалізовану назву та англійський фолбек', () => {
        assert.equal(matchesDownloadLabel('Завантажити', 'Завантажити'), true);
        assert.equal(matchesDownloadLabel('Download video', 'Завантажити'), true);
        assert.equal(matchesDownloadLabel('Delete', 'Завантажити'), false);
    });

    test('findDownloadMenuItem знаходить перший відповідний пункт', () => {
        const items = [
            Object.assign(createFakeElement('span'), { innerText: 'Rename' }),
            Object.assign(createFakeElement('span'), { innerText: 'Download' }),
            Object.assign(createFakeElement('span'), { innerText: 'Download again' })
        ];

        assert.equal(findDownloadMenuItem(items, 'Download'), items[1]);
        assert.equal(findDownloadMenuItem([items[0]], 'Download'), undefined);
    });

    test('openCardMenu клікає «More options» і не падає без кнопки', () => {
        const moreBtn = createFakeElement('button');
        const card = createFakeElement('a');
        card.querySelector = selector => (selector === 'button[aria-label="More options"]' ? moreBtn : null);

        openCardMenu(card);
        assert.equal(moreBtn.click.mock.callCount(), 1);

        assert.doesNotThrow(() => openCardMenu(createFakeElement('a')));
    });

    test('closeDownloadModal клікає кнопку закриття, якщо вона є', () => {
        const closeBtn = createFakeElement('button');
        document.querySelector.mock.mockImplementationOnce(() => closeBtn);
        document.dispatchEvent.mock.resetCalls();

        closeDownloadModal();

        assert.equal(closeBtn.click.mock.callCount(), 1);
        assert.equal(document.dispatchEvent.mock.callCount(), 0);
    });

    test('closeDownloadModal падає назад на Escape', () => {
        document.querySelector.mock.mockImplementationOnce(() => null);
        document.dispatchEvent.mock.resetCalls();

        closeDownloadModal();

        assert.equal(document.dispatchEvent.mock.callCount(), 1);
        assert.equal(document.dispatchEvent.mock.calls[0].arguments[0].key, 'Escape');
    });

    test('затримки сценарію зафіксовані константами', () => {
        assert.deepEqual({ ...DOWNLOAD_DELAYS }, { menu: 600, menuItem: 1200, videoStart: 1500, close: 1000 });
    });

    test('wait резолвиться', async () => {
        await assert.doesNotReject(wait(1));
    });
});

// --- Фасад ------------------------------------------------------------------

describe('video_copier — публічний API фасаду', () => {
    test('SYH_VIDEO_COPIER зберігає повний контракт SyhVideoCopier', () => {
        const api = [
            'init', 'startObserver', 'injectTitleButton', 'injectModalButton', 'injectListButtons',
            'appendButtonsToCard', 'createSquareButton', 'tempIconChange', 'injectMasterDownloadButton',
            'downloadAllFreshVideos', 'downloadSingleFreshVideo'
        ];

        for (const method of api) {
            assert.equal(typeof SYH_VIDEO_COPIER[method], 'function', `відсутній метод: ${method}`);
        }
    });

    test('init реєструє всі чотири точки ін’єкції у централізованому спостерігачі', () => {
        const register = mock.method(SYH_DOM_OBSERVER, 'register', () => () => {});

        SYH_VIDEO_COPIER.init();

        const selectors = register.mock.calls.map(call => call.arguments[0]);
        assert.deepEqual(selectors, [
            'div[class*="TitleWrapper"]',
            'div[aria-label="embed-modal-content-share"]',
            'a.media-item-card',
            'h1[class*="LibraryTitleV2__Title"]'
        ]);

        register.mock.restore();
    });

    test('плагін вмикається лише на streamyard.com', () => {
        assert.equal(SYH_VIDEO_COPIER_PLUGIN.id, 'syh_video_copier');
        assert.equal(SYH_VIDEO_COPIER_PLUGIN.enabled, true);
        assert.equal(SYH_VIDEO_COPIER_PLUGIN.isSupported('https://streamyard.com/xyz'), true);
        assert.equal(SYH_VIDEO_COPIER_PLUGIN.isSupported('https://studio.youtube.com/'), false);
    });
});
