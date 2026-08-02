# 📋 Список задач (на основі незалежного аудиту)
**Дата:** 2026-08-02
**Джерело:** `__Opus - оцінив всіх - і дав ще свій -- audit_battle_evaluation.md`

Цей файл містить виявлені проблеми, розділені за пріоритетом. Використовуйте позначки `[x]` для відмічення виконаних задач.

---

## 🔴 HIGH — Критичні проблеми (потребують негайного виправлення)

- [ ] **H1:** Memory leak — накопичення document-level click listeners у `studio_events.ts`. 
  - *Fix:* Винести listener за межі `bindStudioCommentEvents()` — зробити глобальний одноразовий обробник, який перевіряє активний dropdown.
- [ ] **H2:** `getBrandFromLocalStorage()` без try-catch навколо `JSON.parse` у циклі (`stats_tracker.ts`). 
  - *Fix:* Обгорнути `JSON.parse` всередині циклу окремим `try-catch`.
- [ ] **H3:** Stale Closures у `studio_events.ts` — кнопки копіюють дані ПОПЕРЕДНЬОГО коментаря (через віртуальний скролінг). 
  - *Fix:* Замість замикання параметрів при біндингу — зчитувати `author` і `text` динамічно в момент кліку.
- [ ] **H4:** `eval()` у `stats_exporter.ts` — порушення CSP для Chrome Web Store (через Chart.js). 
  - *Fix:* Імпортувати Chart.js через бандлер Vite або додати як статичний `<script>` у `web_accessible_resources`.
- [ ] **H5:** 35+ глобальних функцій на `window` у popup-скриптах. 
  - *Fix:* Поетапна міграція на ES-модулі (`import/export`), починаючи з `popup_init.js` → `popup_init.ts`.

---

## 🟠 MEDIUM — Архітектурні проблеми

- [ ] **M1:** Відсутність `chrome.runtime.lastError` перевірок у popup storage callbacks (`popup_init.js`, `popup_telegram.js`, `popup_prayers.js`). 
  - *Fix:* Додати перевірку `chrome.runtime.lastError` в кожен callback.
- [ ] **M2:** Popup-скрипти обходять `SYH_STORAGE` адаптер (42+ прямих виклики). 
  - *Fix:* Перевести всі виклики `chrome.storage.local` на використання централізованого `SYH_STORAGE` адаптера.
- [ ] **M3:** `setInterval(1000)` для SPA навігації без cleanup у `studio_content.ts`. 
  - *Fix:* Зберігати ID інтервалу та очищувати його у `stopModule()`.
- [ ] **M4:** Плоска структура storage ключів без неймспейсінгу. 
  - *Fix:* Ввести namespace-конвенцію або вкладену структуру, припинити збереження raw HTML у storage.

---

## 🟢 LOW — Технічний борг

- [ ] **L1:** `tsconfig.json` має `"strict": false` — втрачається compile-time type safety.
- [ ] **L2:** Тимчасовий файл `studio_styles.css.temp` — дублікат основного CSS. (Видалити або перенести).
- [ ] **L3:** ~200+ inline стилів у модальних вікнах замість CSS класів (`info_modal.ts`, `stats_exporter.ts`).
- [ ] **L4:** jQuery залежність у StreamYard модулях — замінити на нативний DOM API.
- [ ] **L5:** Popup-файли залишаються `.js` замість `.ts`.
- [ ] **L6:** MutationObserver у `main.ts` не робить `disconnect()` при zombie context.
- [ ] **L7:** Un-debounced storage writes на кожен keystroke у popup `input` handlers (`popup_init.js`).
- [ ] **L8:** `stats_tracker.ts` — `MutationObserver` без throttling на `document.body` + `setInterval` без `clearInterval`.
- [ ] **L9:** Дублікація document listeners у `initStep3Resizers()` — 4x `mousemove`/`mouseup` на document (`popup_init.js`).
- [ ] **L10:** Race condition: `ResizeObserver` + async `chrome.storage.local.get` (`popup_init.js`).
