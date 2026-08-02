# Задача: Фаза 1 — Критичні баги (5 задач)

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 1 з 4 | **Оцінка:** ~8 год  
**Мета:** Закрити всі реальні runtime-баги перед наступним релізом.

---

## ⚠️ Порядок виконання

```
H1 (memory leak) → H3 (stale closures)   ← ТОЙ САМИЙ ФАЙЛ, H1 першим!
H2 (JSON.parse)                           ← незалежна
H4 (eval → Vite)                          ← незалежна
L2 (видалити temp)                        ← незалежна, 1 хвилина
```

---

## H1: Memory leak — накопичення document-level click listeners

**Файл:** `youtube/studio/studio_events.ts` (рядки ~270-280)  
**Складність:** 🟡 Середня (~2 год)

**Проблема:** `bindStudioCommentEvents()` додає `document.addEventListener('click', ...)` для закриття dropdown **при кожному виклику**. Функція викликається для кожного коментаря при віртуальному скролінгу. За сесію — сотні дублюючих listeners.

**Impact:** CPU overhead на кожен клік (сотні handlers спрацьовують одночасно) + memory leak.

**Рішення:** Глобальний одноразовий listener:
```typescript
// ❌ ЗАРАЗ — всередині bindStudioCommentEvents(), множиться:
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.style.display = 'none';
});

// ✅ ПІСЛЯ — один раз при ініціалізації модуля:
let activeDropdown: HTMLElement | null = null;

document.addEventListener('click', (e) => {
    if (activeDropdown && !activeDropdown.contains(e.target as Node)) {
        activeDropdown.style.display = 'none';
        activeDropdown = null;
    }
});

// У bindStudioCommentEvents() — лише оновлювати activeDropdown:
toggleBtn.addEventListener('click', () => {
    activeDropdown = dropdown;
    dropdown.style.display = 'block';
});
```

**Критерії приймання:**
- [ ] `document.addEventListener('click')` викликається рівно **1 раз** за весь lifecycle модуля
- [ ] Dropdown закриття працює коректно при скролінгу 50+ коментарів
- [ ] Жодних нових listeners на `document` після повторних викликів `bindStudioCommentEvents()`

---

## H3: Stale Closures — кнопки копіюють дані ПОПЕРЕДНЬОГО коментаря

**Файл:** `youtube/studio/studio_events.ts` (рядки ~190-280)  
**Складність:** 🔴 Висока (~3 год)  
**Залежність:** Виконувати **ПІСЛЯ** H1 (той самий файл, менше merge conflicts)

**Проблема:** YouTube Studio використовує `iron-list` (Polymer virtual scrolling) — DOM-вузли `ytcp-comment` перевикористовуються. Прапор `dataset.syhBound = 'true'` блокує повторний bind, але замикання `handleAddClick` / `copyBtn` зберігають **застарілі** значення `author` та `text` від попереднього мешканця цього DOM-вузла.

**Рішення:**
```typescript
// ❌ ЗАРАЗ — замикання захоплює значення при першому bind:
const author = getAuthorNameText(threadEl);
const text = getCommentText(threadEl);
copyBtn.addEventListener('click', () => {
    copyToClipboard(`${author}: ${text}`);  // ← stale!
});

// ✅ ПІСЛЯ — зчитування в момент кліку:
copyBtn.addEventListener('click', () => {
    const freshAuthor = getAuthorNameText(threadEl);
    const freshText = getCommentText(threadEl);
    copyToClipboard(`${freshAuthor}: ${freshText}`);
});
```

**Критерії приймання:**
- [ ] Прокрутити 30+ коментарів вниз, потім вгору — натиснути «Копіювати» на перевикористаному коментарі
- [ ] Скопійований текст відповідає **поточному** вмісту коментаря, а не попередньому
- [ ] Працює для обох кнопок: Copy і Add to Questions

---

## H2: `getBrandFromLocalStorage()` — unsafe JSON.parse у циклі

**Файл:** `modules/stats_tracker.ts` (рядки ~290-310)  
**Складність:** 🟢 Проста (~30 хв)

**Проблема:** Цикл по всіх ключах `localStorage` хост-сторінки з `JSON.parse()` без `try-catch` на кожну ітерацію. Один зламаний запис — зупиняє весь цикл.

**Рішення:**
```typescript
// ❌ ЗАРАЗ:
for (const key of Object.keys(localStorage)) {
    const val = JSON.parse(localStorage.getItem(key) || '');
    // ... brand detection
}

// ✅ ПІСЛЯ:
for (const key of Object.keys(localStorage)) {
    try {
        const val = JSON.parse(localStorage.getItem(key) || '""');
        // ... brand detection
    } catch {
        continue; // Пропустити пошкоджені записи
    }
}
```

**Критерії приймання:**
- [ ] Цикл продовжує роботу навіть якщо `localStorage` містить невалідний JSON
- [ ] Бренд визначається коректно при наявності валідних записів

---

## H4: `eval()` у stats_exporter.ts — блокер Chrome Web Store

**Файл:** `modules/stats_exporter.ts` (рядок ~165)  
**Складність:** 🟡 Середня (~2 год)

**Проблема:** Chart.js завантажується через `fetch()` + `(0, eval)(scriptText)`. У Manifest V3 `eval()` суворо заборонений CSP → Chrome Web Store відхилить розширення.

**Рішення (2 варіанти — обери один):**

**Варіант A — через Vite бандлер (рекомендовано):**
```typescript
// npm install chart.js
import { Chart } from 'chart.js/auto';
// Далі використовувати Chart напряму
```

**Варіант B — статичний скрипт:**
```json
// manifest.json → web_accessible_resources:
{ "resources": ["lib/chart.min.js"], "matches": ["<all_urls>"] }
```
```typescript
// stats_exporter.ts:
const script = document.createElement('script');
script.src = chrome.runtime.getURL('lib/chart.min.js');
document.head.appendChild(script);
```

**Критерії приймання:**
- [ ] `npm run build` проходить без помилок
- [ ] Графіки статистики рендеряться коректно
- [ ] Жодних `eval()`, `new Function()`, `setTimeout(string)` у зібраному коді
- [ ] CSP в manifest.json не містить `unsafe-eval`

---

## L2: Видалити `studio_styles.css.temp`

**Файл:** `youtube/studio/studio_styles.css.temp`  
**Складність:** 🟢 Тривіальна (~1 хв)

**Рішення:** `git rm youtube/studio/studio_styles.css.temp`  
**Приймання:** Файл відсутній у репозиторії, збірка працює.

---

## ✅ Верифікація після КОЖНОЇ задачі

```bash
npm run lint && npm run test && npm run build
```

**⚠️ НЕ чіпати файли, що не стосуються цих 5 задач.**
