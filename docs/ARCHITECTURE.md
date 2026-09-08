# Архітектура StreamYard Helper

> Актуально на 2026-09-08 (після хвилі 1 аудиту `docs/audits/active/2026-09-08_CLAUDE_OPUS_5_AUDIT.md`).
> Практичні кроки «як додати кнопку / поле / опцію» — у [HOWTO_ADD.md](HOWTO_ADD.md).

---

## 1. Точки входу

Chrome Manifest V3, три content script'и + service worker + два UI-документи:

| Точка входу | Файл | Де працює |
|---|---|---|
| StreamYard | `main.ts` → `modules/bootstrap_app.ts` | `https://streamyard.com/*` |
| YouTube (перегляд/трансляція) | `youtube/youtube_content.ts` | `*://*.youtube.com/*` (крім Studio) |
| YouTube Studio | `youtube/studio/studio_content.ts` | `https://studio.youtube.com/*` |
| Service worker | `background/service-worker.ts` → `message_router.ts`, `badge_updater.ts` | фон |
| Попап | `popup/popup.html` → `popup/popup_init.ts` | іконка розширення |
| Налаштування | `options/options.html` → `options/options.ts` | окрема вкладка |

`main.ts` бере блокування повторної ініціалізації (`claimInitLock`), далі `initSyhApp()`
піднімає ядро та реєструє плагіни через `PluginRegistry` (`modules/plugin_registry.ts`).
Кожен крок ініціалізації обгорнутий власним `try/catch` — падіння одного модуля не
вбиває решту (error boundaries, аудит 2026-09-05).

---

## 2. Шари

```
┌───────────────────────────────────────────────────────────────────────┐
│ PRESENTATION — усе, що торкається DOM                                 │
│  popup/ (44 файли) · options/ (12) · modules/ui_*.ts                  │
│  modules/banner_modal*.ts · modules/stats_modal.ts                    │
│  youtube/yt_comment_panel.ts · youtube/studio/studio_ui.ts            │
├───────────────────────────────────────────────────────────────────────┤
│ ORCHESTRATION — хто кого запускає                                     │
│  main.ts → bootstrap_app.ts → PluginRegistry                          │
│  background/service-worker.ts → message_router.ts                     │
│  youtube/studio/studio_content.ts (StudioModuleController)            │
│  modules/comment_injector.ts + comment_action_runner.ts               │
├───────────────────────────────────────────────────────────────────────┤
│ DOMAIN — чисті функції, без DOM і без chrome.*                        │
│  modules/comment_actions.ts (реєстр дій) · modules/parsers/*          │
│  modules/banner_parser*.ts · modules/utils_text.ts (транслітерація)   │
│  modules/sheet_stats_calculator.ts · modules/stats_math.ts            │
├───────────────────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE — стан і зовнішній світ                                │
│  SYH_STORAGE (storage.ts → ops_async / ops_callback / migration)      │
│  CommentService → collected_store · state_store · prayer_record_store │
│  modules/dom_observer.ts · modules/messaging_service.ts · chrome.*    │
└───────────────────────────────────────────────────────────────────────┘
```

Правило напрямку: **Presentation → Orchestration → Domain / Infrastructure**.
DOM попапу не має жити в `modules/` (саме тому `telegram_sheet_dom.ts` переїхав у `popup/`),
а `modules/parsers/*` не має знати ні про DOM, ні про `chrome.storage`.

---

## 3. Робота з коментарями — спільний конвеєр

Одна й та сама модель на трьох поверхнях:

```
        ┌── реєстр дій (modules/comment_actions.ts) ──┐
        │  copy · question · prayer                    │
        │  id · stateType · icon · title · оверайди    │
        └──────────────┬───────────────────────────────┘
                       │ будує кнопки            │ дає stateType
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
        ┌──────────────▼─────────────┐   ┌────────────────────────────┐
        │ CommentPlatformAdapter     │──▶│ comment_action_runner.ts   │
        │ yt_adapter · studio_adapter│   │ toggle on / untoggle       │
        └────────────────────────────┘   └───────────┬────────────────┘
                                                     ▼
                                          CommentService → SYH_STORAGE
```

**Що робить адаптер:** дістає контекст коментаря (`getCommentContext`), віддає кнопки
(`getButtons`), каже, в який аркуш зберігати (`getSheetId` / `beforeAction`), і малює стан
(`applyButtonState`, `applyCheckboxState`).

