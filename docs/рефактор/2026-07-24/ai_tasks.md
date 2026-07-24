# 🤖 Задачі для AI-агентів — рефакторинг StreamYard Helper

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

## Фаза 1: Quick Wins

---

### Задача 1.1 — Виправити XSS-вразливість у `popup_prayers.js`

**Контекст:** У файлі `popup_prayers.js` є XSS-вразливість — дані користувача (author) підставляються напряму в HTML через template literal. Якщо хтось у StreamYard поставить ім'я типу `<img src=x onerror=alert('XSS')>`, це виконається в контексті розширення.

**Що зробити:**
1. Відкрий файл `popup_prayers.js`
2. Знайди всі місця, де змінна `author` (або інші дані від користувача) вставляється в HTML через template literal `${...}` всередині jQuery `$(...)` або `.html(...)` або `.append(...)`
3. Заміни кожне таке місце на безпечну конструкцію з `.text()`:

**Приклад фіксу:**
```javascript
// ❌ НЕБЕЗПЕЧНО — було
const header = $(`<div>...<span class="editable-author">${author}</span>...</div>`);

// ✅ БЕЗПЕЧНО — має бути
// Створюй HTML-структуру через jQuery DOM API, а для текстових даних використовуй .text()
const authorSpan = $('<span>').addClass('editable-author').text(author);
```

4. Перевір ВСІ інші popup-файли (`popup_telegram.js`, тощо) на аналогічні проблеми і виправ їх теж

**Файли для роботи:**
- `popup/popup_prayers.js`
- `popup/popup_telegram.js` (перевірити)
- Інші файли в `popup/` (перевірити)

**Критерії готовності:**
- Жоден user-input не підставляється напряму в HTML через template literals
- Всі текстові дані проходять через `.text()` або аналогічну sanitization
- Функціональність popup не зламана

---

### Задача 1.2 — Очистити permissions у `manifest.json`

**Контекст:** У `manifest.json` є зайві permissions, які не використовуються в коді, але дають розширенню непотрібний доступ. Це червоний прапорець при ревʼю в Chrome Web Store.

**Що зробити:**
1. Відкрий `manifest.json`
2. Видали permission `"tabs"` з масиву `"permissions"` — замість нього вже є `"activeTab"`, який достатній
3. Перевір чи `"alarms"` використовується десь у коді (пошукай `chrome.alarms` у всіх `.js` файлах). Якщо НЕ використовується — видали
4. Перевір чи `"notifications"` використовується десь у коді (пошукай `chrome.notifications` у всіх `.js` файлах). Якщо НЕ використовується — видали
5. Додай секцію `"host_permissions"` (якщо її нема):
```json
"host_permissions": ["https://streamyard.com/*"]
```

**Файли для роботи:**
- `manifest.json`
- Всі `.js` файли (пошук по `chrome.alarms`, `chrome.notifications`, `chrome.tabs`)

**Критерії готовності:**
- `"tabs"` видалено з permissions
- Невикористовувані permissions видалені
- `"host_permissions"` присутній з `"https://streamyard.com/*"`
- Розширення завантажується в Chrome без помилок

---

### Задача 1.3 — Уніфікувати версію розширення

**Контекст:** Версія розширення вказана по-різному в трьох місцях, що створює плутанину:
- `manifest.json` → `"version"`: `"0.81"`
- `manifest.json` → `"default_title"`: `"0.8"`
- `main.js` → `console.log`: `"v0.9.9"`

**Що зробити:**
1. Визнач актуальну версію. Ймовірно це `0.9.9` (остання, яка в `main.js`). Встанови версію `"1.0.0"` як нову офіційну версію після рефакторингу (або `"0.9.9"` якщо хочемо зберегти поточну — обирай `"1.0.0"`)
2. В `manifest.json`:
   - `"version"` → `"1.0.0"`
   - `"default_title"` (в `browser_action` або `action`) → Оновити щоб містив актуальну версію
3. В `main.js`:
   - Оновити console.log з версією, щоб вона бралась динамічно з `chrome.runtime.getManifest().version` замість хардкоду

**Приклад для main.js:**
```javascript
// ❌ Було
console.log('[StreamYard Helper] v0.9.9');

// ✅ Має бути
const manifest = chrome.runtime.getManifest();
console.log(`[StreamYard Helper] v${manifest.version}`);
```

**Файли для роботи:**
- `manifest.json`
- `main.js`

