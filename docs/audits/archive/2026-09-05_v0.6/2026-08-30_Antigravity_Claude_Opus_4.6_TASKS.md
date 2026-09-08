# 🗂️ Задачі за аудитом 2026-08-30 (Claude Opus 4.6)

> **Цільова модель-виконавець:** Gemini 3.7 Flash High  
> **Оркестрація:** Один оркестратор розподіляє задачі по субагентах  
> **Стратегія:** Хвилі (Waves) — задачі в одній хвилі виконуються паралельно, наступна хвиля чекає завершення попередньої  
> **File Ownership:** Кожна задача має ексклюзивний набір файлів — перетинів немає  
> **Верифікація:** Після кожної хвилі — `npm run test && npm run build`

---

## 📋 Інструкція для оркестратора

```
1. Прочитай AGENTS.md (правила проєкту) та цей файл повністю
2. Запускай задачі ХВИЛЯМИ — всі задачі однієї хвилі паралельно
3. Кожному субагенту давай: ID задачі, файли, точний опис, код-контекст
4. Після завершення хвилі — запусти `npm run test && npm run build`
5. Якщо тести ✅ — переходь до наступної хвилі
6. Якщо тести ❌ — зупинись, дебаг, виправ
```

---

## 🌊 WAVE 1 — Безпека та HTML-екранування (паралельно, 3 задачі)

Задачі не перетинаються по файлах. Запускай всі одночасно.

---

### `[x]` T-1: escapeAttr для banner search query

- **Серйозність:** 🟡 W-1
- **Складність:** Тривіальна (1 рядок)
- **Файли (ексклюзивно):** `modules/ui_banners_markup.ts`
- **Що зробити:**
  1. Додати імпорт: `import { escapeAttr } from './escape_html';`
  2. На рядку з `value="${query}"` замінити `${query}` → `${escapeAttr(query)}`
- **Контекст:** У `modules/ui_starred_markup.ts:L64` аналогічний випадок вже правильно екранований — слідуй тому ж патерну
- **Тести:** Існуючі тести мають проходити без змін

---

### `[x]` T-2: escapeHtml для brand name у stats modal

- **Серйозність:** 🟡 W-2
- **Складність:** Тривіальна (1 рядок)
- **Файли (ексклюзивно):** `modules/stats_modal.ts`
- **Що зробити:**
  1. Додати імпорт: `import { escapeHtml } from './escape_html';`
  2. На рядку ~42 де `${currentBrand}` вставляється в `<h2>` через `insertAdjacentHTML` — замінити на `${escapeHtml(currentBrand)}`
- **Тести:** `tests/stats_exporter_modal.test.js` має проходити

---

### `[x]` T-3: Consolidate duplicate escapeHTML у highlighter

- **Серйозність:** 🟡 W-3
- **Складність:** Проста (заміна методу на імпорт)
- **Файли (ексклюзивно):** `modules/comment_assistant/highlighter.ts`
- **Що зробити:**
  1. Додати імпорт: `import { escapeHtml } from '../escape_html';`
  2. Видалити локальний метод `escapeHTML` (рядки ~21-30)
  3. Замінити всі виклики `this.escapeHTML(...)` → `escapeHtml(...)` (це standalone функція, не метод класу)
- **⚠️ Увага:** Стара реалізація використовує `&#039;`, нова — `&#39;`. Обидва валідні HTML entities. Функціональної різниці немає
- **Тести:** `tests/comment_assistant.test.js` має проходити

---

## 🌊 WAVE 2 — Lifecycle та Error Boundaries (паралельно, 3 задачі)

Запускай після успішного `npm run test && npm run build` з Wave 1.

---

### `[x]` T-4: Додати destroy() до SYH_EVENT_BANNERS

