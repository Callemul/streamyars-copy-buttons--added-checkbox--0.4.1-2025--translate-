# Архітектура StreamYard Helper

> Актуально на 2026-09-10 (після хвиль 1–4 аудиту `docs/audits/active/2026-09-08_CLAUDE_OPUS_5_AUDIT.md`
> і переїзду `modules/` по теках, T20, `docs/plans/T20-modules-layout.md`).
> Практичні кроки «як додати кнопку / поле / опцію» — у [HOWTO_ADD.md](HOWTO_ADD.md).

---

## 1. Точки входу

Chrome Manifest V3, три content script'и + service worker + два UI-документи:

| Точка входу | Файл | Де працює |
|---|---|---|
| StreamYard | `main.ts` → `modules/streamyard/bootstrap/bootstrap_app.ts` | `https://streamyard.com/*` |
| YouTube (перегляд/трансляція) | `youtube/youtube_content.ts` | `*://*.youtube.com/*` (крім Studio) |
| YouTube Studio | `youtube/studio/studio_content.ts` | `https://studio.youtube.com/*` |
| Service worker | `background/service-worker.ts` → `message_router.ts`, `badge_updater.ts` | фон |
| Попап | `popup/popup.html` → `popup/popup_init.ts` | іконка розширення |
| Налаштування | `options/options.html` → `options/options.ts` | окрема вкладка |

`main.ts` бере блокування повторної ініціалізації (`claimInitLock`), далі `initSyhApp()`
піднімає ядро та реєструє плагіни через `PluginRegistry` (`modules/core/plugin_registry.ts`).
Кожен крок ініціалізації обгорнутий власним `try/catch` — падіння одного модуля не
вбиває решту (error boundaries, аудит 2026-09-05).

---

## 2. Шари

```
┌───────────────────────────────────────────────────────────────────────┐
│ PRESENTATION — усе, що торкається DOM                                 │
│  popup/ (44 файли) · options/ (12) · modules/streamyard/ui/*.ts       │
│  modules/banners/banner_modal*.ts · modules/stats/stats_modal.ts      │
│  youtube/yt_comment_panel.ts · youtube/studio/studio_ui.ts            │
├───────────────────────────────────────────────────────────────────────┤
│ ORCHESTRATION — хто кого запускає                                     │
│  main.ts → bootstrap_app.ts → PluginRegistry                          │
│  background/service-worker.ts → message_router.ts                     │
│  youtube/studio/studio_content.ts (StudioModuleController)            │
│  modules/comments/comment_injector.ts + comment_action_runner.ts      │
│  modules/streamyard/comments/streamyard_comment_binding.ts            │
├───────────────────────────────────────────────────────────────────────┤
│ DOMAIN — чисті функції, без DOM і без chrome.*                        │
│  modules/comments/comment_actions.ts (реєстр дій) · modules/parsers/* │
│  modules/banners/banner_parser*.ts · modules/core/utils_text.ts       │
│  modules/sheets/sheet_stats_calculator.ts · modules/stats/stats_math.ts │
├───────────────────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE — стан і зовнішній світ                                │
│  SYH_STORAGE (modules/storage/storage.ts → ops_async / ops_callback / │
│  migration) · CommentService → collected_store · state_store ·        │
│  prayer_record_store · modules/dom/dom_observer.ts ·                  │
│  modules/messaging/messaging_service.ts · chrome.*                    │
└───────────────────────────────────────────────────────────────────────┘
```

Ролі вище описують відповідальність модулів, а не точний граф імпортів.
Оркестратори можуть запускати UI; чиста доменна логіка не повинна залежати від UI.
DOM попапу не має жити в `modules/` (саме тому `telegram_sheet_dom.ts` переїхав у `popup/`),
а `modules/parsers/*` не має знати ні про DOM, ні про `chrome.storage`.

### 2.1 Теки — за доменами, а не за шарами

Дерево тек `modules/` **не повторює** чотири ролі вище. Ролі описують відповідальність,
а розкладка по теках —
окреме рішення, зроблене за фактичним графом імпортів (T20, `docs/plans/T20-modules-layout.md`).
Причина: якби теки йшли за шарами, чотири шари утворили б чотири взаємні цикли
(`domain ⇄ infra`, `domain ⇄ presentation`, `infra ⇄ presentation`, `orchestration ⇄ presentation`) —
`ui_comments.ts` (Presentation) значеннєво тягне `comment_actions.ts` (Domain), а
`bootstrap_dom.ts`, `streamyard_adapter.ts`, `stats_tracker.ts` й подібні (Orchestration)
значеннєво тягнуть Presentation. Розкладка за доменами натомість дає ациклічний DAG
(нуль значеннєвих циклів між теками — перевіряється `npm run check:architecture`).

Специфічний для StreamYard код зведений у `modules/streamyard/`, решта тек групує
доменні та допоміжні модулі. Наявність лише внутрішніх споживачів сама по собі не
означає прив'язку до платформи: спільні сервіси теж викликають внутрішні допоміжні модулі.

