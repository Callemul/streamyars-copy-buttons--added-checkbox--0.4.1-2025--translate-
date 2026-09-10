# T20 — розкладка `modules/` по теках

> Задача **C4.3a** аудиту `docs/audits/active/2026-09-10_CLAUDE_OPUS_5_TASKS.md` (вона ж T20
> з набору 2026-09-08). Це **проєктний** документ: коду він не змінює.
> Виконання — задача **C4.3b**, вона робить рівно те, що описано в §4 і §7.
>
> Складено 2026-09-10 на дереві `main` у зеленому стані
> (`npm run verify`: typecheck 0, lint 0, тести 2202/2202, build ok).

---

## 1. Проблема

`modules/` — це 170 `.ts`-файлів: 143 лежать пласко в корені теки, ще 27 — у чотирьох
підтеках (`comment_assistant/` 8, `event_banners/` 12, `parsers/` 10, `streamyard_comments/` 17,
з них 6 у вкладеній `handlers/`). Плюс один `.css`.

При цьому `docs/ARCHITECTURE.md` §2 описує чотири шари з правилом напрямку
**Presentation → Orchestration → Domain / Infrastructure**. Тобто документ обіцяє структуру,
якої в дереві тек немає: агент читає про шари, а бачить пласку купу з префіксами в іменах
(`ui_*` 23, `stats_*` 17, `video_copier_*` 11, `comment_*` 9, `banner_*` 9, `telegram_*` 6,
`storage_*` 6, `utils_*` 6, `messaging_*` 5, `sheet_*` 4, `bootstrap_*` 3, `anti_afk*` 3,
`right_tabs_*` 3).

Ціль T20 — щоб дерево тек саме розповідало те, що зараз доводиться тримати в голові або
вичитувати з `ARCHITECTURE.md`.

---

## 2. Крок 1 — фактичний граф залежностей

Імена файлів для рішення **не використовувались**. Граф побудовано скриптами в `scratch/`
(тека в `.gitignore`; скрипти лишені там для повторного прогону):

| Скрипт | Що робить |
|---|---|
| `scratch/t20_graph.cjs` | зчитує всі `import`/`export … from`, `import(...)`, `require(...)` у `modules/`, `youtube/`, `popup/`, `options/`, `background/`, `tests/`, `main.ts`; резолвить відносні шляхи (з урахуванням `.ts`, `.js`, `index.ts`) |
| `scratch/t20_graph2.cjs` | те саме, але **розділяє значеннєві ребра й `import type`** — це принципово для аналізу циклів |
| `scratch/t20_flags.cjs` | позначає дотик до DOM у рантаймі, дотик до DOM лише в типах, дотик до `chrome.*` |
| `scratch/t20_map.cjs` | застосовує запропоновану розкладку і шукає цикли між теками (Tarjan SCC) |
| `scratch/t20_layers.cjs` | те саме для альтернативи «за шарами» |
| `scratch/t20_impact.cjs`, `scratch/t20_phases.cjs` | обсяг правок і порядок хвиль |

### 2.1 Загальні числа

- прочитано **405** файлів, **0** відносних імпортів не зарезолвилось (граф повний);
- у `modules/` — **170** `.ts`;
- дотик до DOM у рантаймі (`document.`, `window.`, `.querySelector`, `.addEventListener`,
  `createElement`, `MutationObserver`, `.classList`, `.innerHTML`, `.dataset`, …): **76** файлів
  (з них 5 торкаються ще й `chrome.*`);
- дотик лише до `chrome.*`, без DOM: **15**;
- ні DOM, ні `chrome.*` — **79**, з них **15** згадують DOM-типи (`HTMLElement`, `Element`)
  тільки в сигнатурах. Тобто **64 файли — чистий домен** за визначенням `ARCHITECTURE.md` §2.

### 2.2 Найбільший fan-in (скільки файлів імпортують)

| Файл | fan-in (усі) | fan-in (продакшн) | Хто ззовні `modules/` |
|---|---|---|---|
| `storage.ts` | 97 | 65 | background, options, popup, youtube |
| `config.ts` | 61 | 56 | options, youtube |
| `types.ts` | 49 | 49 | options, popup, youtube |
| `comment_service.ts` | 34 | 23 | options, popup, youtube |
| `utils.ts` | 31 | 22 | — (тільки `modules/`) |
| `sheets.ts` | 28 | 22 | popup, youtube |
| `comment_actions.ts` | 24 | 21 | youtube (9 файлів) |
| `ui_state.ts` | 23 | 15 | — |
| `parsers/index.ts` | 20 | 15 | — |
| `channel_config.ts` | 19 | 17 | youtube (13 файлів) |

### 2.3 Головне відкриття: `modules/` — це дві різні речі в одній теці

Порахували, які файли `modules/` мають споживачів **поза** `modules/`. Виявилось —
**лише 23 із 170**:

`storage.ts` · `types.ts` · `sheets.ts` · `config.ts` · `comment_service.ts` ·
`comment_actions.ts` · `comment_platform_adapter.ts` · `comment_injector.ts` ·
`comment_assistant/index.ts` · `channel_config.ts` · `retention_service.ts` ·
`storage_keys.ts` · `sheet_state_service.ts` · `sheet_processing.ts` · `telegram_parser.ts` ·
`messaging.ts` · `dom_observer.ts` · `plugin_registry.ts` · `ui_factory.ts` ·
`utils_notify.ts` · `utils_text.ts` · `render_utils.ts` · `bootstrap_app.ts` (лише з `main.ts`).

Решта **147 файлів — це реалізація однієї поверхні, StreamYard**. Жоден `ui_*` (крім
`ui_factory.ts`), жоден `stats_*`, `banner_*`, `video_copier_*`, `event_banners/*`,
`streamyard_comments/*`, `anti_afk*`, `right_tabs_*`, `event_bus.ts`, `state.ts`, `utils.ts`
не має споживача за межами `modules/`.

Це і є справжня лінія розлому в теці: **спільна бібліотека для шести точок входу** vs
**контент-скрипт StreamYard**. Ані варіант (а), ані варіант (б) з формулювання задачі цю
лінію не бачать; підсумкова розкладка (§3.4) її враховує.

### 2.4 Наявні цикли імпортів (стан «до»)

На рівні **файлів** у `modules/` є **рівно один** SCC:

```
storage.ts → storage_keys.ts → channel_config.ts → storage.ts
   (+ storage_migration.ts, storage_ops_async.ts, storage_ops_callback.ts, storage_runtime.ts
      втягнуті в той самий SCC через storage_keys.ts)
```

Але ребро `storage_keys.ts → channel_config.ts` — це `import type { ChannelConfigItem }`,
і в самому файлі стоїть коментар, що тип стирається й циклу в рантаймі немає.
**Якщо рахувати лише значеннєві ребра, граф `modules/` — DAG без жодного циклу.**

Це важливо: розкладка нижче зобов'язана зберегти цю властивість, а не «не погіршити цикли,
яких і так немає».

