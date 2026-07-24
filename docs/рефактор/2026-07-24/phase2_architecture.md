# 🤖 Фаза 2: Архітектура

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

### Задача 2.1 — Впровадити Vite як бандлер з `@crxjs/vite-plugin` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `package.json`, `vite.config.js`, `manifest.json`, `main.js`, `test_parsers.js`, `popup/popup.html`, файли в `modules/`
- 🎯 **Результат:** 
  - Створено `package.json` та `vite.config.js` для бандлінгу Chrome Extension Manifest V3 з `@crxjs/vite-plugin`.
  - Усі 17 модулів переведено з монолітного глобального `window.SYH_*` на ES Modules (`import`/`export`) із підтримкою зворотної сумісності для моків та тестування.
  - Оновлено `manifest.json` та `main.js` для роботи через Vite бандл.
  - Оновлено `popup/popup.html` (script type="module") та адаптовано `test_parsers.js` для завантаження ES Modules.
  - Проведено тестування — `npm run build` формує оптимізовану збірку у `dist/`, а `npm test` успішно виконує всі автотести.

**Критерії готовності:**
- [x] `npm run build` створює працюючий бандл
- [x] `npm run dev` запускає dev-сервер з HMR
- [x] Всі `window.SYH_*` переведені на `import`/`export` (зі збереженням фоллбеків)
- [x] Розширення завантажується і працює з Chrome
- [x] `manifest.json` коректний для Vite/crx

---

### Задача 2.2 — Перенести CSS з JavaScript у окремі `.css` файли ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `styles.css`, `modules/ui_core.js`, `modules/ui_banners_tabs.js`, `modules/ui_comments.js`
- 🎯 **Результат:** 
  - Вилучено ін'єкції динамічних тегів `<style>` із JS-файлів `modules/ui_core.js`, `modules/ui_banners_tabs.js` та `modules/ui_comments.js`.
  - Усі стилі перенесено та об'єднано у централізованому файлі `styles.css`.

**Критерії готовності:**
- [x] Нуль CSS в JavaScript файлах
- [x] Нуль дублікатів CSS-правил
- [x] Мінімум inline-стилів (тільки динамічні, наприклад `display: none/block`)
- [x] Всі стилі підключені через `.css` файл
- [x] Візуально нічого не змінилось

---

### Задача 2.3 — Lazy loading для Chart.js ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `manifest.json`, `modules/stats_exporter.js`
- 🎯 **Результат:** 
  - Вилучено `lib/chart.js` (208KB) з `content_scripts` у `manifest.json` та додано у `web_accessible_resources`.
  - Реалізовано асинхронне завантаження через `loadChartJs()` у `modules/stats_exporter.js`, що підвантажує скрипт лише під час побудови графіка.
  - Повністю збережена функціональність та пройдено всі тести.

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
- [x] Chart.js НЕ завантажується при відкритті StreamYard
- [x] Chart.js завантажується тільки коли користувач відкриває статистику
- [x] Статистика працює коректно

---

### Задача 2.4 — Прибрати DOM-маніпуляції зі `state.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/state.js`, `modules/ui_core.js`
- 🎯 **Результат:** 
  - Видалено метод `restoreDomCheckboxes()` з `modules/state.js`.
  - DOM-логіку відновлення чекбоксів перенесено в `modules/ui_core.js` (`SYH_UI.restoreDomCheckboxes()`).
  - `modules/state.js` очищено до чистого data-layer.

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
- [x] `state.js` не містить жодних `$()`, `.css()`, `.attr()`, `.prop()` або інших jQuery/DOM викликів
- [x] DOM-маніпуляції перенесені в UI-модуль
- [x] Функціональність збережена

---

### Задача 2.5 — Централізувати Storage adapter ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/storage.js` [NEW], `modules/utils.js`, `modules/state.js`, `modules/ui_core.js`, `modules/event_comments.js`, `manifest.json`
- 🎯 **Результат:** 
  - Створено окремий модуль `modules/storage.js` із розширеним захистом від зомбі-контексту (`chrome.runtime.id`), автоматичним fallback до `localStorage` та методом подій `onChanged`.
  - Усунуто дублювання потрійних тернарних операторів розпізнавання `chrome.storage.local` у файлах `modules/state.js`, `modules/ui_core.js`, `modules/event_comments.js` та `modules/utils.js`.
  - Оновлено `manifest.json` для підключення `modules/storage.js` перед іншими залежними модулями.
  - Усі автоматичні тести успішно пройдено (`node test_parsers.js`).

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
- [x] Storage fallback-логіка існує тільки в одному місці — `storage.js`
- [x] Всі модулі використовують централізований adapter
- [x] Дані коректно зберігаються/зчитуються