- **Серйозність:** 🔴 C-1 (єдина критична)
- **Складність:** Середня
- **Файли (ексклюзивно):** `modules/event_banners/index.ts`, `modules/event_banners/types.ts`
- **Що зробити:**
  1. У `types.ts` — додати до інтерфейсу `SyhEventBanners` метод `destroy(): void;`
  2. У `index.ts` — зберегти посилання на обробники при реєстрації (зараз це анонімні arrow functions):
     ```ts
     // Замість анонімних — зберігай у змінні модуля:
     let _contextHandler: ((e: MouseEvent) => void) | null = null;
     let _mousedownHandler: ((e: MouseEvent) => void) | null = null;
     let _mouseupHandler: ((e: MouseEvent) => void) | null = null;
     let _changeHandler: ((e: Event) => void) | null = null;
     ```
  3. У `bindEvents()` — присвоїти ці змінні перед `addEventListener`
  4. Додати метод `destroy()` до об'єкта `SYH_EVENT_BANNERS`:
     ```ts
     destroy: function(): void {
         if (!eventsBound) return;
         if (_contextHandler) document.removeEventListener('contextmenu', _contextHandler, true);
         if (_mousedownHandler) document.removeEventListener('mousedown', _mousedownHandler);
         if (_mouseupHandler) document.removeEventListener('mouseup', _mouseupHandler);
         if (_changeHandler) document.removeEventListener('change', _changeHandler);
         _contextHandler = _mousedownHandler = _mouseupHandler = _changeHandler = null;
         eventsBound = false;
     }
     ```
- **🛑 ПРАВИЛО AGENTS.md:** `bindEvents()` ЗОБОВ'ЯЗАНИЙ реєструвати РІВНО 4 делеговані слухачі (contextmenu, mousedown, mouseup, change). Не додавай нові!
- **Тести:** `tests/event_banners_deps.test.js`, `tests/event_banners_mouseup_handler.test.js`

---

### `[x]` T-5: Error boundaries на entry points (main + YouTube)

- **Серйозність:** 🟡 W-5 (частина 1)
- **Складність:** Проста
- **Файли (ексклюзивно):** `main.ts`, `youtube/youtube_content.ts`, `youtube/studio/studio_content.ts`
- **Що зробити для кожного entry point:**

  **`main.ts`** — обгорнути `initSyhApp()` у try/catch:
  ```ts
  try {
      initSyhApp();
  } catch (err) {
      console.error('[SYH] Critical init error:', err);
  }
  ```

  **`youtube/youtube_content.ts`** — знайти async виклик `initializeYouTubeModule()` і додати `.catch(err => console.error('[SYH YT] Init error:', err))`

  **`youtube/studio/studio_content.ts`** — знайти async виклик `studioController.init()` і додати `.catch(err => console.error('[SYH Studio] Init error:', err))`

- **Тести:** `tests/yt_bootstrap.test.js`, `tests/studio_integration.test.js`

---

### `[x]` T-6: Error boundaries на entry points (popup + options + SW)

- **Серйозність:** 🟡 W-5 (частина 2)
- **Складність:** Проста
- **Файли (ексклюзивно):** `popup/popup_init.ts`, `options/options.ts`, `background/service-worker.ts`
- **Що зробити:**

  **`popup/popup_init.ts`** — обгорнути `initPopup()` у try/catch з console.error

  **`options/options.ts`** — обгорнути `new OptionsController()` у try/catch

  **`background/service-worker.ts`** — обгорнути async операції всередині `onInstalled` у try/catch

- **Тести:** `tests/popup_dom.test.js`, `tests/options_config.test.js`, `tests/service_worker.test.js`

---

## 🌊 WAVE 3 — Storage, Type Safety та YouTube Studio (паралельно, 4 задачі)

Запускай після успішного `npm run test && npm run build` з Wave 2.

---

### `[x]` T-7: Unhandled Promise у studio_storage_handler

- **Серйозність:** 🟡 W-6
- **Складність:** Тривіальна
- **Файли (ексклюзивно):** `youtube/studio/studio_storage_handler.ts`
- **Що зробити:**
  1. На рядках ~61-64 та ~106-109 знайти `this.loadStorageData().then(...)`
  2. Додати `.catch(err => console.error('[SYH Studio] Storage sync failed:', err))` до кожного
- **Тести:** `tests/studio_storage_handler.test.js`

---

### `[x]` T-8: Redundant double storage loading у Studio init

- **Серйозність:** 🟡 W-7
- **Складність:** Проста (видалення дублюючого виклику)
- **Файли (ексклюзивно):** `youtube/studio/studio_init.ts`
- **Що зробити:**
  1. У `studio_content.ts:L37` вже є `await this.storageController.loadStorageData()`
  2. У `studio_init.ts` знайти дублюючий виклик `loadStorageData()` (рядки ~42-64) і видалити його або прибрати дублювання (переконатись, що дані не перезаписуються)
  3. ⚠️ **УВАЖНО:** Перед видаленням перевір, чи `initializeStudioModule()` не використовує локальні результати `loadStorageData` — якщо так, передай дані через параметр
