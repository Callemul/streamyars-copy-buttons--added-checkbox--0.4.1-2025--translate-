# [2026-08-10] — KILO — Аудит: латентний баг «лічильник журналу зникає після відновлення popup»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> Конкретно — під час розбиття `popup/popup_sheet_state_restorer.ts` (функція
> `restoreSheetLog`, cyclomatic 10 / cognitive 16 — **єдина продакшн-знахідка
> складності** у `fallow health --max-crap 30`, звіт Fallow 3.14.0).
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.

---

## 1. Що саме зламано

Кількість записів у журналах аркуша (`🗑 Видалені` та `🧹 Очищені`) виводиться
**лише за умови `count > 0`**. Нуль і `NaN` не пишуть нічого, тож у DOM лишається
той текст, що був там до відновлення (для щойно відрендереного шаблону — порожній
рядок).

Реальний контракт (після рефакторингу — `popup/popup_sheet_log_restorer.ts`):

```ts
// applyLogCount()
function applyLogCount(targetCountId: string, sheetId: string, count: number): void {
    if (count > 0) {                                   // ← 0 і NaN мовчки ігноруються
        setTextContent(`${targetCountId}${sheetId}`, `(${count})`);
    }
}

// resolveLogCount(): збережене значення МАЄ ПРІОРИТЕТ над підрахунком із DOM
function resolveLogCount(sheetId, html, rawCount, countFromDom): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);                       // ← 0 сюди теж потрапляє
    }
    return countFromDom(sheetId, html);                // ← фолбек не спрацює
}
```

А ось як цей контракт викликають на запису стану
(`popup/popup_telegram.ts` → `modules/telegram_parser.ts`):

```ts
// modules/telegram_parser.ts — параметри лічильників мають ДЕФОЛТ 0
export function collectTelegramSheetStateFromDOM(
    sheetId: string,
    deletedLogCount: number = 0,        // ← дефолт 0
    cleanedLogCount: number = 0,        // ← дефолт 0
    getElementByIdFn = ...
): TelegramSheetDOMState {
    return {
        deletedLogHtml: deletedLogDiv?.innerHTML || '',   // ← реальні рядки .del-row
        deletedLogCount,                                   // ← але 0
        deletedLogDetailsVisible: true,
        ...
    };
}

// popup/popup_telegram.ts:507 — публічний Storage Writer
export function saveTelegramSheetState(sheetId: string, stateData?: TelegramSheetDOMState): void {
    const state = stateData || collectTelegramSheetStateFromDOM(sheetId);  // ← БЕЗ лічильників
    SheetStateService.saveSheetState(sheetId, state);
}
```

**Розбіжність контракту:** `deletedLogHtml` збирається з живого DOM (правдиві дані),
а `deletedLogCount` у цій же структурі — синтетичний `0`. Обидва поля пишуться в
storage як «узгоджений» знімок стану, хоча узгодженими вони не є.

Другий, окремий прояв тієї ж умови: живий рендер і відновлення розходяться на
порожньому журналі.

```ts
// popup/popup_telegram.ts:450 — живий рендер порожнього журналу
setTextContent(`deletedLogCount__${sheetId}`, '(0)');   // показує "(0)"
// відновлення того самого стану → count === 0 → не пише НІЧОГО → показує ""
```

**Помилок `tsc` немає** — типи узгоджені (`deletedLogCount: number`), баг суто
семантичний: тип не розрізняє «нуль записів» і «лічильник не порахували».

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### Трасування сценарію A — «зниклий лічильник» (потенційний, через публічний API)

1. Виклик `saveTelegramSheetState('vp_ss')` **без** другого аргументу.
2. → `collectTelegramSheetStateFromDOM('vp_ss')` — `deletedLogCount` бере дефолт `0`.
3. → у DOM у цей момент 12 рядків `.del-row`; `deletedLogHtml` зберігає всі 12.
4. → `SheetStateService.saveSheetState` пише в storage:
   `…:deletedLogHtml` = «12 рядків», `…:deletedLogCount` = `0`,
   `…:deletedLogDetailsVisible` = `true`.
5. Користувач закриває і відкриває popup.
6. → `popup_init.ts` → `restoreSingleSheetState('vp_ss', result)`.
7. → `restoreSheetDeletedLog` → `isVisible === true` → гілка `restoreVisibleLog`.
8. → `html` істинний → `setElementText('deletedLog__vp_ss', …)` — **12 рядків на екрані**.
9. → `rawCount === 0`, тобто `!== undefined && !== null` → `resolveLogCount` повертає `0`
   і **не доходить** до `countFromDom`, який порахував би правильні 12.
10. → `applyLogCount`: `0 > 0` — хибно → `setTextContent` не викликається.
11. **Результат:** розгорнутий журнал з 12 видимими рядками і **порожнім** заголовком
    `🗑 ( )` замість `🗑 (12)`.

