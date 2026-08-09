# [2026-08-09] — KILO — Аудит: латентний баг «беззвучна втрата типізації в `modules/event_comments/types.ts`»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.

---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали, а також помилками tsc, якщо вони є)

`modules/event_comments/types.ts` — це файл-контракт усієї родини `modules/event_comments/*`.
У ньому оголошено інтерфейс `SyhEventComments`, який використовує **п'ять зовнішніх типів**:
`SelectorValue`, `SyhState`, `SyhUtils`, `SyhUi`, `SyhConfig`.

**Реальний контракт (як має бути, за зразком сусіднього `modules/event_banners/types.ts`, рядки 1–5):**

```ts
import type { SyhConfig, SelectorValue } from '../config';
import type { SyhState } from '../state';
import type { SyhUtils } from '../utils';
import type { SyhUi } from '../ui';
import type { SyhBannerCreator } from '../banner_creator';
```

**Як його написали (`modules/event_comments/types.ts`, поточний стан) — у файлі НЕМАЄ ЖОДНОГО `import`:**

```ts
export interface CopyPayload { ... }

export interface SyhEventComments {
    SELECTORS: Record<string, SelectorValue> | null;   // ← SelectorValue не імпортовано
    STATE: SyhState | null;                            // ← SyhState не імпортовано
    UTILS: SyhUtils | null;                            // ← SyhUtils не імпортовано
    UI: SyhUi | null;                                  // ← SyhUi не імпортовано
    ...
    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void;
}
```

**Підтвердження від `tsc` (на поточному, незміненому коді) — 8 помилок:**

```
modules/event_comments/types.ts(9,31):  error TS2304: Cannot find name 'SelectorValue'.
modules/event_comments/types.ts(10,12): error TS2304: Cannot find name 'SyhState'.
modules/event_comments/types.ts(11,12): error TS2304: Cannot find name 'SyhUtils'.
modules/event_comments/types.ts(12,9):  error TS2304: Cannot find name 'SyhUi'.
modules/event_comments/types.ts(25,19): error TS2304: Cannot find name 'SyhConfig'.
modules/event_comments/types.ts(25,38): error TS2304: Cannot find name 'SyhState'.
modules/event_comments/types.ts(25,56): error TS2304: Cannot find name 'SyhUtils'.
modules/event_comments/types.ts(25,71): error TS2304: Cannot find name 'SyhUi'.
```

Ключова підступність: `TS2304` **не зупиняє** аналіз. TypeScript підставляє на місце
нерозпізнаного імені тип-помилку, який поводиться як `any`. Тобто інтерфейс
`SyhEventComments` фактично деградує до:

```ts
SELECTORS: any | null;   STATE: any | null;   UTILS: any | null;   UI: any | null;
```

а разом із ним **уся родина `modules/event_comments/*` втрачає перевірку типів**,
бо кожен її файл починається з `import type { SyhEventComments } from './types'`.

### Емпіричний доказ масштабу

Під час КРОКУ 0 цього рефакторингу імпорти було додано **тимчасово**, і `tsc` одразу
показав **19 раніше замаскованих реальних помилок**, які до того не було видно:

| Файл | Помилок | Тип |
|---|---|---|
| `modules/event_comments/handlers.ts` | 9 | `TS2769` |
| `modules/event_comments/auto_heal.ts` | 4 | `TS2769` |
| `modules/event_comments/button_handlers.ts` | 3 | `TS2769` |
| `modules/event_comments/actions.ts` | 1 | `TS2769` |
| `modules/event_comments/handlers.ts:37` | 1 | `TS18047` |
| `modules/event_comments/auto_heal.ts:49` | 1 | `TS18047` |

Баланс: полагодження 8 помилок у `types.ts` **відкриває 19 нових**. Саме тому зміну
було відкочено — вона виходить за межі рефакторингу «1-в-1» і потребує окремого рішення.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

Сам по собі `TS2304` — помилка компіляції, а не рантайму: `import type` стирається,
збірка Vite проходить, розширення працює. Небезпека інша — **зникає захисна сітка**,
і два класи справжніх рантайм-багів проходять у прод непоміченими.

### 2.1 `TS2769` — `SelectorValue` (`string | string[]`) там, де очікується `string`

`modules/event_comments/handlers.ts`, рядки 19–24:

