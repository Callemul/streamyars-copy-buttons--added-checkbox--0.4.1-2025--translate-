@RTK.md

# AGENTS.md — протокол роботи над проєктом

> Карта проєкту — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
> Як додати кнопку / поле / опцію / платформу — [docs/HOWTO_ADD.md](docs/HOWTO_ADD.md).
> Тематичні технічні правила — [docs/rules/](docs/rules/) (індекс у §5).

---

## 💬 1. Комунікація та діагностика

- 🛑 **СУВОРЕ ТАБУ НА ДОДУМУВАННЯ:** якщо завдання двозначне або є сумніви — **ЗУПИНИСЯ і запитай уточнення**. Не роби правки «наосліп».
- 🩺 **ДЕБАГ ТІЛЬКИ ЧЕРЕЗ DevTools (F12):** при збоях UI/DOM заборонено змінювати код без даних. Згенеруй точковий JS-скрипт для консолі, попроси лог і спирайся виключно на факти.
- 🔬 **DEEP RESEARCH:** якщо специфікація сайту/технології невідома на 100% — спершу сформулюй промт для Deep Research.

---

## 🎯 2. Головне правило: SSOT через реєстри

**Перед тим як створювати UI-елемент, поле, ключ чи обчислення — знайди його реєстр**
у таблиці [ARCHITECTURE.md §4](docs/ARCHITECTURE.md#4-реєстри-проєкту-ssot-точки).

1. Реєстр є → додай **один запис** у нього.
2. Реєстру немає → **створи реєстр**, а не другу копію поруч.
3. Скопіювати наявний блок і поправити — **заборонено**.

Ознака, що ти йдеш неправильно: доводиться робити ту саму правку вдруге в іншому файлі.

Заборонено локально обчислювати, дублювати чи маніпулювати станом елементів застосунку
(кнопки, чекбокси, зібрані коментарі, парсинг Telegram/коментарів, визначення каналів,
лічильники статистики) всередині разових UI-обробників або невідповідних модулів.
Усі операції йдуть **виключно** через сервіси та адаптери: `CommentService`,
`SheetStateService`, `SYH_STORAGE`, `adapter.getButtonState`, `adapter.getCheckboxState`,
`getStudioChannelInfo`.

Дія над коментарем має бути на **всіх трьох поверхнях** (StreamYard / YouTube / Studio)
або свідомо позначена в реєстрі як відсутня на конкретній (`null` замість оверайду).

---

## 📐 3. Команди і workflow

- **Команди:** `npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck`
- **Перед комітом — одна команда:** `npm run verify` (typecheck → lint → test → build).
- **Workflow RPI:** Research → Plan → Implement → Verify (`npm run verify`).
- **Codebase Search Directive:** для дослідження структури й логіки віддавай перевагу
  `codebase-memory` (`search_code`, `search_graph`, `get_architecture`); якщо даних
  недостатньо — звичайні файлові інструменти.
- ⚡ **RTK Token Saving:** довгі команди в терміналі запускай через `rtk`
  (`rtk test npm run test`, `rtk tsc npx tsc --noEmit`), якщо PreToolUse hook не робить це прозоро.

---

## ⚡ 4. Протокол аудиту та звітів

- **Тригер «Аудит» / «Code Review»:**
  1. 🛑 Без масивних буферів коду (лише точковий аналіз потрібних файлів).
  2. 🛑 Без огляду старих аудитів (аналіз з чистого аркуша).
  3. Збережи звіт у `docs/audits/active/YYYY-MM-DD_<MODEL_NAME>_AUDIT.md`.
  4. ❓ Після збереження запитай: *«Створити список задач (`YYYY-MM-DD_<MODEL_NAME>_TASKS.md`)?»*.
     Створюй `TASKS.md` **тільки** після підтвердження.
- **Папки:** активні — `docs/audits/active/`, архів — `docs/audits/archive/YYYY-MM-DD_vX.X/`.
- 🛑 **Заборонено** створювати неіменовані `AUDIT.md` у корені.

---

## 📚 5. Технічні правила (читай за темою задачі)

| Тема | Файл |
|---|---|
| Тести: happy-dom, запуск одиничного тесту | [docs/rules/testing.md](docs/rules/testing.md) |
| Сховище: zero data loss, міграції, ключі, локації авторів | [docs/rules/storage.md](docs/rules/storage.md) |
| DOM і селектори: sequential fallback, strict null, MV3 | [docs/rules/dom-selectors.md](docs/rules/dom-selectors.md) |
| Парсери банерів: пріоритет категорій, суфікси авторів | [docs/rules/parsers.md](docs/rules/parsers.md) |
| SmartSearch і транслітерація імен | [docs/rules/search-translit.md](docs/rules/search-translit.md) |
| Події банерів і 4 метрики аналітики, авто-фази | [docs/rules/events-analytics.md](docs/rules/events-analytics.md) |

Нове довготривале правило додається **окремим файлом у `docs/rules/`** і рядком у цій
таблиці — не рядком у кінці `AGENTS.md`.

---

## 🧩 6. Модульна маршрутизація скілів (lazy-loading)

> ⚠️ **ДИРЕКТИВА ДЛЯ AI:** зчитуй скіли **тільки** при виконанні відповідного типу задач.

- ⚙️ **Extension / Manifest V3 / Vite / Service Worker** → `.agents/skills/chrome-extension.md`
- 🟡 **StreamYard** (`modules/`, `app.streamyard.com`) → `.agents/skills/streamyard.md`
- 🔴 **YouTube Studio** (`youtube/studio/`, Polymer, `<iron-list>`) → `.agents/skills/youtube-studio.md`

---

## 🤖 7. Вибір моделей і субагентів

- Перед призначенням моделі, reasoning effort або паралельної write-роботи використовуй
  `docs/CODEX_MODEL_SELECTION_GUIDE.md`.
- Якщо task card явно задає модель і reasoning — вони мають пріоритет над default.
- Для паралельних змін обов'язкові неперетинний file ownership і виконання залежних задач хвилями.

---

## 🚨 8. Точна схема параметрів MCP-інструментів

1. `codebase-memory`:
   - `search_code`: обов'язковий параметр називається `pattern` (**не** `query`).
     Приклад: `call_mcp_tool("codebase-memory", "search_code", {"pattern": "cleanAuthorName"})`

2. `code-extractor`:
   - `get_symbols_tool`: обов'язковий параметр `path_or_url` (**не** `file_path`).
     Приклад: `call_mcp_tool("code-extractor", "get_symbols_tool", {"path_or_url": "modules/comment_assistant/processor.ts"})`
   - `get_lines_tool`: обов'язкові `path_or_url`, `start_line`, `end_line`.
     Запитуй точково по 15–30 рядків, щоб вивід не згортався у файл.

3. **Заборона `view_file` для файлів > 50 рядків** — тільки `get_lines_tool` з `path_or_url`.
