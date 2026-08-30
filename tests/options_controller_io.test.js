// Характеризаційні тести для `OptionsController` (`options/options.ts`) —
// найвищий refactoring target у звіті Fallow 3.14 (`priority 32.1`,
// hotspot score 33.7 — 16 комітів, «accelerating trend», 208 LOC, fan-out 7).
//
// `tests/options_settings.test.js` уже покриває save/load та журнал Studio.
// Цей набір закриває решту публічної поведінки сторінки, яка досі не мала
// жодного тесту і тому не давала безпечно ділити контролер:
//   - навігація між секціями (`.nav-item` ↔ `.content-section`);
//   - експорт конфігурації у файл;
//   - імпорт конфігурації з файлу (успіх / невалідний формат / битий JSON);
//   - скидання до значень за замовчуванням (з підтвердженням і без);
//   - копіювання та очищення журналу YouTube Studio;
//   - життєвий цикл тоста (текст, клас `show`, автозникнення, перезапуск таймера).
//
// Тестуємо ЧОРНОЮ СКРИНЬКОЮ через реальну точку входу: `DOMContentLoaded`
// створює контролер, далі — кліки по кнопках. Тому поділ контролера на
// модулі не ламає ці тести.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { DEFAULT_OPTIONS } = await import('../options/defaults.ts');

// Імпорт реєструє слухач DOMContentLoaded — саме він створює контролер.
await import('../options/options.ts');

const PAGE_HTML = `
    <nav>
        <button class="nav-item active" data-target="secGeneral">Загальні</button>
        <button class="nav-item" data-target="secStudio">Studio</button>
        <button class="nav-item" data-target="secMissing">Немає секції</button>
        <button class="nav-item">Без data-target</button>
    </nav>
    <section id="secGeneral" class="content-section active"></section>
    <section id="secStudio" class="content-section"></section>

    <button id="saveTopBtn">Save</button>
    <button id="exportConfigBtn">Export</button>
    <input id="importConfigFile" type="file">
    <button id="resetDefaultsBtn">Reset</button>
    <button id="copyStudioLogBtn">Copy log</button>
    <button id="clearStudioLogBtn">Clear log</button>
    <div id="toastNotification"></div>

    <input id="optSschoolName" type="text">
    <input id="optPreachName" type="text">
    <select id="optLanguage"><option value="auto">auto</option><option value="uk">uk</option></select>
    <input id="optAntiAfkEnabled" type="checkbox">
    <input id="optAntiAfkInterval" type="text">
    <input id="optAutoHealEnabled" type="checkbox">
    <input id="optTruncationLength" type="text">
    <input id="optShowCopyButtons" type="checkbox">
    <input id="optCompactSecondaryTabs" type="checkbox">
    <input id="optYouTubeEnabled" type="checkbox">
    <input id="optStudioEnabled" type="checkbox">
    <table><tbody id="studioLogBody"></tbody></table>
`;

/** @type {Record<string, any>} */
let store = {};
/** @type {string[]} */
let alerts = [];
/** @type {string[]} */
let confirms = [];
let confirmAnswer = true;
/** @type {string[]} */
let clipboardWrites = [];
let clipboardShouldFail = false;
/** @type {Array<{ download: string, blobSize: number }>} */
let downloads = [];
/** @type {string[]} */
let revokedUrls = [];

function installStore(seed = {}) {
    store = { ...seed };
    globalThis.chrome = {
        runtime: { id: 'test-extension-id', lastError: null },
        storage: {
            local: {
                get(keys, cb) {
                    const list = Array.isArray(keys) ? keys : (keys == null ? Object.keys(store) : [keys]);
                    const out = {};
                    for (const k of list) if (k in store) out[k] = store[k];
                    if (cb) cb(out);
                },
                set(items, cb) {
                    Object.assign(store, items);
                    if (cb) cb();
                },
                remove(keys, cb) {
                    const list = Array.isArray(keys) ? keys : [keys];
                    for (const k of list) delete store[k];
                    if (cb) cb();
                }
            },
            onChanged: { addListener() {}, removeListener() {} }
        }
    };
}