```ts
const starBtn = target.closest(self.SELECTORS!.starButton);              // ← рядок 19
if (starBtn) {
    if (starBtn.getAttribute('aria-selected') === 'true') {
        const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);           // ← 22
        const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent; // ← 24
```

Трасування на реальному конфізі (`modules/config.ts`, рядки 88–92):

```ts
commentBlock: ['[class*="PlatformComment__Wrap"]', '[data-testid="platform-comment"]'],
commentText:  ['[class*="PlatformCommentShell__ContentSpan"]', '[data-testid="comment-content"]'],
starButton:   ['[class*="PlatformComment__StarButton"]', '[aria-label*="star" i]'],
```

1. `self.SELECTORS.commentBlock` — це **масив**, а не рядок.
2. `Element.closest()` за WebIDL робить `ToString(arg)` → `'[class*="PlatformComment__Wrap"],[data-testid="platform-comment"]'`.
3. Кома у CSS — це **селекторна група**, тож рядок валідний і випадково працює як «АБО».

Тобто зараз воно **працює за збігом обставин**. Ризики:

- Це **не** та семантика, яку реалізує решта проєкту: `resolveFirstSelector()` бере
  ПЕРШИЙ елемент (пріоритет), а `queryFirst()` перебирає варіанти **по черзі**
  і повертає перший, що дав збіг. Групування ж віддає той елемент, що **перший у DOM**,
  незалежно від пріоритету в конфізі.
- Достатньо одного порожнього чи невалідного члена масиву — і весь селектор кидає
  `SyntaxError`, тоді як `queryFirst()` такий член просто пропускає (див. окремий аудит
  `audit_2026-08-09_KILO_selector-array-validation-false-positive.md`).

### 2.2 `TS18047` — `self.UI` можливо `null` у відкладеному колбеку

`modules/event_comments/handlers.ts`, рядки 28–38:

```ts
if (self.UI) {                                               // ← звуження типу тут
    self.UI.updateCommentVisuals(commentBlock, 'none');
    ...
    if (typeof self.UI.filterStarredComments === 'function') {
        setTimeout(() => self.UI.filterStarredComments(), 50);   // ← рядок 37: звуження вже НЕ діє
    }
}
```

Трасування гонки:

1. Користувач знімає зірочку з коментаря → спрацьовує `_clickHandler`.
2. `self.UI` не `null`, заходимо в гілку, ставимо `setTimeout(..., 50)`.
3. Протягом цих 50 мс відбувається `SYH_EVENT_COMMENTS.destroy()` або повторний
   `init(...)` з іншими залежностями (SPA-перехід, перепідключення content-script).
4. Колбек прокидається, читає **актуальне** `self.UI` → `null`.
5. `TypeError: Cannot read properties of null (reading 'filterStarredComments')`
   всередині таймера — **необроблений**, бо жодного try/catch на цьому шляху немає.

Аналогічно `modules/event_comments/auto_heal.ts:49`.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

**Крок 1** — повернути імпорти в `modules/event_comments/types.ts`:

```ts
import type { SyhConfig, SelectorValue } from '../config';
import type { SyhState } from '../state';
import type { SyhUtils } from '../utils';
import type { SyhUi } from '../ui';
```

**Крок 2** — прибрати 17 × `TS2769`, перевівши звернення до селекторів на наявні
хелпери з `modules/config.ts` (вони вже реалізують правильну семантику «по черзі»):

```ts
// Було (неявне зведення масиву до CSS-групи):
const starBtn = target.closest(self.SELECTORS!.starButton);
const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);
const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;

// Стало (пріоритетний перебір, як у решті проєкту):
import { resolveFirstSelector, queryFirst } from '../config';

const starBtn = closestBySelectorValue(target, self.SELECTORS?.starButton);
const commentBlock = closestBySelectorValue(starBtn, self.SELECTORS?.commentBlock);
const text = queryFirst(self.SELECTORS?.commentText, commentBlock)?.textContent;
```

де в `modules/config.ts` варто додати відсутній парний хелпер:

```ts
/** Аналог queryFirst для .closest(): перебирає варіанти по черзі, пропускає порожні. */
export function closestBySelectorValue(
    start: Element | null,
    selectorValue: SelectorValue | null | undefined
): Element | null {
    if (!start || !selectorValue) return null;
    const selectors = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;
    for (const sel of selectors) {
        if (!sel) continue;
        try {
            const el = start.closest(sel);
            if (el) return el;
        } catch (e) {
            console.warn(`[SYH Selector] Invalid CSS selector in closest: "${sel}"`, e);
        }
    }
    return null;
}
```