- **Тести:** `tests/studio_integration.test.js`

---

### `[x]` T-9: Boolean coercion у Options checkbox reader

- **Серйозність:** 🟡 W-10
- **Складність:** Тривіальна (1 рядок)
- **Файли (ексклюзивно):** `options/form.ts`
- **Що зробити:**
  1. На рядку ~81-83 функція `readCheckbox(id)`:
     - Зараз: `return (document.getElementById(id) as HTMLInputElement)?.checked;`
     - Замінити на: `return Boolean((document.getElementById(id) as HTMLInputElement)?.checked);`
- **Тести:** `tests/options_settings.test.js`

---

### `[x]` T-10: Polymer recycling — очистити data-syh-bound на дочірніх

- **Серйозність:** 🟡 W-8
- **Складність:** Проста
- **Файли (ексклюзивно):** `youtube/studio/studio_binding_state.ts`
- **Що зробити:**
  1. У функції `cleanupRecycledStudioElement` (~рядок 37-50) — додати видалення `data-syh-bound` з дочірніх елементів badge та dropdown:
     ```ts
     // Після видалення data-syh-bound з threadEl:
     const badge = threadEl.querySelector('[data-syh-bound]');
     if (badge) badge.removeAttribute('data-syh-bound');
     // Можна використати querySelectorAll для всіх дочірніх:
     threadEl.querySelectorAll('[data-syh-bound]').forEach(el => el.removeAttribute('data-syh-bound'));
     ```
- **Тести:** `tests/studio_recycling_lifecycle.test.js`

---

## 🌊 WAVE 4 — Cleanup та Code Hygiene (паралельно, 3 задачі)

Запускай після успішного `npm run test && npm run build` з Wave 3.

---

### `[x]` T-11: Очистити barrel re-exports

- **Серйозність:** 🟡 W-4
- **Складність:** Проста
- **Файли (ексклюзивно):** `modules/event_banners.ts`, `modules/event_comments.ts`
- **Що зробити:**

  **`modules/event_banners.ts`** — зараз:
  ```ts
  export * from './event_banners/index';
  export * from './event_banners/types';
  export * from './event_banners/deletion';      // ← дублює index
  export * from './event_banners/category';       // ← дублює index
  export * from './event_banners/mouse_handlers'; // ← дублює index
  export * from './event_banners/checkbox';        // ← дублює index
  ```
  `index.ts` вже ре-експортує всі символи з `deletion`, `category`, `mouse_handlers`, `checkbox`. Тому рядки 4-7 **дублюють**. Видалити їх, залишивши:
  ```ts
  export * from './event_banners/index';
  export * from './event_banners/types';
  ```

  **`modules/event_comments.ts`** — аналогічно перевірити, які ре-експорти вже покриті `index.ts`, і видалити дублі.

- **⚠️ ОБОВ'ЯЗКОВО:** Після змін запустити `npm run build` — якщо будь-який імпорт зламався, повернути відповідний ре-експорт
- **Тести:** Повний набір `npm run test`

---

### `[x]` T-12: revokeObjectURL timing fix

- **Серйозність:** 🟢 I-7
- **Складність:** Тривіальна (1 рядок)
- **Файли (ексклюзивно):** `options/options_config_io.ts`
- **Що зробити:**
  1. На рядку ~66 знайти: `URL.revokeObjectURL(url);`
  2. Замінити на: `setTimeout(() => URL.revokeObjectURL(url), 1000);`
- **Тести:** `tests/options_controller_io.test.js`

---

### `[x]` T-13: Видалити тимчасові файли з кореня

- **Серйозність:** 🟢 I-2
- **Складність:** Тривіальна (shell-команда)
- **Файли (ексклюзивно):** root-level temp files
- **Що зробити:** Виконати у PowerShell:
  ```powershell
  cd "d:\Chrome Extension\Время перемен. Chrome Extension\streamyars-copy-buttons (added checkbox) 0.6-2026.01.11"
  Remove-Item fallow*.json, fallow*.txt, fallow-targets.json, health*.json -ErrorAction SilentlyContinue
  Remove-Item build_final.txt, build_output*.txt, lint_output*.txt, test_output*.txt, tsc_*.txt, index.log -ErrorAction SilentlyContinue
  Remove-Item "vite.config.js.timestamp-*.mjs" -ErrorAction SilentlyContinue
  ```
