# [2026-08-09] — KILO — Аудит: латентний баг «валідатор CSS-селекторів склеює масив у групу»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> **Статус:** ✅ ВИПРАВЛЕНО (до 2026-08-10). `validateSelectorsSyntax` вже ітерує члени масиву через `toSelectorList` (єдине джерело правди), тож хибнопозитивні/хибнонегативні повідомлення усунуто. Перевірено: `tests/ui_facade.test.js` зелений.

---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали, а також помилками tsc, якщо вони є)

`validateSelectorsSyntax()` — це діагностичний скан, який на старті UI має знайти
синтаксично невалідні CSS-селектори в конфізі й голосно про них повідомити.
Після рефакторингу він живе в `modules/ui_selector_validator.ts` (раніше —
`modules/ui.ts`, рядки 70–82).

**Реальний контракт значення селектора (`modules/config.ts`, рядок 4):**

```ts
export type SelectorValue = string | string[];
```

Масив тут означає **список альтернатив за спаданням пріоритету**. Саме так його
трактує решта проєкту (`modules/config.ts`, `queryFirst`, рядки ~52–62):

```ts
const selectors = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;

for (const sel of selectors) {
    if (!sel) continue;                       // ← порожній член ПРОПУСКАЄТЬСЯ
    try {
        const el = root.querySelector<T>(sel);   // ← кожен член перевіряється ОКРЕМО
        if (el) return el;
    } catch (e) {
        console.warn(`[SYH Selector] Invalid CSS selector: "${sel}"`, e);  // ← і не зупиняє решту
    }
}
```

**Як його викликали у валідаторі (поведінка збережена 1-в-1):**

```ts
for (const key in SYH_UI_STATE.SELECTORS) {
    const selector = SYH_UI_STATE.SELECTORS[key];
    if (!selector) continue;                 // ← перевіряє МАСИВ цілком, а не його члени
    try {
        document.querySelector(String(selector));   // ← масив зводиться до 'a,b'
    } catch (e) {
        console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
    }
}
```

Тобто валідатор перевіряє **не список альтернатив, а одну CSS-групу**, склеєну комами.

**Підтвердження від `tsc` (на оригінальному коді, `modules/ui.ts:77`):**

```
modules/ui.ts(77,36): error TS2769: No overload matches this call.
```

Компілятор прямо казав, що в `querySelector(selector)` летить `string | string[]`
замість `string`. Помилка існувала з моменту введення типу `SelectorValue`.

> **Що зроблено в цьому рефакторингу:** неявне зведення замінено на явне
> `String(selector)`. Це **побітово та сама операція**, яку виконував рушій за
> WebIDL-правилом `ToString`, тому рантайм не змінився ані на крок, — але
> помилка `TS2769` зникла чесно, без `as string` і без `@ts-ignore`.
> **Сама логіка «склеювання замість перебору» свідомо залишена як є.**

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### 2.1 Емпірика (happy-dom, той самий рушій, що й у тестах)

```
[".a",".b"]   → document.querySelector('.a,.b')  → OK
[".a",""]     → document.querySelector('.a,')    → THROWS SyntaxError
[".a"]        → document.querySelector('.a')     → OK
```

### 2.2 Наслідок A — хибнопозитивна «критична» помилка

У бойовому конфізі масивів багато (`modules/config.ts`, рядки 88–108), наприклад:

```ts
bannerDeleteButton: ['button:has(svg.lucide-trash2)', 'button:has(svg.lucide-trash-2)', '[data-testid="delete-banner-btn"]'],
rightTabButtons:    ['button[role="tab"][id*="broadcast-aside-tab-"]', '[data-testid="dropdown-workaround-id"] button', 'button[class*="RightTabButton__StyledButton"]'],
```

Трасування:

1. Розробник додає в масив тимчасовий порожній рядок або лишає кому після правки:
   `['button:has(svg.lucide-trash2)', '']`.
2. `if (!selector) continue` бачить **непорожній масив** → пропуску не буде.
3. `String([...])` → `'button:has(svg.lucide-trash2),'` → `SyntaxError`.
4. У консолі — `[SYH] Виявлено критично невалідний CSS селектор ... [bannerDeleteButton]`.
5. **Але `queryFirst()` цей самий конфіг обробляє без єдиної скарги** — він пропускає
   порожній член. Тобто валідатор кричить про поломку, якої в реальній роботі немає.

### 2.3 Наслідок B — хибнонегативний пропуск (небезпечніший)

Зворотний бік тієї самої монети: `:has()` та інші селектори по-різному підтримуються
різними рушіями. Якщо один член масиву невалідний для поточного браузера, а решта — ні:

1. `['button:has(svg.lucide-trash2)', '[data-testid="delete-banner-btn"]']`
   у рушії без підтримки `:has()` → `String(...)` дає `'button:has(...),[data-testid=...]'`.
2. CSS-групу браузер парсить **атомарно**: один невалідний член робить невалідною всю групу.
3. Валідатор рапортує помилку по **всьому ключу**, і в логу видно масив цілком —
   **не видно, який саме член винен**.
