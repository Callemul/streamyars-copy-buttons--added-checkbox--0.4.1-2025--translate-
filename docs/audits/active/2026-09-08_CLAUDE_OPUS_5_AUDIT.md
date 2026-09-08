# 🏛️ АУДИТ — CLAUDE OPUS 5

**Дата:** 2026-09-08
**Модель:** Claude Opus 5
**Гілка:** `v0.5.3` @ `c1c7450`
**Методологія:** статичний аналіз (tsc/eslint/node:test/vite) + точкове читання коду за заявленою проблемою

**Заявлена проблема замовника:** *«кажу зробити форму — а воно пишеться наново, а не через SSOT; додав кнопку в одному місці, а треба щоб вона з'явилась у всіх схожих вікнах»*.
Аудит сфокусовано саме на цьому: **чому додавання одного UI-елемента вимагає правок у 5–8 місцях**.

---

## 📊 БАЗОВА ЛІНІЯ

| Перевірка | Результат |
|:---|:---|
| `tsc --noEmit` | **0** помилок |
| `eslint` | **0** помилок / **0** попереджень |
| `npm test` | **2098** тестів / 378 сюїт / **0 fail** (~68 с) |
| `vite build` | ✓ 4.18 s |
| TS-файлів (джерела) | 283 (~23 076 рядків) |
| Тестових файлів | 110 |
| `Record<string, any>` | 99 |
| `: any` / `as any` | 67 |

> [!NOTE]
> Статика зелена. Проблема замовника **не діагностується компілятором** — це проблема архітектури, а не типів. Саме тому вона й повторюється.

---

## 🔴 ГОЛОВНА ПРИЧИНА: набір дій над коментарем не має єдиного реєстру

Розширення показує **одну й ту саму** панель дій над коментарем на трьох поверхнях:

| Поверхня | Файл побудови панелі | Імена дій | Іконки |
|:---|:---|:---|:---|
| StreamYard | [modules/ui_comments.ts:23-38](../../../modules/ui_comments.ts) | `copy-comment`, `copy-author-comment`, `copy-prayer` | 📄 ❓ 🙏 |
| YouTube Watch | [youtube/yt_comment_panel.ts:23-42](../../../youtube/yt_comment_panel.ts) | `copy-comment`, `add-question`, `add-prayer` | 📄 + текстові підписи |
| YouTube Studio | [youtube/studio/studio_ui.ts:32-52](../../../youtube/studio/studio_ui.ts) | `studio-copy`, `studio-question`, `studio-prayer` | 📋 ❓ 🙏 |

Це **три незалежні описи однієї сутності**: три словники імен дій, три набори іконок, три префікси CSS-класів (`syh-`, `syh-yt-btn-`, `syh-studio-btn-`). Спільним є лише `UiFactory.createButton` — тобто **уніфіковано вигляд кнопки, але не її існування**.

### Що фактично треба змінити, щоб додати ОДНУ нову дію (напр. «до подяк»)

| # | Місце | Файл |
|:--|:---|:---|
| 1 | Опис кнопки для StreamYard | `modules/ui_comments.ts` |
| 2 | Опис кнопки для YouTube | `youtube/yt_comment_panel.ts` |
| 3 | Опис кнопки для Studio | `youtube/studio/studio_ui.ts` |
| 4 | Слот кнопки в контракті платформи | `modules/comment_platform_adapter.ts` → `PlatformButtons` |
| 5 | Тип стану | `ButtonStateType = 'question' \| 'prayer' \| null` — там само |
| 6 | Обробник кліку | `modules/comment_injector.ts` (`handleQuestionClick` / `handlePrayerClick` — по методу на дію) |
| 7 | Візуальний стан у 2 адаптерах | `youtube/yt_adapter.ts`, `youtube/studio/studio_adapter.ts` (`applyButtonState`) |
| 8 | Окремий конвеєр StreamYard | `modules/event_comments/button_handlers.ts`, `formatters.ts`, `actions.ts` |
| 9 | Схема сховища + міграція | `modules/storage_keys.ts`, `comment_collected_store.ts` |
| 10 | Відображення у попапі | `popup/popup_telegram_collected.ts`, `modules/ui_starred_markup.ts` |

**Мінімум 10 точок дотику.** Агент (як і людина) фізично не «побачить» їх усі з формулювання «додай кнопку», тому й дописує там, де почав.

### Кількісне підтвердження