---

## 3. Крок 2 — вибір осі поділу

Обидва варіанти прогнані на реальному графі, не на здогадах.

### 3.1 Варіант (а) — за шарами `ARCHITECTURE.md` §2

Класифікація автоматична, за тими самими ознаками, що названі в §2: композиційні корені →
Orchestration; `chrome.*` та `*_store`/`*_service`/`storage*`/`messaging_*`/`state`/`event_bus` →
Infrastructure; рантайм-DOM → Presentation; решта → Domain.

Розміри: `domain` 59, `presentation` 54, `infra` 29, `orchestration` 28.

Граф тек (**значеннєві** ребра):

```
domain         → infra, presentation
infra          → domain, presentation
orchestration  → domain, infra, presentation
presentation   → domain, infra, orchestration
```

**Чотири шари утворюють чотири взаємні цикли** — `domain ⇄ infra`, `domain ⇄ presentation`,
`infra ⇄ presentation`, `orchestration ⇄ presentation`. І це не артефакт класифікації:
`ui_comments.ts` (Presentation) значеннєво тягне `comment_actions.ts` (Domain), а
`bootstrap_dom.ts`, `streamyard_adapter.ts`, `stats_tracker.ts`, `event_banners/index.ts`,
`ui_facade.ts`, `video_copier_ui.ts` (Orchestration) значеннєво тягнуть Presentation —
**34 значеннєві ребра Orchestration → Presentation**, тобто рівно проти правила
«Presentation → Orchestration», записаного в `ARCHITECTURE.md`.

Тобто поділ за шарами не просто «не ідеальний» — він **перетворив би документоване правило
напрямку на правило, яке дерево тек порушує в кожній теці**. Правило, яке не виконується,
гірше за відсутність правила: наступний агент його прочитає й повірить.

### 3.2 Варіант (б) — за доменами

Прогнано розкладку з §3.4. Граф тек за **значеннєвими** ребрами — **DAG, нуль циклів**,
11 топологічних рівнів:

```
рівень 0 : dom/            messaging/
рівень 1 : storage/
рівень 2 : registry/
рівень 3 : parsers/        streamyard/right_tabs/
рівень 4 : core/
рівень 5 : stats/          telegram/        streamyard/anti_afk/
рівень 6 : sheets/
рівень 7 : comments/
рівень 8 : banners/        video/           streamyard/ui/
рівень 9 : streamyard/banners/               streamyard/comments/
рівень 10: streamyard/bootstrap/
```

### 3.3 «Типова зміна»: скільки тек зачіпає

| Зміна | шари (а) | домени (б) | які теки в (б) |
|---|---|---|---|
| додати метрику статистики | **4** | **1** | `stats/` |
| додати поле банера | **3** | **2** | `banners/`, `streamyard/ui/` |
| нова опція в `SYH_CONFIG` | 2 | 2 | `registry/`, `storage/` |
| додати дію над коментарем | **4** | 5 | `comments/`, `streamyard/ui/`, `streamyard/comments/`, `storage/`, `core/` |

Один рядок із чотирьох виграють шари, і то на одну теку. Але кількість тек — не вся правда:
під шарами 17 файлів статистики лежали б у чотирьох теках по 30–60 файлів кожна, і щоб
знайти «де рахується середнє», довелось би шукати. Під доменами всі 17 — в одній теці,
і зміна метрики не виходить за неї взагалі.

### 3.4 Рекомендація

**Ділити за доменами (варіант б), з однією поправкою: усе, що є реалізацією поверхні
StreamYard, з'їжджає під `modules/streamyard/`.**

Головний аргумент — не смак, а граф: за доменами граф тек виходить ациклічним DAG'ом
(нуль значеннєвих циклів, 11 рівнів), за шарами — чотири теки, кожна з кожною, чотири
взаємні цикли й 34 значеннєві ребра проти документованого правила напрямку.
Другий аргумент — 147 із 170 файлів `modules/` не мають жодного споживача поза `modules/`:
це не «спільні модулі», це контент-скрипт StreamYard, і тека має це показувати.

`ARCHITECTURE.md` §2 при цьому **не скасовується**: шари лишаються правилом *напрямку*
(`streamyard/ui/` імпортує `comments/`, а не навпаки), просто перестають бути правилом
*розкладки по теках*. §8 описує, що саме треба дописати в `ARCHITECTURE.md`.

### 3.5 Нове дерево

```
modules/
├── registry/    4   статичні реєстри-SSOT, від яких залежить решта:
│                    config.ts (SYH_CONFIG) · sheets.ts · channel_config.ts · i18n.ts
├── dom/         3   DOM-примітиви без прив'язки до поверхні, нуль імпортів:
│                    ui_factory.ts · dom_observer.ts · escape_html.ts
├── storage/     6   SYH_STORAGE: фасад, ключі, схема, міграції, дві реалізації, runtime
├── messaging/   5   chrome.runtime-повідомлення
├── core/       12   типи, стан, шина подій, реєстр плагінів, фасад утиліт
├── parsers/    10   розбір тексту коментаря  (без змін усередині)
├── comments/   18   спільний конвеєр коментарів (усі три поверхні): 10 + assistant/
│   └── assistant/ 8   підсвітка тригерів (колишня comment_assistant/)
├── sheets/      5   сервіси над аркушами + retention
├── telegram/    6   експорт у формат телеграму
├── banners/     9   створення й розбір банерів
├── stats/      17   статистика трансляції
├── video/      11   копіювач відео
└── streamyard/ 63   ПОВЕРХНЯ StreamYard — сюди не ходить ніхто, крім main.ts (+1 .css)
    ├── bootstrap/    3   bootstrap_app / _dom / _messages
    ├── ui/          23   панелі, фільтри, чекбокси, зірки, банери в правій колонці
    ├── comments/    19   адаптер, binding, auto-heal, ПКМ/коліщатко, база молитов: 13 + handlers/
    │   └── handlers/ 6
    ├── banners/     12   колишня event_banners/
    ├── anti_afk/     3
    ├── right_tabs/   3
    └── modal_styles.css
```

**Чому `registry/`, а не `config/`.** Групу з чотирьох файлів утворив не смак, а граф:
`parsers/sabbath_parser.ts` значеннєво тягне `channel_config.ts`, а `sheets/sheet_processing.ts`
і `sheets/sheet_stats_calculator.ts` тягнуть `parsers/index.ts`. Якби `channel_config.ts`
поїхав у `sheets/`, вийшов би цикл `sheets/ ⇄ parsers/`. `channel_config.ts` своєю чергою
тягне `sheets.ts`, тож і той мусить бути поруч. Ці чотири файли — не «конфіг», а
**ациклічна база статичних даних**, тому й назва `registry/` (мовою `ARCHITECTURE.md` §4 —
«реєстри проєкту»), а не `config/`.

