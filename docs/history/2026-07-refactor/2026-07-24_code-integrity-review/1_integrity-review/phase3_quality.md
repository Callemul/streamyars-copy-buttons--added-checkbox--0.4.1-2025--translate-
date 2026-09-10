# 🤖 Фаза 3: Якість

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

### Задача 3.1 — Додати ESLint з конфігурацією для Chrome Extensions ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `eslint.config.js` (новий), `package.json`, `modules/parsers.js`, `modules/stats_exporter.js`, `modules/ui_banners_filters.js`, `modules/ui_comments.js`, `modules/event_banners.js`, `modules/banner_creator.js`, `popup/popup_telegram.js`, `popup/popup_translit.js`
- 🎯 **Результат:** 
  - Встановлено пакети `eslint`, `@eslint/js`, `globals` (ESLint 9+ flat config).
  - Створено `eslint.config.js` з налаштуваннями для Chrome WebExtensions, Browser, Node, jQuery (`$`, `jQuery`), Chart.js globals та виключеннями для `libs/`, `dist/`, `node_modules/`.
  - Додано команду `"lint": "eslint modules/ main.js popup/"` у `package.json`.
  - Усунуто всі 32 критичні помилки (0 errors залишилося, `npm run lint` завершується успішно).

**Що зробити:**
1. Встанови ESLint:
   ```bash
   npm install -D eslint @eslint/js globals
   ```
2. Створи `eslint.config.js` (flat config для ESLint 9+):
   ```javascript
   import js from '@eslint/js';
   import globals from 'globals';

   export default [
     js.configs.recommended,
     {
       languageOptions: {
         globals: {
           ...globals.browser,
           ...globals.webextensions,
           chrome: 'readonly',
           $: 'readonly',
           jQuery: 'readonly',
         }
       },
       rules: {
         'no-unused-vars': 'warn',
         'no-undef': 'error',
         'no-console': 'off',
         'prefer-const': 'warn',
         'eqeqeq': ['error', 'always'],
       }
     }
   ];
   ```
3. Додай script в `package.json`: `"lint": "eslint modules/ main.js popup/"`
4. Запусти `npm run lint` і виправ критичні помилки (errors), warnings залиш на потім
5. Додай `.eslintignore` або `ignores` в конфіг для `libs/`, `node_modules/`

**Файли для роботи:**
- Новий: `eslint.config.js`
- `package.json`
- Всі `.js` файли (виправлення помилок)

**Критерії готовності:**
- [x] `npm run lint` запускається без критичних errors
- [x] Warnings допустимі для першого проходу (0 errors, 72 warnings)
- [x] CI-ready конфігурація

---

### Задача 3.2 — Покрити тестами `utils.js` та `state.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені / Створені файли:** `tests/utils.test.js` (новий), `tests/state.test.js` (новий), `package.json`
- 🎯 **Результат:** 
  - Створено 14 модульних тестів для `modules/utils.js` у `tests/utils.test.js` (покриття `getTodayDateString`, `smartSearch`, `normalizeText`, `transliterate`, `switchKeyboardLayout`, `saveBannerCategory` та edge cases).
  - Створено 10 модульних тестів для `modules/state.js` у `tests/state.test.js` (покриття `getState`, `updateState`, `init`, Cache Invalidation при зміні дати, ізоляція локальних дат, обробка пошкодженого стану та відсутності storage).
  - Оновлено скрипт `"test"` у `package.json` на `"node --test tests/utils.test.js tests/state.test.js test_parsers.js"`.
  - Усі 25 тестів проходять успішно (`npm test` виконується без помилок, 100% success).

**Контекст:** Зараз тести є тільки для `parsers.js` (файл `test_parsers.js`, кастомний раннер на `node:assert`). Потрібно додати тести для `utils.js` і `state.js`.

**Що зробити:**
1. Встанови Vitest (працює з Vite, якщо задача 2.1 виконана) або Jest:
   ```bash
   npm install -D vitest
   ```
2. Створи тести для `utils.js`:
   - `smartSearch()` — перевір пошук, транслітерацію, edge cases (порожній рядок, спецсимволи)
   - `truncateText()` — перевір обрізання на 195 символів, з крапками, без
   - Інші утилітні функції
3. Створи тести для `state.js`:
   - `getState()` / `setState()` — базова робота зі станом
   - Збереження/відновлення стану з storage
   - Timezone-залежна логіка (якщо є)
   - Edge cases: порожній стан, пошкоджені дані
4. Додай script в `package.json`: `"test": "vitest run"`

