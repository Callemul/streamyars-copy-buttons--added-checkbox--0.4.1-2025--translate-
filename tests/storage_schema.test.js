// tests/storage_schema.test.js
//
// Схема сховища (`modules/storage/storage_keys.ts`, T17 — крок 1).
//
// Схема `StorageSchema` існувала й до цієї хвилі, але не використовувалась
// ЖОДНИМ місцем коду: усі читання й записи йшли через `Record<string, any>`.
// Ніхто цього не бачив — і схема тихо розійшлася з реальністю (журнал ручних
// корекцій Studio був описаний як мапа, хоча зберігається масивом).
//
// Тепер схема — дефолтний тип адаптера сховища, тож `tsc` тримає її в тонусі.
// Але дві речі компілятор перевірити не може, і їх перевіряє цей файл:
//
//   1. `StoredOptions` дублює `OptionsState` (виводиться з реєстру опцій).
//      Дублювання свідоме — правило напрямку залежностей забороняє `modules/`
//      імпортувати з `options/`. Тест не дає копії розійтися мовчки.
//   2. Форми значень, які реально лягають у сховище, збігаються зі схемою.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';

import { installChromeMock } from './setup/chrome_mock.ts';

let store = {};

installChromeMock({
    runtimeImpl: { id: 'test-id' },
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const res = {};
            for (const k of list) if (k in store) res[k] = store[k];
            if (cb) cb(res);
        },
        set: (items, cb) => { Object.assign(store, items); if (cb) cb(); },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete store[k];
            if (cb) cb();
        }
    }
});

const { STORAGE_KEYS, STORAGE_SCHEMA_VERSION, getSheetStorageKey, getSheetCollectedStorageKey, POPUP_SHEET_KEYS } = await import('../modules/storage/storage.ts');
const { EXPANDED_TABS_KEY } = await import('../modules/streamyard/right_tabs/right_tabs_storage.ts');
const { OPTION_FIELDS } = await import('../options/option_fields.ts');