```
modules/
├── registry/     статичні реєстри-SSOT: config.ts (SYH_CONFIG) · sheets.ts ·
│                 channel_config.ts · i18n.ts
├── dom/          DOM-примітиви без прив'язки до поверхні: ui_factory.ts ·
│                 dom_observer.ts · escape_html.ts
├── storage/      SYH_STORAGE: фасад, ключі, схема, міграції, дві реалізації, runtime
├── messaging/    chrome.runtime-повідомлення
├── core/         типи, стан, шина подій, реєстр плагінів, фасад утиліт
├── parsers/      розбір тексту коментаря
├── comments/     спільний конвеєр коментарів (усі три поверхні)
│   └── assistant/  підсвітка тригерів (колишня comment_assistant/)
├── sheets/       сервіси над аркушами + retention
├── telegram/     експорт у формат телеграму
├── banners/      створення й розбір банерів
├── stats/        статистика трансляції
├── video/        копіювач відео
└── streamyard/   ПОВЕРХНЯ StreamYard — сюди не ходить ніхто, крім main.ts
    ├── bootstrap/    bootstrap_app / _dom / _messages
    ├── ui/           панелі, фільтри, чекбокси, зірки, банери в правій колонці
    ├── comments/     адаптер, binding, auto-heal, ПКМ/коліщатко, база молитов
    │   └── handlers/
    ├── banners/      колишня event_banners/
    ├── anti_afk/
    └── right_tabs/
```

**Правило, яке треба тримати:** між теками `modules/` заборонені значеннєві цикли.
Зворотне ребро допускається лише як `import type` (стирається компілятором) — див. правило
в `AGENTS.md`.

---

## 3. Робота з коментарями — спільний конвеєр

Одна й та сама модель на трьох поверхнях:

```
        ┌── реєстр дій (modules/comments/comment_actions.ts) ─┐
        │  copy · question · prayer                    │
        │  id · stateType · icon · title · оверайди    │
        │  events · mouseButtons (події та кнопки миші)│
        └──────────────┬───────────────────────────────┘
                       │ будує кнопки            │ дає stateType і події
        ┌──────────────▼──────────────┐          │
        │ панелі поверхонь            │          │
        │ ui_comments.ts (StreamYard) │          │
        │ yt_comment_panel.ts         │          │
        │ studio_ui.ts                │          │
        └──────────────┬──────────────┘          │
                       │ DOM-кнопки              │
        ┌──────────────▼──────────────────────────▼─────┐
        │ CommentInjector — навішує слухачі циклом      │
        │ по реєстру, диспетчеризує за id дії           │
        └──────────────┬────────────────────────────────┘
                       │
        ┌──────────────▼─────────────────┐   ┌────────────────────────────┐
        │ CommentPlatformAdapter         │──▶│ comment_action_runner.ts   │
        │ yt_adapter · studio_adapter    │   │ toggle on / untoggle       │
        └──────────────┬─────────────────┘   └───────────┬────────────────┘
                       │ runAction (StreamYard)          │
        ┌──────────────▼─────────────────┐               ▼
        │ streamyard/comments/           │    CommentService → SYH_STORAGE
        │ streamyard_adapter.ts          │
        │ банер · база молитов · мітка   │
        └─────────────────────────────────┘
```

**Що робить адаптер:** дістає контекст коментаря (`getCommentContext`), віддає кнопки
(`getButtons`), каже, в який аркуш зберігати (`getSheetId` / `beforeAction`), і малює стан
(`applyButtonState`, `applyCheckboxState`).

**Дві точки, де поверхня може перехопити конвеєр** (обидві опційні, ними користується
лише StreamYard):

| Хук адаптера | Навіщо |
|---|---|
| `runAction` | поверхня виконує дію сама. StreamYard не «перемикає» кнопку повторним натисканням і не пише в аркуші: він показує банер копіювання, зберігає запис у базі молитов/питань і ставить `data-syh-just-added` |
| `onCheckboxToggled` | поверхня сама зберігає стан чекбокса. StreamYard тримає його за ТЕКСТОМ коментаря в оперативному `SYH_STATE`, а не за ключем коментаря у `chrome.storage` |

Ще дві відмінності поверхні описані **в реєстрі**, а не в коді інжектора:
`events` (StreamYard слухає `mouseup`, бо для 🙏 має значення кнопка миші) і
`mouseButtons` (🙏 приймає всі три кнопки: 🙏🙏🙏 / 🙏❤️🙏 / ❤️❤️❤️).

Загальносторінкові речі StreamYard, які не належать окремій картці, лишились у
`modules/streamyard/comments/`: Auto-Heal, зірка платформи, коліщатко по картці,
ПКМ по кнопках платформи.

---

## 4. Реєстри проєкту (SSOT-точки)