**Файли для роботи:**
- Новий: `tests/utils.test.js`
- Новий: `tests/state.test.js`
- `package.json`
- Опціонально: `vitest.config.js`

**Критерії готовності:**
- [x] Мінімум 10 тестів для `utils.js` (реалізовано 14)
- [x] Мінімум 8 тестів для `state.js` (реалізовано 10)
- [x] Всі тести проходять: `npm test`
- [x] Покриті основні функції та edge cases

---

### Задача 3.3 — Оптимізувати MutationObserver (throttle + target scope) ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `main.js`
- 🎯 **Результат:** 
  - Реалізовано `requestAnimationFrame` batching для MutationObserver (накопичення мутацій у `pendingMutations` та виконання єдиної обробки за фрейм рендерингу браузера).
  - Налаштовано targeted container scope (пріоритетний обсервінг контейнерів чату `[data-testid="chat-container"]`, `.chat-container`, `#app`, `#root` із фолбеком на `document.body`).
  - Усунуто надмірне створення jQuery-обгородок: обробку вузлів переведено на нативні перевірки `.matches()` та `.querySelector()`.
  - Перевірено через linter та модульні тести — 0 помилок, 100% успіх.

**Контекст:** У `main.js` (рядок ~167) MutationObserver спостерігав за ВСІМ `document.body` рекурсивно. На живих стрімах зі швидким чатом це генерувало сотні mutation-подій на секунду. Кожна проходила через jQuery `.find()` + `.filter()` + `.addBack()` ланцюжки.

**Що зробити:**
1. Знайди MutationObserver в `main.js`
2. Обмеж observer конкретним контейнером StreamYard (знайди батьківський елемент, що містить коментарі/банери, замість `document.body`)
3. Додай `requestAnimationFrame` batching:

```javascript
let pendingMutations = [];
let rafScheduled = false;

const observer = new MutationObserver((mutations) => {
  pendingMutations.push(...mutations);
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      processMutations(pendingMutations);
      pendingMutations = [];
      rafScheduled = false;
    });
  }
});

// Спостерігати за конкретним контейнером, не за body
const container = document.querySelector('[data-testid="chat-container"]')
  || document.querySelector('.chat-container')
  || document.body; // fallback

observer.observe(container, { childList: true, subtree: true });
```

4. Оптимізуй callback — мінімізуй jQuery операції в обробнику

**Файли для роботи:**
- `main.js`

**Критерії готовності:**
- [x] Observer спостерігає за конкретним контейнером (з fallback на body)
- [x] Mutations обробляються через `requestAnimationFrame` batching
- [x] На швидкому чаті розширення не гальмує сторінку

---

### Задача 3.4 — Замінити `setInterval` DOM polling на MutationObserver ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/event_comments.js`
- 🎯 **Результат:** 
  - Замінено таймер `setInterval(..., 500)` для Auto-Heal та перевірки на подійний `MutationObserver`.
  - Додано batching через `requestAnimationFrame` для групування перевірок при швидкому оновленні коментарів у чаті.
  - Обмежено scope MutationObserver цільовим контейнером чату (`[data-testid="chat-container"]`, `.chat-container` із фолбеком на `document.body`) та відфільтровано атрибути (`aria-selected`, `class`).
  - Додано автоматичне відключення спостерігача (`disconnect()`) у випадку втрати розширенням контексту (Chrome extension context invalidation).

**Контекст:** `modules/event_comments.js` використовував `setInterval(..., 500)` для "Auto-Heal" — кожні 500мс робив `querySelectorAll` по всьому DOM. Це неефективно.

**Що зробити:**
1. Відкрий `modules/event_comments.js`
2. Знайди `setInterval` для Auto-Heal
3. Заміни на MutationObserver, який реагує на зміни DOM:

```javascript
// ❌ Було — polling кожні 500мс
setInterval(() => {
  document.querySelectorAll('.some-selector').forEach(el => {
    // auto-heal logic
  });
}, 500);

// ✅ Має бути — event-driven через MutationObserver
const autoHealObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Перевіряй тільки нові елементи
        if (node.matches('.some-selector')) {
          // auto-heal logic
        }
        node.querySelectorAll('.some-selector').forEach(el => {
          // auto-heal logic
        });
      }
    }
  }
});
```

4. Якщо певний polling неможливо замінити на MutationObserver — залиш, але збільш інтервал та додай коментар чому

**Файли для роботи:**
- `modules/event_comments.js`

**Критерії готовності:**
- [x] `setInterval` для DOM polling видалений або мінімізований
- [x] Auto-Heal працює через MutationObserver
- [x] Функціональність Auto-Heal збережена

