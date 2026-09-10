# Документація StreamYard Helper

Навігація по `docs/`. Тут лише вказівники — самі правила живуть у відповідних файлах.

## Почати звідси

| Документ | Для кого | Про що |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | розробник, агент | шари, точки входу, конвеєр коментарів, **таблиця реєстрів (SSOT)** |
| [HOWTO_ADD.md](HOWTO_ADD.md) | розробник, агент | як додати кнопку · поле аркуша · опцію · платформу · правило |
| [../AGENTS.md](../AGENTS.md) | агент | протокол роботи: комунікація, SSOT, команди, аудит |
| [../CLAUDE.md](../CLAUDE.md) | Claude Code | вказівник на `AGENTS.md` — Claude Code не гарантує читання `AGENTS.md` без нього |
| [../README.md](../README.md) | новачок | що це за розширення, стек, збірка |

## Технічні правила (`rules/`)

| Файл | Тема |
|---|---|
| [rules/testing.md](rules/testing.md) | happy-dom, запуск одиничного тесту, заборона TS у `.js`-тестах |
| [rules/storage.md](rules/storage.md) | zero data loss, міграції, ключі, локації авторів молитов |
| [rules/dom-selectors.md](rules/dom-selectors.md) | sequential fallback, strict null у замиканнях, MV3 |
| [rules/parsers.md](rules/parsers.md) | пріоритет категорій банерів, очищення суфіксів авторів |
| [rules/search-translit.md](rules/search-translit.md) | транслітерація імен і fuzzy-пошук |
| [rules/events-analytics.md](rules/events-analytics.md) | 4 слухачі `event_banners`, 4 метрики ефіру, авто-фази |

## Аудити

- `audits/active/` — актуальні звіти й списки задач. Поточний: [2026-09-08](audits/active/2026-09-08_CLAUDE_OPUS_5_AUDIT.md) + [TASKS](audits/active/2026-09-08_CLAUDE_OPUS_5_TASKS.md).
- `audits/archive/YYYY-MM-DD_vX.X/` — історія (12 моделей, 60+ файлів). Не видаляти: там зафіксовані вже виправлені дефекти й рішення користувача.
- Протокол аудиту — `AGENTS.md` §4.

## Інше

| Шлях | Що це |
|---|---|
| [MODEL_SELECTION_GUIDE.md](MODEL_SELECTION_GUIDE.md) | вибір моделі та reasoning для задачі (мапа Opus/Sonnet/Haiku — у `AGENTS.md` §7) |
| `anomalies/` | розібрані нетипові збої (jQuery-експорт, invalidated context тощо) |
| `manual testing/` | сценарії ручної перевірки перед релізом |
| `dom_snapshots/` | зрізи DOM платформ для звірки селекторів |
| `plans/` | плани підмодулів: YouTube comments, фіксація клітинок (`lock-cells-*`, **не реалізовано**, 2026-09-04) |
| `prompts/` | шаблони промтів (протокол рефакторингу) |
| `history/` | архів минулого: `walkthrough.md` (хроніка рефакторингу) і `2026-07-refactor/` (плани й аудити липня–серпня 2026, див. власний README) |
| `FUTURE_IDEAS_GEMINI_API_COMMENTS.md` | ідеї на майбутнє, не план |

## Документи в корені проєкту

| Файл | Аудиторія | Статус |
|---|---|---|
| `README.md` | усі | актуальний |
| `AGENTS.md` | агенти | актуальний |
| `CLAUDE.md` | Claude Code | актуальний — вказівник на `AGENTS.md`, правил не дублює |
| `DEVELOPER_NOTES.md` | розробник | актуальний — правила парсингу Telegram-тексту, які не дублюються в `docs/rules/` |
| `Daily_tips.md` | **користувач** розширення | актуальний — це не технічний документ |
| `Release_notes.md` | усі | актуальний |

`walkthrough.md` переїхав у [`docs/history/walkthrough.md`](history/walkthrough.md) — це історична хроніка
рефакторингу (тестів тоді було 120, зараз 2200+), тримати як хроніку, не як інструкцію.