**Чому `dom/`, а не `ui/`.** Тека `modules/ui/` поруч із `modules/streamyard/ui/` читалася б
як «тут спільні панелі» — а там їх нема. У `dom/` лежать три файли з **нулем імпортів**,
якими користуються всі три поверхні (`ui_factory.ts` — реєстр вигляду кнопок із
`ARCHITECTURE.md` §4; `dom_observer.ts` — реєстр MutationObserver'ів; `escape_html.ts`).

**`modules/render_utils.ts` → `popup/render_utils.ts`.** Єдиний файл, що виїжджає з `modules/`
взагалі. Його чотири споживачі — `popup/popup_telegram_collected.ts`,
`popup/popup_telegram_renderers.ts`, `popup/prayer_render.ts` і його власний тест. Це рівно
той випадок, який `ARCHITECTURE.md` §2 уже описує прецедентом: «DOM попапу не має жити
в `modules/` (саме тому `telegram_sheet_dom.ts` переїхав у `popup/`)».

**`modules/modal_styles.css` → `modules/streamyard/modal_styles.css`.** Це не TypeScript,
але й не безхазяйний файл: його підключає рядок 1 кореневого `styles.css`
(`@import './modules/modal_styles.css';`), а `styles.css` — це CSS контент-скрипта StreamYard
з `manifest.json`. Вміст — модалки StreamYard Helper. Тому їде до поверхні StreamYard, а
`styles.css` дістає єдину правку: `@import './modules/streamyard/modal_styles.css';`.
Окремий CSS-файл у `popup/`/`options/` він не дублює, тож інших споживачів немає.

---

## 4. Крок 3 — таблиця переїзду

Усі **170** `.ts`-файлів `modules/`, кожен рівно один раз; плюс `modal_styles.css` (§3.5).
Колонки `ряд.` / `fan-in` / `DOM` / `chrome.*` — з графу §2, вони й обґрунтовують місце.
`DOM = тип` означає, що файл згадує `HTMLElement`/`Element` лише в сигнатурах.

Рядки `modules/parsers/*` навмисно мають однакові «звідки» і «куди»: ця тека вже стоїть
правильно (рівень 3 у DAG §3.2), рухати її не треба — вона в таблиці для повноти.
Фізично переміщуються **160** файлів зі 170.

**Перейменувань немає — тільки переміщення.** Кожен `git mv` зберігає базове ім'я файла.
Дві наявні підтеки збережено як підтеки саме тому, що інакше виникає колізія імен:
`comment_assistant/index.ts` + `comment_assistant/types.ts` зіткнулися б із `comments/`,
а `streamyard_comments/index.ts` і `streamyard_comments/handlers/index.ts` — один з одним.

#### `modules/registry/` — 4 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/channel_config.ts` | `modules/registry/channel_config.ts` | 152 | 19 | — | — |
| `modules/config.ts` | `modules/registry/config.ts` | 200 | 61 | так | — |
| `modules/i18n.ts` | `modules/registry/i18n.ts` | 26 | 3 | — | так |
| `modules/sheets.ts` | `modules/registry/sheets.ts` | 93 | 28 | — | — |

#### `modules/dom/` — 3 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/dom_observer.ts` | `modules/dom/dom_observer.ts` | 131 | 9 | так | — |
| `modules/escape_html.ts` | `modules/dom/escape_html.ts` | 28 | 6 | — | — |
| `modules/ui_factory.ts` | `modules/dom/ui_factory.ts` | 56 | 7 | так | — |

#### `modules/storage/` — 6 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/storage.ts` | `modules/storage/storage.ts` | 76 | 97 | — | — |
| `modules/storage_keys.ts` | `modules/storage/storage_keys.ts` | 405 | 14 | — | так |
| `modules/storage_migration.ts` | `modules/storage/storage_migration.ts` | 96 | 3 | — | так |
| `modules/storage_ops_async.ts` | `modules/storage/storage_ops_async.ts` | 130 | 1 | — | так |
| `modules/storage_ops_callback.ts` | `modules/storage/storage_ops_callback.ts` | 88 | 1 | — | так |
| `modules/storage_runtime.ts` | `modules/storage/storage_runtime.ts` | 57 | 1 | — | так |

#### `modules/messaging/` — 5 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/messaging.ts` | `modules/messaging/messaging.ts` | 15 | 9 | — | — |
| `modules/messaging_context.ts` | `modules/messaging/messaging_context.ts` | 19 | 7 | — | так |
| `modules/messaging_listener.ts` | `modules/messaging/messaging_listener.ts` | 61 | 2 | — | так |
| `modules/messaging_senders.ts` | `modules/messaging/messaging_senders.ts` | 75 | 2 | — | так |
| `modules/messaging_service.ts` | `modules/messaging/messaging_service.ts` | 43 | 1 | — | — |

#### `modules/core/` — 12 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/event_bus.ts` | `modules/core/event_bus.ts` | 91 | 15 | тип | — |
| `modules/fuzzy_match.ts` | `modules/core/fuzzy_match.ts` | 62 | 2 | — | — |
| `modules/fuzzy_window.ts` | `modules/core/fuzzy_window.ts` | 71 | 2 | так | — |
| `modules/plugin_registry.ts` | `modules/core/plugin_registry.ts` | 145 | 8 | так | — |
| `modules/state.ts` | `modules/core/state.ts` | 105 | 17 | — | — |
| `modules/types.ts` | `modules/core/types.ts` | 106 | 49 | — | — |
| `modules/utils.ts` | `modules/core/utils.ts` | 151 | 31 | тип | — |
| `modules/utils_dom_wait.ts` | `modules/core/utils_dom_wait.ts` | 151 | 1 | так | — |
| `modules/utils_notify.ts` | `modules/core/utils_notify.ts` | 69 | 6 | так | — |
| `modules/utils_search.ts` | `modules/core/utils_search.ts` | 63 | 1 | — | — |
| `modules/utils_storage_ops.ts` | `modules/core/utils_storage_ops.ts` | 32 | 1 | — | — |
| `modules/utils_text.ts` | `modules/core/utils_text.ts` | 250 | 2 | — | — |

#### `modules/parsers/` — 10 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/parsers/author.ts` | `modules/parsers/author.ts` | 42 | 1 | — | — |
| `modules/parsers/emoji_parser.ts` | `modules/parsers/emoji_parser.ts` | 61 | 1 | — | — |
| `modules/parsers/index.ts` | `modules/parsers/index.ts` | 28 | 20 | — | — |
| `modules/parsers/question_parsers.ts` | `modules/parsers/question_parsers.ts` | 5 | 3 | — | — |
| `modules/parsers/regex.ts` | `modules/parsers/regex.ts` | 70 | 7 | — | — |
| `modules/parsers/sabbath_parser.ts` | `modules/parsers/sabbath_parser.ts` | 44 | 1 | — | — |
| `modules/parsers/split_prayer.ts` | `modules/parsers/split_prayer.ts` | 10 | 1 | — | — |
| `modules/parsers/standard_parser.ts` | `modules/parsers/standard_parser.ts` | 35 | 1 | — | — |
| `modules/parsers/truncation.ts` | `modules/parsers/truncation.ts` | 24 | 3 | — | — |
| `modules/parsers/types.ts` | `modules/parsers/types.ts` | 6 | 1 | — | — |

#### `modules/comments/` — 18 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/comment_action_runner.ts` | `modules/comments/comment_action_runner.ts` | 192 | 1 | тип | — |
| `modules/comment_actions.ts` | `modules/comments/comment_actions.ts` | 278 | 24 | — | — |
| `modules/comment_assistant/highlighter.ts` | `modules/comments/assistant/highlighter.ts` | 109 | 3 | — | — |
| `modules/comment_assistant/index.ts` | `modules/comments/assistant/index.ts` | 65 | 12 | тип | — |
| `modules/comment_assistant/processor.ts` | `modules/comments/assistant/processor.ts` | 85 | 1 | так | — |
| `modules/comment_assistant/trigger_category.ts` | `modules/comments/assistant/trigger_category.ts` | 28 | 1 | — | — |
| `modules/comment_assistant/trigger_manager.ts` | `modules/comments/assistant/trigger_manager.ts` | 77 | 4 | — | — |
| `modules/comment_assistant/trigger_regex.ts` | `modules/comments/assistant/trigger_regex.ts` | 55 | 1 | — | — |
| `modules/comment_assistant/trigger_words.ts` | `modules/comments/assistant/trigger_words.ts` | 91 | 1 | — | — |
| `modules/comment_assistant/types.ts` | `modules/comments/assistant/types.ts` | 18 | 1 | тип | — |
| `modules/comment_clipboard.ts` | `modules/comments/comment_clipboard.ts` | 64 | 1 | так | — |
| `modules/comment_collected_store.ts` | `modules/comments/comment_collected_store.ts` | 147 | 1 | — | — |
| `modules/comment_injector.ts` | `modules/comments/comment_injector.ts` | 222 | 11 | так | — |
| `modules/comment_platform_adapter.ts` | `modules/comments/comment_platform_adapter.ts` | 191 | 14 | тип | — |
| `modules/comment_service.ts` | `modules/comments/comment_service.ts` | 150 | 34 | — | — |
| `modules/comment_state_store.ts` | `modules/comments/comment_state_store.ts` | 82 | 1 | — | так |
| `modules/comment_types.ts` | `modules/comments/comment_types.ts` | 43 | 5 | — | — |
| `modules/prayer_record_store.ts` | `modules/comments/prayer_record_store.ts` | 43 | 1 | — | — |

#### `modules/sheets/` — 5 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/retention_service.ts` | `modules/sheets/retention_service.ts` | 116 | 8 | — | — |
| `modules/sheet_processing.ts` | `modules/sheets/sheet_processing.ts` | 183 | 2 | — | — |
| `modules/sheet_repository.ts` | `modules/sheets/sheet_repository.ts` | 151 | 1 | — | так |
| `modules/sheet_state_service.ts` | `modules/sheets/sheet_state_service.ts` | 53 | 8 | — | так |
| `modules/sheet_stats_calculator.ts` | `modules/sheets/sheet_stats_calculator.ts` | 136 | 2 | — | — |

#### `modules/telegram/` — 6 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/telegram_line_export.ts` | `modules/telegram/telegram_line_export.ts` | 162 | 1 | — | — |
| `modules/telegram_old_item.ts` | `modules/telegram/telegram_old_item.ts` | 172 | 2 | — | — |
| `modules/telegram_old_section.ts` | `modules/telegram/telegram_old_section.ts` | 186 | 1 | — | — |
| `modules/telegram_parser.ts` | `modules/telegram/telegram_parser.ts` | 34 | 7 | — | — |
| `modules/telegram_text_rules.ts` | `modules/telegram/telegram_text_rules.ts` | 62 | 4 | — | — |
| `modules/telegram_types.ts` | `modules/telegram/telegram_types.ts` | 32 | 3 | — | — |

#### `modules/banners/` — 9 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/banner_creator.ts` | `modules/banners/banner_creator.ts` | 135 | 7 | тип | — |
| `modules/banner_executor.ts` | `modules/banners/banner_executor.ts` | 35 | 3 | — | — |
| `modules/banner_form.ts` | `modules/banners/banner_form.ts` | 161 | 1 | так | — |
| `modules/banner_modal.ts` | `modules/banners/banner_modal.ts` | 401 | 3 | так | — |
| `modules/banner_modal_draft.ts` | `modules/banners/banner_modal_draft.ts` | 33 | 3 | — | — |
| `modules/banner_modal_parser.ts` | `modules/banners/banner_modal_parser.ts` | 114 | 3 | — | — |
| `modules/banner_parser.ts` | `modules/banners/banner_parser.ts` | 110 | 4 | — | — |
| `modules/banner_parser_rules.ts` | `modules/banners/banner_parser_rules.ts` | 100 | 2 | — | — |
| `modules/banner_types.ts` | `modules/banners/banner_types.ts` | 26 | 5 | тип | — |

#### `modules/stats/` — 17 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/stats_auto_phase.ts` | `modules/stats/stats_auto_phase.ts` | 166 | 4 | так | — |
| `modules/stats_brand_detector.ts` | `modules/stats/stats_brand_detector.ts` | 125 | 1 | так | — |
| `modules/stats_brand_storage.ts` | `modules/stats/stats_brand_storage.ts` | 58 | 1 | — | — |
| `modules/stats_chart_data.ts` | `modules/stats/stats_chart_data.ts` | 118 | 1 | так | — |
| `modules/stats_downloads.ts` | `modules/stats/stats_downloads.ts` | 76 | 1 | так | — |
| `modules/stats_exporter.ts` | `modules/stats/stats_exporter.ts` | 185 | 4 | так | — |
| `modules/stats_header_controls.ts` | `modules/stats/stats_header_controls.ts` | 141 | 1 | так | — |
| `modules/stats_header_observer.ts` | `modules/stats/stats_header_observer.ts` | 64 | 1 | так | — |
| `modules/stats_live_sampler.ts` | `modules/stats/stats_live_sampler.ts` | 108 | 1 | так | так |
| `modules/stats_math.ts` | `modules/stats/stats_math.ts` | 107 | 2 | — | — |
| `modules/stats_modal.ts` | `modules/stats/stats_modal.ts` | 247 | 2 | так | так |
| `modules/stats_phase_marker.ts` | `modules/stats/stats_phase_marker.ts` | 104 | 2 | так | — |
| `modules/stats_report_templates.ts` | `modules/stats/stats_report_templates.ts` | 172 | 2 | — | — |
| `modules/stats_session.ts` | `modules/stats/stats_session.ts` | 28 | 5 | — | — |
| `modules/stats_slide_generator.ts` | `modules/stats/stats_slide_generator.ts` | 289 | 2 | так | — |
| `modules/stats_tracker.ts` | `modules/stats/stats_tracker.ts` | 143 | 7 | так | — |
| `modules/stats_types.ts` | `modules/stats/stats_types.ts` | 60 | 12 | — | — |

#### `modules/video/` — 11 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/video_copier.ts` | `modules/video/video_copier.ts` | 83 | 2 | так | — |
| `modules/video_copier_card_buttons.ts` | `modules/video/video_copier_card_buttons.ts` | 101 | 1 | так | — |
| `modules/video_copier_downloader.ts` | `modules/video/video_copier_downloader.ts` | 104 | 3 | так | — |
| `modules/video_copier_fresh.ts` | `modules/video/video_copier_fresh.ts` | 92 | 6 | так | — |
| `modules/video_copier_links.ts` | `modules/video/video_copier_links.ts` | 36 | 3 | так | — |
| `modules/video_copier_master_button.ts` | `modules/video/video_copier_master_button.ts` | 77 | 1 | так | — |
| `modules/video_copier_share_modal.ts` | `modules/video/video_copier_share_modal.ts` | 64 | 1 | так | — |
| `modules/video_copier_theme.ts` | `modules/video/video_copier_theme.ts` | 86 | 6 | — | — |
| `modules/video_copier_title_button.ts` | `modules/video/video_copier_title_button.ts` | 46 | 1 | так | — |
| `modules/video_copier_ui.ts` | `modules/video/video_copier_ui.ts` | 74 | 3 | — | — |
| `modules/video_copier_ui_kit.ts` | `modules/video/video_copier_ui_kit.ts` | 86 | 5 | так | — |

#### `modules/streamyard/bootstrap/` — 3 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/bootstrap_app.ts` | `modules/streamyard/bootstrap/bootstrap_app.ts` | 146 | 2 | — | так |
| `modules/bootstrap_dom.ts` | `modules/streamyard/bootstrap/bootstrap_dom.ts` | 89 | 3 | так | — |
| `modules/bootstrap_messages.ts` | `modules/streamyard/bootstrap/bootstrap_messages.ts` | 160 | 2 | так | так |

#### `modules/streamyard/ui/` — 23 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/ui.ts` | `modules/streamyard/ui/ui.ts` | 12 | 11 | — | — |
| `modules/ui_banners.ts` | `modules/streamyard/ui/ui_banners.ts` | 31 | 5 | — | — |
| `modules/ui_banners_filter.ts` | `modules/streamyard/ui/ui_banners_filter.ts` | 148 | 2 | так | — |
| `modules/ui_banners_header.ts` | `modules/streamyard/ui/ui_banners_header.ts` | 104 | 1 | так | — |
| `modules/ui_banners_inject.ts` | `modules/streamyard/ui/ui_banners_inject.ts` | 61 | 2 | так | — |
| `modules/ui_banners_markup.ts` | `modules/streamyard/ui/ui_banners_markup.ts` | 65 | 1 | — | — |
| `modules/ui_checkbox_restorer.ts` | `modules/streamyard/ui/ui_checkbox_restorer.ts` | 76 | 4 | так | — |
| `modules/ui_checkbox_utils.ts` | `modules/streamyard/ui/ui_checkbox_utils.ts` | 54 | 1 | так | — |
| `modules/ui_comment_labels.ts` | `modules/streamyard/ui/ui_comment_labels.ts` | 49 | 2 | тип | — |
| `modules/ui_comments.ts` | `modules/streamyard/ui/ui_comments.ts` | 75 | 5 | так | — |
| `modules/ui_comments_copy.ts` | `modules/streamyard/ui/ui_comments_copy.ts` | 178 | 1 | так | — |
| `modules/ui_comments_filter.ts` | `modules/streamyard/ui/ui_comments_filter.ts` | 223 | 2 | так | — |
| `modules/ui_dom_updates.ts` | `modules/streamyard/ui/ui_dom_updates.ts` | 27 | 1 | так | — |
| `modules/ui_empty_state.ts` | `modules/streamyard/ui/ui_empty_state.ts` | 111 | 2 | так | — |
| `modules/ui_facade.ts` | `modules/streamyard/ui/ui_facade.ts` | 91 | 1 | — | — |
| `modules/ui_filter_controls.ts` | `modules/streamyard/ui/ui_filter_controls.ts` | 125 | 1 | так | — |
| `modules/ui_init.ts` | `modules/streamyard/ui/ui_init.ts` | 89 | 2 | — | так |
| `modules/ui_scroll_utils.ts` | `modules/streamyard/ui/ui_scroll_utils.ts` | 53 | 1 | так | — |
| `modules/ui_selector_validator.ts` | `modules/streamyard/ui/ui_selector_validator.ts` | 41 | 3 | так | — |
| `modules/ui_shared_utils.ts` | `modules/streamyard/ui/ui_shared_utils.ts` | 28 | 8 | — | — |
| `modules/ui_starred_controls.ts` | `modules/streamyard/ui/ui_starred_controls.ts` | 143 | 5 | так | — |
| `modules/ui_starred_markup.ts` | `modules/streamyard/ui/ui_starred_markup.ts` | 86 | 2 | — | — |
| `modules/ui_state.ts` | `modules/streamyard/ui/ui_state.ts` | 103 | 23 | тип | — |

#### `modules/streamyard/comments/` — 19 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/streamyard_adapter.ts` | `modules/streamyard/comments/streamyard_adapter.ts` | 286 | 2 | так | так |
| `modules/streamyard_comment_binding.ts` | `modules/streamyard/comments/streamyard_comment_binding.ts` | 42 | 2 | тип | — |
| `modules/streamyard_comments/action_dom_sync.ts` | `modules/streamyard/comments/action_dom_sync.ts` | 78 | 1 | так | — |
| `modules/streamyard_comments/action_effects.ts` | `modules/streamyard/comments/action_effects.ts` | 60 | 3 | тип | — |
| `modules/streamyard_comments/action_marking.ts` | `modules/streamyard/comments/action_marking.ts` | 70 | 1 | тип | — |
| `modules/streamyard_comments/auto_heal.ts` | `modules/streamyard/comments/auto_heal.ts` | 86 | 3 | так | — |
| `modules/streamyard_comments/auto_heal_cover_buttons.ts` | `modules/streamyard/comments/auto_heal_cover_buttons.ts` | 55 | 1 | так | — |
| `modules/streamyard_comments/auto_heal_ghosts.ts` | `modules/streamyard/comments/auto_heal_ghosts.ts` | 102 | 1 | так | — |
| `modules/streamyard_comments/format.ts` | `modules/streamyard/comments/format.ts` | 47 | 2 | — | — |
| `modules/streamyard_comments/handlers/context_menu.ts` | `modules/streamyard/comments/handlers/context_menu.ts` | 57 | 1 | так | — |
| `modules/streamyard_comments/handlers/helpers.ts` | `modules/streamyard/comments/handlers/helpers.ts` | 12 | 3 | тип | — |
| `modules/streamyard_comments/handlers/index.ts` | `modules/streamyard/comments/handlers/index.ts` | 5 | 2 | — | — |
| `modules/streamyard_comments/handlers/middle_click.ts` | `modules/streamyard/comments/handlers/middle_click.ts` | 29 | 1 | так | — |
| `modules/streamyard_comments/handlers/star_button.ts` | `modules/streamyard/comments/handlers/star_button.ts` | 52 | 1 | так | — |
| `modules/streamyard_comments/handlers/syh_buttons.ts` | `modules/streamyard/comments/handlers/syh_buttons.ts` | 21 | 1 | так | — |
| `modules/streamyard_comments/index.ts` | `modules/streamyard/comments/index.ts` | 118 | 2 | так | — |
| `modules/streamyard_comments/prayer_database.ts` | `modules/streamyard/comments/prayer_database.ts` | 35 | 2 | так | — |
| `modules/streamyard_comments/types.ts` | `modules/streamyard/comments/types.ts` | 96 | 15 | тип | — |
| `modules/streamyard_comments/utils.ts` | `modules/streamyard/comments/utils.ts` | 11 | 2 | — | — |

#### `modules/streamyard/banners/` — 12 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/event_banners/category.ts` | `modules/streamyard/banners/category.ts` | 50 | 3 | так | — |
| `modules/event_banners/checkbox.ts` | `modules/streamyard/banners/checkbox.ts` | 56 | 1 | так | — |
| `modules/event_banners/deletion.ts` | `modules/streamyard/banners/deletion.ts` | 3 | 3 | — | — |
| `modules/event_banners/deletion_calculations.ts` | `modules/streamyard/banners/deletion_calculations.ts` | 113 | 2 | так | — |
| `modules/event_banners/deletion_execution.ts` | `modules/streamyard/banners/deletion_execution.ts` | 16 | 2 | так | — |
| `modules/event_banners/deletion_handler.ts` | `modules/streamyard/banners/deletion_handler.ts` | 31 | 1 | так | — |
| `modules/event_banners/deps.ts` | `modules/streamyard/banners/deps.ts` | 93 | 2 | так | — |
| `modules/event_banners/helpers.ts` | `modules/streamyard/banners/helpers.ts` | 16 | 2 | так | — |
| `modules/event_banners/index.ts` | `modules/streamyard/banners/index.ts` | 105 | 2 | так | — |
| `modules/event_banners/mouse_handlers.ts` | `modules/streamyard/banners/mouse_handlers.ts` | 39 | 4 | так | — |
| `modules/event_banners/mouseup_handler.ts` | `modules/streamyard/banners/mouseup_handler.ts` | 79 | 3 | так | — |
| `modules/event_banners/types.ts` | `modules/streamyard/banners/types.ts` | 30 | 5 | — | — |

#### `modules/streamyard/anti_afk/` — 3 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/anti_afk.ts` | `modules/streamyard/anti_afk/anti_afk.ts` | 66 | 3 | так | — |
| `modules/anti_afk_detector.ts` | `modules/streamyard/anti_afk/anti_afk_detector.ts` | 135 | 2 | так | — |
| `modules/anti_afk_service.ts` | `modules/streamyard/anti_afk/anti_afk_service.ts` | 189 | 1 | так | — |

#### `modules/streamyard/right_tabs/` — 3 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/right_tabs_compact.ts` | `modules/streamyard/right_tabs/right_tabs_compact.ts` | 105 | 4 | так | — |
| `modules/right_tabs_rules.ts` | `modules/streamyard/right_tabs/right_tabs_rules.ts` | 117 | 3 | так | так |
| `modules/right_tabs_storage.ts` | `modules/streamyard/right_tabs/right_tabs_storage.ts` | 91 | 3 | — | так |

#### `popup/` — 1 файл(и)

| Звідки | Куди | ряд. | fan-in | DOM | `chrome.*` |
|---|---|---|---|---|---|
| `modules/render_utils.ts` | `popup/render_utils.ts` | 98 | 4 | так | — |

---

## 5. Крок 4 — перевірка на цикли

Перевірено скриптом `scratch/t20_map.cjs`: розкладка з §4 накладається на граф §2, ребра
згортаються до рівня тек, далі Tarjan SCC — окремо для **значеннєвих** ребер і окремо
для **всіх** (значеннєві + `import type`).

### 5.1 Значеннєві ребра — циклів немає

```
SCC розміром > 1 : []
двонаправлених пар: []
```

Повний граф тек (значеннєві ребра, згори вниз за топологічними рівнями):

```
dom/                    → (нічого)
messaging/              → (нічого)
storage/                → messaging
registry/               → storage
parsers/                → registry
streamyard/right_tabs/  → registry, storage
core/                   → registry, storage, messaging, parsers
stats/                  → registry, storage, messaging, core, dom
telegram/               → core, parsers
streamyard/anti_afk/    → registry, storage, messaging, core
sheets/                 → registry, storage, parsers, telegram
comments/               → registry, storage, core, dom, sheets
banners/                → registry, core, parsers, comments
video/                  → registry, core, dom, comments
streamyard/ui/          → registry, storage, core, dom, comments
streamyard/banners/     → registry, core, banners, comments, stats, streamyard/ui
streamyard/comments/    → registry, messaging, core, dom, comments, streamyard/ui
streamyard/bootstrap/   → усе перелічене вище
```

Рантаймна властивість, яка є сьогодні (§2.4), збережена: **у зібраному бандлі жодна тека
не тягне сама себе через іншу**.

### 5.2 Цикли на рівні `import type` — є, названі поіменно

Якщо рахувати й типові ребра, з'являється SCC із дев'яти тек. Його тримають **два файли
і шість ребер**, усі — `import type`:

| Ребро | Файл | Що тягне |
|---|---|---|
| `storage/` → `registry/` | `storage/storage_keys.ts` | `type ChannelConfigItem` |
| `storage/` → `comments/` | `storage/storage_keys.ts` | `type CheckboxStateEntry`, `type CommentPayload`, `type CommentStateActionId` |
| `storage/` → `stats/` | `storage/storage_keys.ts` | `type StatsChartsDb` |
| `storage/` → `core/` | `storage/storage_keys.ts` | типи з `types.ts` |
| `core/` → `comments/` | `core/types.ts` | `type CommentActionId` |
| `core/` → `comments/` | `core/event_bus.ts` | `type CommentActionId` |
| `messaging/` → `core/` | `messaging/messaging_{listener,senders,service}.ts` | типи з `types.ts` |

Це **той самий цикл, що вже існує сьогодні** (§2.4) — переїзд його не створює й не
поглиблює, лише робить видимим на рівні тек.

**Причина.** `storage/storage_keys.ts` — це 405 рядків, у яких живуть дві різні речі:
будівники ключів (`STORAGE_KEYS`, `POPUP_SHEET_KEYS`, шаблонні типи ключів) і **типізована
схема сховища** `StorageSchema`, яка за визначенням мусить знати доменні типи всіх, хто
щось у сховище пише. Тому саме цей файл і тягне назад у `comments/`, `stats/`, `registry/`.

**Що треба розчепити, якщо колись знадобиться нульовий цикл і за типами:** винести
`StorageSchema` з `storage_keys.ts` в окремий `storage/storage_schema.ts`. Тоді
`storage_keys.ts` стає листком із нулем імпортів, а весь зворотний зв'язок збирається
в одному файлі схеми. **Але це зміна коду, а не переміщення — у C4.3b її робити не можна.**
Окрема задача, і робити її варто лише якщо з'явиться потреба; на рантайм вона не впливає.

### 5.3 Правило, яке треба закріпити

> Між теками `modules/` **заборонені значеннєві цикли**. Зворотне ребро допускається лише
> як `import type` (стирається компілятором). Перевіряється `scratch/t20_map.cjs` або
> окремим тестом, якщо його вирішать додати.

Це правило перевірне (на відміну від «Presentation → Orchestration», яке дерево порушує
34 рази — §3.1) і вже виконується на поточному коді.

---

## 6. Обмеження, враховані в розкладці

| Обмеження | Як враховано |
|---|---|
| `manifest.json` посилається на точки входу за шляхами: `main.ts`, `youtube/youtube_content.ts`, `youtube/studio/studio_content.ts`, `background/service-worker.ts`, `popup/popup.html`, `options/options.html` | **Жоден із цих шести файлів не рухається.** У `main.ts` змінюється рівно один рядок імпорту (`./modules/bootstrap_app` → `./modules/streamyard/bootstrap/bootstrap_app`). `manifest.json` правити **не треба**; `vite.config.js` шляхів не містить взагалі |
| `styles.css` (CSS контент-скрипта StreamYard з маніфесту) | Один рядок: `@import './modules/modal_styles.css'` → `@import './modules/streamyard/modal_styles.css'`. `tests/css_lint.test.js` перевіряє список із 5 CSS-файлів, і `modal_styles.css` до нього не входить — тест правити не треба (окремо варто помітити, що він цей файл не перевіряє взагалі) |
| `tsconfig.json` `moduleResolution: "bundler"` — імпорт теки резолвиться в `index.ts` | Нові `index.ts` **не створюються**. Ті `index.ts`, що вже є (`parsers/`, `comment_assistant/`, `event_banners/`, `streamyard_comments/`, `streamyard_comments/handlers/`), лишаються там, де були логічно, і жодних нових barrel-фасадів не додається. Три мертвих фасади, видалених у C4.1, назад не повертаються. `include` в `tsconfig.json` — глоб `modules/**/*`, правити не треба; `lint`-скрипт теж глоб |
| Тести мокають модулі рядком-шляхом | Розібрано в §7.3 |
| Наявні підтеки `parsers/`, `comment_assistant/`, `event_banners/`, `streamyard_comments/` | Кожна дістала рішення: `parsers/` лишається на місці (вона вже правильна — рівень 3 у DAG); `comment_assistant/` → `comments/assistant/`; `event_banners/` → `streamyard/banners/`; `streamyard_comments/` → `streamyard/comments/` разом із `handlers/` |

---

## 7. Крок 5 — обсяг, порядок, ризики

### 7.1 Точні числа

| Що | Скільки |
|---|---|
| файлів `.ts` у `modules/` усього | **170** |
| з них фізично переміщуються (`git mv`) | **160** |
| з них лишаються на місці | **10** — уся `modules/parsers/` |
| з переміщуваних виїжджають із `modules/` | **1** (`render_utils.ts` → `popup/`) |
| файлів `.css`, що переїжджають | **1** (`modal_styles.css`) |
| файлів `modules/`, яким треба правити власні рядки імпорту | **170** (усі) |
| **файлів ПОЗА `modules/`, яким треба правити шляхи імпорту** | **174** |
| — з них продакшн | **86** |
| — з них тести | **88** |
| усього специфікаторів імпорту до перезапису | **628** |

Продакшн-файли поза `modules/` по теках:

| Тека | Файлів |
|---|---|
| `youtube/` (у т.ч. `youtube/studio/`) | 39 |
| `popup/` | 36 |
| `options/` | 6 |
| `background/` | 4 |
| `main.ts` | 1 |
| **разом** | **86** |

Плюс `styles.css` (один рядок `@import`) — він не імпорт TypeScript, тому в 628 не входить.

### 7.2 Чи можна частинами

**Можна і треба.** Переїзд ділиться на чотири хвилі так, щоб кожна закінчувалась зеленим
`npm run verify` і окремим комітом. Порядок — від найдешевших тек (мало зовнішніх
споживачів) до найдорожчих:

| Хвиля | Теки | Переїздить | Споживачів поза хвилею: у `modules/` / продакшн поза `modules/` / тестів |
|---|---|---|---|
| **1. Поверхня StreamYard** | `streamyard/{bootstrap,ui,comments,banners,anti_afk,right_tabs}` + `modal_styles.css` | 63 + 1 | **0 / 1 / 27** |
| **2. Листові домени** | `video/` 11, `stats/` 17, `telegram/` 6, `banners/` 9 | 43 | 10 / 3 / 20 |
| **3. Середина** | `comments/` 18 (з `assistant/`), `sheets/` 5, `core/` 12, `render_utils.ts` → `popup/` | 36 | 51 / 50 / 38 |
| **4. Основа** | `registry/` 4, `storage/` 6, `messaging/` 5, `dom/` 3 | 18 | 77 / 69 / 44 |

`parsers/` не рухається взагалі — тека вже на своєму місці.

Порядок обраний не «на око»: **у хвилі 1 переїздять 63 файли, і на них не посилається
жоден інший файл `modules/` і лише один продакшн-файл поза нею — `main.ts`, один рядок.**
Це найбільша хвиля з найменшим ризиком, і вона ж — головний доказ, що зріз «поверхня
StreamYard» правильний. Найдорожчі `storage/` і `registry/` (66 і 89 продакшн-споживачів
кожна) їдуть останніми, коли решта дерева вже стабілізувалась.

Якщо власник наполягає на одному коміті (як записано в C4.3b) — це теж працює, порядок
`git mv` той самий, просто `npm run verify` буде один. **Але тоді помилку в 628 правках
доведеться шукати в дифі на 350 файлів.** Рекомендація — чотири коміти в одному PR/гілці.

### 7.3 Зона особливої уваги: тести

Тести — половина всіх правок (88 із 174 файлів). Розібрано, як саме вони чіпляються за шляхи:

| Форма | Скільки | Ризик |
|---|---|---|
| `await import('../modules/…')` — динамічний імпорт із **явним** `.ts` | **187** входжень | низький: механічна заміна префікса, помилка ловиться падінням тесту |
| `import … from '../modules/…'` — статичний | **40** входжень | низький |
| `mock.module('шлях', …)` — рідне мокання ESM у Node | **0** | ризику немає, ця форма в проєкті не застосовується |
| Читання **вихідника за жорстко зашитим шляхом** через `fs` | **3** входження | **високий — мовчазний провал** |
| Мертвий об'єкт `mockModules` зі шляхами-рядками | **1 файл, 3 шляхи в `modules/`** | середній: не зламається, але залишиться брехнею в тексті |
| Рекурсивний обхід теки `modules/` | 2 тести | ризику немає, обхід рекурсивний |

**Три жорстко зашиті шляхи (правити обов'язково):**

- `tests/storage_schema.test.js` — `readFileSync('modules/storage_keys.ts')`, **двічі**
  (рядки ~234 і ~255) → `modules/storage/storage_keys.ts`;
- `tests/streamyard_panel_binding_invariant.test.js` — `readFileSync('modules/bootstrap_dom.ts')`
  (рядок ~184) → `modules/streamyard/bootstrap/bootstrap_dom.ts`.

Обидва — саме той тип поломки, що вже стрілив у цій сесії: `fs.readFileSync` на неіснуючому
шляху кидає виняток, але в одному з них це guard-тест «перевірка справді щось знаходить»,
і якщо його зламати неправильно, він може почати проходити вхолосту. **Після переїзду
обов'язково перевірити, що ці два тести все ще падають, якщо їм підсунути порожній файл.**

**Мертвий мок:** `tests/yt_storage_handler.test.js` рядки 47–91 — об'єкт `mockModules`
із ключами `'../modules/storage'`, `'../modules/comment_assistant/index'`,
`'../modules/dom_observer'`. Він оголошений і **ніде не використовується** (сам файл нижче
пише: «Since we can't easily mock ES modules in Node's test runner, let's test the logic
directly»). Найчистіше — видалити його разом із мертвими `originalResolve`/`resolveModuleHooks`
поруч; якщо видаляти не хочеться, шляхи в ньому все одно треба оновити, інакше він
дезінформує наступного читача. **Це єдине місце в таблиці, де дозволено видалити код, а не
перемістити** — і його варто винести в окремий коміт, щоб не змішувати з переїздом.

**Рекурсивні обходи (правити не треба, але перевірити):**
`tests/storage_schema.test.js` (`PRODUCTION_DIRS = ['modules', 'popup', 'options', 'youtube', 'background']`)
і `tests/streamyard_panel_binding_invariant.test.js` (`collectTsFiles('modules')`) рекурсивно
проходять усе дерево, тому нові підтеки підхоплять самі. Але другий із них шукає файли,
що вставляють панель кнопок і не прив'язують її: після переїзду набір файлів той самий,
кількість знахідок має лишитись **нуль**.

### 7.4 Що перевіряти після кожної хвилі

1. `npm run typecheck` — ловить 100% битих шляхів у `.ts` (усі імпорти відносні, зовнішніх
   аліасів немає, тож нерозв'язаний шлях = помилка компіляції).
2. `npm run lint`.
3. `npm test` — 2202/2202. **Кількість тестів має збігтися точно:** якщо тест не зміг
   імпортувати модуль, він не «впаде», а може просто не зареєструватись.
4. `npm run build` — ловить те, що бачить бандлер, зокрема `@import` у `styles.css`.
5. `git diff --stat` — у дифі мають бути **тільки** перейменування (`R`) і рядки з шляхами.
   Швидка перевірка: `git diff -M --numstat` не повинен показувати змістовних змін у
   переміщених файлах, окрім рядків `import`.
6. Разова перевірка після **останньої** хвилі:
   - `git ls-files 'modules/*.ts' | wc -l` → **0** (у корені `modules/` не лишилось `.ts`);
   - `git grep -n "modules/" -- styles.css` → рядок вказує на `streamyard/modal_styles.css`;
   - `git grep -c "export \*" -- 'modules/**/*.ts'` → **0** (нових barrel'ів не з'явилось);
   - `node scratch/t20_map.cjs` (перезібравши граф `t20_graph2.cjs`) → `SCC>1: []` на
     значеннєвих ребрах.

### 7.5 Ризики

| Ризик | Оцінка | Що робити |
|---|---|---|
| Битий шлях імпорту в `.ts` | низький | `typecheck` ловить усе |
| Битий шлях у динамічному `import()` у тестах | середній | тест падає; звірити кількість тестів 2202 |
| Битий жорстко зашитий шлях `readFileSync` | **високий** | §7.3, три місця, перевірити руками |
| `styles.css` `@import` | середній | `build` + візуальна перевірка модалок на StreamYard |
| Втрата історії файла в `git log` | низький | `git mv` + `git log --follow`; в PR не змішувати переміщення зі змістовними правками |
| Конфлікти з паралельними задачами хвилі 4 | **високий** | C4.3b володіє `modules/`, `youtube/`, `popup/`, `options/`, `main.ts`, `tests/`, `styles.css` — це майже весь репозиторій. **Жодна інша задача хвилі 4 не може йти паралельно.** C4.1 (мертві фасади) і C4.2 (селектори) мають бути влиті **до** початку; C4.4 (злиття дрібних файлів) — тільки **після** |
| Розсинхрон документації | середній | §8 |

---

## 8. Що доведеться оновити в документації (окремим комітом після C4.3b)

| Файл | Згадок `modules/` | Що саме |
|---|---|---|
| `docs/ARCHITECTURE.md` | 33 | §2 (схема шарів → додати абзац «шари — це правило напрямку, теки — за доменами» + нове дерево з §3.5), §3 (шляхи в схемі конвеєра), §4 (таблиця реєстрів — усі шляхи), §5 (сховище) |
| `docs/HOWTO_ADD.md` | 7 | шляхи в покрокових інструкціях |
| `AGENTS.md` | 1 | згадка + додати правило §5.3 (заборона значеннєвих циклів між теками) |

Архівні аудити в `docs/audits/archive/` і `docs/anomalies/` **не чіпати** — це історичні
документи, вони описують стан на свою дату.

---

## 9. Чек-лист приймання C4.3a

- [x] Граф побудовано за фактичними імпортами, не за іменами файлів (§2)
- [x] Наведено fan-in, дотик до DOM, дотик до `chrome.*`, кандидати в Domain (§2.1–2.2)
- [x] Обидві осі оцінені на реальному графі, дана пряма рекомендація (§3)
- [x] Кожен зі 170 файлів згаданий у таблиці рівно один раз (§4)
- [x] Наявні підтеки розподілені, не залишені «як є» без рішення (§3.5, §6)
- [x] `modal_styles.css` має рішення (§3.5)
- [x] Цикли перевірені: значеннєвих немає, типові названі поіменно з причиною і способом
      розчеплення (§5)
- [x] Пораховано файли поза `modules/`: 174 (86 продакшн + 88 тестів), 628 специфікаторів (§7.1)
- [x] Мок-шляхи в тестах пораховані й позначені як зона особливої уваги (§7.3)
- [x] Запропоновано порядок хвиль і перевірку після кожної (§7.2, §7.4)
- [x] Коду не змінено
