# Незалежний Аудит Коду — StreamYard Helper (KiloCode / Laguna S 2.1)

**Дата:** 2026-08-03
**Аудитор:** KiloCode (модель `poolside/laguna-s-2.1:free`)
**Обсяг проєкту:** Chrome Extension (Manifest V3, TypeScript / Vite + CRX)
**Статус:** Активний (Worktree)

---

## Методологія

Аудит виконано шляхом прямого читання вихідних файлів проєкту (`modules/*`, `youtube/*`, `youtube/studio/*`, `popup/*`, `options/*`, `main.ts`, `background/*`) без використання попередніх звітів. Перевірка стану CI/збірки виконана за допомогою `npm run lint`, `npm run test`, `npm run build` та додатково `npx tsc --noEmit` (індепендентна типізована перевірка, яку **не запускає** жоден із скриптів).

### База для аудиту (стан на 2026-08-03)

| Команда       | Команда                | Результат                                                                 |
|---------------|------------------------|---------------------------------------------------------------------------|
| `npm run lint`  | ESLint (TS/JS)         | ✅ Чисто (0 помилок)                                                        |
| `npm run test`  | Node.js test runner    | ✅ 97 тестів, 11 наборів, 0 failures, duration ~1.1s                         |
| `npm run build` | Vite + CRX             | ✅ Успішна (64 модулі, dist/ збілдовано)                                     |
| `npx tsc --noEmit` | TypeScript (strict) | ❌ **114 типізованих помилок** (TS2769 — 47шт, TS2339 — 21шт, TS2345 — 16шт, TS2304 — 10шт та інші) |

---

## 🚨 Головна виявлення: типізована перевірка (tsc) вимкнена з конвеєру CI

**`tsconfig.json`** має `"strict": true`, тому `tsc --noEmit` є суворим. Однак **жоден** скрипт (`lint`, `test`, `build`) його не виконує:

```jsonc
// tsconfig.json (фрагмент)
"strict": true,   // <-- суворий режим
```

Щоб перевірити, я запустив `npx tsc --noEmit` вручну і отримав **114 помилок типізації**, які потрапляють у `dist/` (через Vite/esbuild, який робить **тільки транспіляцію** без перевірки типів). Це означає, що **реальні помилки типів не блокують збірку** і накидаються незамітними.

#### Класифікація помилок tsc

| Код     | Кількість | Опис                                                  | Приклад розташування                 |
|---------|-----------|-------------------------------------------------------|--------------------------------------|
| TS2769  | 47        | No overload matches this call — `querySelector(...)` | `event_comments.ts`, `yt_ui.ts`, `youtube_content.ts`, `studio_selectors.ts` |
| TS2339  | 21        | Property 'X' does not exist on type '{}'             | `.textContent`, `.style`, `.offsetWidth` на недостатньо типізованих результатах `querySelector` |
| TS2345  | 16        | `string[]` не приводиться до `string` (SelectorValue)| `studio_selectors.ts`, `yt_adapter.ts` |
| TS2304  | 10        | Cannot find name 'X' — відсутній імпорт              | `anti_afk.ts:98` (`SYH_BUS`), `yt_events.ts:34` (`CommentStateCaches`) |
| TS2322  | 7         | Type mismatch                                         | `studio_selectors.ts`                                |
| TS18047 | 3         | 'X' is possibly 'null' / 'Y' is possibly null        | `event_comments.ts:137,198,330` (`self.UI is possibly null`) |
| TS2550  | 2         | Property 'replaceAll' does not exist                 | `popup_translit.ts:17,27` (target ES2020 < ES2021)  |
| інші    | 32        | TS7006, TS2554, TS2353, TS2341, TS2740              | різні                                          |

> **Наслідок:** без типізованої перевірки у CI будь-яка рефакторинг-помилка або регресія типів проходить непоміченою. Це єдиний системний дефект, який робить багити у коді видимими.

---

## 🔴 Критичні баги (функціональні, а не лише типізація)

### 1. `SYH_BUS` не імпортовано у `anti_afk.ts` → подія `ANTI_AFK_TRIGGERED` ніколи не видається

