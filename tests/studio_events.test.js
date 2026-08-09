import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальний DOM + chrome для Node (Polymer / iron-list емулюється вручну)
// ---------------------------------------------------------------------------

class FakeNode {
    constructor(selectorMatches = []) {
        this.attrs = {};
        this.selectorMatches = selectorMatches;
        this.textContent = '';
        this.href = '';
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
    removeAttribute(name) { delete this.attrs[name]; }
    matchesSelector(selector) {
        return selector.split(',').some(s => this.selectorMatches.includes(s.trim()));
    }
}

class FakeThread {
    constructor() {
        this.dataset = {};
        this.attrs = {};
        this.nodes = [];
        this.parent = null;
        this.listeners = {};
    }
    addChild(node) { this.nodes.push(node); return node; }
    querySelector(selector) {
        return this.nodes.find(n => n.matchesSelector(selector)) || null;
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
    removeAttribute(name) {
        delete this.attrs[name];
        // Емулюємо зв'язок attribute <-> dataset як у справжньому DOM
        const m = /^data-(.+)$/.exec(name);
        if (m) delete this.dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
    }
    closest(selector) { return this.parent && this.parent.matchesSelector(selector) ? this.parent : null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
}

class FakeContainer extends FakeThread {
    constructor(selectorMatches = []) {
        super();
        this.selectorMatches = selectorMatches;
    }
    matchesSelector(selector) { return this.selectorMatches.includes(selector); }
}

const observerInstances = [];
class FakeMutationObserver {
    constructor(cb) {
        this.cb = cb;
        this.observed = [];
        this.disconnected = false;
        observerInstances.push(this);
    }
    observe(target, options) { this.observed.push({ target, options }); }
    disconnect() { this.disconnected = true; }
    trigger() { this.cb([], this); }
}

global.window = global;
global.MutationObserver = FakeMutationObserver;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, append() {}, appendChild() {}, classList: { add() {}, remove() {} } }),
    addEventListener: () => {}
};

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({
    storageImpl: {
        get: (k, cb) => cb && cb({}),
        set: (i, cb) => cb && cb(),
        remove: (k, cb) => cb && cb()
    }
});

const {
    findMetadataElement,
    readVideoTitleText,
    readVideoLinkHref,
    hasVideoMetadata,
    isVideoMetadataComplete,
    resolveVideoThreadContainer,
    disconnectVideoMetadataObserver,
    setupVideoMetadataObserver,
    isStudioElementBound,
    isRecycledStudioElement,
    cleanupRecycledStudioElement,
    isStudioBindingUpToDate,
    hasStudioActionButtons,
    applyStudioCommentIntegrations
} = await import('../youtube/studio/studio_events.ts');

const TITLE_SELECTOR = '#video-title,.video-title-text';
const LINK_SELECTOR = '#video-title a';

function makeThreadWithParent() {
    const parent = new FakeContainer(['.ytcp-comment-thread']);
    const thread = new FakeThread();
    thread.parent = parent;
    return { thread, parent };
}

