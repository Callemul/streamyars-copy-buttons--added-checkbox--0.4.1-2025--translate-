# 2026-08-09 — KILO — Аудит: латентний баг диспетчеризації кнопок банерів (`event_banners/mouseup_handler.ts`)

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow
> (`npx fallow health --max-crap 30`), зокрема модуля `modules/event_banners/index.ts` (CRAP 56).
> Баг існував в оригінальному коді, підтверджений **фактичним runtime-прогоном** вузлового
> проку — не припущення.
>
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг свідомо зберігає поведінку 1-в-1. Виправлення
> потребує окремого погодження (змінює поведінку кнопок копіювання/відмітки банерів — UX).

---

## 1. Що саме зламано

У `modules/event_banners/mouseup_handler.ts` таблиця `actionHandlers` описує поведінку
кнопок банерів, але **два з чотирьох обробників не відповідають контракту** предиката
`canHandle`, що робить відповідні кнопки непрацюючими.

### Контракт предиката (інтерфейс `ButtonActionHandler`, рядок 7–10)

```ts
interface ButtonActionHandler {
    canHandle: (action: string | undefined, type: string | undefined) => boolean;
    handle: (button: HTMLElement, self: SyhEventBanners) => void;
}
```

Предикат має рівно **два** параметри: `action` і `type`.

### Як його написали (оригінал, `mouseup_handler.ts`)

```ts
// рядок 22 — предикат оголошено з ТРЬОМА параметрами:
canHandle: (_action, type, action) => type === 'banner' && action === 'copy-banner',
//                                                  ^^^^^^ третій параметр — це undefined

// рядок 26–27 — mark-stream/mark-audience/mark-prayer:
canHandle: (action) => action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer',
handle: (button, self) => handleMarkBannerCategoryAction(button, action!, self.SELECTORS, self.UI, self.UTILS)
//                                                              ^^^^^^ вільна змінна, якої НЕМАЄ у області видимості
```

Два дефекти:

1. **`copy-banner` (рядок 22): невідповідність сигнатурі + зсув аргументів.**
   Обробник оголошено як `(_action, type, action)` — три параметри, хоча інтерфейс дає два.
   Третій параметр `action` отримує значення `undefined` (туди передається лише
   `action` і `type`). Тому умова `action === 'copy-banner'` завжди `false` →
   **кнопка «Копіювати текст банера» ніколи не знаходить свій обробник і не спрацьовує.**

2. **`mark-stream` / `mark-audience` / `mark-prayer` (рядок 27): вільна змінна `action`.**
   Стрілочна функція — модульна область видимості. Змінна `action` всередині `handle`
   посилається на **вільне посилання**, якого не існує ні в модулі, ні у функції
   (`action` є лише локальною змінною всередині `handleBannerMouseUp`, рядок 36).
   → при кліку **`ReferenceError: action is not defined`** (у браузері, де немає глобального `action`).

### Підтвердження від `tsc` (на поточному коді, без змін)

```
modules/event_banners/mouseup_handler.ts(22,9):  error TS2322: Type '(_action: any, type: any, action: any) => boolean' is not assignable to type '(action: string | undefined, type: string | undefined) => boolean'.
modules/event_banners/mouseup_handler.ts(22,21): error TS7006: Parameter '_action' implicitly has an 'any' type.
modules/event_banners/mouseup_handler.ts(22,30): error TS7006: Parameter 'type' implicitly has an 'any' type.
modules/event_banners/mouseup_handler.ts(22,36): error TS7006: Parameter 'action' implicitly has an 'any' type.
modules/event_banners/mouseup_handler.ts(27,74): error TS2304: Cannot find name 'action'.
```

Проєкт має **109 помилок `tsc`** (з них 5 — у цьому файлі); оскільки `npm run build` (Vite)
та `npm run lint` (ESLint) **не роблять type-check**, ці помилки ніколи не блокують збірку.

---

## 2. Runtime-наслідки (трасування + емпірика)

`handleBannerMouseUp` — **єдиний** шлях обробки цих кнопок. `UiFactory.createButton`
(`modules/ui_factory.ts:16`) не вішає власного слухача кліку, а делегування йде через
`document.addEventListener('mouseup', ...)` у `modules/event_banners/index.ts:76`.
Кнопки створюються в `modules/ui_banners.ts:23-34` (`type: 'banner'`, `action: 'copy-banner' | 'mark-stream' | 'mark-audience' | 'mark-prayer'`).

