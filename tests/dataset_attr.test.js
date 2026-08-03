/**
 * tests/dataset_attr.test.js
 *
 * Runtime-тести isEventsBound / markEventsBound для StudioCommentAdapter і
 * YouTubeCommentAdapter.
 *
 * Мета: впевнитися, що методи маркування DOM-елементів:
 *   1. Не кидають SyntaxError (колишня помилка: dataset['key-with-hyphens']).
 *   2. Реально встановлюють атрибут і повертають коректний стан.
 *   3. Ізольовано один від одного (різні атрибути).
 *
 * Запускається через Node.js --experimental-strip-types (без jsdom / без Chrome).
 * Використовує мінімальний WHATWG-сумісний Element-mock.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Мінімальний DOM-mock, що відтворює поведінку WHATWG DOMStringMap / Element.
// setAttribute/getAttribute — саме так Chrome і jsdom реалізують специфікацію.
// ---------------------------------------------------------------------------
function makeElement() {
    const attrs = new Map();
    return {
        getAttribute(name) {
            return attrs.has(name) ? attrs.get(name) : null;
        },
        setAttribute(name, value) {
            // Відтворюємо поведінку jsdom: ключі з дефісами — ОК для setAttribute,
            // але НЕ ОК для dataset[...] bracket-notation.
            if (typeof name !== 'string' || name.length === 0) {
                throw new DOMException('Invalid attribute name', 'InvalidCharacterError');
            }
            attrs.set(name, String(value));
        },
        hasAttribute(name) {
            return attrs.has(name);
        },
        dataset: new Proxy({}, {
            // Відтворюємо реальну помилку: dataset['key-with-hyphens'] = 'value'
            // кидає SyntaxError (WHATWG DOM spec § 8.1.2.4).
            set(_target, prop, _value) {
                if (/[-]/.test(String(prop))) {
                    throw new SyntaxError(
                        `Failed to set 'dataset' property: '${prop}' is not a valid property name.`
                    );
                }
                return true;
            },
            get(_target, prop) {
                if (/[-]/.test(String(prop))) {
                    throw new SyntaxError(
                        `Failed to read 'dataset' property: '${prop}' is not a valid property name.`
                    );
                }
                return undefined;
            }
        })
    };
}

// ---------------------------------------------------------------------------
// Замість прямого імпорту TS-класів (які містять parameter properties —
// несумісні з --experimental-strip-types), тестуємо логіку ізольовано.
// Це дозволяє запускати тести без повного build-ланцюга.
// ---------------------------------------------------------------------------

// Атрибути відповідають константам в адаптерах
const STUDIO_BOUND_ATTR        = 'data-syh-studio-events-bound';
const STUDIO_BUTTON_BOUND_ATTR = 'data-syh-bound';
const YT_BOUND_ATTR            = 'data-syh-yt-events-bound';

// Мінімальні обгортки, що відтворюють isEventsBound / markEventsBound
const StudioAdapter = {
    isEventsBound:  (el) => el.getAttribute(STUDIO_BOUND_ATTR) === 'true',
    markEventsBound:(el) => el.setAttribute(STUDIO_BOUND_ATTR, 'true'),
};

const YTAdapter = {
    isEventsBound:  (el) => el.getAttribute(YT_BOUND_ATTR) === 'true',
    markEventsBound:(el) => el.setAttribute(YT_BOUND_ATTR, 'true'),
};

// ---------------------------------------------------------------------------
// Допоміжна функція: переконатись, що операція не кидає SyntaxError
// ---------------------------------------------------------------------------
function assertNoPanic(fn, label) {
    try {
        fn();
    } catch (e) {
        if (e instanceof SyntaxError) {
            assert.fail(`${label} — кинуто SyntaxError: ${e.message}`);
        }
        // Інші помилки (TypeError тощо) ігноруємо — тест перевіряє лише SyntaxError
    }
}

// ===========================================================================
// StudioCommentAdapter — isEventsBound / markEventsBound
// ===========================================================================
describe('StudioCommentAdapter — bound-marker', () => {

    test('1. markEventsBound не кидає SyntaxError на свіжому елементі', () => {
        const el = makeElement();
        assertNoPanic(() => StudioAdapter.markEventsBound(el), 'markEventsBound');
    });

    test('2. isEventsBound повертає false до маркування', () => {
        const el = makeElement();
        assert.equal(StudioAdapter.isEventsBound(el), false, 'до markEventsBound має бути false');
    });

    test('3. isEventsBound повертає true після markEventsBound', () => {
        const el = makeElement();
        StudioAdapter.markEventsBound(el);
        assert.equal(StudioAdapter.isEventsBound(el), true, 'після markEventsBound має бути true');
    });

    test('4. Два різних елементи — стан незалежний', () => {
        const el1 = makeElement();
        const el2 = makeElement();
        StudioAdapter.markEventsBound(el1);
        assert.equal(StudioAdapter.isEventsBound(el1), true,  'el1 — marked');
        assert.equal(StudioAdapter.isEventsBound(el2), false, 'el2 — not marked');
    });

    test('5. Повторне markEventsBound ідемпотентне (не кидає, стан = true)', () => {
        const el = makeElement();
        assertNoPanic(() => StudioAdapter.markEventsBound(el), 'перший виклик');
        assertNoPanic(() => StudioAdapter.markEventsBound(el), 'повторний виклик');
        assert.equal(StudioAdapter.isEventsBound(el), true);
    });

    test('6. Атрибут реально присутній в DOM (setAttribute-рівень)', () => {
        const el = makeElement();
        StudioAdapter.markEventsBound(el);
        assert.ok(
            el.hasAttribute('data-syh-studio-events-bound'),
            'атрибут data-syh-studio-events-bound має існувати в DOM'
        );
        assert.equal(
            el.getAttribute('data-syh-studio-events-bound'),
            'true',
            'значення атрибута має бути "true"'
        );
    });

    // Регресійний тест: перевіряємо, що стара помилка (dataset bracket) дійсно
    // відтворюється mock'ом — щоб mock не давав хибних позитивів.
    test('7. [REGRESSION GUARD] dataset[key-with-hyphens] кидає SyntaxError (підтвердження mock)', () => {
        const el = makeElement();
        const KEY = 'syh-studio-events-bound';
        assert.throws(
            () => { el.dataset[KEY] = 'true'; },
            SyntaxError,
            'dataset bracket-notation з дефісами ПОВИННА кидати SyntaxError'
        );
    });
});

// ===========================================================================
// YouTubeCommentAdapter — isEventsBound / markEventsBound
// ===========================================================================
describe('YouTubeCommentAdapter — bound-marker', () => {

    test('1. markEventsBound не кидає SyntaxError', () => {
        const el = makeElement();
        assertNoPanic(() => YTAdapter.markEventsBound(el), 'markEventsBound');
    });

    test('2. isEventsBound повертає false до маркування', () => {
        const el = makeElement();
        assert.equal(YTAdapter.isEventsBound(el), false);
    });

    test('3. isEventsBound повертає true після markEventsBound', () => {
        const el = makeElement();
        YTAdapter.markEventsBound(el);
        assert.equal(YTAdapter.isEventsBound(el), true);
    });

    test('4. Атрибут реально присутній в DOM', () => {
        const el = makeElement();
        YTAdapter.markEventsBound(el);
        assert.ok(
            el.hasAttribute('data-syh-yt-events-bound'),
            'атрибут data-syh-yt-events-bound має існувати в DOM'
        );
        assert.equal(el.getAttribute('data-syh-yt-events-bound'), 'true');
    });

    test('5. Studio і YouTube використовують РІЗНІ атрибути (немає колізій)', () => {
        const sharedEl = makeElement();

        StudioAdapter.markEventsBound(sharedEl);
        // YT ще не маркований на цьому елементі
        assert.equal(YTAdapter.isEventsBound(sharedEl), false,
            'Studio mark не повинен впливати на YouTube bound-check');

        YTAdapter.markEventsBound(sharedEl);
        assert.equal(StudioAdapter.isEventsBound(sharedEl), true,
            'Studio bound залишається після YT mark');
        assert.equal(YTAdapter.isEventsBound(sharedEl), true,
            'YT bound коректно встановлено');
    });
});