describe('studio_video_metadata — читання метаданих відео', () => {
    test('1. findMetadataElement шукає спершу в коментарі, потім у треді', () => {
        const { thread, parent } = makeThreadWithParent();

        const parentNode = parent.addChild(new FakeNode(['#video-title']));
        assert.equal(findMetadataElement(thread, parent, '#video-title'), parentNode, 'fallback у батька');

        const ownNode = thread.addChild(new FakeNode(['#video-title']));
        assert.equal(findMetadataElement(thread, parent, '#video-title'), ownNode, 'пріоритет власного вузла');

        assert.equal(findMetadataElement(thread, parent, '#absent'), null);
    });

    test('2. readVideoTitleText тримить текст і повертає "" за відсутності вузла', () => {
        const { thread, parent } = makeThreadWithParent();
        assert.equal(readVideoTitleText(thread, parent, TITLE_SELECTOR), '');

        const titleNode = thread.addChild(new FakeNode(['#video-title']));
        titleNode.textContent = '   СУББОТНЯЯ ШКОЛА | УРОК 6   ';
        assert.equal(readVideoTitleText(thread, parent, TITLE_SELECTOR), 'СУББОТНЯЯ ШКОЛА | УРОК 6');

        titleNode.textContent = null;
        assert.equal(readVideoTitleText(thread, parent, TITLE_SELECTOR), '');
    });

    test('3. readVideoLinkHref віддає перевагу атрибуту href, потім властивості .href', () => {
        const { thread, parent } = makeThreadWithParent();
        assert.equal(readVideoLinkHref(thread, parent, LINK_SELECTOR), '');

        const linkNode = thread.addChild(new FakeNode(['#video-title a']));
        linkNode.href = 'https://youtu.be/from-property';
        assert.equal(readVideoLinkHref(thread, parent, LINK_SELECTOR), 'https://youtu.be/from-property');

        linkNode.setAttribute('href', '/watch?v=from-attribute');
        assert.equal(readVideoLinkHref(thread, parent, LINK_SELECTOR), '/watch?v=from-attribute');
    });

    test('4. hasVideoMetadata істинний, якщо є заголовок АБО посилання', () => {
        const { thread, parent } = makeThreadWithParent();
        assert.equal(hasVideoMetadata(thread, parent, TITLE_SELECTOR, LINK_SELECTOR), false);

        const titleNode = thread.addChild(new FakeNode(['#video-title']));
        titleNode.textContent = '   ';
        assert.equal(hasVideoMetadata(thread, parent, TITLE_SELECTOR, LINK_SELECTOR), false, 'пробіли не рахуються');

        titleNode.textContent = 'Проповідь';
        assert.equal(hasVideoMetadata(thread, parent, TITLE_SELECTOR, LINK_SELECTOR), true);

        titleNode.textContent = '';
        const linkNode = thread.addChild(new FakeNode(['#video-title a']));
        linkNode.setAttribute('href', '/watch?v=abc');
        assert.equal(hasVideoMetadata(thread, parent, TITLE_SELECTOR, LINK_SELECTOR), true);
    });

    test('5. isVideoMetadataComplete вимагає і заголовок, і videoId', () => {
        assert.equal(isVideoMetadataComplete('Назва', 'vid1'), true);
        assert.equal(isVideoMetadataComplete('Назва', ''), false);
        assert.equal(isVideoMetadataComplete('', 'vid1'), false);
        assert.equal(isVideoMetadataComplete('', ''), false);
    });

    test('6. resolveVideoThreadContainer падає назад на сам елемент', () => {
        const { thread, parent } = makeThreadWithParent();
        assert.equal(resolveVideoThreadContainer(thread), parent);

        const orphan = new FakeThread();
        assert.equal(resolveVideoThreadContainer(orphan), orphan);
    });
});