> **Чому «латентний», а не «активний»:** сьогодні єдиний виклик
> `saveTelegramSheetState` (`popup/popup_telegram.ts:569`) передає `stateData`
> з правильними лічильниками, тож гілка з дефолтом `0` недосяжна. Це **міна**:
> перший же новий виклик `saveTelegramSheetState(sheetId)` (напр. автозбереження
> при перемиканні аркуша) вмикає баг мовчки, без падіння тестів і без помилки `tsc`.

### Трасування сценарію B — «(0) перетворюється на порожньо» (відтворюється вже зараз)

1. Аркуш оброблено, видалень немає → `renderTelegramDeletedLog` показує
   `Видалень немає` і пише лічильник `(0)`.
2. Стан зберігається: `deletedLogHtml` = «Видалень немає», `deletedLogCount` = `0`,
   `deletedLogDetailsVisible` = `true`.
3. Перевідкриття popup → `restoreVisibleLog` → `count === 0` → лічильник не пишеться.
4. **Результат:** до перезавантаження — `🗑 (0)`, після — `🗑`. Той самий стан
   виглядає по-різному; користувач не може відрізнити «нуль видалень» від
   «лічильник не порахований».

### Додатковий підсилювач: `NaN`

`Number(rawCount)` для зіпсованого значення (напр. рядка `"abc"` після ручного
редагування storage або невдалої міграції) дає `NaN`. `NaN > 0` — хибно, тож
лічильник так само мовчки не оновлюється. Жодного попередження в консоль.

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Розділити два різні поняття: «лічильник не задано» і «лічильник дорівнює нулю».

```ts
// popup/popup_sheet_log_restorer.ts

/** Валідне збережене число, або null, якщо значення відсутнє/зіпсоване. */
function readStoredCount(rawCount: unknown): number | null {
    if (rawCount === undefined || rawCount === null) return null;
    const parsed = Number(rawCount);
    return Number.isFinite(parsed) ? parsed : null;   // NaN → падаємо на підрахунок з DOM
}

function resolveLogCount(sheetId, html, rawCount, countFromDom): number {
    const stored = readStoredCount(rawCount);
    return stored ?? countFromDom(sheetId, html);
}

/** Лічильник пишеться ЗАВЖДИ — 0 теж є валідним станом. */
function applyLogCount(targetCountId: string, sheetId: string, count: number): void {
    setTextContent(`${targetCountId}${sheetId}`, `(${count})`);
}
```

Додатково — прибрати саму пастку в писачі стану:

```ts
// modules/telegram_parser.ts — зробити лічильники обов'язковими,
// щоб виклик без них не компілювався:
export function collectTelegramSheetStateFromDOM(
    sheetId: string,
    deletedLogCount: number,     // ← без дефолту
    cleanedLogCount: number,     // ← без дефолту
    getElementByIdFn = ...
): TelegramSheetDOMState
```

…або, якщо сигнатуру ламати не можна, рахувати лічильники з DOM прямо в
`collectTelegramSheetStateFromDOM`, коли їх не передали.

## 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Журнал видалень порожній, popup щойно відкрито | `🗑` (порожньо) | `🗑 (0)` |
| Журнал видалень порожній, до перезавантаження | `🗑 (0)` | `🗑 (0)` — стабільно |
| 12 записів, лічильник у storage = 0 (майбутній виклик без `stateData`) | `🗑` + 12 видимих рядків | `🗑 (12)` |
| 12 записів, лічильник у storage = 12 | `🗑 (12)` | `🗑 (12)` — без змін |
| Лічильник у storage зіпсований (`"abc"`) | `🗑` (мовчазний `NaN`) | `🗑 (12)` — фолбек на DOM |
| Журнал прихований (`DetailsVisible = false`) | лічильник очищується | без змін |
| Журнал очищених: 5 рядків + заголовок таблиці | `🧹 (5)` | `🧹 (5)` — без змін |

## 3.2 Ризики міграції

1. **Зміна видимого UI.** З'явиться `(0)` там, де раніше було порожньо. Це саме
   те, що показує живий рендер, але візуально сторінка зміниться — потрібне
   погодження, бо правило рефакторингу вимагає збереження поведінки 1-в-1.
2. **Регрес-тести.** Ці кейси зафіксовані як «квірки» в
   `tests/popup_sheet_state_restorer.test.js` (№ 11, 12, 14, 19). Після фіксу їх
   треба переписати на нову очікувану поведінку, а не просто видалити.
3. **Зміна сигнатури `collectTelegramSheetStateFromDOM`** зачіпає
   `modules/telegram_parser.ts` (публічний експорт) і `tests/telegram_parser.test.js`.
   Прибирання дефолтів — breaking change для будь-якого зовнішнього виклику.