**Файл:** `modules/anti_afk.ts:98-99`

```ts
if (typeof SYH_BUS !== 'undefined') {
    SYH_BUS.emit('ANTI_AFK_TRIGGERED', { timestamp: Date.now() });
}
```

`SYH_BUS` **ніде не імпортовується** у цьому модулі (імпортований лише `SYH_I18N` з `./i18n`). `typeof SYH_BUS` для невизначеної змінної повертає `'undefined'` без помилки, тому цей блок **ніколи не виконується** — івент `ANTI_AFK_TRIGGERED` (який оголошений у `event_bus.ts:13` і `SyhEventPayloads`) так і залишається невидаваним. Будь-подібний слухач на нього чекає часу назустріч і ніколи не дзвонить.

**Чому це проходить:** `tsc` видає `TS2304: Cannot find name 'SYH_BUS'`, але `tsc` не запускається у CI, а Vite/esbuild транспілює мовчки.

**Виправлення:** `import { SYH_BUS } from './event_bus';`

### 2. `yt_events.ts` — бита типізація адаптера колекцій

**Файл:** `youtube/yt_events.ts:34-53`

```ts
export interface YTCaches extends CommentStateCaches { ... }  // TS2304: CommentStateCaches not imported
```

Інтерфейс `YTCaches extends CommentStateCaches`, але `CommentStateCaches` **не імпортований** з `comment_platform_adapter.ts`. Наслідок:

- `YTCaches` не має власне `buttonStates`/`checkboxStates` (TS2353, TS2345) — об'єкт, який передається у `CommentInjector`, структурно не відповідає `CommentStateCaches`.
- Це **часова помилка типізації**, яка не впливає на runtime (esbuild не чекає), але свідчить про незавершений перехід на `CommentInjector` у YouTube-адаптері: типи невідповідні, адаптер створюється, але кеші не типізовані коректно.

**Виправлення:** імпортувати `CommentStateCaches` та переконатися, що `YTCaches` коректно розширює його.

### 3. `self.autoHealObserver` — мертвий код / помилка типізації в `event_comments.ts`

**Файл:** `modules/event_comments.ts:97-99`

```ts
if (self.autoHealObserver) {
    self.autoHealObserver.disconnect();
}
```

`autoHealObserver` **не оголошений** у інтерфейсі `SyhEventComments` і **ніде не присвоюється**. Це мертвий код (TS2339). Спринг-клін авто-хілу вже коректно керується через `this.unregisterAutoHeal` (функція, що повертається з `SYH_DOM_OBSERVER.register`), тому ця гілка зайнялася. Проте вона створює плутанину та ламає типізацію.

### 4. `destroy()` у `event_comments.ts` не відписує 4 із 6 обробників подій (leak)

**Файл:** `modules/event_comments.ts:67-85`

`bindEvents()` реєструє **6** слухачів на `document`:
1. `click` (лінійний, `self._clickHandler` ✅ збережений)
2. `mousedown` (middle-click unstar) — анонімний ❌
3. `contextmenu` (коментар) — анонімний ❌
4. `contextmenu` (syh-button copy-prayer) — анонімний ❌
5. `mousedown` (syh-button) — анонімний ❌
6. `mouseup` (коментар) — анонімний ❌

`destroy()` видаляє лише `_clickHandler`, `_contextHandler` (який **ніколи не присвоюється**), і `_changeHandler` (теж не присвоюється). Отже **4 сторони євентики не відписуються** і при повторному `bindEvents()` після `destroy()` будуть **подвійно прив'язані**. Хоча `isBound`-гвард знижує ймовірність, це технічний борг і потенційний джерело подвійних спрацьовувань.

### 5. `replaceAll` у `popup_translit.ts` не підтримується tsconfig target (TS2550)

**Файл:** `modules/popup_translit.ts:16,27` (TypeScript TS2550)

`String.prototype.replaceAll` доступний, починаючи з ES2021, але `tsconfig.json` має `"target": "ES2020"` без відповідного `lib`. Це **типізована помилка**, яка не впливає на runtime у сучасних Chrome (replaceAll підтримується), але варта виправлення для узгодженості:
- легше додати `"lib": ["ES2021", "DOM", "DOM.Iterable", "Scriptable"]` або `"target": "ES2021"`, або замінити `replaceAll` на `.split(x).join(x)`.