**Крок 3** — прибрати 2 × `TS18047`, зафіксувавши посилання до постановки таймера:

```ts
// Було:
if (typeof self.UI.filterStarredComments === 'function') {
    setTimeout(() => self.UI.filterStarredComments(), 50);
}

// Стало:
const ui = self.UI;                       // знімок, який не може стати null
if (typeof ui.filterStarredComments === 'function') {
    setTimeout(() => ui.filterStarredComments(), 50);
}
```

## 3.1 Що зміниться для користувача (таблиця сценаріїв "Зараз" та "Після")

| # | Сценарій | Зараз | Після |
|---|---|---|---|
| 1 | Звичайний StreamYard: у DOM є лише `[class*="PlatformComment__Wrap"]` | Працює | Працює (без змін) |
| 2 | Перехідний DOM: у списку є і старий `[class*="PlatformComment__Wrap"]`, і новий `[data-testid="platform-comment"]` | Береться той, що **перший у DOM** — пріоритет конфігу ігнорується | Береться **перший за пріоритетом** із конфігу, як у решті модулів |
| 3 | Один із fallback-селекторів у масиві став невалідним після правки конфігу | `SyntaxError` → **весь** обробник зірочки мовчки перестає працювати | Невалідний член пропускається з `console.warn`, робочі — далі діють |
| 4 | Зняття зірочки, потім SPA-перехід/`destroy()` протягом 50 мс | Необроблений `TypeError` у таймері, лічильники вкладок лишаються застарілими | Таймер тихо доопрацьовує зі знімком `ui`, без винятку |
| 5 | Розробник додає новий виклик у `event_comments/*` з помилкою типів | `tsc` **мовчить** (усе `any`) | `tsc` ловить помилку на етапі рев'ю |

## 3.2 Ризики міграції

1. **Зміна семантики вибору елемента (сценарій 2)** — головний ризик. Перехід від
   CSS-групи до пріоритетного перебору змінює, який саме вузол буде обрано, коли в DOM
   присутні обидва варіанти. Потрібна ручна перевірка на живому StreamYard.
2. **Обсяг** — 19 місць у 4 файлах (`handlers.ts`, `auto_heal.ts`, `button_handlers.ts`,
   `actions.ts`). Це не механічна заміна: кожне звернення треба звірити з тим, чи
   потрібен там `closest`, `querySelector` чи `querySelectorAll`.
3. **Новий публічний хелпер** `closestBySelectorValue` розширює API `modules/config.ts` —
   його треба покрити тестами разом із `queryFirst`.
4. **Ризик регресії в тестах** — `tests/event_comments.test.js` та
   `tests/event_banners_deps.test.js` подають селектори у вигляді рядків, тож
   зміна семантики масивів ними **не покривається**. Потрібні нові кейси саме на масиви.
5. **Не робити «заодно»** — крок 1 без кроків 2–3 залишить репозиторій із 19 червоними
   помилками `tsc`. Ці три кроки мають потрапити в один PR.

---

## 4. Де зараз живе цей борг у коді (вказати конкретні файли та функції після рефакторингу)

| Файл | Місце | Що саме |
|---|---|---|
| `modules/event_comments/types.ts` | рядки 1–36, `interface SyhEventComments` | **Корінь проблеми**: 5 типів без `import type`, 8 × `TS2304` |
| `modules/event_comments/handlers.ts` | `bindStarButtonClickHandler` (19, 22, 24), `bindMiddleClickHandler` (54, 59), `bindContextMenuHandlers` (83, 88), `bindCheckboxChangeHandler` (128, 130) | 9 × `TS2769` — `SelectorValue` у `closest`/`querySelector` |
| `modules/event_comments/handlers.ts` | рядок 37, всередині `bindStarButtonClickHandler` | 1 × `TS18047` — `self.UI` у `setTimeout` |
| `modules/event_comments/auto_heal.ts` | рядки 19, 24, 37, 42 | 4 × `TS2769` |
| `modules/event_comments/auto_heal.ts` | рядок 49 | 1 × `TS18047` |
| `modules/event_comments/button_handlers.ts` | `handleSyhButtonMouseUp`, рядки 21, 24, 26 | 3 × `TS2769` |
| `modules/event_comments/actions.ts` | `applyCommentActionState`, рядок 41 | 1 × `TS2769` |
| `modules/config.ts` | `resolveFirstSelector` (26–31), `queryFirst` (~52–62) | Правильна семантика вже є, але парного `closest`-хелпера бракує |