4. **Взаємодія з `popup_sheet_clear.ts`.** Очищення аркуша окремо стирає ключі
   лічильників; треба перевірити, що після фіксу очищений аркуш не починає
   показувати `(0)` там, де очікується повністю порожній блок.
5. **Порядок «html → лічильник»** має лишитися незмінним: підрахунок із DOM
   свідомо виконується ПІСЛЯ підстановки html.

## 4. Де зараз живе цей борг у коді (після рефакторингу)

| Файл | Функція | Роль у баґу |
|---|---|---|
| `popup/popup_sheet_log_restorer.ts` | `applyLogCount` | Умова `count > 0`, що ковтає `0` та `NaN` |
| `popup/popup_sheet_log_restorer.ts` | `resolveLogCount` | Пріоритет збереженого `0` над підрахунком із DOM |
| `popup/popup_sheet_log_restorer.ts` | `countDeletedRows`, `countCleanedRows` | Коректний фолбек, до якого не доходить керування |
| `popup/popup_sheet_log_restorer.ts` | `restoreVisibleLog` | Гілка «журнал видимий», де все це збирається |
| `modules/telegram_parser.ts` | `collectTelegramSheetStateFromDOM` | Дефолти `= 0` для обох лічильників |
| `popup/popup_telegram.ts:507` | `saveTelegramSheetState` | Фолбек `|| collectTelegramSheetStateFromDOM(sheetId)` без лічильників |
| `popup/popup_telegram.ts:440/450`, `:486/496` | `renderTelegramDeletedLog`, `renderTelegramCleanedLog` | Живий рендер, що пише `(0)` — джерело розбіжності |
| `modules/sheet_state_service.ts:169–171` | читання стану | `|| 0` при читанні ще раз стирає «немає значення» |

> До рефакторингу весь цей код був однією функцією `restoreSheetLog`
> у `popup/popup_sheet_state_restorer.ts` (рядки 32–57).

## 5. Перевірка після виправлення (чек-лист)

- [ ] `tests/popup_sheet_state_restorer.test.js` № 11, 12, 14, 19 переписані з
      «квірк» на нову очікувану поведінку (лічильник пишеться завжди).
- [ ] Доданий тест: `deletedLogCount = 0` + непорожній `deletedLogHtml` з 3
      рядками `.del-row` → показує `(3)`, а не `(0)` і не порожньо.
- [ ] Доданий тест: `deletedLogCount = "abc"` → фолбек на підрахунок із DOM.
- [ ] Доданий тест: порожній журнал → після відновлення `(0)`, як у живому рендері.
- [ ] Перевірено, що `restoreSheetCleanedLog` і далі віднімає рядок заголовка
      (`.clean-table tr` − 1) і не показує `(-1)` для таблиці без даних.
- [ ] `npm run test` — усі тести зелені.
- [ ] `npx tsc --noEmit` — 0 помилок.
- [ ] `npm run lint` — 0 errors.
- [ ] `npx fallow dead-code --format json` — без нових `unused-*` у змінених файлах.
- [ ] Ручна перевірка (`docs/manual testing/`): обробити аркуш без видалень →
      закрити/відкрити popup → заголовок стабільно показує `(0)`.

## 6. Побічні спостереження

1. **Загальний стан type-check:** `npx tsc --noEmit` на момент аудиту — **0 помилок**;
   `npm run test` — **1311/1311 зелені**; `npm run lint` — **0 errors, 3 warnings**
   (усі три успадковані й не стосуються цього боргу:
   `modules/storage_migration.ts:16`, `modules/ui_shared_utils.ts:7`,
   `youtube/studio/studio_storage_handler.ts:7`).
2. **Мертвий фолбек ключа роздільника.** У `restoreSheetDividerPos` вираз
   `result[POPUP_SHEET_KEYS.dividerPos(sId)] ?? result['syh:popup:divider_pos:' + sId]`
   має обидві гілки **ідентичними**: `POPUP_SHEET_KEYS.dividerPos` і є
   `syh:popup:divider_pos:${sheetId}`. Другий доданок недосяжний. Якщо історичні
   дані колись лежали під іншим ключем, вони не мігрують. Зафіксовано тестом
   № 25 у `tests/popup_sheet_state_restorer.test.js` і коментарем у
   `popup/popup_sheet_field_restorer.ts`.
3. **`Number()` без валідації** застосовується до значення зі storage у трьох
   місцях цього ланцюга. Варто ввести спільний хелпер «безпечне ціле зі storage»
   — аналогічний тому, що вже з'явився в `options/form.ts::readInteger` після
   виправлення баґу з `NaN`.
4. **Асиметрія «живий рендер ↔ відновлення»** ширша за лічильники: живий рендер
   додатково викликає `showElement(deletedLogDetails__…)`, тоді як відновлення
   виставляє `style.display = ''` лише коли елемент `<details>` знайдено.
   Поведінка збігається, але дублюється у двох місцях і легко розійдеться далі.

---