/** Піднімає сторінку налаштувань так само, як це робить браузер. */
function bootOptionsPage(html = PAGE_HTML) {
    document.body.innerHTML = html;
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

const $id = (id) => document.getElementById(id);
const clickById = (id) => $id(id).click();

/** Проганяє мікрозадачі, щоб дочекатись async-колбеків контролера. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('options — інфраструктура сторінки (характеризація)', () => {
    beforeEach(() => {
        installStore();
        alerts = [];
        confirms = [];
        confirmAnswer = true;
        clipboardWrites = [];
        clipboardShouldFail = false;
        downloads = [];
        revokedUrls = [];

        globalThis.alert = (msg) => { alerts.push(String(msg)); };
        globalThis.confirm = (msg) => { confirms.push(String(msg)); return confirmAnswer; };

        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: {
                writeText: async (text) => {
                    if (clipboardShouldFail) throw new Error('clipboard denied');
                    clipboardWrites.push(text);
                }
            },
            configurable: true,
            writable: true
        });

        globalThis.URL.createObjectURL = (blob) => {
            downloads.push({ download: '', blobSize: blob.size });
            return 'blob:mock-url';
        };
        globalThis.URL.revokeObjectURL = (url) => { revokedUrls.push(url); };
    });

    afterEach(() => {
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    describe('навігація секціями', () => {
        test('1. клік по пункту меню переносить клас active на пункт і його секцію', () => {
            bootOptionsPage();

            $id('secStudio').classList.remove('active');
            document.querySelector('.nav-item[data-target="secStudio"]').click();

            assert.equal(document.querySelector('.nav-item[data-target="secStudio"]').classList.contains('active'), true);
            assert.equal(document.querySelector('.nav-item[data-target="secGeneral"]').classList.contains('active'), false);
            assert.equal($id('secStudio').classList.contains('active'), true);
            assert.equal($id('secGeneral').classList.contains('active'), false);
        });

        test('2. активним лишається рівно один пункт меню', () => {
            bootOptionsPage();

            document.querySelector('.nav-item[data-target="secStudio"]').click();
            document.querySelector('.nav-item[data-target="secGeneral"]').click();

            assert.equal(document.querySelectorAll('.nav-item.active').length, 1);
            assert.equal(document.querySelectorAll('.content-section.active').length, 1);
        });

        test('3. КВІРК: пункт із неіснуючою секцією підсвічується, але жодна секція не активна', () => {
            bootOptionsPage();

            document.querySelector('.nav-item[data-target="secMissing"]').click();

            assert.equal(document.querySelector('.nav-item[data-target="secMissing"]').classList.contains('active'), true);
            assert.equal(document.querySelectorAll('.content-section.active').length, 0);
        });

        test('4. пункт без data-target лише знімає підсвічування з решти', () => {
            bootOptionsPage();

            const plain = Array.from(document.querySelectorAll('.nav-item')).find(n => !n.hasAttribute('data-target'));
            plain.click();

            assert.equal(plain.classList.contains('active'), true);
            assert.equal(document.querySelectorAll('.content-section.active').length, 0);
        });
    });

    describe('експорт конфігурації', () => {
        test('5. експорт формує JSON-Blob і показує тост', () => {
            mock.timers.enable({ apis: ['setTimeout'] });
            try {
                installStore({
                    [STORAGE_KEYS.DB]: { newTitleSS: 'СШ' },
                    [STORAGE_KEYS.OPTIONS]: { ui_locale: 'uk' },
                    [STORAGE_KEYS.VERSION]: '9.9.9'
                });
                bootOptionsPage();

                clickById('exportConfigBtn');

                assert.equal(downloads.length, 1);
                assert.ok(downloads[0].blobSize > 0);
                assert.deepEqual(revokedUrls, [], 'URL не повинен відкликатися синхронно');
                mock.timers.tick(1000);
                assert.deepEqual(revokedUrls, ['blob:mock-url']);
                assert.equal($id('toastNotification').textContent, '📥 Налаштування та стан успішно експортовано');
            } finally {
                mock.timers.reset();
            }
        });

        test('6. ім\'я файлу містить дату у форматі YYYY-MM-DD', () => {
            bootOptionsPage();

            let capturedDownload = null;
            const origCreate = document.createElement.bind(document);
            mock.method(document, 'createElement', (tag) => {
                const el = origCreate(tag);
                if (tag === 'a') {
                    el.click = () => { capturedDownload = el.download; };
                }
                return el;
            });

            clickById('exportConfigBtn');

            assert.match(capturedDownload, /^streamyard_helper_config_\d{4}-\d{2}-\d{2}\.json$/);
        });

        test('7. експортований JSON має службові поля та копії ключів storage', () => {
            installStore({
                [STORAGE_KEYS.DB]: { newTitleSS: 'СШ' },
                [STORAGE_KEYS.CATEGORIES]: ['a', 'b']
            });
            bootOptionsPage();

            let payload = null;
            globalThis.URL.createObjectURL = () => 'blob:mock-url';
            const origBlob = globalThis.Blob;
            globalThis.Blob = class extends origBlob {
                constructor(parts, opts) {
                    super(parts, opts);
                    payload = JSON.parse(parts[0]);
                }
            };

            try {
                clickById('exportConfigBtn');
            } finally {
                globalThis.Blob = origBlob;
            }

            assert.equal(payload.app, 'StreamYard Helper');
            assert.ok(typeof payload.timestamp === 'string');
            assert.equal(payload.version, '1.0.0', 'без збереженої версії підставляється 1.0.0');
            assert.deepEqual(payload.db, { newTitleSS: 'СШ' });
            assert.deepEqual(payload.syh_options, DEFAULT_OPTIONS, 'без збережених опцій експортуються дефолти');
            assert.deepEqual(payload[STORAGE_KEYS.CATEGORIES], ['a', 'b']);
        });
    });

    describe('імпорт конфігурації', () => {
        /** Підміняє FileReader, щоб не залежати від реального читання File. */
        function stubFileReader(text) {
            const OrigFileReader = globalThis.FileReader;
            globalThis.FileReader = class {
                readAsText() {
                    queueMicrotask(() => {
                        if (typeof this.onload === 'function') {
                            this.onload({ target: { result: text } });
                        }
                    });
                }
            };
            return () => { globalThis.FileReader = OrigFileReader; };
        }

        /** Емулює вибір файлу користувачем. */
        function fireImport() {
            const input = $id('importConfigFile');
            Object.defineProperty(input, 'files', {
                value: [{ name: 'config.json' }],
                configurable: true
            });
            input.dispatchEvent(new Event('change'));
        }

        test('8. валідний файл записується у storage і показує тост', async () => {
            bootOptionsPage();
            const restore = stubFileReader(JSON.stringify({
                db: { newTitleSS: 'З файлу' },
                syh_options: { ui_locale: 'ru' }
            }));

            try {
                fireImport();
                await flush();
            } finally {
                restore();
            }

            assert.deepEqual(store[STORAGE_KEYS.DB], { newTitleSS: 'З файлу' });
            assert.deepEqual(store[STORAGE_KEYS.OPTIONS], { ui_locale: 'ru' });
            assert.equal($id('toastNotification').textContent, '📤 Налаштування та стан успішно імпортовано!');
            assert.deepEqual(alerts, []);
        });

        test('9. після імпорту форма перечитується зі storage', async () => {
            bootOptionsPage();
            const restore = stubFileReader(JSON.stringify({
                db: { newTitleSS: 'Нове ім\'я', newTitlePreach: 'Нова проповідь' }
            }));

            try {
                fireImport();
                await flush();
            } finally {
                restore();
            }

            assert.equal($id('optSschoolName').value, 'Нове ім\'я');
            assert.equal($id('optPreachName').value, 'Нова проповідь');
        });

        test('10. невалідна структура → alert, storage не змінюється', async () => {
            bootOptionsPage();
            const restore = stubFileReader(JSON.stringify({ somethingElse: 1 }));

            try {
                fireImport();
                await flush();
            } finally {
                restore();
            }

            assert.deepEqual(alerts, ['Некоректний формат файлу конфігурації.']);
            assert.equal(STORAGE_KEYS.DB in store, false);
        });

        test('11. битий JSON → alert про помилку зчитування', async () => {
            bootOptionsPage();
            const restore = stubFileReader('{ це не json');

            try {
                fireImport();
                await flush();
            } finally {
                restore();
            }

            assert.deepEqual(alerts, ['Помилка при зчитуванні JSON файлу.']);
        });

        test('12. порожній вибір файлу нічого не робить', () => {
            bootOptionsPage();

            const input = $id('importConfigFile');
            Object.defineProperty(input, 'files', { value: [], configurable: true });

            assert.doesNotThrow(() => input.dispatchEvent(new Event('change')));
            assert.deepEqual(alerts, []);
        });
    });

    describe('скидання до значень за замовчуванням', () => {
        test('13. підтверджене скидання пише дефолти у db та опції', () => {
            installStore({ [STORAGE_KEYS.DB]: { newTitleSS: 'старе', extra: 'зникне' } });
            bootOptionsPage();
            confirmAnswer = true;

            clickById('resetDefaultsBtn');

            assert.equal(confirms.length, 1);
            assert.deepEqual(store[STORAGE_KEYS.DB], {
                newTitleSS: DEFAULT_OPTIONS.newTitleSS,
                newTitlePreach: DEFAULT_OPTIONS.newTitlePreach
            });
            assert.deepEqual(store[STORAGE_KEYS.OPTIONS], DEFAULT_OPTIONS);
            assert.equal($id('toastNotification').textContent, '⚠️ Налаштування скинуто до початкових!');
        });

        test('14. відмова у діалозі лишає storage недоторканим', () => {
            installStore({ [STORAGE_KEYS.DB]: { newTitleSS: 'зберігається' } });
            bootOptionsPage();
            confirmAnswer = false;

            clickById('resetDefaultsBtn');

            assert.deepEqual(store[STORAGE_KEYS.DB], { newTitleSS: 'зберігається' });
            assert.equal(STORAGE_KEYS.OPTIONS in store, false);
        });
    });

    describe('журнал YouTube Studio: копіювання та очищення', () => {
        const LOG_ENTRY = {
            timestamp: 0,
            channelLabel: 'Канал A',
            videoTitle: 'Відео A',
            autoDetectedSheet: 'Авто A',
            assignedSheet: 'Ручний A'
        };

        test('15. копіювання порожнього журналу показує інформаційний тост', async () => {
            bootOptionsPage();

            clickById('copyStudioLogBtn');
            await flush();

            assert.equal($id('toastNotification').textContent, 'ℹ️ Лог порожній, нічого копіювати');
            assert.deepEqual(clipboardWrites, []);
        });

        test('16. копіювання непорожнього журналу кладе текстовий звіт у буфер', async () => {
            installStore({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [LOG_ENTRY] });
            bootOptionsPage();

            clickById('copyStudioLogBtn');
            await flush();

            assert.equal(clipboardWrites.length, 1);
            assert.match(clipboardWrites[0], /YouTube Studio Manual Override Log \(1 записів\)/);
            assert.match(clipboardWrites[0], /Канал: Канал A/);
            assert.equal($id('toastNotification').textContent, '📋 Лог корекцій YouTube Studio скопійовано!');
        });

        test('17. збій буфера обміну веде до alert замість тоста', async () => {
            installStore({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [LOG_ENTRY] });
            bootOptionsPage();
            clipboardShouldFail = true;
            // happy-dom не реалізує execCommand — додаємо його як провальний фолбек.
            Object.defineProperty(document, 'execCommand', {
                value: () => false,
                configurable: true,
                writable: true
            });

            clickById('copyStudioLogBtn');
            await flush();

            assert.deepEqual(alerts, ['Не вдалося скопіювати лог в буфер обміну']);
        });

        test('18. підтверджене очищення журналу пише порожній масив і перемальовує таблицю', () => {
            installStore({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [LOG_ENTRY] });
            bootOptionsPage();
            confirmAnswer = true;

            clickById('clearStudioLogBtn');

            assert.deepEqual(store[STORAGE_KEYS.STUDIO_OVERRIDE_LOG], []);
            assert.match($id('studioLogBody').innerHTML, /Записи у лозі відсутні/);
            assert.equal($id('toastNotification').textContent, '🗑 Лог Studio успішно очищено');
        });

        test('19. відмова від очищення лишає журнал на місці', () => {
            installStore({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [LOG_ENTRY] });
            bootOptionsPage();
            confirmAnswer = false;

            clickById('clearStudioLogBtn');

            assert.deepEqual(store[STORAGE_KEYS.STUDIO_OVERRIDE_LOG], [LOG_ENTRY]);
        });
    });

    describe('тост', () => {
        test('20. тост зникає через 3 секунди', () => {
            mock.timers.enable({ apis: ['setTimeout'] });
            try {
                bootOptionsPage();
                clickById('saveTopBtn');

                const toast = $id('toastNotification');
                assert.equal(toast.classList.contains('show'), true);

                mock.timers.tick(3000);
                assert.equal(toast.classList.contains('show'), false);
            } finally {
                mock.timers.reset();
            }
        });

        test('21. повторний тост перезапускає таймер приховування', () => {
            mock.timers.enable({ apis: ['setTimeout'] });
            try {
                bootOptionsPage();
                const toast = $id('toastNotification');

                clickById('saveTopBtn');
                mock.timers.tick(2000);
                clickById('saveTopBtn');
                mock.timers.tick(2000);

                assert.equal(toast.classList.contains('show'), true, 'таймер мав перезапуститись');

                mock.timers.tick(1000);
                assert.equal(toast.classList.contains('show'), false);
            } finally {
                mock.timers.reset();
            }
        });

        test('22. відсутній у DOM тост не ламає збереження', () => {
            bootOptionsPage(PAGE_HTML.replace('<div id="toastNotification"></div>', ''));

            assert.doesNotThrow(() => clickById('saveTopBtn'));
            assert.ok(STORAGE_KEYS.OPTIONS in store);
        });
    });

    describe('стійкість розмітки', () => {
        test('23. сторінка без жодної з кнопок піднімається без винятку', () => {
            assert.doesNotThrow(() => bootOptionsPage('<div></div>'));
        });

        test('24. відсутній #studioLogBody не ламає завантаження журналу', () => {
            installStore({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [{ videoTitle: 'x', assignedSheet: 'y' }] });

            assert.doesNotThrow(() => bootOptionsPage(PAGE_HTML.replace('<tbody id="studioLogBody"></tbody>', '')));
        });
    });
});