- Літерал `'question' | 'prayer'` **вписаний 28 разів у 16 файлах** замість одного експортованого типу:
  `comment_action_runner`, `comment_injector`, `comment_platform_adapter`, `comment_types`, `event_bus`, `event_comments/types`, `types`, `ui_starred_markup`, `studio/state_resolvers`, `studio/studio_adapter`, `studio/studio_comment_key`, `studio/studio_init`, `studio/studio_ui`, `yt_comment_visual_state`, `yt_events`, `yt_state`.
- `PlatformButtons` — **фіксовані 3 іменовані слоти** (`questionBtn`, `prayerBtn`, `copyBtn`), а не список дій. Розширити його без правки інтерфейсу неможливо.
- **StreamYard узагалі не переведено на Adapter Pattern.** `CommentInjector` + `BaseCommentPlatformAdapter` використовують лише YouTube і Studio (`yt_adapter.ts`, `studio/studio_adapter.ts`). Для StreamYard живе паралельний конвеєр `modules/event_comments/*` (19 файлів). Тобто в проєкті **дві різні архітектури для однієї задачі**.

> [!IMPORTANT]
> **Рішення (ядро всіх подальших задач):** увести `modules/comment_actions.ts` — єдиний реєстр дій
> (`id`, `icon`, `title`, `stateType`, `handler`, `platforms`), з якого:
> будується панель на всіх трьох поверхнях; виводиться `ButtonStateType`;
> `PlatformButtons` стає `Record<ActionId, HTMLElement | null>`;
> `CommentInjector` диспетчеризує за `id`, а не має метод на кожну дію.
> Після цього «додати кнопку» = **один запис у таблиці**.

---

## 🟠 ТА САМА ХВОРОБА В ІНШИХ МІСЦЯХ

### SSOT-2: поле аркуша у попапі — 6 точок дотику

Шаблон аркуша клонується один раз ([popup/popup_sheet_renderer.ts:7-45](../../../popup/popup_sheet_renderer.ts)) — це **правильний** патерн і саме він дає «однакові вікна». Але кожне поле все одно треба зареєструвати вручну ще в 5 місцях:

1. розмітка в `<template id="sheet-content-template">` (`popup/popup.html`);
2. рядок `setAttrId('.js-…', '…__${sId}')` у `popup_sheet_renderer.ts`;
3. ключ у `POPUP_SHEET_KEYS` (`modules/storage`);
4. легасі-префікс `tg_<field>__` (`popup/popup_sheet_keys.ts`);
5. функція `restoreSheet<Field>` (`popup/popup_sheet_field_restorer.ts`);
6. збереження в `popup/popup_sheet_bindings.ts`.

**Рішення:** таблиця дескрипторів полів (`{ cssHook, idPrefix, storageKey, legacyPrefix, kind }`) — рендер, відновлення і збереження генеруються з неї.

### SSOT-3: налаштування на сторінці опцій — 5–7 точок дотику

`OptionsState` (інтерфейс) → `DEFAULT_OPTIONS` → розмітка в `options.html` → `populateFormElements` → `readOptionsFromForm` → `validation.ts` → споживач. Усі п'ять списків уже мають однакову довжину (11 полів) і руками тримаються синхронними ([options/form.ts:33-45](../../../options/form.ts)).

**Рішення:** один масив дескрипторів опцій; `populate`/`read`/`validate` — цикли по ньому.

### SSOT-4: i18n не масштабується разом з UI

`_locales/{uk,ru,en}/messages.json` — по **54 рядки**, тоді як UI містить сотні україномовних літералів прямо в коді (`title`, `aria-label`, тексти кнопок). Нова кнопка не потрапляє в переклад узагалі — механізму, який би це вимагав, немає.

---

## 🟡 ЗАЛИШКИ ПОПЕРЕДНЬОГО АУДИТУ (2026-09-05)

Хвилі 1–4 реалізовано і закомічено (`70c0093`, `a7d41a4`, `c1c7450`). Не закрито:

| # | Пункт | Статус |
|:--|:---|:---|
| 1 | `noUncheckedIndexedAccess` у `tsconfig.json` | ❌ вимкнено (`noImplicitReturns`, `noFallthroughCasesInSwitch` — увімкнено ✅) |
| 2 | `Record<string, any>` у Storage API | ❌ 99 випадків; типізованої схеми сховища немає |
| 3 | Тести entry points (`main.ts`, `youtube_content.ts`, `studio_init.ts`, `popup_listeners.ts`) | ❌ відсутні |
| 4 | 123 файли пласко в `modules/` (4 підпапки на 128 одиниць) | ❌ без шарів |
| 5 | `banner_modal_parser` / `banner_modal_draft` без прямих тестів | ✅ закрито 2026-09-08 (21 тест) |
| 6 | Сміття в корені (`split.cjs`, `tmp_*.json`) | ✅ винесено в `scratch/`, ігнорується |

