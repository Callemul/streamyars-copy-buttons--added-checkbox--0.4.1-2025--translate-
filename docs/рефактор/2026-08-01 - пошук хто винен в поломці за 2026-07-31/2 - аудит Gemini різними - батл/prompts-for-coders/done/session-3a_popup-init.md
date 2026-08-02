# Сесія 3A — Повна міграція popup_init (JS→TS + модулі + SYH_STORAGE + fixes)

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1-2 виконані.
Верифікація: `npm run lint && npm run test && npm run build` + відкрити popup в Chrome.

## Скоуп
Читай і змінюй ТІЛЬКИ: `popup/popup_init.js` (→ `.ts`), `popup/popup.html`
Довідкові файли (лише читати): `popup/options.ts` (еталон модуля), `modules/storage.ts` (SYH_STORAGE API)
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

> ⚠️ Це великий рефакторинг. Виконуй **покроково**, верифікуй після кожного кроку.
> ⚠️ **НЕ змінювати ключі storage** (`syh_yt_collected` тощо) — це окрема сесія 3D.
> ⚠️ **НЕ видаляй helper-функції** `loadData`/`saveData` після Кроку 2 — сесії 3B/3C імпортують їх з цього файлу. Вони мають лишитись як `export`, але делегувати в SYH_STORAGE (див. Крок 2).

## Крок 1: JS → TypeScript + ES модулі

1. `popup_init.js` → `popup_init.ts`
2. Замінити всі `window.functionName = function(...)` → `export function functionName(...)`
3. Додати TypeScript типи
4. В `popup.html`: `<script src="popup_init.js">` → `<script type="module" src="popup_init.ts">`
5. Імпортувати залежності з інших модулів

```typescript
// ❌ БУЛО:
window.loadData = function(key, callback) {
    chrome.storage.local.get([key], function(result) {
        callback(result[key]);
    });
};

// ✅ ПРОМІЖНИЙ СТАН (тільки на час Кроку 1!):
export function loadData(key: string, callback: (value: unknown) => void): void {
    chrome.storage.local.get([key], (result) => {
        callback(result[key]);
    });
}
```

> ⚠️ Приклад вище — НЕ фінальний вигляд. Прямий `chrome.storage.local` усередині helper'ів замінюється на SYH_STORAGE у Кроці 2.

**Верифікація:** `npm run build` + popup працює.

---

## Крок 2: chrome.storage.local → SYH_STORAGE (17 замін)

Вивчи API в `modules/storage.ts`. Еталон використання: `popup/options.ts` (0 прямих storage calls).

```typescript
// ❌ БУЛО:
chrome.storage.local.get(['syh_yt_collected'], function(result) {
    const data = result['syh_yt_collected'];
});
chrome.storage.local.set({ 'syh_yt_collected': newData });

// ✅ СТАЛО:
import { SYH_STORAGE } from '../modules/storage';
const data = await SYH_STORAGE.get('syh_yt_collected');
await SYH_STORAGE.set('syh_yt_collected', newData);
```

> Якщо SYH_STORAGE використовує async/await — callback-стиль потрібно перетворити на async функції.
> Обробка `chrome.runtime.lastError` автоматично закрита адаптером — окремих перевірок НЕ додавати.

**Фінальний вигляд helper'ів з Кроку 1** (НЕ видаляти — їх імпортують 3B/3C):

```typescript
// ✅ ФІНАЛЬНИЙ СТАН:
export async function loadData(key: string): Promise<unknown> {
    return SYH_STORAGE.get(key);
}

export async function saveData(key: string, value: unknown): Promise<void> {
    return SYH_STORAGE.set(key, value);
}
```

> Якщо зміна сигнатури helper'ів (callback → Promise) ламає їхні виклики всередині popup_init — онови виклики на `await`. Якщо конфлікт сигнатур не вирішується чисто — ЗУПИНИСЬ і доповідь.

**Верифікація:** `npm run build` + popup читає/пише дані.

---

## Крок 3: Debounce storage writes (L7, ~рядки 232-246)

**Проблема:** Кожне натискання клавіші у input → запис у storage. Десятки зайвих записів.

```typescript
let saveTimer: ReturnType<typeof setTimeout> | null = null;
input.addEventListener('input', () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveToStorage(input.value), 300);
});
```

---

## Крок 4: Consolidate resizer listeners (L9, ~рядки 388-421)

**Проблема:** 4 resizer'и × 2 listeners (mousemove+mouseup) = 8 listeners на document замість 2.

```typescript
let activeResizer: { el: HTMLElement; axis: 'x'|'y'; startX: number; startY: number } | null = null;

document.addEventListener('mousemove', (e) => {
    if (!activeResizer) return;
    // resize logic
});
document.addEventListener('mouseup', () => { activeResizer = null; });

// Кожен resizer тільки встановлює state:
resizer.addEventListener('mousedown', (e) => {
    activeResizer = { el: target, axis: 'y', startX: e.clientX, startY: e.clientY };
});
```

---

## Крок 5: Race condition fix (L10, ~рядок 338)

**Проблема:** ResizeObserver спрацьовує під час завантаження storage → popup "стрибає".

```typescript
let storageLoaded = false;

const savedSize = await SYH_STORAGE.get('popup_size');
applySize(savedSize);
storageLoaded = true;

const resizeObserver = new ResizeObserver(() => {
    if (!storageLoaded) return;
    // save size
});
```

---

## Приймання (всі критерії)
- [ ] 0 штук `window.functionName = ...`
- [ ] Всі функції — ES-модулі з `import/export`
- [ ] `popup.html` → `<script type="module">`
- [ ] 0 прямих `chrome.storage.local.get/set` (включно з тілом helper'ів loadData/saveData)
- [ ] Всі storage через `SYH_STORAGE`
- [ ] Helper'и `loadData`/`saveData` лишились як `export` і делегують у SYH_STORAGE
- [ ] Debounce на input saves (≤1 write/300ms)
- [ ] 2 listeners на document (move+up) замість 8
- [ ] Popup не "стрибає" при відкритті
- [ ] Popup працює без помилок у консолі