**Критерії готовності:**
- Версія єдина і консистентна в усіх місцях
- `main.js` бере версію динамічно з manifest

---

### Задача 1.4 — Оновити jQuery до 3.7.1

**Контекст:** Проєкт використовує jQuery 3.5.0 (6+ років, має відомі performance-баги). Поточна стабільна — 3.7.1.

**Що зробити:**
1. Знайди файл jQuery у проєкті (ймовірно `libs/jquery-3.5.0.min.js` або подібний)
2. Завантаж jQuery 3.7.1 minified з офіційного CDN: `https://code.jquery.com/jquery-3.7.1.min.js`
3. Заміни старий файл на новий
4. Оновити посилання в `manifest.json` (якщо там прописаний конкретний файл jQuery з версією в назві)
5. Перевір що немає використання deprecated jQuery API, які видалені в 3.7.1:
   - `.click()` без аргументів (shorthand для `.trigger('click')`) — ОК, працює
   - `.size()` — замінити на `.length`
   - `.andSelf()` — замінити на `.addBack()`

**Файли для роботи:**
- `libs/` (директорія з бібліотеками)
- `manifest.json` (оновити посилання)
- Всі `.js` файли (перевірити deprecated API)

**Критерії готовності:**
- jQuery оновлена до 3.7.1
- `manifest.json` посилається на правильний файл
- Немає використання deprecated jQuery API
- Розширення працює коректно з новою версією

---

### Задача 1.5 — Замінити `document.execCommand("copy")` на `navigator.clipboard.writeText()`

**Контекст:** `document.execCommand("copy")` — це deprecated API. Сучасна заміна — `navigator.clipboard.writeText()`.

**Що зробити:**
1. Знайди всі використання `document.execCommand("copy")` або `document.execCommand('copy')` в проєкті
2. Заміни кожне на `navigator.clipboard.writeText(text)`:

**Приклад фіксу:**
```javascript
// ❌ Deprecated — було
const textArea = document.createElement('textarea');
textArea.value = text;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);

// ✅ Сучасний API — має бути
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback для старих браузерів
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
```

3. Переконайся що в `manifest.json` є permission `"clipboardWrite"` (якщо потрібно для content scripts)

**Файли для роботи:**
- `popup/popup_prayers.js`
- `popup/popup_telegram.js`
- Інші файли — пошукай `execCommand` по всьому проєкту

**Критерії готовності:**
- Всі `document.execCommand("copy")` замінені на `navigator.clipboard.writeText()`
- Є fallback для випадків де clipboard API недоступний
- Копіювання працює як раніше

---

### Задача 1.6 — Винести magic numbers в `config.js`

**Контекст:** По коду розкидані "магічні числа" без пояснення. Їх потрібно централізувати в `config.js` з описовими іменами.

**Що зробити:**
1. Відкрий `modules/config.js` і додай нову секцію (або розшир існуючу) для констант:

```javascript
// Додати в config.js
TIMINGS: {
  ANTI_AFK_INTERVAL: 30000,        // 30 секунд — інтервал Anti-AFK кліків
  AUTO_HEAL_POLLING: 500,          // 500мс — DOM polling для Auto-Heal
  FILTER_DEBOUNCE: 150,            // 150мс — debounce для фільтру пошуку
  STATS_TRACKING_INTERVAL: 60000,  // 60 секунд — інтервал збору статистики
  REMINDER_DELAY: 2 * 60 * 1000,  // 2 хвилини — затримка нагадування
},
LIMITS: {
  TEXT_TRUNCATION_LENGTH: 195,     // Максимальна довжина тексту перед обрізанням
}
```

2. Знайди кожне з цих чисел в коді і заміни на посилання з конфігу:
   - `30000` в Anti-AFK → `SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL`
   - `500` в Auto-Heal → `SYH_CONFIG.TIMINGS.AUTO_HEAL_POLLING`
   - `150` в debounce → `SYH_CONFIG.TIMINGS.FILTER_DEBOUNCE`
   - `195` в truncation → `SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH`
   - `60000` в stats → `SYH_CONFIG.TIMINGS.STATS_TRACKING_INTERVAL`
   - `2 * 60 * 1000` або `120000` → `SYH_CONFIG.TIMINGS.REMINDER_DELAY`

**Файли для роботи:**
- `modules/config.js` (додати константи)
- `main.js`
- `modules/event_comments.js`
- `modules/utils.js`
- `modules/parsers.js`
- `modules/stats_tracker.js`
- Інші модулі — пошукай ці числа