> **Що вже полагоджено цим рефакторингом (і чого тут більше немає):**
> `modules/ui.ts` тепер реекспортує тип `SyhUi`, а `modules/event_banners/types.ts` —
> `SyhUi` і `SyhUtils`. Це усунуло 7 зламаних імпортів (`TS2724`/`TS2459`) у
> `event_banners/{types,index,deletion_handler,category,checkbox}.ts` та
> `event_comments/index.ts` **без жодної нової помилки**.
> `modules/event_comments/types.ts` свідомо залишено без змін — саме тому цей звіт існує.

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] `npx tsc --noEmit` — у `modules/event_comments/*` **нуль** помилок
      (зараз їх 8 видимих + 19 замаскованих; загальний лічильник по проєкту має
      впасти зі 100 до ≈73).
- [ ] `npm test` — усі тести зелені; додано нові кейси на **масивні** селектори
      в `tests/event_comments.test.js`.
- [ ] Новий `closestBySelectorValue` покрито тестами: рядок, масив, порожній член
      масиву, невалідний член, `null`.
- [ ] `npm run build` проходить; `npm run lint` без нових зауважень.
- [ ] `npx fallow dead-code --format json` — без нових `unused_exports`
      (новий хелпер у `config.ts` має бути реально спожитий).
- [ ] **Ручна перевірка на живому StreamYard** (обов'язково, бо змінюється семантика вибору):
  - [ ] зняття зірочки прибирає коментар зі вкладки Starred;
  - [ ] середній клік і контекстне меню на коментарі працюють;
  - [ ] чекбокс коментаря зберігає стан після перезавантаження;
  - [ ] швидке зняття зірочки + перехід між вкладками не дає `TypeError` у консолі.
- [ ] DevTools: у консолі немає `Invalid CSS selector` і немає необроблених
      `TypeError` із таймерів.

---

## 6. Побічні спостереження (наприклад, загальний стан type-check у проєкті)

1. **`npx tsc --noEmit` у проєкті ніколи не був зеленим.** Заміряний базовий стан
   на початку цієї сесії — **108 помилок у 33 файлах**. Цей рефакторинг знизив їх
   до **100** (полагоджено 7 зламаних імпортів + 1 некоректне зведення типу в
   `ui_selector_validator.ts`), не додавши жодної нової. У `package.json` немає
   скрипта `typecheck`, тож регресії типів нічим не ловляться в CI.

2. **Найбільший осередок боргу — `modules/ui_comments.ts` (20 помилок)**, далі
   `modules/event_comments/{handlers,types,index}.ts` (23 разом) і
   `youtube/yt_ui.ts` (7).

3. **`modules/event_banners/mouseup_handler.ts` (5 помилок) свідомо не чіпали** —
   це вже задокументований латентний баг диспетчеризації кнопок банерів
   (`docs/audits/active/2026-08-09_KILO_AUDIT.md`).

4. **Схема «файл-контракт без імпортів» — не одиничний випадок.** Той самий шаблон
   зустрічається у `modules/event_banners/types.ts` (був частково зламаний, полагоджено
   в цій сесії). Варто перевірити решту `types.ts` у проєкті одним прогоном на `TS2304`.

5. **Fallow не бачить цієї проблеми.** `npx fallow dead-code --format json` рапортує
   `unresolved_imports: 0` і `re_export_cycles: 0`, бо працює на рівні **специфікаторів
   модулів**, а не імен, що з них імпортуються. Зламаний іменований імпорт
   (`SyhUi` з `../ui`) чи повністю відсутній імпорт для Fallow невидимі. Висновок:
   **Fallow і `tsc` тут не взаємозамінні** — структурну цілісність імпортів треба
   перевіряти обома інструментами.

6. **Стан пакета тестів.** `npm test` виконує 546 тестів (479 до цієї сесії + 67 нових).
   Проте в `tests/` лежить ще **18 файлів `*.test.js`, не підключених** до скрипта
   `test` у `package.json` (зокрема `event_banners_deletion.test.js`,
   `button_handlers.test.js`, `mouse_handlers.test.js`, `popup_prayers.test.js`).
   Серед них є ті, що покривають саме `event_comments/*`, — перед виправленням
   цього боргу варто з'ясувати, чому їх виключено.
