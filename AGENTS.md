@RTK.md

# AGENTS.md — Єдиний протокол та Маршрутизатор ШІ

## 💬 1. Правила комунікації та діагностики

- 🛑 **СУВОРЕ ТАБУ НА ДОДУМУВАННЯ:** Якщо завдання двозначне або є сумніви — **ЗУПИНИСЯ і запитай уточнення**. Не роби правки "наосліп".
- 🩺 **ДЕБАГ ТІЛЬКИ ЧЕРЕЗ DevTools (F12):** При збоях UI/DOM заборонено змінювати код без даних. Згенеруй та надай користувачу точковий JS-скрипт для консолі DevTools, попроси лог і спирайся виключно на факти.
- 🔬 **DEEP RESEARCH:** Якщо специфікація сайту/технології невідома на 100% — спочатку сформулюй промт для Deep Research.

---

## ⚡ 2. Протокол Аудиту та Звітів

- **Тригер "Аудит" / "Code Review":**
  1. 🛑 Без масивних буферів коду (лише точковий аналіз потрібних файлів).
  2. 🛑 Без огляду старих аудитів (аналіз з чистого аркуша).
  3. Збережи звіт у: `docs/audits/active/YYYY-MM-DD_<MODEL_NAME>_AUDIT.md`.
  4. ❓ Після збереження запитай: *"Створити список задач (`YYYY-MM-DD_<MODEL_NAME>_TASKS.md`)?"*. Створюй `TASKS.md` ТІЛЬКИ після підтвердження.

- **Папки:** Active: `docs/audits/active/` | Archive: `docs/audits/archive/YYYY-MM-DD_vX.X/`
- 🛑 **Заборонено** створювати неіменовані `AUDIT.md` у корені!

---

## 📐 3. Загальні правила та Команди

- **Codebase Search Directive:** Prefer `codebase-memory` tools (`search_code`, `search_graph`, `get_architecture`) for exploring codebase structure and logic. Fall back to standard file tools if codebase-memory returns insufficient data.
- **Команди:** `npm run dev` | `npm run build` | `npm run test` | `npm run lint`
- **Workflow RPI:** Research (`codebase-memory`) → Plan → Implement → Verify (`npm run test && npm run lint`).
- 🩺 **Happy DOM Mocking Rule**: Проєкт використовує `happy-dom` (`tests/setup/happy-dom.ts`) для глобального DOM-середовища в тестах. Через це властивості `window`, `location`, `document` та `localStorage` мають рид-онлі геттери на `global`/`globalThis`. Заборонено їх перезаписувати прямим присвоєнням (наприклад, `global.localStorage = ...`), оскільки це викличе `TypeError`. Завжди використовуйте `Object.defineProperty(global, 'property', { value: ..., configurable: true, writable: true })`.
- ⚡ **RTK Token Saving**: Для економії 90%+ контекстних токенів у терміналі рекомендується запускати довгі команди через `rtk` (наприклад, `rtk test npm run test` або `rtk tsc npx tsc --noEmit`), якщо автоматичний PreToolUse hook не перехоплює їх прозоро.
- 🛑 **ПРАВИЛО SINGLE SOURCE OF TRUTH (ГЛОБАЛЬНО ДЛЯ ВСЬОГО ДОДАТКУ):** Заборонено локально обчислювати, дублювати чи маніпулювати станом будь-яких елементів додатка (кнопки, чекбокси, зібрані коментарі, парсинг Telegram/коментарів, визначення каналів, лічильники статистики) всередині разових UI-обробників або невідповідних модулів. Усі обчислення стану та операції зобов'язані йти ВИКЛЮЧНО через відповідні сервіси та адаптери (`CommentService`, `SheetStateService`, `SYH_STORAGE`, `adapter.getButtonState`, `adapter.getCheckboxState`, `getStudioChannelInfo`). Будь-які зміни логіки підлягають обов'язковій перевірці `npm run test && npm run build`.
- **Manifest V3:** TypeScript / Vite. `host_permissions` обмежені конкретними доменами. DOM event listeners у попапі — strictly всередині `DOMContentLoaded`.
- 🩺 **TypeScript Strict Null Checks у замиканнях**: Коли поля класу/об'єкта (`this.someEl`) використовуються всередині ітераторів чи колбеків (`forEach`, `map`, `addEventListener`), обов'язково кешуйте їх у локальну змінну перед замиканням (`const el = this.someEl; if (!el) return;`), щоб запобігти помилці `TS2531: Object is possibly 'null'`.
- 📐 **Пріоритет категорій у парсері банерів**: Порядок перевірки заголовків завжди: `prayer` (МОЛИТВ, ПРОХАН, 🙏) → `stream` (СУББОТ, СУБОТ, УРОК) → `audience` (ВОПРОС, ПИТАН, ???, ❓). Ключі суботи/уроку мають обов'язковий вищий пріоритет над словом «ВОПРОС».

---

## 🧩 4. Модульна маршрутизація Скілів (Lazy-Loading)

> ⚠️ **ДИРЕКТИВА ДЛЯ AI:** Зчитуй нижчевказані скіли за допомогою інструменту читання файлів **ТІЛЬКИ** при виконанні відповідного типу задач!

- ⚙️ **Архітектура Extension / Manifest V3 / Vite / Service Workers:**
  - Зчитай `.agents/skills/chrome-extension.md` при роботі з `manifest.json`, background worker, build-скриптами чи messaging.
- 🟡 **Модуль StreamYard (`modules/streamyard/` | `app.streamyard.com`):**
  - Зчитай `.agents/skills/streamyard.md` при розробці/дебагу UI чи ін'єкцій StreamYard.
- 🔴 **Модуль YouTube Studio (`modules/youtube/` | `studio.youtube.com`):**
  - Зчитай `.agents/skills/youtube-studio.md` при розробці/дебагу YouTube Studio (Polymer, `<iron-list>`, рециклінг).

---

## 🤖 5. Вибір моделей і субагентів

- Перед призначенням моделі, reasoning effort або паралельної write-роботи використовуй `docs/CODEX_MODEL_SELECTION_GUIDE.md`.
- Якщо task card явно задає модель і reasoning — вони мають пріоритет над загальним default.
- Для паралельних змін обов'язкові неперетинний file ownership і виконання залежних задач хвилями.

---

## 🚨 ТОЧНА СХЕМА ПАРАМЕТРІВ MCP-ІНСТРУМЕНТІВ

1. ДЛЯ `codebase-memory`:
   - `search_code`: ОБОВ'ЯЗКОВИЙ параметр назвати `pattern` (НЕ `query`).
     Приклад: `call_mcp_tool("codebase-memory", "search_code", {"pattern": "cleanAuthorName"})`

2. ДЛЯ `code-extractor`:
   - `get_symbols_tool`: ОБОВ'ЯЗКОВИЙ параметр назвати `path_or_url` (НЕ `file_path`).
     Приклад: `call_mcp_tool("code-extractor", "get_symbols_tool", {"path_or_url": "modules/comment_assistant.ts"})`
   - `get_lines_tool`: ОБОВ'ЯЗКОВІ параметри `path_or_url`, `start_line`, `end_line`.
     Запитуй точечно по 15–30 рядків, щоб вивід не згортався у файл output.txt!
     Приклад: `call_mcp_tool("code-extractor", "get_lines_tool", {"path_or_url": "modules/comment_assistant.ts", "start_line": 1, "end_line": 30})`

3. ЗАБОРОНА УСИХ `view_file` ДЛЯ ФАЙЛІВ > 50 РЯДКІВ:
   - Використовуй тільки `get_lines_tool` з параметром `path_or_url`.