describe('studio_video_metadata — MutationObserver', () => {
    beforeEach(() => { observerInstances.length = 0; });

    test('7. setupVideoMetadataObserver не створює спостерігача, коли метадані вже повні', () => {
        const { thread } = makeThreadWithParent();

        setupVideoMetadataObserver(thread, 'Назва', 'vid1', () => {});

        assert.equal(observerInstances.length, 0);
        assert.equal(thread._syhVideoObserver, undefined);
    });

    test('8. setupVideoMetadataObserver спостерігає за тредом і викликає onLoaded після появи метаданих', () => {
        const { thread, parent } = makeThreadWithParent();
        let loadedCalls = 0;

        setupVideoMetadataObserver(thread, '', '', () => { loadedCalls++; });

        assert.equal(observerInstances.length, 1);
        const observer = observerInstances[0];
        assert.equal(observer.observed[0].target, parent, 'слухаємо батьківський тред');
        assert.equal(observer.observed[0].options.attributeFilter[0], 'href');
        assert.equal(thread._syhVideoObserver, observer);

        // Метаданих ще немає -> onLoaded не викликається
        observer.trigger();
        assert.equal(loadedCalls, 0);
        assert.equal(observer.disconnected, false);

        // Polymer дозавантажив заголовок
        const titleNode = thread.addChild(new FakeNode(['#video-title']));
        titleNode.textContent = 'Проповідь Опаріна';
        observer.trigger();

        assert.equal(loadedCalls, 1);
        assert.equal(observer.disconnected, true);
        assert.equal(thread._syhVideoObserver, undefined, 'посилання прибрано');
    });

    test('9. повторний виклик від\'єднує попереднього спостерігача (Polymer recycling)', () => {
        const { thread } = makeThreadWithParent();

        setupVideoMetadataObserver(thread, '', '', () => {});
        const first = observerInstances[0];

        setupVideoMetadataObserver(thread, '', '', () => {});
        const second = observerInstances[1];

        assert.equal(first.disconnected, true, 'старий спостерігач від\'єднаний');
        assert.equal(second.disconnected, false);
        assert.equal(thread._syhVideoObserver, second);

        disconnectVideoMetadataObserver(thread);
        assert.equal(second.disconnected, true);
        assert.equal(thread._syhVideoObserver, undefined);

        assert.doesNotThrow(() => disconnectVideoMetadataObserver(thread), 'ідемпотентність');
    });
});

describe('studio_binding_state — recycling та актуальність прив\'язки', () => {
    test('10. isStudioElementBound читає data-атрибут прив\'язки', () => {
        const { thread } = makeThreadWithParent();
        assert.equal(isStudioElementBound(thread), false);

        thread.dataset.syhStudioEventsBound = 'true';
        assert.equal(isStudioElementBound(thread), true);
    });

    test('11. isRecycledStudioElement істинний лише для прив\'язаного вузла з ІНШИМ ключем', () => {
        const { thread } = makeThreadWithParent();

        assert.equal(isRecycledStudioElement(thread, 'old-key', 'new-key'), false, 'не прив\'язаний');

        thread.dataset.syhStudioEventsBound = 'true';
        assert.equal(isRecycledStudioElement(thread, undefined, 'new-key'), false, 'немає попереднього ключа');
        assert.equal(isRecycledStudioElement(thread, 'same-key', 'same-key'), false, 'той самий коментар');
        assert.equal(isRecycledStudioElement(thread, 'old-key', 'new-key'), true);
    });

    test('12. cleanupRecycledStudioElement скидає прапорці та збережений текст', () => {
        const { thread } = makeThreadWithParent();
        thread.dataset.syhStudioEventsBound = 'true';
        thread.dataset.syhBound = 'true';
        thread._syhBound = true;

        const textNode = thread.addChild(new FakeNode(['#content-text']));
        textNode.setAttribute('data-syh-original-text', 'старий текст');

        cleanupRecycledStudioElement(thread, 'old-key', 'new-key');

        assert.equal(thread.dataset.syhStudioEventsBound, undefined);
        assert.equal(thread.dataset.syhBound, undefined);
        assert.equal(thread._syhBound, undefined);
        assert.equal(textNode.getAttribute('data-syh-original-text'), null);
    });

    test('13. cleanupRecycledStudioElement — no-op, якщо вузол не перевикористаний', () => {
        const { thread } = makeThreadWithParent();
        thread.dataset.syhStudioEventsBound = 'true';
        const textNode = thread.addChild(new FakeNode(['#content-text']));
        textNode.setAttribute('data-syh-original-text', 'той самий текст');

        cleanupRecycledStudioElement(thread, 'same-key', 'same-key');

        assert.equal(thread.dataset.syhStudioEventsBound, 'true');
        assert.equal(textNode.getAttribute('data-syh-original-text'), 'той самий текст');
    });

    test('14. isStudioBindingUpToDate: forceUpdate / не прив\'язаний / розсинхрон -> false', () => {
        const { thread } = makeThreadWithParent();
        const synced = { isCheckboxOutOfSync: () => false, isButtonOutOfSync: () => false };

        assert.equal(isStudioBindingUpToDate(thread, synced, 'k1', false), false, 'не прив\'язаний');

        thread.dataset.syhStudioEventsBound = 'true';
        assert.equal(isStudioBindingUpToDate(thread, synced, 'k1', true), false, 'forceUpdate');
        assert.equal(isStudioBindingUpToDate(thread, synced, 'k1', false), true, 'все синхронно');

        const checkboxDrift = { isCheckboxOutOfSync: () => true, isButtonOutOfSync: () => false };
        assert.equal(isStudioBindingUpToDate(thread, checkboxDrift, 'k1', false), false);

        const buttonDrift = { isCheckboxOutOfSync: () => false, isButtonOutOfSync: () => true };
        assert.equal(isStudioBindingUpToDate(thread, buttonDrift, 'k1', false), false);
    });

    test('15. hasStudioActionButtons істинний за наявності будь-якої кнопки', () => {
        const none = { questionBtn: null, prayerBtn: null, copyBtn: null, checkboxEl: null, bodyEl: null };
        assert.equal(hasStudioActionButtons(none), false);
        assert.equal(hasStudioActionButtons({ ...none, questionBtn: {} }), true);
        assert.equal(hasStudioActionButtons({ ...none, prayerBtn: {} }), true);
        assert.equal(hasStudioActionButtons({ ...none, copyBtn: {} }), true);
        assert.equal(hasStudioActionButtons({ ...none, checkboxEl: {} }), false, 'чекбокс без кнопок не рахується');
    });
});