- **⚠️ НЕ ВИДАЛЯТИ:** `package-lock.json`, `package.json`, `manifest.json`, `litellm-config.yaml` (останній — AI proxy config, можливо потрібен користувачу)
- **Тести:** Ніяких — це файли поза кодом

---

## 🌊 WAVE 5 — Опціональні покращення (низький пріоритет)

Виконувати лише якщо попередні хвилі ✅ і залишився час/бюджет.

---

### `[x]` T-14: Видалити dead code exports

- **Серйозність:** 🟢 I-1
- **Складність:** Проста, але потребує верифікації
- **Файли (ексклюзивно):** `youtube/studio/studio_events.ts`, `youtube/yt_events.ts`, `popup/popup_storage.ts`
- **Що зробити:**
  1. Перед видаленням кожного експорту — пошуком по кодовій базі (`grep`) переконатися, що 0 імпортерів
  2. Видалити мертві експорти: `saveStudioCollectedItem`, `saveCollectedItem`, `copyToClipboard` (yt_events), `loadData`, `saveData` (popup_storage)
- **Тести:** `npm run test && npm run build`

---

### `[x]` T-15: Оновити Release_notes.md

- **Серйозність:** 🟢 I-3
- **Складність:** Документація
- **Файли (ексклюзивно):** `Release_notes.md`
- **Що зробити:**
  1. Додати секцію `## v1.0.0` з описом нових фіч відносно v0.81
  2. Орієнтуватися на git log та існуючі записи v0.80-v0.81

---

### `[x]` T-16: Non-null assertion → type guard

- **Серйозність:** 🟢 I-6
- **Складність:** Проста
- **Файли (ексклюзивно):** `modules/utils_dom_wait.ts`
- **Що зробити:**
  1. На рядку ~138: `matchingElement!.click()` — замінити на safe check:
     ```ts
     if (matchingElement) matchingElement.click();
     ```
     Або зробити helper `isVisible` type guard: `el is HTMLElement`

---

## 📊 Зведена матриця задач

| ID | Wave | Серйозність | Складність | Ексклюзивні файли | Залежності |
|----|------|-------------|------------|-------------------|------------|
| T-1 | 1 | 🟡 | Тривіальна | `ui_banners_markup.ts` | — |
| T-2 | 1 | 🟡 | Тривіальна | `stats_modal.ts` | — |
| T-3 | 1 | 🟡 | Проста | `comment_assistant/highlighter.ts` | — |
| T-4 | 2 | 🔴 | Середня | `event_banners/index.ts`, `event_banners/types.ts` | — |
| T-5 | 2 | 🟡 | Проста | `main.ts`, `youtube_content.ts`, `studio_content.ts` | — |
| T-6 | 2 | 🟡 | Проста | `popup_init.ts`, `options.ts`, `service-worker.ts` | — |
| T-7 | 3 | 🟡 | Тривіальна | `studio_storage_handler.ts` | — |
| T-8 | 3 | 🟡 | Проста | `studio_init.ts` | — |
| T-9 | 3 | 🟡 | Тривіальна | `options/form.ts` | — |
| T-10 | 3 | 🟡 | Проста | `studio_binding_state.ts` | — |
| T-11 | 4 | 🟡 | Проста | `event_banners.ts`, `event_comments.ts` | T-4 |
| T-12 | 4 | 🟢 | Тривіальна | `options_config_io.ts` | — |
| T-13 | 4 | 🟢 | Тривіальна | root temp files | — |
| T-14 | 5 | 🟢 | Проста | `studio_events.ts`, `yt_events.ts`, `popup_storage.ts` | — |
| T-15 | 5 | 🟢 | Документація | `Release_notes.md` | — |
| T-16 | 5 | 🟢 | Проста | `utils_dom_wait.ts` | — |

---

## 🔧 Верифікація після кожної хвилі

```bash
npm run test && npm run build && npx tsc --noEmit
```

Усі три команди мають завершитися з кодом 0.