/** Імена полів інтерфейсу з вихідного коду (типи стираються — рантайм їх не бачить). */
function readInterfaceFields(filePath, interfaceName) {
    const source = readFileSync(filePath, 'utf8');
    const match = source.match(new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(match, `у ${filePath} має бути інтерфейс ${interfaceName}`);

    return [...match[1].matchAll(/^\s{4}(\w+)\??:/gm)].map(m => m[1]);
}

describe('storage_schema — StoredOptions не розходиться з реєстром опцій', () => {
    // «Позаформні» поля: зберігаються в тому ж ключі, але елемента у формі не
    // мають, тому в реєстрі опцій їх немає і бути не повинно. Список явний —
    // нове таке поле має бути свідомим рішенням, а не непоміченим додаванням.
    const NON_FORM_FIELDS = ['customChannels'];

    test('усі поля форми присутні в StoredOptions', () => {
        const stored = readInterfaceFields('modules/storage/storage_keys.ts', 'StoredOptions');
        const registry = OPTION_FIELDS.map(f => f.key);

        const missing = registry.filter(key => !stored.includes(key));

        assert.deepEqual(
            missing,
            [],
            'StoredOptions розійшовся з реєстром опцій: додайте поле в обидва місця ' +
            '(імпортувати options/ з modules/ не можна — ARCHITECTURE §2)'
        );
    });

    test('усе, що є в StoredOptions понад форму, перелічене явно', () => {
        const stored = readInterfaceFields('modules/storage/storage_keys.ts', 'StoredOptions');
        const registry = new Set(OPTION_FIELDS.map(f => f.key));

        const extras = stored.filter(key => !registry.has(key));

        assert.deepEqual(
            [...extras].sort(),
            [...NON_FORM_FIELDS].sort(),
            'у StoredOptions з\'явилось поле поза формою — або додайте йому елемент ' +
            'і рядок у реєстрі опцій, або внесіть у список позаформних тут'
        );
    });

    test('перевірка справді читає інтерфейс, а не проходить вхолосту', () => {
        const stored = readInterfaceFields('modules/storage/storage_keys.ts', 'StoredOptions');

        assert.ok(stored.length >= 10, `очікувалось щонайменше 10 полів, знайдено ${stored.length}`);
        assert.ok(stored.includes('ui_locale'));
    });
});

describe('storage_schema — реальні форми значень збігаються зі схемою', () => {
    test('журнал ручних корекцій Studio зберігається МАСИВОМ, а не мапою', async () => {
        store = {};
        const { SYH_STORAGE } = await import('../modules/storage/storage.ts');

        await SYH_STORAGE.setAsync({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [] });
        const result = await SYH_STORAGE.getAsync([STORAGE_KEYS.STUDIO_OVERRIDE_LOG]);

        assert.ok(
            Array.isArray(result[STORAGE_KEYS.STUDIO_OVERRIDE_LOG]),
            'схема описувала цей ключ як Record — саме тому її й довелось виправити'
        );
    });

    test('стани кнопок і чекбоксів переживають цикл запис → читання', async () => {
        store = {};
        const { SYH_STORAGE } = await import('../modules/storage/storage.ts');

        await SYH_STORAGE.setAsync({
            [STORAGE_KEYS.YT_BUTTON_STATES]: { 'comment-1': 'prayer' },
            [STORAGE_KEYS.YT_CHECKBOX_STATE]: { 'comment-1': { checked: true, timestamp: 1 } },
            [STORAGE_KEYS.STUDIO_BUTTON_STATE]: { 'comment-2': 'question' },
            [STORAGE_KEYS.STUDIO_CHECKBOX_STATE]: { 'comment-2': { checked: false, timestamp: 2 } }
        });

        const result = await SYH_STORAGE.getAsync([
            STORAGE_KEYS.YT_BUTTON_STATES,
            STORAGE_KEYS.YT_CHECKBOX_STATE,
            STORAGE_KEYS.STUDIO_BUTTON_STATE,
            STORAGE_KEYS.STUDIO_CHECKBOX_STATE
        ]);

        assert.equal(result[STORAGE_KEYS.YT_BUTTON_STATES]['comment-1'], 'prayer');
        assert.deepEqual(result[STORAGE_KEYS.YT_CHECKBOX_STATE]['comment-1'], { checked: true, timestamp: 1 });
        assert.equal(result[STORAGE_KEYS.STUDIO_BUTTON_STATE]['comment-2'], 'question');
        assert.deepEqual(result[STORAGE_KEYS.STUDIO_CHECKBOX_STATE]['comment-2'], { checked: false, timestamp: 2 });
    });

    test('динамічні ключі аркушів і далі читаються (catch-all у схемі потрібен)', async () => {
        store = {};
        const { SYH_STORAGE } = await import('../modules/storage/storage.ts');

        await SYH_STORAGE.setAsync({
            'syh:popup:sheet:vp_ss:oldList': 'текст',
            'tg_oldList__vp_ss': 'текст',
            'syh:popup:collected:vp_ss': []
        });

        const result = await SYH_STORAGE.getAsync([
            'syh:popup:sheet:vp_ss:oldList',
            'tg_oldList__vp_ss',
            'syh:popup:collected:vp_ss'
        ]);

        assert.equal(result['syh:popup:sheet:vp_ss:oldList'], 'текст');
        assert.equal(result['tg_oldList__vp_ss'], 'текст');
        assert.deepEqual(result['syh:popup:collected:vp_ss'], []);
    });

    test('версія схеми не змінювалась цією хвилею (міграцій не чіпали)', () => {
        assert.equal(STORAGE_SCHEMA_VERSION, 2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// T17, крок 2: схема закрита — `[key: string]: any` прибрано, динамічні родини
// ключів описані шаблонними літеральними типами.
//
// Самі типи стираються, тому рантайм їх не бачить. Але рантайм може перевірити
// те, від чого вони залежать: що будівники ключів справді дають ті форми, які
// описані в типах. Розійдуться — і схема почне мовчки пропускати не те.
// ─────────────────────────────────────────────────────────────────────────────

describe('storage_schema — будівники ключів дають форми, описані в типах', () => {
    const SID = 'vp_ss';

    test('ключ стану аркуша: syh:popup:sheet:<sheetId>:<field>', () => {
        assert.equal(getSheetStorageKey(SID, 'oldList'), `syh:popup:sheet:${SID}:oldList`);
        assert.equal(POPUP_SHEET_KEYS.oldList(SID), `syh:popup:sheet:${SID}:oldList`);
        assert.match(POPUP_SHEET_KEYS.statsHtml(SID), /^syh:popup:sheet:[^:]+:[^:]+$/);
    });

    test('ключ зібраних коментарів: syh:popup:collected:<sheetId>', () => {
        assert.equal(getSheetCollectedStorageKey(SID), `syh:popup:collected:${SID}`);
    });

    test('ключ роздільника: syh:popup:divider_pos:<sheetId>', () => {
        assert.equal(POPUP_SHEET_KEYS.dividerPos(SID), `syh:popup:divider_pos:${SID}`);
    });

    test('усі будівники POPUP_SHEET_KEYS дають ключ однієї з описаних родин', () => {
        const PATTERNS = [
            /^syh:popup:sheet:[^:]+:[^:]+$/,
            /^syh:popup:collected:[^:]+$/,
            /^syh:popup:divider_pos:[^:]+$/
        ];

        const offenders = Object.entries(POPUP_SHEET_KEYS)
            .map(([name, build]) => [name, build(SID)])
            .filter(([, key]) => !PATTERNS.some(p => p.test(key)));

        assert.deepEqual(
            offenders,
            [],
            'ці ключі не належать жодній описаній родині — схема їх не пропустить'
        );
    });
});

describe('storage_schema — ключ згорнутих/розгорнутих вкладок не змінив імені', () => {
    // Ключ переїхав у STORAGE_KEYS з літерала в `right_tabs_storage.ts`.
    // Переїзд мав бути суто організаційним: інше ім'я = осиротілі дані
    // користувача (docs/rules/storage.md).
    test('EXPANDED_TABS_KEY і далі вказує на історичне ім\'я', () => {
        assert.equal(EXPANDED_TABS_KEY, 'syh:streamyard:expanded_tabs');
        assert.equal(STORAGE_KEYS.EXPANDED_TABS, 'syh:streamyard:expanded_tabs');
        assert.equal(EXPANDED_TABS_KEY, STORAGE_KEYS.EXPANDED_TABS);
    });

    test('значення переживає цикл запис → читання під тим самим ключем', async () => {
        store = {};
        const { SYH_STORAGE } = await import('../modules/storage/storage.ts');

        await SYH_STORAGE.setAsync({ [STORAGE_KEYS.EXPANDED_TABS]: ['tab-1', 'tab-2'] });

        assert.deepEqual(store['syh:streamyard:expanded_tabs'], ['tab-1', 'tab-2']);
        const result = await SYH_STORAGE.getAsync([EXPANDED_TABS_KEY]);
        assert.deepEqual(result[EXPANDED_TABS_KEY], ['tab-1', 'tab-2']);
    });
});

describe('storage_schema — catch-all не повертається', () => {
    // Один рядок `[key: string]: any` знімає перевірку з УСЬОГО сховища.
    // Спокуса додати його заради одного нового ключа виникатиме знову.
    test('у StorageSchema немає індексу [key: string]', () => {
        const source = readFileSync('modules/storage/storage_keys.ts', 'utf8');
        const schema = source.match(/export interface StorageSchema \{([\s\S]*?)\n\}/);

        assert.ok(schema, 'інтерфейс StorageSchema має існувати');

        // Коментарі всередині тіла самі згадують колишній catch-all — прибираємо,
        // інакше тест ловив би власне пояснення.
        const declarations = schema[1]
            .split('\n')
            .filter(line => !line.trim().startsWith('//'))
            .join('\n');

        assert.doesNotMatch(
            declarations,
            /\[key: string\]/,
            'catch-all повернувся у схему — нову родину ключів описують шаблонним типом, ' +
            'а не відкриттям схеми для будь-якого рядка'
        );
    });

    test('перевірка справді читає тіло інтерфейсу', () => {
        const source = readFileSync('modules/storage/storage_keys.ts', 'utf8');
        const schema = source.match(/export interface StorageSchema \{([\s\S]*?)\n\}/);

        assert.match(schema[1], /SheetStateKey/, 'у схемі мають бути шаблонні родини ключів');
        assert.match(schema[1], /LegacyTgKey/, 'легасі-родина tg_* має лишатись описаною');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Тріскачка T17: `Record<string, any>` у продакшн-коді більше немає.
//
// Критерій приймання задачі — «кількість зменшується монотонно». Тепер вона
// нульова, і єдиний спосіб утримати її такою — не дати з'явитись новому
// випадку непомітно. Заміна майже завжди одна: НАЗВАТИ тип. За хвилю T17
// саме безіменні мішки й ховали три неправди про форму збережених даних.
// ─────────────────────────────────────────────────────────────────────────────

/** Каталоги продакшн-коду. `tests/` не рахуємо: там моки й стаби. */
const PRODUCTION_DIRS = ['modules', 'popup', 'options', 'youtube', 'background'];

/**
 * Свідомі винятки, якщо колись знадобляться: файл → коротке «чому».
 * Порожній список — навмисно.
 */
const ALLOWED = {};

function collectTsFiles(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        // Шлях збираємо через `/` навмисно: на Windows `join` дав би `modules\file.ts`,
        // і тоді ні `ALLOWED`, ні перевірка «ходить по файлах» не збіглися б із ключами.
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) collectTsFiles(full, acc);
        else if (entry.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

describe('T17 — Record<string, any> не повертається у продакшн-код', () => {
    /**
     * Рядки з ТИПОМ, а не зі згадкою в коментарі.
     *
     * Коментарі відсіюються обидва: і `//`, і блокові `/* … *\/` — саме в
     * блокових пояснюється, чому той чи інший мішок отримав ім'я, і без цього
     * перевірка ловила б власні пояснення.
     */
    function findUntypedBags() {
        const found = [];

        for (const dir of PRODUCTION_DIRS) {
            for (const file of collectTsFiles(dir)) {
                if (file in ALLOWED) continue;

                let inBlockComment = false;

                readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                    let code = line;

                    if (inBlockComment) {
                        const end = code.indexOf('*/');
                        if (end === -1) return;
                        code = code.slice(end + 2);
                        inBlockComment = false;
                    }

                    const start = code.indexOf('/*');
                    if (start !== -1) {
                        const end = code.indexOf('*/', start + 2);
                        if (end === -1) {
                            inBlockComment = true;
                            code = code.slice(0, start);
                        } else {
                            code = code.slice(0, start) + code.slice(end + 2);
                        }
                    }

                    code = code.split('//')[0];

                    if (code.includes('Record<string, any>')) {
                        found.push(`${file}:${i + 1}`);
                    }
                });
            }
        }

        return found;
    }

    test('жодного випадку не лишилось', () => {
        assert.deepEqual(
            findUntypedBags(),
            [],
            'з\'явився новий Record<string, any>. Майже завжди правильна заміна — ' +
            'НАЗВАТИ тип: StorageReadResult / StorageWriteItems / StorageRawResult ' +
            'для сховища, або власний іменований тип для доменного об\'єкта. ' +
            'Якщо випадок справді виправданий — внесіть його в ALLOWED із поясненням.'
        );
    });

    test('перевірка справді ходить по файлах (не проходить вхолосту)', () => {
        const files = PRODUCTION_DIRS.flatMap(dir => collectTsFiles(dir));

        assert.ok(files.length > 200, `очікувались сотні файлів, знайдено ${files.length}`);
        assert.ok(files.includes('modules/storage/storage_keys.ts'));
    });
});
