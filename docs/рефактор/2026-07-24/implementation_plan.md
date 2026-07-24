# 🔍 Повний аудит Chrome-розширення «StreamYard Helper»

> [!NOTE]
> Проаналізовано **28 файлів** (16 модулів, 6 popup-файлів, 2 бібліотеки, manifest, styles, main, test).
> Розширення виконує свою функцію добре, але має системні архітектурні обмеження, що блокують масштабування.

---

## 📊 Загальна оцінка

| Категорія | Оцінка | Коментар |
|---|---|---|
| **Функціональність** | ⭐⭐⭐⭐ | Працює стабільно, покриває потреби |
| **Архітектура** | ⭐⭐ | Глобальні об'єкти на `window`, відсутність модульності |
| **Безпека** | ⭐⭐ | XSS-вразливості, зайві permissions |
| **Продуктивність** | ⭐⭐⭐ | MutationObserver без throttle, polling DOM |
| **Масштабованість** | ⭐⭐ | Додавання нових фіч потребує зміни 3-5 файлів |
| **Тестування** | ⭐⭐ | Тільки parsers покриті тестами |
| **CSS / UI** | ⭐⭐⭐ | Popup — добре, content scripts — хаотично |

---

## 🚨 Критичні проблеми (треба фіксити зараз)

### 1. XSS-вразливість у `popup_prayers.js`

```javascript
// ❌ НЕБЕЗПЕЧНО — author підставляється напряму в HTML через template literal
const header = $(`<div>...<span class="editable-author">${author}</span>...</div>`);
```

Якщо хтось у StreamYard поставить ім'я типу `<img src=x onerror=alert('XSS')>`, це виконається в контексті розширення.

**Фікс:** Використовувати `.text()` замість інтерполяції:
```javascript
// ✅ Безпечно
const authorSpan = $('<span>').addClass('editable-author').text(author);
```

---

### 2. Зайві permissions у [manifest.json](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/manifest.json)

| Permission | Потрібен? | Проблема |
|---|---|---|
| `tabs` | ❌ | Дає доступ до URL і title **усіх** вкладок. `activeTab` вже достатньо |
| `alarms` | ❓ | Ніде не використовується (немає background service worker) |
| `notifications` | ❓ | Ніде не використовується |

> [!WARNING]
> Зайві дозволи — це червоний прапорець при ревʼю в Chrome Web Store і потенційний ризик безпеки.

---

### 3. Відсутні `host_permissions`

У Manifest V3 `host_permissions` потрібні окремо від `permissions`. Для `chrome.scripting.executeScript` (використовується в popup) потрібно:
```json
"host_permissions": ["https://streamyard.com/*"]
```

---

### 4. Неконсистентна версія

| Місце | Версія |
|---|---|
| `manifest.json` → `version` | `0.81` |
| `manifest.json` → `default_title` | `0.8` |
| `main.js` → console.log | `v0.9.9` |

---

## ⚠️ Архітектурні проблеми

### 5. Глобальний namespace — антипатерн `window.SYH_*`

Кожен модуль реєструється як глобальний об'єкт на `window`:

```javascript
window.SYH_CONFIG = { ... };
window.SYH_STATE = { ... };
window.SYH_UTILS = { ... };
window.SYH_UI = { ... };
// ... ще 8 модулів
```

**Проблеми:**
- Конфлікти з іншими розширеннями або скриптами StreamYard
- Порядок завантаження в `manifest.json` критичний і крихкий
- Неможливо використати tree-shaking, lazy loading, code splitting
- `Object.assign(window.SYH_UI, { ... })` в 4 різних файлах — ризик перезапису

### 6. CSS в JavaScript — 200+ рядків inline CSS

[ui_core.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/ui_core.js) і [ui_banners_tabs.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/ui_banners_tabs.js) інжектять масивні `<style>` блоки з дублюючими правилами:

- `ui_core.js` → `syh-global-styles` (~50 рядків CSS)
- `ui_banners_tabs.js` → `syh-banner-header-styles` (~100 рядків CSS)
- Дублювання правил для `.Banner__Wrap` стилів між цими двома файлами
- Масивні inline-стилі в HTML-шаблонах (`style="display: flex; gap: 8px; ..."`)