> ⚠️ **Виняток, який ще не згорнуто:** StreamYard поки не має адаптера — його кліки
> обробляє паралельний конвеєр `modules/event_comments/*` (19 файлів). Імена дій там
> уже резолвляться через реєстр, але сама міграція — задача **T7**.

---

## 4. Реєстри проєкту (SSOT-точки)

> Це головна таблиця цього документа. **Перед тим як створювати UI-елемент, поле чи
> ключ — знайди його реєстр тут.** Якщо реєстру немає — створи реєстр, а не другу копію.

| Що описується | Реєстр | Хто з нього читає |
|---|---|---|
| Дії над коментарем (кнопки, стан, іконки, `data-action`) | `modules/comment_actions.ts` | `ui_comments.ts`, `yt_comment_panel.ts`, `studio_ui.ts`, `comment_injector.ts`, `event_comments/formatters.ts` |
| Аркуші (канали/програми) | `modules/sheets.ts` (`DynamicSheetRegistry`) | попап, `studio_ui.ts`, сховище |
| Ключі сховища | `modules/storage_keys.ts` (`STORAGE_KEYS`, `POPUP_SHEET_KEYS`) | усе, що пише в `chrome.storage` |
| Селектори StreamYard | `modules/config.ts` (`SYH_CONFIG.SELECTORS`) | `ui_*`, `event_*`, `comment_assistant` |
| Селектори YouTube | `youtube/yt_selectors.ts` | `yt_*` |
| Селектори Studio | `youtube/studio/studio_selectors.ts` | `studio_*` |
| Вигляд кнопок і чекбоксів | `modules/ui_factory.ts` (`UiFactory`) | усі панелі |
| Налаштування | `options/defaults.ts` (`OptionsState`, `DEFAULT_OPTIONS`) | `options/form.ts`, споживачі опцій |
| Події між модулями | `modules/event_bus.ts` (`SYH_BUS`, 16 типів) | плагіни, статистика, банери |
| Плагіни StreamYard | `modules/plugin_registry.ts` (`SYH_PLUGINS`) | `bootstrap_app.ts` |
| Ліміти й таймінги | `modules/config.ts` (`SYH_CONFIG.TIMINGS`, `LIMITS`) | anti-AFK, auto-heal, спалахи кнопок |

Ще не зведені в реєстр (відомий борг, задачі T8–T9):
поля аркуша попапу (6 місць на одне поле) і опції сторінки налаштувань (5–7 місць).

---

## 5. Сховище

- Єдина точка доступу — `SYH_STORAGE` (`modules/storage.ts`, реалізації в
  `storage_ops_async.ts` / `storage_ops_callback.ts`).
- Ключі будуються **тільки** через `STORAGE_KEYS` / `POPUP_SHEET_KEYS`; рядкові літерали заборонені.
- Схема версіонована (`STORAGE_SCHEMA_VERSION`), міграції — `storage_migration.ts`.
- **Zero data loss:** старі ключі не видаляються, читання завжди має легасі-фолбек
  (`popup/popup_sheet_keys.ts` — приклад канонічний ключ + `tg_<field>__<sheetId>`).
- Доменні операції йдуть через `CommentService` та `SheetStateService`, а не прямими
  `SYH_STORAGE.set` з UI-обробників.

---

## 6. Тести

- Раннер — вбудований `node:test` зі strip-types (без окремої компіляції),
  DOM — `happy-dom` (`tests/setup/happy-dom.ts`), `chrome.*` — `tests/setup/chrome_mock.ts`.
- 110+ файлів, 2100+ тестів; повний прогін ~65 с.
- Один прогін усього: `npm run verify` (typecheck → lint → test → build).
- Правила написання тестів — `docs/rules/testing.md`.

---

## 7. Куди що класти

| Новий код | Місце |
|---|---|
| Чиста функція розбору тексту | `modules/parsers/` |
| Правило вигляду/поведінки кнопки коментаря | `modules/comment_actions.ts` |
| DOM попапу | `popup/` |
| Специфіка платформи YouTube | `youtube/` |
| Специфіка Studio | `youtube/studio/` |
| Робота зі сховищем | `modules/*_store.ts` через `CommentService` |
| Ключ сховища | `modules/storage_keys.ts` |
| Довготривале правило для агентів | `docs/rules/*.md` (і посилання з `AGENTS.md`) |