---

## 🟠 Висока важливість — системні порушення DRY / архітектура

### 6. Відсутність `tsc` у pipeline (див. п. 0) створює умови для накопичення 114 помилок типізації

Це корінь тому, чому п.1–5 проходять непоміченими. Без цього етапу жоден з виявлених типових дефектів (в т.ч. реальних `TS2304` з п.1) не може бути перехоплений.

### 7. `STORY_TYPES` / `SelectorValue` (string \| string[]) не розв'язується перед `querySelector`

Помилки TS2769 (47шт) та TS2345 (16шт) пов'язані з тим, що `STUDIO_SELECTORS` і `SYH_CONFIG.SELECTORS` мають варіанти типу `string[]`, які передаються **прямо** у `el.querySelector(selector)`/`el.querySelectorAll(selector)` без розв'язання. У новішому коді є утиліти `resolveSelector`/`resolveSelectorAll` (config.ts:23), але їх **не використовується** у:
- `studio_selectors.ts` (усі функції)
- `yt_ui.ts`
- `youtube_content.ts`
- `event_comments.ts`
- `ui_comments.ts`

> **Runtime note:** це працює **випадково** — `querySelector(['.a', '.b'])` коерціє масив до `".a,.b"` через `.toString()`. Але це не гарантовано у всіх контекстах (наприклад, коли `SelectorValue` приходить як `null` або коли esbuild-оптимізатори змінять поведінку) і робить код ламаним для type-checker.

### 8. Неповний перехід на `CommentInjector` у StreamYard (God Object залишається)

Існує нова інфраструктура (`comment_injector.ts` `CommentInjector` + `comment_platform_adapter.ts` `CommentPlatformAdapter`), яку вже використовує `youtube/yt_events.ts`. Проте **StreamYard-сторона** (`modules/event_comments.ts`) **продовжує** працювати за старим патерном `SYH_EVENT_COMMENTS`-God Object: в одній функції `bindEvents()` (230 лін.) одночасно делегуються кліки, логується в storage (`saveToDatabase`/`removeFromDatabase`), ініціалізується auto-heal, формується текст банеру. `CommentService` (новий сервіс) його частково імпортує, але `event_comments.ts` залишає власні `saveToDatabase`/`removeFromDatabase`, які **дублюють** логіку `CommentService.savePrayerRecord`/`removePrayerRecord`. Це створює ризик розходження TTL/логіки збереження.

---

## 🟡 Середня важливість — технічний борг

### 9. Дублювання legacy-ключів сховища (`tg_*` ↔ `POPUP_SHEET_KEYS`)

`popup_init.ts` і `popup_telegram.ts` підтримують **спільно** старі ключі `tg_oldList__${sId}` та нові `POPUP_SHEET_KEYS.oldList(sId)` за допомогою `??`. Це миграційний шар, але:
- Кожен `input`-хендлер **двоєчний writes** обидва ключа (лин. 290-293, 302-306, 315-318, 328-331).
- Це збільшує розвмір storage (2x) до тих пір, поки міграція не завершиться.

Рекомендація: додати одноразову `migrateStorageIfNeeded()` для popup-ключів, аналогічно вже наявній для `storage.ts`, і видалити legacy-запис.

### 10. `popup_translit.ts` має top-level DOM-ініціацію поза `$(document).ready(...)`

**Файл:** `popup/popup_translit.ts:50-65`

```ts
const translateBtn = document.getElementById('Translate');   // ← виконується під час імпорту
if (translateBtn) { translateBtn.addEventListener('click', () => {...}); }
```

Цей код виконується **одразу при імпорті модуля** (коли `translateBtn` ще не існує у DOM, оскіль ні), що робить обробник небезпечним для порядку ініціалізації. AGENTS.md вимагує: *"Усі DOM event listeners у скриптах попапу/опцій повинні бути строго розташовані всередині `$(document).ready(...)` або `DOMContentLoaded`."* Цей файл **порушує** це правило.