Прямий прогін (Node, з моками DOM) перевірив усі п'ять `action`:

| action | type | preventDefault | Результат |
|---|---|---|---|
| `create-from-text` | — | так | ок (fallback на `prompt` у Node кидає, але у браузері працює) |
| `copy-banner` | `banner` | так | **NO HANDLER MATCHED** — кнопка мовчить |
| `mark-stream` | `banner` | так | **THROWS → ReferenceError: action is not defined** |
| `mark-audience` | `banner` | так | **THROWS → ReferenceError: action is not defined** |
| `mark-prayer` | `banner` | так | **THROWS → ReferenceError: action is not defined** |

Ключовий нюанс ланцюга: у `handleBannerMouseUp` спочатку викликається
`e.preventDefault(); e.stopPropagation();` (рядки 42–43) — **до** пошуку обробника.
Тому навіть коли обробник не спрацьовує (copy-banner) або кидає (mark-*), браузер уже
«проковтнув» подію. Користувач бачить: клік спрацьовує візуально, але **нічого не відбувається**
(копіювання) або **помилка в консолі без жодного ефекту** (відмітка).

### 2.1 Чому `mark-*` падає саме так
`handle` на рядку 27 — це стрілочна функція, замикання над **модульною** областю.
Ідентифікатор `action` у ній не оголошений ніде у модулі → `ReferenceError` на етапі
обчислення `action.replace('mark-', '')` всередині `handleMarkBannerCategoryAction`.
Це не per-call помилка — вона детермінована для кожного кліку по будь-якій кнопці `mark-*`.

### 2.2 Чому `copy-banner` «тихий»
Предикат повертає `false` для всіх кліків → `actionHandlers.find(...)` дає `undefined`
→ блок `if (handler) handler.handle(...)` не виконується. Побічних ефектів і помилок немає,
тому баг **незауважений**: кнопка просто не копіює текст банера.

---

## 3. Пропоноване виправлення (НЕ застосоване)

Мінімальне, що відновлює контракт і поведінку, не чіпаючи решту:

```ts
const actionHandlers: ButtonActionHandler[] = [
    {
        canHandle: (action) => action === 'create-from-text',
        handle: (_button, self) => handleCreateBannersAction(self.BANNER_CREATOR)
    },
    {
        canHandle: (action) => action === 'delete-selected-banners',
        handle: (_button, self) => handleDeleteSelectedBannersAction(self.SELECTORS, self.UI)
    },
    {
        // ВИПРАВЛЕНО: предикат лише (action, type); action береться з першого параметра
        canHandle: (action, type) => type === 'banner' && action === 'copy-banner',
        handle: (button, self) => handleCopyBannerAction(button, self.SELECTORS, self.UTILS)
    },
    {
        // ВИПРАВЛЕНО: action має бути параметром handle, а не вільною змінною
        canHandle: (action) => action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer',
        handle: (button, action, self) => handleMarkBannerCategoryAction(button, action!, self.SELECTORS, self.UI, self.UTILS)
    }
];
```

Або, чистіше, зробити `handle` варіативним `(button, self, action)` — але це зміна
інтерфейсу `ButtonActionHandler` і торкається `handleCreateBannersAction`/`handleDeleteSelectedBannersAction`.
Краще обмежитись першим варіантом.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Клік «📋 Копіювати текст банера» | нічого не відбувається | текст банера копіюється у буфер (`utils.copyAndShowBanner`) |
| Клік «📺 Відмітити як Питання ефіру» | `ReferenceError` у консолі, банер не змінюється | банер відмічається як «ефір» |
| Клік «❓ Відмітити як Питання глядачів» | `ReferenceError` у консолі | банер відмічається як «глядачі» |
| Клік «🙏 Відмітити як Молитовне» | `ReferenceError` у консолі | банер відмічається як «молитовне» |

Це **зміна UX** (оживляються 4 кнопки), тому винесено в окрему задачу.

### 3.2 Ризики міграції

- Ризик низький: зміна локалізована в одному файлі `modules/event_banners/mouseup_handler.ts`,
  жодних побічних ефектів на сховище/мережу.