### 7. State module порушує Separation of Concerns

[state.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/state.js#L45-L72) — `restoreDomCheckboxes()` маніпулює DOM напряму через jQuery. State layer повинен бути чисто data layer.

### 8. Хардкоджені CSS-класи поза `config.js`

[main.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/main.js#L82-L84) містить:
```javascript
// Хардкод замість використання SELECTORS з config.js
'.StarredCommentList__HeaderWrap-sc-1qtlqu2-5'
'.StarredCommentList__ItemWrap-sc-1qtlqu2-6'
'.StarredCommentList__List-sc-1qtlqu2-1'
```

---

## 🐢 Проблеми продуктивності

### 9. MutationObserver без throttle на `document.body`

```javascript
// main.js:167 — спостерігає за ВСІМ document.body рекурсивно
observer.observe(document.body, { childList: true, subtree: true });
```

На живих стрімах зі швидким чатом це генерує сотні mutation-подій на секунду. Кожна проходить через `.find()` + `.filter()` + `.addBack()` jQuery ланцюжки.

**Фікс:** Обмежити observer конкретним контейнером StreamYard + `requestAnimationFrame` batching.

### 10. DOM polling кожні 500мс

[event_comments.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/event_comments.js) — `setInterval(..., 500)` для Auto-Heal. Кожні 500мс робить `querySelectorAll` по всьому DOM.

### 11. Smart Search — O(N*M) на кожне натискання

[utils.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/utils.js) — `smartSearch()` генерує permutations для транслітерації на кожне натискання клавіші і виконує `includes()` по кожному банеру/коментарю.

### 12. Масивна бібліотека Chart.js (208KB) завантажується завжди

`chart.js` інжектиться як content script на кожну сторінку StreamYard, навіть якщо статистика не потрібна.

---

## 🧹 Code Quality Issues

### 13. jQuery 3.5.0 — застаріла версія (6+ років)

Поточна стабільна версія — **3.7.1**. Версія 3.5.0 має відомі performance-баги.

### 14. Deprecated API: `document.execCommand("copy")`

Використовується в `popup_prayers.js` і `popup_telegram.js`. Замінити на `navigator.clipboard.writeText()`.

### 15. Дублювання коду

| Паттерн | Де зустрічається | Кількість |
|---|---|---|
| Storage adapter fallback | `state.js`, `utils.js`, `ui_core.js` | 4 рази |
| Truncation logic (195 chars) | `parsers.js` | 3 рази |
| Category assignment handlers | `event_banners.js` | 3 ідентичних |
| `chrome.runtime.id` kill switch | `main.js`, `event_comments.js`, `stats_tracker.js` | 3 рази |

### 16. Дублювання `getCheckedState()` і `getState()` в [state.js](file:///d:/Chrome%20Extension/Время%20перемен.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/modules/state.js#L80-L86)

Ідентичні методи — один зайвий.

### 17. Timezone bug в state.js

```javascript
new Date().toISOString().split('T')[0] // UTC-based!
```

Користувачі в UTC+2/+3 отримають скид стану о 22:00-01:00 замість опівночі.

### 18. Хардкоджені текстові літерали

- `'Stay in the studio'` — Anti-AFK
- `'Ended'` — перевірка кінця стріму
- `'Timer off'` — стан таймера
- `'Download'` — video_copier.js

Якщо StreamYard змінить мову UI або локалізацію — все зламається.

### 19. Хардкоджені magic numbers

- `30000` (Anti-AFK interval)
- `500` (Auto-Heal polling)
- `150` (debounce filter)
- `195` (text truncation)
- `60000` (stats tracking)
- `2 * 60 * 1000` (reminder delay)

Мають бути в `config.js`.

---

## 🧪 Тестування

### 20. Покриття тестами

| Модуль | Тести | Статус |
|---|---|---|
| `parsers.js` | ✅ `test_parsers.js` | Добре покрито |
| `utils.js` | ❌ | Не покрито |
| `state.js` | ❌ | Не покрито |
| `event_*.js` | ❌ | Не покрито |
| `ui_*.js` | ❌ | Не покрито |
| `video_copier.js` | ❌ | Не покрито |
| `popup_*.js` | ❌ | Не покрито |

> [!IMPORTANT]
> Тести є тільки для parsers. Решта 90% коду не покрита. Тестовий раннер — кастомний на `node:assert`, без фреймворку.

---

## ♿ Accessibility

### 21. Відсутність aria-атрибутів

- Emoji-кнопки (📝, 🗑️, 🎯) без `aria-label`
- Tab-контролі без `role="tablist"` / `role="tab"` / `aria-selected`
- Checkbox-контролі без пов'язаних `<label>`

---

## 🔮 Рекомендація по технології

### Чи потрібен перехід на іншу технологію?

> [!TIP]
> **Повне переписування НЕ потрібне.** Потрібна поетапна модернізація.

### Що залишити:
- ✅ **Manifest V3** — вже використовується, це правильно
- ✅ **Vanilla JS + jQuery** — для content scripts це прийнятно
- ✅ **Загальна архітектура** (config → state → utils → ui → events) — правильний напрямок

### Що модернізувати поетапно:

#### Фаза 1: Quick Wins (1-2 дні)
- [ ] Прибрати XSS-вразливість у `popup_prayers.js`
- [ ] Видалити зайві permissions (`tabs`, можливо `alarms`, `notifications`)
- [ ] Додати `host_permissions`
- [ ] Оновити jQuery до 3.7.1
- [ ] Замінити `document.execCommand("copy")` → `navigator.clipboard.writeText()`
- [ ] Уніфікувати версію розширення
- [ ] Винести magic numbers в `config.js`
- [ ] Видалити дубль `getCheckedState()` / `getState()`
- [ ] Винести хардкоджені CSS-класи з `main.js` в `config.js`

#### Фаза 2: Архітектура (3-5 днів)
- [ ] Впровадити **Vite** або **ESBuild** як бандлер:
  - ES Modules (`import`/`export`) замість `window.SYH_*`
  - Автоматичний порядок завантаження
  - Tree-shaking (Chart.js тільки де потрібен)
  - Hot Module Replacement для розробки
- [ ] Перенести весь CSS із JS у `.css` файли
- [ ] Lazy loading Chart.js (завантажувати тільки при відкритті статистики)
- [ ] Прибрати DOM-маніпуляції зі `state.js`
- [ ] Централізувати storage adapter (один instance замість 4 fallback-копій)

#### Фаза 3: Якість (2-3 дні)
- [ ] Додати ESLint з конфігом для Chrome Extensions
- [ ] Покрити тестами `utils.js`, `state.js` (Jest або Vitest)
- [ ] Throttle / `requestAnimationFrame` для MutationObserver
- [ ] Замінити `setInterval` DOM polling на `MutationObserver` де можливо
- [ ] Фікс timezone бага (використовувати `toLocaleDateString`)
- [ ] Aria-атрибути для accessibility

#### Фаза 4: Масштабування (опціонально)
- [ ] TypeScript (поступовий перехід через `.ts` файли у Vite)
- [ ] Service Worker для background tasks (alarms, notifications)
- [ ] Окрема Options Page замість вкладки в popup
- [ ] i18n (інтернаціоналізація) через `chrome.i18n`

---

## Прийняті рішення (Decisions)

> [!NOTE]
> 1. **jQuery** — чи готові ви поступово відмовитися від jQuery в content scripts? Сучасний DOM API покриває 95% потреб, а jQuery — це зайві 287KB в кожній вкладці.
>    - **Відповідь:** ✅ Готовий до поступової відмови від jQuery.
> 2. **Бандлер** — Vite vs ESBuild vs Webpack? Рекомендую **Vite** з плагіном `@crxjs/vite-plugin` — він спеціально для Chrome Extensions.
>    - **Відповідь:** ✅ Затверджено **Vite** з плагіном `@crxjs/vite-plugin`.
> 3. **TypeScript** — чи цікавий вам поступовий перехід? Дуже допомагає при масштабуванні.
>    - **Відповідь:** ✅ Так, робимо поступовий перехід на TypeScript.
> 4. **Порядок фаз** — чи хочете починати з Quick Wins, чи одразу з архітектурного рефакторингу?
>    - **Відповідь:** ✅ Виконувати все підряд (послідовно з Фази 1 до Фази 4).
