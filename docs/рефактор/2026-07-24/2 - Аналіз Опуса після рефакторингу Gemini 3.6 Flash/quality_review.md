# 🔍 Code Quality Review — після рефакторингу

> Перевірено 13 ключових файлів. Всі задачі формально виконані, але є проблеми якості реалізації.

---

## 📊 Загальна оцінка

| Файл | Оцінка | Критичні баги |
|------|--------|---------------|
| `modules/i18n.ts` | ⭐ Good | 0 |
| `popup/popup_prayers.js` | ⭐ Good | 0 |
| `modules/ui_core.js` | ⭐ Good | 1 |
| `background/service-worker.ts` | ⭐ Good | 1 |
| `options/options.ts` | ⭐ Good | 1 |
| `modules/config.ts` | 🔶 Acceptable | 1 |
| `modules/storage.ts` | 🔶 Acceptable | 2 |
| `modules/state.js` | 🔶 Acceptable | 1 |
| `modules/event_comments.js` | 🔶 Acceptable | 2 |
| `modules/utils.js` | 🔶 Acceptable | 1 critical |
| `popup/popup_telegram.js` | 🔶 Acceptable | 2 |
| `main.js` | 🔶 Acceptable | 2 |
| `modules/stats_exporter.js` | 🔶 Acceptable | 3 |

---

## 🚨 Критичні баги (потребують фіксу)

### 1. `stats_exporter.js` — Chart.js не працює в Isolated World
**Severity: 🔴 BLOCKER**

`loadChartJs()` створює `<script>` тег і додає в `document.head`. В MV3 такі скрипти виконуються в **Main World** сторінки, а content scripts працюють в **Isolated World**. `typeof Chart` завжди буде `undefined` в content script.

```javascript
// ❌ Поточна реалізація — Chart.js недоступний для content script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('lib/chart.js');
document.head.appendChild(script);
// Chart === undefined в Isolated World!
```

> [!CAUTION]
> Графіки аналітики скоріш за все **не працюють** після цього рефакторингу. Раніше Chart.js підключався через `content_scripts` в manifest (що працює в Isolated World), а тепер — через DOM injection (що працює в Main World).

---

### 2. `main.js` — RAF batching зависає у фоновій вкладці
**Severity: 🟠 HIGH**

`requestAnimationFrame` **не викликається** коли вкладка в фоні. Мутації накопичуються в `pendingMutations` без обробки → затримка UI + витік пам'яті при тривалих стрімах.

```javascript
// Проблема: у фоновій вкладці RAF призупинений
requestAnimationFrame(() => {
    processMutations(pendingMutations); // Не викликається!
    pendingMutations = []; // Масив росте безконтрольно
});
```

---

### 3. `utils.js` — `smartSearch` ламає transliterate/switchLayout
**Severity: 🟠 HIGH**

`normalizeText()` замінює латинські літери на кириличні двійники **до** transliterate/switchLayout. Після цього ці функції отримують вже змінені символи і працюють некоректно.

```javascript
// Порядок: normalizeText ПЕРШИМ замінює a→а, e→е, o→о...
// Після цього transliterate і switchKeyboardLayout не працюють правильно
```

---

### 4. `main.js` — `checkForStreamEnd()` ніколи не викликається
**Severity: 🟡 MEDIUM**

Функція `checkForStreamEnd()` визначена (рядки 39–54), але **ніде не викликається**. Детекція кінця стріму та автоматичне нагадування в Telegram не спрацьовують.

---

### 5. `stats_exporter.js` — Falsy zero bug (`0 || '-'`)
**Severity: 🟡 MEDIUM**

```javascript
st1.avg || '-'  // Якщо avg === 0, показує '-' замість '0'
```

---

### 6. `stats_exporter.js` — Blob URL memory leak
**Severity: 🟡 MEDIUM**

`URL.createObjectURL(blob)` викликається без відповідного `URL.revokeObjectURL()`. Кожен експорт створює витік пам'яті.

---

## ⚠️ Архітектурні проблеми

### 7. MutationObserver фолбек на `document.body`
**Файли:** `main.js`, `event_comments.js`

Якщо контейнер чату ще не завантажився — observer підключається до `document.body` і **ніколи не перепідключається** до правильного контейнера. Це зводить нанівець оптимізацію з задачі 3.3.

### 8. `state.js` все ще викликає UI
```javascript
// state.js досі має coupling з UI:
if (window.SYH_UI && typeof window.SYH_UI.restoreDomCheckboxes === 'function') {
    window.SYH_UI.restoreDomCheckboxes();
}
```
Задача 2.4 вимагала зробити state чистим data-layer, але прямий виклик UI залишився.

### 9. `storage.ts` — тихе ковтання помилок
Всі `catch` блоки порожні. `QuotaExceededError`, мережеві помилки, зомбі-контекст — все замовчується без логування.

### 10. `popup_telegram.js` — regex typo
Рядок 57: `\Snapshot_or_time` — `\S` інтерпретується як regex escape (будь-який непробільний символ), а не літерал `S`.

### 11. `ui_core.js` — однобічна синхронізація чекбоксів
`restoreDomCheckboxes()` ставить `checked = true`, але **ніколи не скидає** `checked = false`. Якщо стан змінився на false — DOM не оновиться.

---

## 📋 Менш критичні зауваження

| # | Файл | Проблема |
|---|------|----------|
| 12 | `storage.ts` | `null` vs `undefined` — різна поведінка між `chrome.storage` та `localStorage` fallback |
| 13 | `storage.ts` | `chrome.runtime.lastError` не перевіряється в callbacks |
| 14 | `storage.ts` | `for...in` без `hasOwnProperty` |
| 15 | `config.ts` | Styled-Components хеші зламаються при оновленні StreamYard |
| 16 | `config.ts` | `timerOffTextResult` обчислюється один раз при завантаженні модуля |
| 17 | `state.js` | `saveState()` без debounce — множинні записи в storage |
| 18 | `event_comments.js` | Повторний виклик `bindEvents()` створює дублікати observers |
| 19 | `service-worker.ts` | `return true` для синхронних handlers в `onMessage` |
| 20 | `options.ts` | Імпорт JSON конфігурації без валідації схеми |
| 21 | `popup_prayers.js` | Stale array index при видаленні елементів |
| 22 | `popup_telegram.js` | IEEE-754 floating point parsing для sub-index |

---

## 🎯 Рекомендація

> [!IMPORTANT]
> **Баг #1 (Chart.js Isolated World) — ймовірний BLOCKER.** Графіки аналітики скоріш за все зламані. Потрібна перевірка і фікс через `chrome.scripting.executeScript({ world: 'MAIN' })` або повернення Chart.js у `content_scripts` з динамічним `import()`.

> [!WARNING]
> **Баги #2-3 (RAF + smartSearch)** впливають на продуктивність і пошук. Варто пофіксити.

Решта проблем (#4-22) — помірні або стилістичні, можна фіксити ітеративно.