- Після виправлення варто додати інтеграційний тест: емітити `mouseup` по кнопці
  `copy-banner`/`mark-stream` і перевірити виклик `utils.copyAndShowBanner` /
  `ui.bannerCategoriesCache`.
- Тести `tests/event_banners_mouseup_handler.test.js` уже існують, але не покривають ці дві
  гілки (перевіряють лише `isAllowedBannerAction` та загальний `preventDefault`/`stopPropagation`).

---

## 4. Де зараз живе цей борг у коді

Після рефакторингу структура `event_banners` не змінилася у цій частині:

- `modules/event_banners/mouseup_handler.ts:22` — предикат `copy-banner` із трьома параметрами
  (третій `action` завжди `undefined`).
- `modules/event_banners/mouseup_handler.ts:26-27` — предикат `mark-*` + `handle`, що посилається
  на вільну змінну `action`.
- `modules/event_banners/mouseup_handler.ts:31-48` — `handleBannerMouseUp`, що викликає
  `actionHandlers.find(h => h.canHandle(action, type))` (рядок 45) і лише потім диспетчеризує.
- `modules/event_banners/index.ts:76` — делегування `document.addEventListener('mouseup', ...)`.
- `modules/ui_banners.ts:23-34` — місце створення кнопок із `action`/`type`.

Рефакторинг (виокремлення `modules/event_banners/deps.ts`, зниження CRAP `index.ts` з 56 до ≤2)
**не торкнувся** `mouseup_handler.ts`, отже борг залишився на місці 1-в-1.

---

## 5. Перевірка після виправлення (чек-лист для наступного ШІ)

1. `npx tsc --noEmit 2>&1 | Select-String 'mouseup_handler'` → порожньо (зникнуть 5 помилок).
2. `npm run test` → додати/розширити `tests/event_banners_mouseup_handler.test.js`:
   - emit `mouseup` (button 0) по кнопці `copy-banner` → виклик `utils.copyAndShowBanner`.
   - emit `mouseup` по `mark-stream` → без `ReferenceError`, виклик `handleMarkBannerCategoryAction`.
3. Ручна перевірка в StreamYard: навести банер → натиснути 📋 / 📺 / ❓ / 🙏 → ефект є, консоль чиста.
4. `npx fallow health --max-crap 30` → у `mouseup_handler.ts` знахідок за CRAP немає
   (файл уже ≤ CRAP 30; він не входив у топ-3 цього етапу).

---

## 6. Побічні спостереження (загальний стан проєкту)

- **`npm run build`/`npm run lint` не роблять type-check.** `npx tsc --noEmit` на поточному
  коді дає **109 помилок** по всьому проєкту. Більшість — `SelectorValue`
  (`string | string[]`), що передається у `querySelector(...)`, який чекає `string`.
  Рекомендація (окрема задача): додати скрипт `"typecheck": "tsc --noEmit"` і поетапно звести
  кількість помилок до нуля через уже наявні хелпери `resolveSelector`/`resolveSelectorString`.
- **`youtube/yt_comment_processor.ts:4`** імпортує `YTCollectedItem` як *значення*
  (`import { ..., YTCollectedItem } from './yt_events'`), хоча `yt_events.ts:6` експортує його
  лише як `export type`. Під Vite (`isolatedModules`) це проходить, але під
  `node --experimental-strip-types` (яким запускається `npm run test`) кидає
  `SyntaxError: ... does not provide an export named 'YTCollectedItem'`. Це блокує статичний
  шлях тестів до всього піддерева `youtube/yt_*`, тому `youtube/yt_storage_handler.ts` лишився
  поза покриттям (gap=True), хоча його CRAP після рефакторингу все одно ≤ 6. Виправлення —
  замінити на `import { bindYTEvents, type YTCollectedItem } from './yt_events'` (нейтрально для
  рантайму, але знімає блокування тестів). Винесено в окрему задачу.
- **Неправильний шлях імпорту `SyhUi`.** Чотири файли імпортують `SyhUi` з `../ui`, хоча тип
  оголошено в `modules/ui_state.ts` (експортований як `SYH_UI` — значення, і `export type SyhUi`
  у `ui_state`). Це дає помилки `TS2724: '"../ui"' has no exported member named 'SyhUi'`
  у `modules/event_banners/{index,category,checkbox,deletion_handler}.ts` та `types.ts`.
  Не блокує Vite, але засмічує `tsc`.