4. Розробник бачить «зламаний `bannerDeleteButton`» і може викинути робочий
   fallback `[data-testid="delete-banner-btn"]`, хоча зламаний був лише перший член.

### 2.4 Наслідок C — валідатор не робить того, заради чого існує

Найтихіший наслідок: **жоден член масиву ніколи не перевіряється окремо**.
Мета скану — «знайти невалідний селектор у конфізі», а фактично він відповідає
на інше питання: «чи валідна конкатенація всіх альтернатив через кому».
Для 11+ масивних ключів конфігу діагностична цінність скану близька до нуля.

Позитивна деталь: помилка **не** зупиняє ані цикл, ані `init()` — `try/catch`
всередині циклу, а весь `init` додатково загорнутий у власний `try/catch`
(`modules/ui_init.ts`). Тож це суто діагностичний, а не функціональний збій.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Привести валідатор до тієї самої семантики, що вже реалізована в `queryFirst()`:

```ts
// modules/ui_selector_validator.ts

import { SYH_UI_STATE } from './ui_state';

export function validateSelectorsSyntax(): void {
    if (!SYH_UI_STATE.SELECTORS) return;
    console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");

    for (const key in SYH_UI_STATE.SELECTORS) {
        const selectorValue = SYH_UI_STATE.SELECTORS[key];
        if (!selectorValue) continue;

        // Та сама нормалізація, що й у queryFirst/queryAll — єдине джерело правди.
        const candidates = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;

        for (const selector of candidates) {
            if (!selector) continue;          // порожній член — не помилка, його просто пропускають
            try {
                document.querySelector(selector);
            } catch (e) {
                // Тепер у лог потрапляє САМЕ винний член, а не весь масив.
                console.error(
                    `[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`,
                    selector,
                    e
                );
            }
        }
    }
}
```

Ще краще — винести нормалізацію в `modules/config.ts` і перевикористати її
в `queryFirst`, `queryAll` і валідаторі, щоб правило «як читати `SelectorValue`»
жило в одному місці:

```ts
// modules/config.ts
export function toSelectorList(selectorValue: SelectorValue | null | undefined): string[] {
    if (!selectorValue) return [];
    const list = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;
    return list.filter(Boolean);
}
```

## 3.1 Що зміниться для користувача (таблиця сценаріїв "Зараз" та "Після")

| # | Сценарій (значення в конфізі) | Зараз | Після |
|---|---|---|---|
| 1 | `'.valid'` (рядок) | Тиша | Тиша (без змін) |
| 2 | `':::broken'` (рядок) | 1 × `console.error` із текстом селектора | 1 × `console.error` (без змін) |
| 3 | `['.a', '.b']` — обидва валідні | Тиша (`'.a,.b'` парситься) | Тиша |
| 4 | `['.a', '']` — порожній «хвіст» | ❌ `console.error` про **весь ключ** — хибна тривога | Тиша: порожній член пропускається, як і в `queryFirst` |
| 5 | `[':::broken', '.b']` — один член зламаний | `console.error`, у лог виводиться **масив цілком** | `console.error`, у лог виводиться **саме `':::broken'`** |
| 6 | `[':::broken', '::alsobroken']` — обидва зламані | 1 × `console.error` на ключ | 2 × `console.error` — по одному на кожен зламаний член |
| 7 | Робота застосунку (пошук елементів) | Не змінюється | Не змінюється — валідатор нічого не повертає |

> **Важливо:** змінюється **виключно діагностичний вивід у консоль**. Валідатор
> не має значення, що повертається, і не впливає на пошук елементів у DOM —
> той іде через `queryFirst`/`resolveFirstSelector`. Для кінцевого користувача
> розширення видимих змін немає; вигоду отримує розробник.

## 3.2 Ризики міграції

1. **Ризик мінімальний** — функція без повертаного значення й без побічних ефектів,
   окрім `console.*`. Змінюється лише кількість і зміст лог-повідомлень.
2. **Кількість логів може зрости** (сценарій 6: один ключ → кілька повідомлень).
   Якщо десь є автотест або скрипт, що рахує `console.error`, його треба оновити.
3. **Хибні тривоги зникнуть** (сценарій 4) — якщо хтось звик бачити конкретне
   попередження в консолі, воно щезне; це очікувано і бажано.
4. **Потрібно синхронізувати з `tests/ui_facade.test.js`**: тест №7
   («невалідний селектор логується як error… рівно один `console.error`») написаний
   під рядковий селектор і залишиться валідним, але варто **додати** кейси на масиви
   (сценарії 4–6), інакше нова поведінка лишиться непокритою.
5. **Не змішувати з рефактором `event_comments`** — там семантика масивів змінюється
   по-справжньому (див. `audit_2026-08-09_KILO_event-comments-types-missing-imports.md`,
   розділ 3.2, ризик №1). Тут же зміна суто косметично-діагностична, тож ці два
   виправлення краще вести окремими PR.

---

## 4. Де зараз живе цей борг у коді (вказати конкретні файли та функції після рефакторингу)

| Файл | Функція / рядки | Що саме |
|---|---|---|
| `modules/ui_selector_validator.ts` | `validateSelectorsSyntax()`, цикл `for...in` | **Основне місце боргу.** Масив зводиться до CSS-групи через `String(selector)` замість перебору членів |
| `modules/ui_selector_validator.ts` | рядок з `if (!selector) continue` | Перевіряє масив як ціле; порожні члени всередині масиву не відсіюються |
| `modules/ui.ts` | поле `validateSelectorsSyntax` в `SYH_UI` | Точка входу: фасад віддає ту саму функцію без обгортки (перевіряється тестом №27) |
| `modules/ui_init.ts` | `initUiModule()` | Єдиний виклик валідатора в проді — на старті UI |
| `modules/config.ts` | `queryFirst` (~52–62), `queryAll` (~71–81) | **Еталонна** семантика перебору, з якою треба звірити валідатор |
| `modules/config.ts` | `SELECTORS`, рядки 88–108 | 11+ ключів із масивами — саме вони зараз валідуються некоректно |
| `tests/ui_facade.test.js` | тести 4–7, `describe('ui — validateSelectorsSyntax')` | Фіксують поточну поведінку; кейсів на масиви поки немає |

> **Історична довідка:** до цього рефакторингу код жив у `modules/ui.ts`, рядки 70–82,
> і давав помилку `modules/ui.ts(77,36): error TS2769`. Зараз файл винесено окремо,
> зведення типу зроблено явним (`String(...)`), помилки `tsc` більше немає —
> але **логічна вада збережена свідомо**, щоб не порушити принцип «1-в-1».

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] `npx tsc --noEmit` — `modules/ui_selector_validator.ts` без помилок
      (зараз чисто; після правки має лишитися чисто, без `as string`/`@ts-ignore`).