> Це головна таблиця цього документа. **Перед тим як створювати UI-елемент, поле чи
> ключ — знайди його реєстр тут.** Якщо реєстру немає — створи реєстр, а не другу копію.

| Що описується | Реєстр | Хто з нього читає |
|---|---|---|
| Дії над коментарем (кнопки, стан, іконки, `data-action`, події, кнопки миші) | `modules/comments/comment_actions.ts` | `ui_comments.ts`, `yt_comment_panel.ts`, `studio_ui.ts`, `comment_injector.ts`, `streamyard_adapter.ts` |
| Аркуші (канали/програми) | `modules/registry/sheets.ts` (`DynamicSheetRegistry`) | попап, `studio_ui.ts`, сховище |
| Ключі сховища | `modules/storage/storage_keys.ts` (`STORAGE_KEYS`, `POPUP_SHEET_KEYS`) | усе, що пише в `chrome.storage` |
| Селектори StreamYard | `modules/registry/config.ts` (`SYH_CONFIG.SELECTORS`) | `ui_*`, `event_*`, `comment_assistant` |
| Селектори YouTube | `youtube/yt_selectors.ts` | `yt_*` |
| Селектори Studio | `youtube/studio/studio_selectors.ts` | `studio_*` |
| Вигляд кнопок і чекбоксів | `modules/dom/ui_factory.ts` (`UiFactory`) | усі панелі |
| Поля аркуша попапу (гачок, id, вид, ключі сховища) | `popup/popup_sheet_fields.ts` (`SHEET_FIELDS`) | `popup_sheet_renderer.ts`, `popup_sheet_field_restorer.ts`, `popup_sheet_log_restorer.ts`, `popup_sheet_bindings.ts` |
| Опції сторінки налаштувань (ключ, елемент, вид, дефолт, діапазон) | `options/option_fields.ts` (`OPTION_FIELDS`) | `options/defaults.ts` (виводить `OptionsState` і `DEFAULT_OPTIONS`), `options/form.ts` |
| Події між модулями | `modules/core/event_bus.ts` (`SYH_BUS`, 16 типів) | плагіни, статистика, банери |
| Плагіни StreamYard | `modules/core/plugin_registry.ts` (`SYH_PLUGINS`) | `bootstrap_app.ts` |
| Ліміти й таймінги | `modules/registry/config.ts` (`SYH_CONFIG.TIMINGS`, `LIMITS`) | anti-AFK, auto-heal, спалахи кнопок |

Усі UI-сутності, що повторювались, зведені в реєстри (T1–T9).

---

## 5. Сховище

- Єдина точка доступу — `SYH_STORAGE` (`modules/storage/storage.ts`, реалізації в
  `storage_ops_async.ts` / `storage_ops_callback.ts`).
- Ключі будуються **тільки** через `STORAGE_KEYS` / `POPUP_SHEET_KEYS`; рядкові літерали заборонені.
- Схема версіонована (`STORAGE_SCHEMA_VERSION`), міграції — `storage_migration.ts`.
- Схема типів **закрита**: `StorageSchema` не має `[key: string]: any`, динамічні
  родини ключів описані шаблонними літеральними типами (`SheetStateKey`,
  `SheetCollectedKey`, `SheetDividerKey`, `LegacyTgKey`, `TelegramDataKey`).
  Читання строге, запис ширший — деталі й причина в `docs/rules/storage.md`.
- **Zero data loss:** старі ключі не видаляються, читання завжди має легасі-фолбек
  (`popup/popup_sheet_keys.ts` — приклад канонічний ключ + `tg_<field>__<sheetId>`).
- Доменні операції йдуть через `CommentService` та `SheetStateService`, а не прямими
  `SYH_STORAGE.set` з UI-обробників.

---

## 6. Тести

- Раннер — вбудований `node:test` зі strip-types (без окремої компіляції),
  DOM — `happy-dom` (`tests/setup/happy-dom.ts`), `chrome.*` — `tests/setup/chrome_mock.ts`.
- 110+ файлів, 2100+ тестів; повний прогін ~65 с.
- Один прогін усього: `npm run verify` (typecheck → lint → check:architecture → test → build).
- Правила написання тестів — `docs/rules/testing.md`.

---

## 7. Куди що класти

| Новий код | Місце |
|---|---|
| Чиста функція розбору тексту | `modules/parsers/` |
| Правило вигляду/поведінки кнопки коментаря | `modules/comments/comment_actions.ts` |
| DOM попапу | `popup/` |
| Специфіка платформи YouTube | `youtube/` |
| Специфіка Studio | `youtube/studio/` |
| Специфіка StreamYard-коментаря | `modules/streamyard/comments/streamyard_adapter.ts` |
| Робота зі сховищем | `modules/comments/*_store.ts` через `CommentService` |
| Ключ сховища | `modules/storage/storage_keys.ts` |
| Довготривале правило для агентів | `docs/rules/*.md` (і посилання з `AGENTS.md`) |