### 11. Відсутність типізованого перевірення слідкуючи за відсутністю підписки

`event_bus.ts` має дуже добрий типізований `TypedEventBus`. Жоден слухач не підписаний у `main.ts`/контент-скриптах на `SHEET_DATA_PROCESSED` (який `CommentService` емітує), отже частина реактивної архітектури **не задіяна** — схоже на недофінішовану інтеграцію.

### 12. Відсутність `strictNullChecks` обробки в `event_comments.ts`

15 з 114 помилок (TS18047) — `self.UI` is possibly null / `self.UTILS` possibly null. Це просто `SyhEventComments.UI?: SyhUi | null` з ініціалізацією `null`. Будь-який виклик `self.UI.X` ламається, якби `UI` був `null` у runtime (хоча `init()` за замовчуванням ставить `SYH_UI`). Це технічний борг: варто або робити `UI!` після ініціалізації, або додавати ранні `if (!self.UI) return;`.

---

## 🟢 Низька важливість

### 13. Магічні кольори в CSS-in-JS

`video_copier.ts`, `banner_creator.ts`, `popup_prayers.ts` та ін. використовують інлайн `style.cssText` з hex-кольорами (`#28a745`, `#005DF7`...), хоча `popup.css` вже визначає CSS-змінні (`--primary`, `--new-border`). Це ускладнює темізацію.

### 14. Інконсістентність імпорту типів

`event_comments.ts` імпортує `PrayerRecord` локально (лінії 11-18), хоча такий інтерфейс вже існує в `comment_service.ts`. Дублювання інтерфейсу-типу.

### 15. `banner_creator.ts` створює `BannerItem` з полем `category: string`

`modules/banner_creator.ts:8` — `category: string` замість `'stream' | 'audience' | 'prayer'`. Це не дає compile-time захисту від oпечаток.

---

## Перевірка раніше заявлених фіксів (Progress Log з попереднього аудиту)

Незалежно від попереднього звіту, я верифікував стан коду:

| Фікс з попереднього аудиту | Статус | Доказ |
|---------------------------|--------|-------|
| 1.1 Подвійний запис YouTube (`yt_events.ts::saveCollectedItem`) | ✅ **Виправлено** | `yt_events.ts:28` тепер лише `CommentService.saveCollectedComment` (без `SYH_STORAGE.setAsync`); `CommentService.saveCollectedComment` дедуплікує за `id`/`author+text+type` |
| 1.2 TTL у `RetentionService` з урахуванням `item.type` | ✅ **Виправлено** | `retention_service.ts` — `isFreshPrayerItem` розрізняє `type === 'prayer'` (48г) vs 30 днів; `popup_prayers.ts:54` використовує `filterFreshPrayers` |
| 1.3 `Map<sheetId, Timer>` у `popup_init.ts` | ✅ **Виправлено** | `popup_init.ts:279-282` — `oldListTimers`/`newTelegramTimers`/`answeredIdsTimers`/`finalResultTimers` — Maps |
| 2 `vp_ss`-спецкейси | ✅ **Виправлено** | `popup_telegram.ts`, `sheet_state_service.ts` використовують `getSheetCollectedStorageKey(sheetId)`; спецкейсів не знайдено |
| 5 `SYH_I18N` адаптація | ✅ **Виправлено** | `config.ts:91`, `anti_afk.ts:77` використовують `SYH_I18N.getMessage` |
| 5/6 `CommentInjector` для YouTube | ⚠️ **Частково** | `yt_events.ts` використовує `CommentInjector` + `YouTubeCommentAdapter`, але типізація `YTCaches` бита (див. п.2) |
| 9 Auto-Heal через `SYH_DOM_OBSERVER` | ⚠️ **Частково** | `event_comments.ts` тепер реєструє через `SYH_DOM_OBSERVER` (лінії 167-171), але залишився мертвий `autoHealObserver` (п.3) |

---

## Оцінка тестового покриття