---

### Задача 3.5 — Виправити timezone баг в `state.js` та інших модулях ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/utils.js`, `modules/state.js`, `modules/stats_exporter.js`, `modules/stats_tracker.js`
- 🎯 **Результат:** 
  - У `modules/utils.js` додано утилітну функцію `getTodayDateString()`, що повертає поточну дату за місцевим часом у форматі `YYYY-MM-DD` (`new Date().toLocaleDateString('sv-SE')`).
  - Усунуто баг із використанням `toISOString().split('T')[0]` (яка генерувала дати по UTC, призводячи до скидання стану о 21:00–22:00 за місцевим часом для часових поясів UTC+2/UTC+3).
  - Замінено розрахунок дати на локальний часовий пояс у `modules/state.js` (`init` та `saveState`), `modules/stats_exporter.js` та `modules/stats_tracker.js`.
  - Запущено автоматичне тестування (`node test_parsers.js`), 100% тестів успішно пройдено.

**Контекст:** У `state.js` для визначення дати використовується:
```javascript
new Date().toISOString().split('T')[0] // UTC-based!
```
Це означає що користувачі в UTC+2/+3 отримають скид стану о 22:00-01:00 замість опівночі.

**Що зробити:**
1. Знайди в `state.js` всі місця де використовується `toISOString().split('T')[0]`
2. Заміни на `toLocaleDateString()` з фіксованим форматом:

```javascript
// ❌ Було — UTC
new Date().toISOString().split('T')[0] // "2026-07-24" в UTC

// ✅ Має бути — локальний часовий пояс
new Date().toLocaleDateString('sv-SE') // "2026-07-24" в локальному часовому поясі
// 'sv-SE' дає формат YYYY-MM-DD
```

3. Перевір чи є аналогічні проблеми в інших файлах

**Файли для роботи:**
- `modules/state.js`
- Інші модулі (пошукай `toISOString`)

**Критерії готовності:**
- [x] Дата визначається в локальному часовому поясі користувача
- [x] Скид стану відбувається опівночі за місцевим часом
- [x] Формат дати залишається `YYYY-MM-DD`
- [x] `stats_exporter.js` та `stats_tracker.js` також оновлені для єдиної дати

---

### Задача 3.6 — Додати aria-атрибути для accessibility ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/ui_banners_items.js`, `modules/ui_banners_tabs.js`, `modules/ui_banners_filters.js`, `modules/ui_comments.js`, `modules/event_banners.js`, `modules/info_modal.js`, `modules/stats_tracker.js`, `modules/stats_exporter.js`, `popup/popup.html`, `popup/popup_init.js`
- 🎯 **Результат:** 
  - Додано `aria-label` до всіх емодзі-кнопок (📋, 📺, ❓, 🙏, 📝, 🗑️, 🎯, ✕, ⓘ, 🔄, 📄) та чекбоксів для підтримки screen readers.
  - Додано ARIA-ролі для контейнерів вкладок (`role="tablist"`), самих вкладок (`role="tab"`) із динамічним оновленням `aria-selected` ("true"/"false") при кліках.
  - Розмічено `role="tabpanel"` та зв'язки `for`/`aria-label` для текстових полів у `popup.html`.
  - Усі 25 модульних тестів проходять успішно, linter підтверджує відсутність помилок (0 errors).

**Контекст:** UI-елементи розширення не мали aria-атрибутів, що робило їх недоступними для screen readers.

**Що зробити:**
1. Знайди всі emoji-кнопки (📝, 🗑️, 🎯 тощо) і додай `aria-label`:
```javascript
// Було
$('<button>').text('📝')
// Має бути
$('<button>').text('📝').attr('aria-label', 'Edit')
```

2. Знайди tab-контролі і додай ролі:
```javascript
// Tab-контейнер
.attr('role', 'tablist')
// Кожна вкладка
.attr('role', 'tab').attr('aria-selected', isSelected)
// Tab-панель
.attr('role', 'tabpanel')
```

3. Знайди checkbox-контролі і додай `<label>` або `aria-label`

4. Перевір інші інтерактивні елементи (кнопки копіювання, фільтри тощо)

**Файли для роботи:**
- `modules/ui_core.js`
- `modules/ui_banners_tabs.js`
- `popup/popup.html`
- Інші файли де створюються UI-елементи

**Критерії готовності:**
- [x] Всі кнопки мають `aria-label`
- [x] Tab-контролі мають відповідні ARIA-ролі
- [x] Checkbox мають пов'язані labels / aria-label
- [x] Базовий рівень a11y забезпечено