---

## 📄 ДОКУМЕНТАЦІЯ

| Проблема | Деталі |
|:---|:---|
| **`docs/` розрісся до 123 файлів** | 60+ — архівні аудити 12 різних моделей; актуальний зріз знайти важко |
| **Немає `ARCHITECTURE.md`** | Карта шарів існує **лише всередині аудиту** 2026-09-05 і помре разом із ним |
| **`AGENTS.md` = 101 рядок правил суцільним списком** | Правила накопичуються по одному рядку за коміт (парсери, транслітерація, happy-dom, суфікси авторів). Агент читає стіну тексту й застосовує вибірково |
| **Дублювання оглядових документів** | `DEVELOPER_NOTES.md` (16 КБ), `walkthrough.md`, `Daily_tips.md`, `README.md` частково переказують одне одного |
| **Немає документа «як додати X»** | Найчастіша операція в проєкті (додати кнопку/поле/опцію) ніде не описана — звідси й переписування наново |

---

## 🤖 ВКАЗІВКИ АГЕНТАМ

Поточний стан: `AGENTS.md` (101 рядок) + 3 скіли (`chrome-extension` 16, `streamyard` 59, `youtube-studio` 57 рядків). Вигаданих селекторів після правок 2026-09-05 **не виявлено** ✅.

Чого бракує саме під заявлену проблему:

1. **Реєстр реєстрів.** Агент не знає, що в проєкті вже є SSOT-точки (`modules/sheets.ts`, `STORAGE_KEYS`, `POPUP_SHEET_KEYS`, `UiFactory`, `COMMENT_ACTION_BUTTONS`, `PANEL_BUTTONS`, `DEFAULT_OPTIONS`). Потрібен явний список: «UI-елемент такого типу описується ось тут — і ніде більше».
2. **Правило «спершу шукай таблицю».** Наявне правило SSOT сформульоване як заборона (*«заборонено дублювати стан»*), але не як **інструкція до дії** (*«перед створенням елемента знайди його реєстр; якщо реєстру немає — створи реєстр, а не другу копію»*).
3. **Чекліст «додаю кнопку / поле / опцію»** зі списком точок дотику (розділи вище) — поки їх 10/6/5, поки не зроблено рефакторинг реєстру.
4. **Заборона на часткову реалізацію крос-поверхневих дій.** Якщо дія стосується коментаря — вона обов'язково має бути на всіх трьох поверхнях або свідомо позначена як платформозалежна в реєстрі.
5. **`npm run verify`** — один скрипт (`test && lint && typecheck && build`) замість чотирьох, які легко пропустити.

---

## 🎯 ПЛАН (за пріоритетом)

### 🔴 Хвиля 1 — Реєстр дій над коментарем *(усуває першопричину)*
1. `modules/comment_actions.ts` — єдиний реєстр дій; `ButtonStateType` виводиться з нього.
2. `PlatformButtons` → мапа за `id` дії; `CommentInjector` — диспетчер за `id`.
3. Панелі всіх трьох поверхонь будуються з реєстру (різняться лише класами/іконками через оверайди платформи).
4. StreamYard переводиться на `CommentPlatformAdapter` (третій адаптер) — `modules/event_comments/*` згортається.

### 🟡 Хвиля 2 — Дескриптори полів і опцій
5. Таблиця полів аркуша → рендер + відновлення + збереження з одного джерела.
6. Таблиця опцій → `populate`/`read`/`validate` циклами.

### 🟢 Хвиля 3 — Документація та вказівки агентам
7. `docs/ARCHITECTURE.md` (карта шарів + список реєстрів).
8. `docs/HOWTO_ADD.md` — «додати кнопку / поле аркуша / опцію / платформу».
9. `AGENTS.md` → короткий протокол + винесені `docs/rules/*.md`.
10. Скіли: додати розділ «реєстри» з посиланнями на конкретні файли.
11. `npm run verify`.
12. Прибирання `docs/` (123 файли → актуальне/архів).

### 🔵 Хвиля 4 — Технічний борг
13. Типізована схема сховища замість `Record<string, any>` (99).
14. `noUncheckedIndexedAccess`.
15. Тести entry points.
16. Шари всередині `modules/` (123 файли пласко).

---

*Аудит виконано на закоміченому дереві `c1c7450`; усі числа отримані прогонами й grep'ами по кодовій базі, без припущень.*