**Критерії готовності:**
- Всі magic numbers винесені в `config.js`
- Кожна константа має описову назву та коментар
- Всі модулі використовують значення з конфігу
- Функціональність не змінилась

---

### Задача 1.7 — Видалити дублікат `getCheckedState()` / `getState()` в `state.js`

**Контекст:** У `modules/state.js` (рядки ~80-86) є два ідентичних методи: `getCheckedState()` і `getState()`. Один з них зайвий.

**Що зробити:**
1. Відкрий `modules/state.js`
2. Порівняй методи `getCheckedState()` та `getState()` — вони мають бути ідентичними
3. Видали один з них (залиш `getState()` як основний, бо ім'я більш зрозуміле)
4. Знайди всі виклики `getCheckedState()` по всьому проєкту і заміни на `getState()`

**Файли для роботи:**
- `modules/state.js`
- Всі файли що викликають `getCheckedState()` — пошукай по проєкту

**Критерії готовності:**
- Залишився тільки один метод — `getState()`
- Всі виклики `getCheckedState()` замінені на `getState()`
- Нічого не зламалось

---

### Задача 1.8 — Винести хардкоджені CSS-класи з `main.js` в `config.js`

**Контекст:** У `main.js` (рядки ~82-84) є хардкоджені CSS-класи StreamYard, які мають бути в `config.js` разом з іншими селекторами.

**Що зробити:**
1. Відкрий `main.js` і знайди хардкоджені CSS-класи StreamYard:
```javascript
'.StarredCommentList__HeaderWrap-sc-1qtlqu2-5'
'.StarredCommentList__ItemWrap-sc-1qtlqu2-6'
'.StarredCommentList__List-sc-1qtlqu2-1'
```
2. Перенеси їх в `modules/config.js` в секцію `SELECTORS`:
```javascript
SELECTORS: {
  // ... існуючі селектори ...
  STARRED_HEADER_WRAP: '.StarredCommentList__HeaderWrap-sc-1qtlqu2-5',
  STARRED_ITEM_WRAP: '.StarredCommentList__ItemWrap-sc-1qtlqu2-6',
  STARRED_LIST: '.StarredCommentList__List-sc-1qtlqu2-1',
}
```
3. Оновити `main.js` щоб використовував `SYH_CONFIG.SELECTORS.STARRED_*`
4. Перевір чи є інші хардкоджені CSS-класи StreamYard в інших файлах (не в `config.js`) і теж перенеси

**Файли для роботи:**
- `main.js`
- `modules/config.js`
- Інші модулі (перевірити на хардкоджені StreamYard CSS-класи)

**Критерії готовності:**
- Всі StreamYard CSS-класи знаходяться тільки в `config.js`
- Інші файли посилаються на `SYH_CONFIG.SELECTORS.*`

---

## Фаза 2: Архітектура

---

### Задача 2.1 — Впровадити Vite як бандлер з `@crxjs/vite-plugin`

**Контекст:** Зараз розширення використовує глобальний namespace `window.SYH_*` для комунікації між модулями. Кожен модуль реєструється як глобальний об'єкт (SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, тощо). Це створює проблеми: конфлікти з іншими розширеннями, крихкий порядок завантаження, неможливість tree-shaking.

Потрібно перейти на ES Modules з Vite + `@crxjs/vite-plugin`.

**Що зробити:**
1. Ініціалізуй Vite проєкт у корені розширення:
   ```bash
   npm init -y
   npm install -D vite @crxjs/vite-plugin
   ```
2. Створи `vite.config.js` з конфігурацією для Chrome Extension:
   ```javascript
   import { defineConfig } from 'vite';
   import { crx } from '@crxjs/vite-plugin';
   import manifest from './manifest.json';

   export default defineConfig({
     plugins: [crx({ manifest })],
   });
   ```
3. Конвертуй кожен модуль з `window.SYH_*` на ES Modules (`export`/`import`):
   - `modules/config.js` → `export const CONFIG = { ... }` замість `window.SYH_CONFIG = { ... }`
   - `modules/state.js` → `import { CONFIG } from './config.js'; export const STATE = { ... }`
   - І так далі для всіх модулів
4. Оновити `manifest.json` — видалити масив `content_scripts[].js` з переліком окремих файлів, замість цього Vite сам сгенерує bundled файл
5. Оновити `main.js` як entry point з імпортами всіх модулів
6. Переконатися що popup теж працює через Vite

**Файли для роботи:**
- Всі файли в `modules/`
- `main.js`
- `manifest.json`
- `popup/` (всі файли)
- Нові: `vite.config.js`, `package.json`

**ВАЖЛИВО:** Це найбільша задача. Конвертуй модулі по одному, перевіряючи працездатність після кожного.

**Критерії готовності:**
- `npm run build` створює працюючий бандл
- `npm run dev` запускає dev-сервер з HMR
- Всі `window.SYH_*` видалені, замість них `import`/`export`
- Розширення завантажується і працює з Chrome
- `manifest.json` коректний для Vite/crx

---

### Задача 2.2 — Перенести CSS з JavaScript у окремі `.css` файли

**Контекст:** Зараз 200+ рядків CSS знаходяться всередині JavaScript файлів як інлайн `<style>` блоки:
- `modules/ui_core.js` → `syh-global-styles` (~50 рядків CSS)
- `modules/ui_banners_tabs.js` → `syh-banner-header-styles` (~100 рядків CSS)
- Дублювання правил для `.Banner__Wrap` між цими файлами
- Масивні inline-стилі в HTML-шаблонах

**Що зробити:**
1. Створи файл `styles/content.css` для CSS content scripts
2. Витягни ВСЕ CSS з JavaScript файлів в `styles/content.css`:
   - Знайди всі місця де створюються `<style>` теги або інжектяться CSS
   - Перенеси CSS-правила в `.css` файл
   - Видали JavaScript код що інжектив ці стилі
3. Видали дублікати CSS-правил (`.Banner__Wrap` стилі тощо)
4. Для inline-стилів в HTML-шаблонах — створи відповідні CSS-класи
5. Підключи `.css` файл через `manifest.json` → `content_scripts[].css` (або через Vite якщо задача 2.1 вже виконана)

**Файли для роботи:**
- `modules/ui_core.js`
- `modules/ui_banners_tabs.js`
- Інші модулі з inline CSS
- Новий: `styles/content.css`
- `manifest.json`

**Критерії готовності:**
- Нуль CSS в JavaScript файлах
- Нуль дублікатів CSS-правил
- Мінімум inline-стилів (тільки динамічні, наприклад `display: none/block`)
- Всі стилі підключені через `.css` файл
- Візуально нічого не змінилось

---

### Задача 2.3 — Lazy loading для Chart.js

**Контекст:** Chart.js (208KB) завантажується як content script на КОЖНУ сторінку StreamYard, навіть якщо статистика не відкрита. Це марна витрата пам'яті та часу.

**Що зробити:**
1. Видали `chart.js` з `manifest.json` → `content_scripts[].js`
2. Модифікуй модуль статистики щоб він динамічно завантажував Chart.js тільки коли потрібно:

```javascript
// Приклад lazy loading
async function loadChartJs() {
  if (typeof Chart !== 'undefined') return; // Вже завантажено

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('libs/chart.js');
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Використання
async function showStats() {
  await loadChartJs();
  // ... тепер Chart доступний
}
```

Якщо Vite вже впроваджено (задача 2.1), використай динамічний `import()`:
```javascript
async function showStats() {
  const { Chart } = await import('chart.js');
  // ...
}
```

**Файли для роботи:**
- `manifest.json`
- `modules/stats_tracker.js` (або де використовується Chart.js)
- `libs/chart.js`

**Критерії готовності:**
- Chart.js НЕ завантажується при відкритті StreamYard
- Chart.js завантажується тільки коли користувач відкриває статистику
- Статистика працює коректно

---

### Задача 2.4 — Прибрати DOM-маніпуляції зі `state.js`

**Контекст:** `state.js` (рядки ~45-72) містить метод `restoreDomCheckboxes()` який напряму маніпулює DOM через jQuery. State layer повинен бути чисто data layer — зберігати та надавати дані, а не змінювати UI.

**Що зробити:**
1. Відкрий `modules/state.js` і знайди `restoreDomCheckboxes()` та інші DOM-маніпуляції
2. Перенеси DOM-логіку в відповідний UI-модуль (`modules/ui_core.js` або створи `modules/ui_checkboxes.js`)
3. В `state.js` залиш тільки дата-операції (read/write стану)
4. UI-модуль має підписуватися на зміни стану і оновлювати DOM

**Приклад рефакторингу:**
```javascript
// state.js — тільки дані
getState() { return this._state; },
setState(key, value) { this._state[key] = value; this._save(); },

// ui_checkboxes.js — DOM
function restoreDomCheckboxes() {
  const state = SYH_STATE.getState();
  // ... jQuery DOM маніпуляції ...
}
```

5. Оновити всі місця що викликають `SYH_STATE.restoreDomCheckboxes()` — перенаправити на UI-модуль

**Файли для роботи:**
- `modules/state.js`
- `modules/ui_core.js` (або новий файл)
- Файли що викликають `restoreDomCheckboxes()`

**Критерії готовності:**
- `state.js` не містить жодних `$()`, `.css()`, `.attr()`, `.prop()` або інших jQuery/DOM викликів
- DOM-маніпуляції перенесені в UI-модуль
- Функціональність збережена

---

### Задача 2.5 — Централізувати Storage adapter

**Контекст:** Storage adapter з fallback-логікою (`chrome.storage.local` → `localStorage`) дублюється 4 рази в різних файлах: `state.js`, `utils.js`, `ui_core.js`, та ще один модуль.

**Що зробити:**
1. Створи єдиний storage adapter — `modules/storage.js`:

```javascript
// modules/storage.js
const StorageAdapter = {
  async get(key) {
    try {
      if (chrome?.storage?.local) {
        return new Promise(resolve => {
          chrome.storage.local.get(key, result => resolve(result[key]));
        });
      }
    } catch (e) { /* fallback */ }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  async set(key, value) {
    try {
      if (chrome?.storage?.local) {
        return chrome.storage.local.set({ [key]: value });
      }
    } catch (e) { /* fallback */ }
    localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key) {
    try {
      if (chrome?.storage?.local) {
        return chrome.storage.local.remove(key);
      }
    } catch (e) { /* fallback */ }
    localStorage.removeItem(key);
  }
};
```

2. Видали всі дублікати storage fallback-логіки з `state.js`, `utils.js`, `ui_core.js`
3. Заміни на виклики `StorageAdapter.get()` / `StorageAdapter.set()`

**Файли для роботи:**
- Новий: `modules/storage.js`
- `modules/state.js`
- `modules/utils.js`
- `modules/ui_core.js`
- Інші модулі де є storage fallback

**Критерії готовності:**
- Storage fallback-логіка існує тільки в одному місці — `storage.js`
- Всі модулі використовують централізований adapter
- Дані коректно зберігаються/зчитуються

---

## Фаза 3: Якість

---

### Задача 3.1 — Додати ESLint з конфігурацією для Chrome Extensions

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
- `npm run lint` запускається без критичних errors
- Warnings допустимі для першого проходу
- CI-ready конфігурація

---

### Задача 3.2 — Покрити тестами `utils.js` та `state.js`

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
- Мінімум 10 тестів для `utils.js`
- Мінімум 8 тестів для `state.js`
- Всі тести проходять: `npm test`
- Покриті основні функції та edge cases

---

### Задача 3.3 — Оптимізувати MutationObserver (throttle + target scope)

**Контекст:** У `main.js` (рядок ~167) MutationObserver спостерігає за ВСІМ `document.body` рекурсивно. На живих стрімах зі швидким чатом це генерує сотні mutation-подій на секунду. Кожна проходить через jQuery `.find()` + `.filter()` + `.addBack()` ланцюжки.

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
- Observer спостерігає за конкретним контейнером (з fallback на body)
- Mutations обробляються через `requestAnimationFrame` batching
- На швидкому чаті розширення не гальмує сторінку

---

### Задача 3.4 — Замінити `setInterval` DOM polling на MutationObserver

**Контекст:** `modules/event_comments.js` використовує `setInterval(..., 500)` для "Auto-Heal" — кожні 500мс робить `querySelectorAll` по всьому DOM. Це неефективно.

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
- `setInterval` для DOM polling видалений або мінімізований
- Auto-Heal працює через MutationObserver
- Функціональність Auto-Heal збережена

---

### Задача 3.5 — Виправити timezone баг в `state.js`

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
- Дата визначається в локальному часовому поясі користувача
- Скид стану відбувається опівночі за місцевим часом
- Формат дати залишається `YYYY-MM-DD`

---

### Задача 3.6 — Додати aria-атрибути для accessibility

**Контекст:** UI-елементи розширення не мають aria-атрибутів, що робить їх недоступними для screen readers.

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
- Всі кнопки мають `aria-label`
- Tab-контролі мають відповідні ARIA-ролі
- Checkbox мають пов'язані labels
- Базовий рівень a11y забезпечено

---

## Фаза 4: Масштабування (опціонально)

---

### Задача 4.1 — Поступовий перехід на TypeScript

**Що зробити:**
1. Встанови TypeScript:
   ```bash
   npm install -D typescript
   ```
2. Створи `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": false,
       "allowJs": true,
       "checkJs": true,
       "outDir": "./dist",
       "rootDir": "./",
       "types": ["chrome"]
     },
     "include": ["modules/**/*", "main.ts", "popup/**/*"]
   }
   ```
3. Встанови Chrome types: `npm install -D @types/chrome @types/jquery`
4. Почни з конвертації найпростіших модулів — переіменуй `.js` → `.ts`:
   - `modules/config.js` → `modules/config.ts` (додай типи для CONFIG об'єкту)
   - `modules/storage.js` → `modules/storage.ts`
5. НЕ конвертуй все одразу — тільки 2-3 модулі для початку
6. Переконайся що Vite коректно обробляє `.ts` файли

**Файли для роботи:**
- Новий: `tsconfig.json`
- `package.json`
- `modules/config.js` → `.ts`
- `modules/storage.js` → `.ts` (якщо створено в задачі 2.5)
- `vite.config.js` (оновити якщо потрібно)

**Критерії готовності:**
- TypeScript налаштований
- 2-3 модулі конвертовані на `.ts`
- `npm run build` працює
- IDE підказки типів працюють

---

### Задача 4.2 — Інтернаціоналізація через `chrome.i18n`

**Контекст:** Зараз хардкоджені текстові літерали (`'Stay in the studio'`, `'Ended'`, `'Timer off'`, `'Download'`) розкидані по коду. Якщо StreamYard змінить мову UI — все зламається.

**Що зробити:**
1. Створи структуру `_locales/`:
   ```
   _locales/
   ├── en/
   │   └── messages.json
   ├── uk/
   │   └── messages.json
   └── ru/
       └── messages.json
   ```
2. В `messages.json` додай всі текстові літерали:
   ```json
   {
     "stayInStudio": {
       "message": "Stay in the studio",
       "description": "Anti-AFK button text in StreamYard"
     },
     "streamEnded": {
       "message": "Ended",
       "description": "Text indicating stream has ended"
     }
   }
   ```
3. Заміни хардкоджені рядки на `chrome.i18n.getMessage('stayInStudio')`
4. Додай `"default_locale": "en"` в `manifest.json`

**Файли для роботи:**
- Новий: `_locales/en/messages.json`
- Новий: `_locales/uk/messages.json`
- `manifest.json`
- Всі модулі з хардкодженими текстами

**Критерії готовності:**
- Всі user-facing рядки в `_locales/`
- `chrome.i18n.getMessage()` використовується замість хардкоду
- Мінімум 2 мови (en, uk)
- Розширення працює з обома мовами

---

### Задача 4.3 — Створити Service Worker для background tasks

**Що зробити:**
1. Створи `background/service-worker.js`
2. Перенеси background-логіку (якщо є): alarms, notifications
3. В `manifest.json` додай:
   ```json
   "background": {
     "service_worker": "background/service-worker.js",
     "type": "module"
   }
   ```
4. Налаштуй комунікацію між content scripts і service worker через `chrome.runtime.sendMessage`

**Файли для роботи:**
- Новий: `background/service-worker.js`
- `manifest.json`
- Модулі що потребують background tasks

**Критерії готовності:**
- Service worker зареєстрований і працює
- Background tasks виконуються коректно
- Content scripts можуть комунікувати з service worker

---

### Задача 4.4 — Створити окрему Options Page

**Що зробити:**
1. Створи `options/options.html` та `options/options.js`
2. Перенеси налаштування з popup в окрему Options Page
3. В `manifest.json` додай:
   ```json
   "options_page": "options/options.html"
   ```
   або:
   ```json
   "options_ui": {
     "page": "options/options.html",
     "open_in_tab": true
   }
   ```
4. Popup залиш для швидких дій, Options Page — для детальних налаштувань

**Файли для роботи:**
- Новий: `options/options.html`
- Новий: `options/options.js`
- Новий: `options/options.css`
- `manifest.json`
- `popup/` файли (видалити/спростити частину налаштувань)

**Критерії готовності:**
- Options Page відкривається з контекстного меню розширення
- Налаштування зберігаються через `chrome.storage`
- Popup спрощений, містить тільки швидкі дії
