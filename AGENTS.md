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
- 🔍 **SmartSearch та транслітерація імен (consonant + ia)**:
  - Таблиця `TRANSLITERATION_MAP` та функція `transliterateRaw` зобов'язані підтримувати 3-символьні послідовності (пріоритет: 4 → 3 → 2 → 1).
  - Іменні закінчення `приголосна + ia` (`dia`, `ria`, `lia`, `nia`, `sia`, `fia`, `via`, `tia`, `ct` тощо) мають строго транслюватися як `-ия`/`-кт`, а не зливатися у 2-символьне `ia → я`. Це критично для посимвольного пошуку під час вводу (наприклад, префікс `лиди` для автора `@LidiaSplayeva`).
  - Усі кириличні варіанти закінчень (`ия`, `ія`, `иа`, `іа`) повинні симетрично схлопуватися у `toFuzzy` для повної еквівалентності українського, російського та латинського написань.
- ✂️ **Очищення суфіксів авторів у питаннях (Author Suffix Cleanup)**:
  - Патерн очищення авторів у кінці питань (`QUESTION_AUTHOR_SUFFIX_REGEX` у `modules/parsers/regex.ts`) зобов'язаний підтримувати як закриті дужки `(Автор)`, так і незакриті `( Автор 1 , Автор 2` (через необов'язкову закриваючу дужку `\)?` перед `$`).
  - Внутрішні смислові дужки всередині тексту питання (`(Тора)`, `(Рим. 8:28)`) мають обов'язково зберігатися.
  - Очищення здійснюється виключно на етапі парсингу (`cleanLine` у `sabbath_parser.ts`, `formatNumberedLine` у `standard_parser.ts`) як SSOT, щоб прев'ю у модальному вікні та фінальні банери одразу містили чистий текст.
- 🧪 **Синтаксис та запуск одиничних тестів**:
  - Файли у `tests/*.test.js` виконуються нативним раннером Node.js без компіляції TS у тестах. Заборонено писати конструкції TypeScript (`as unknown as ...`, `type`, інтерфейси) усередині `.js`-тестів.
  - Одиничні тести слід запускати з повним набором лоадерів: `node --experimental-strip-types --import ./tests/ts_loader.js --import ./tests/setup/happy-dom.ts --test "tests/<ім'я>.test.js"`.
- 🛑 **Незмінність набору глобальних слухачів у `event_banners`**:
  - `SYH_EVENT_BANNERS.bindEvents()` зобов'язаний реєструвати РІВНО 4 делеговані слухачі на `document` (`contextmenu`, `mousedown`, `mouseup`, `change`).
  - Заборонено додавати нові слухачі (наприклад, `click`) безпосередньо до `document`. Будь-яка реакція на взаємодію з банерами (включно з виявленням показу банерів на трансляції) має інтегруватися у наявний `handleBannerMouseUp` або точкові обробники елементів.
- 📊 **Симетрія 4 статистичних метрик ефіру (Min, Max, Median, Avg)**:
  - Усі форми відображення аналітики ефіру (Markdown, HTML-звіт, HTML-презентація, Full HD PNG слайд 1920x1080 та зведена таблиця модального вікна `#syh-chart-modal`) зобов'язані симетрично виводити повний набір із 4 показників: **Мінімум**, **Максимум (Пік)**, **Медіана**, **Середнє** для кожного з блоків (Суботня школа, Питання, Молитви) та загального підсумку.
- ⚡ **Автоматичний запуск фаз ефіру (SSOT & Safety Guards)**:
  - Жодна фаза не запускається без активного таймера ефіру (`Timer__TimerWrapper`).
  - Фаза коментарів (`phase_questions_start`) активується при відмічанні всіх чекбоксів банерів уроку/етеру (`stream`).
  - Фаза молитов (`phase_prayers_start`) активується при показі активного банера (`svg.lucide-eye-off`), текст якого містить слова `молитвенн*` та `просьб*` через неточний (`fuzzyIncludes`) пошук.
- 🏷️ **Збереження локацій авторів у молитвах (Prayer Author Location Suffix)**:
  - У попапі та молитовних списках суворо **заборонено відсікати назви міст чи локацій** (наприклад, `Марія • Львів` → `Марія`). Локації є критично важливими для розрізнення людей. Чистка має обмежуватися виключно технічними/небажаними символами (`@` тощо).
- 🛡️ **Zero Data Loss & Ідемпотентність міграцій (Comment Identity v2)**:
  - Будь-яка зміна генерації ключів чи схем збереження стану зобов'язана підтримувати читання legacy-ключів. Старі ключі в сховищі **не видаляються**; стан автоматично кешується/копіюється у нову схему при першому зверненні, забезпечуючи безпечний відкат (rollback safe) та ідемпотентність.
- 🎯 **Справжній пріоритет селекторів (Sequential Fallback)**:
  - Заборонено використовувати CSS-групування через кому (`querySelector(selectors.join(','))`), коли один селектор у масиві може бути DOM-батьком іншого (наприклад, `#metadata #name` vs `.author-text`). Слід використовувати послідовний перебір (`queryOne`), щоб перший селектор у масиві завжди мав справжній пріоритет над порядком у DOM-дереві.

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