Тестові набори (11): `utils`, `ui_state`, `telegram_parser`, `storage`, `state`, `sheet_state_service`, `retention_service`, `popup_dom`, `plugin_registry`, `fuzzy_match`, `comment_service`, `comment_assistant`, `channel_config`, `anti_afk`, `dataset_syntax`, `dataset_attr`, `css_lint`.

**Ядро доменної логіки добре покрите:** `CommentService`, `RetentionService`, `SheetStateService`, `SYH_UTILS`, `SYH_PARSERS`/regex, `fuzzy_match`, `storage` міграція.

**Прогалини:** жодних DOM-тестів/інтеграційний тестів для:
- `event_comments.ts` (God Object, найтяжча логіка ін'єкції кнопок на StreamYard)
- `event_banners.ts`
- `banner_creator.ts`
- `comment_injector.ts` / `yt_adapter.ts` (нова інфраструктура)
- `youtube/youtube_content.ts`
- `youtube/studio/*` (studio_content, studio_events, studio_ui, studio_selectors)
- `popup_translit.ts`

Найкрихкіша бізнес-логіка (парсинг) добре тестована, а **DOM-шари**, де мінімум 4 з найажчих багів знаходяться (п.1, п.3, п.4), — **не тестовані**.

---

## Рекомендований план дій

### Тривалість < 1 дня (високий impact)

1. **Додати `tsc --noEmit` у CI/lint.** Це єдиний спосіб перехопити п.1 та п.2. Додати скрипт `"typecheck": "tsc --noEmit"` та `npm run eslint && npm run typecheck && npm run test` у pre-commit/CI.
2. **Виправити `SYH_BUS` у `anti_afk.ts`** — додати імпорт. (TS2304, п.1)
3. **Виправити типізовку `YTCaches` у `yt_events.ts`** — імпортувати `CommentStateCaches`, переконатися, що інтерфейс коректно розширює. (п.2)
4. **Перекласти `popup_translit.ts` у `$(document).ready(...)`** для відповідності AGENTS.md. (п.10)
5. **Виправити `replaceAll` у `popup_translit.ts`** або підняти `target` до `ES2021`. (TS2550)

### Тривалість 1-2 дні

6. **Очистити мертвий `autoHealObserver`** у `event_comments.ts` та зберегти всі 6 listener-обробників у `this._*` для коректного `destroy()`. (п.3, п.4)
7. **Уніфікувати `SelectorValue` resolution** — замінити прямі `querySelector(arraySelector)` на `resolveSelector`/`resolveSelectorAll` у `studio_selectors.ts`, `yt_ui.ts`, `youtube_content.ts`, `event_comments.ts`, `ui_comments.ts`. Це прибере ~70 TS2769/TS2345 помилок. (п.7)
8. **Додати `strictNullChecks`-guard** або non-null assertions у `event_comments.ts` для `self.UI`/`self.UTILS`. (п.12)

### Тривалість 3-5 днів

9. **Додати типізовані тести для DOM-шарів** (`comment_injector`, `yt_adapter`, `event_comments` bindEvents) за допомогою jsdom + chrome-mock патерн, що вже є у `tests/`. Це запобігатиме регресіям п.1, п.3, п.4.
10. **Довести міграцію `event_comments.ts` на `CommentInjector`** — прибрати `saveToDatabase`/`removeFromDatabase`-дублі, використовувати `CommentService`.
11. **Чистка legacy popup-ключів** (`tg_*`) після одноразової міграції.

---

## Статус виконання (Progress Log)

| Крок | Дія | Статус |
|------|-----|--------|
| 0.1 | Перевірено `npm run lint` | ✅ Чистий |
| 0.2 | Перевірено `npm run test` | ✅ 97/97 pass, 11 suites |
| 0.3 | Перевірено `npm run build` | ✅ Успішна |
| 0.4 | Запущено `npx tsc --noEmit` | ⚠️ **114 помилок** (не в CI!) |
| 0.5 | Верифіковано фікси з попереднього аудиту | ✅ більшість; п.5 частково |

Наступний крок: після підписання цього звіту — **створити чергу задач** (`2026-08-03_KiloCode_Laguna_S_2.1_TASKS.md`) на основі розділу "Рекомендований план дій".