- [ ] `npm test` — усі зелені; у `tests/ui_facade.test.js` **додано** кейси:
  - [ ] `['.a', '.b']` → жодного `console.error`;
  - [ ] `['.a', '']` → жодного `console.error` (був хибний);
  - [ ] `[':::broken', '.b']` → рівно 1 `console.error`, і в аргументах **рядок**
        `':::broken'`, а не масив;
  - [ ] `[':::broken', '::alsobroken']` → рівно 2 `console.error`.
- [ ] Перевірено, що `SYH_UI.validateSelectorsSyntax === validateSelectorsSyntax`
      (тест №27 у `tests/ui_facade.test.js`) все ще проходить — фасад не обріс обгорткою.
- [ ] Якщо додано `toSelectorList()` у `modules/config.ts` — його спожито **і** в
      `queryFirst`, **і** в `queryAll`, **і** у валідаторі (інакше Fallow позначить
      як `unused_export`).
- [ ] `npx fallow dead-code --format json` — без нових `unused_exports`/`unused_imports`.
- [ ] `npm run lint` і `npm run build` — без нових зауважень.
- [ ] DevTools на живому StreamYard: у консолі при старті **немає** повідомлень
      `[SYH] Виявлено критично невалідний CSS селектор` для ключів
      `commentBlock`, `commentText`, `starButton`, `bannerDeleteButton`, `rightTabButtons`.

---

## 6. Побічні спостереження (наприклад, загальний стан type-check у проєкті)

1. **Загальний стан type-check.** Базовий заміряний стан на початку сесії —
   **108 помилок `tsc` у 33 файлах**; після цього рефакторингу — **100**, без жодної
   нової. Скрипта `typecheck` у `package.json` немає, тому такі помилки, як
   `TS2769` у валідаторі, можуть жити роками: збірка Vite їх не бачить,
   бо транспілює без перевірки типів.

2. **`TS2769` тут був єдиним «чесним» сигналом.** Ані ESLint (`npm run lint` — чисто),
   ані Fallow (`dead-code` — 0 проблем у цьому файлі) цю ваду не бачать: для них
   код синтаксично коректний і повністю досяжний. Тільки `tsc` вказував пальцем
   на `string[]` там, де очікується `string`.

3. **Дублювання логіки читання `SelectorValue`.** Нормалізація
   `typeof v === 'string' ? [v] : v` зустрічається щонайменше двічі в
   `modules/config.ts` (`queryFirst`, `queryAll`) і **відсутня** там, де потрібна
   (валідатор, `modules/event_comments/*`). Це порушує правило Single Source of Truth
   із `AGENTS.md`. Кандидат на єдиний хелпер `toSelectorList()`.

4. **Бракує парного хелпера для `.closest()`.** `queryFirst`/`queryAll` покривають
   `querySelector`/`querySelectorAll`, але для `closest` аналога немає — і саме
   тому `modules/event_comments/handlers.ts` передає масиви напряму в `closest`
   (див. суміжний аудит).

5. **Результат рефакторингу для цього файлу.** `modules/ui.ts` (175 LOC, fan-out 8,
   щільність складності 0.38) розділено на `ui_init` / `ui_selector_validator` /
   `ui_checkbox_restorer` і **зник зі списку `fallow health --targets`** (був №1
   з пріоритетом 34.5). Maintainability Index нового
   `modules/ui_selector_validator.ts` — **94.2**, fan-out — **1**.