describe('studio_binding_state — applyStudioCommentIntegrations', () => {
    function makeAdapterSpy(buttons) {
        const calls = [];
        return {
            calls,
            getButtons: () => buttons,
            restoreButtonState: (...a) => calls.push(['restoreButtonState', ...a.slice(1)]),
            restoreCheckboxState: (...a) => calls.push(['restoreCheckboxState', ...a.slice(1)]),
            bindStudioSpecificEvents: (...a) => calls.push(['bindStudioSpecificEvents', a[1]])
        };
    }

    test('16. без кнопок дій інтеграції не підключаються і прапорець не ставиться', () => {
        const { thread } = makeThreadWithParent();
        const adapter = makeAdapterSpy({ questionBtn: null, prayerBtn: null, copyBtn: null, checkboxEl: null, bodyEl: null });
        const injector = { bindCommentEvents: () => adapter.calls.push(['bindCommentEvents']) };

        applyStudioCommentIntegrations(thread, 'key-1', adapter, injector, { buttonStates: {}, checkboxStates: {} });

        assert.deepEqual(adapter.calls, []);
        assert.equal(thread.dataset.syhStudioEventsBound, undefined);
    });

    test('17. з кнопками — відновлює стани, біндить події та ставить прапорець', () => {
        const { thread } = makeThreadWithParent();
        const adapter = makeAdapterSpy({ questionBtn: {}, prayerBtn: {}, copyBtn: {}, checkboxEl: {}, bodyEl: {} });
        const injector = { bindCommentEvents: (el, key) => adapter.calls.push(['bindCommentEvents', key]) };

        applyStudioCommentIntegrations(thread, 'key-1', adapter, injector, { buttonStates: {}, checkboxStates: {} });

        assert.deepEqual(adapter.calls, [
            ['restoreButtonState', 'key-1'],
            ['restoreCheckboxState', 'key-1'],
            ['bindCommentEvents', 'key-1'],
            ['bindStudioSpecificEvents', 'key-1']
        ]);
        assert.equal(thread.dataset.syhStudioEventsBound, 'true');
    });
});
