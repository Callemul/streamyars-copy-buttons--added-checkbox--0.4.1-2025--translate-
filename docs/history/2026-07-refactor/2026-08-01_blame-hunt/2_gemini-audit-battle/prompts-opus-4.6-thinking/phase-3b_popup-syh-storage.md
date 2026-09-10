# Задача: Фаза 3б — Popup → SYH_STORAGE адаптер + popup fixes

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 3б з 4 (архітектурна) | **Оцінка:** ~5 год  
**Передумова:** Фаза 3а (popup → TS + ES modules) вже виконана.  
**Мета:** Замінити 42+ прямих `chrome.storage.local.*` виклики на єдиний `SYH_STORAGE` адаптер + виправити 2 popup-баги.

---

## Контекст

В проєкті вже є `SYH_STORAGE` адаптер (модуль `storage.ts`), який:
- Обгортає `chrome.storage.local` з обробкою `chrome.runtime.lastError`
- Надає типізований API
- Використовується в `popup/options.ts` (0 прямих storage calls — еталон!)

Зараз 3 popup-файли обходять цей адаптер і роблять 42+ прямих виклики:
- `popup_init.ts` — 17 викликів
- `popup_telegram.ts` — 9 викликів
- `popup_prayers.ts` — 16 викликів

---

## ⚠️ Порядок виконання

```
M2 (SYH_STORAGE міграція) — по одному файлу:
  1. popup_init.ts     (17 замін)
  2. popup_telegram.ts (9 замін)
  3. popup_prayers.ts  (16 замін)

L9 (resizer consolidation) — після M2
L10 (race condition fix) — після M2
```

---

## M2: Popup → SYH_STORAGE адаптер (42+ прямих виклики)

**Файли:** `popup/popup_init.ts`, `popup/popup_telegram.ts`, `popup/popup_prayers.ts`  
**Еталон:** `popup/options.ts` — 0 прямих storage calls, 100% через `SYH_STORAGE`

**Шаблон трансформації:**
```typescript
// ❌ БУЛО:
chrome.storage.local.get(['syh_yt_collected'], function(result) {
    const data = result['syh_yt_collected'];
    // ... process
});

chrome.storage.local.set({ 'syh_yt_collected': newData });

// ✅ СТАЛО:
import { SYH_STORAGE } from '../modules/storage';

const data = await SYH_STORAGE.get('syh_yt_collected');
// ... process

await SYH_STORAGE.set('syh_yt_collected', newData);
```

> **Примітка:** Якщо `SYH_STORAGE` API використовує async/await — callback-стиль потрібно перетворити на async функції. Перевірити актуальний API у `modules/storage.ts`.

**Критерії приймання:**
- [ ] 0 прямих `chrome.storage.local.get/set` у popup-скриптах
- [ ] Всі виклики через імпортований `SYH_STORAGE` адаптер
- [ ] Обробка `lastError` автоматично закрита (адаптер обробляє)
- [ ] Popup працює без помилок

---

## L9: Дублювання 4x `mousemove`/`mouseup` listeners у `initStep3Resizers()`

**Файл:** `popup/popup_init.ts` (рядки ~388-421)  
**Складність:** 🟡 Середня (~1 год)

**Проблема:** Кожен з 4 resizer'ів додає свою пару `mousemove`/`mouseup` listeners на `document` — разом 8 listeners замість 2.

**Рішення:** Один спільний `mousemove`/`mouseup` listener на document, який визначає активний resizer через state-змінну:

```typescript
let activeResizer: { element: HTMLElement; axis: 'x' | 'y' | 'both'; startX: number; startY: number } | null = null;

document.addEventListener('mousemove', (e) => {
    if (!activeResizer) return;
    // ... resize logic based on activeResizer.axis
});

document.addEventListener('mouseup', () => {
    activeResizer = null;
});

// Кожен resizer тільки встановлює activeResizer:
resizer.addEventListener('mousedown', (e) => {
    activeResizer = { element: targetEl, axis: 'y', startX: e.clientX, startY: e.clientY };
});
```

**Критерії приймання:**
- [ ] 2 listeners на document (mousemove + mouseup) замість 8
- [ ] Всі 4 resizer'и працюють коректно

---

## L10: Race condition — `ResizeObserver` + async `chrome.storage.local.get`

**Файл:** `popup/popup_init.ts` (рядок ~338)  
**Складність:** 🟡 Середня (~1 год)

**Проблема:** `ResizeObserver` спрацьовує під час початкового завантаження даних зі storage → popup "стрибає" (розмір перезаписується до того, як storage data завантажена).

**Рішення:** Прапорець `storageLoaded` — ResizeObserver callback ігнорує виклики до завершення початкового завантаження:

```typescript
let storageLoaded = false;

// При ініціалізації:
const savedSize = await SYH_STORAGE.get('popup_size');
applySize(savedSize);
storageLoaded = true;

// У ResizeObserver callback:
const resizeObserver = new ResizeObserver((entries) => {
    if (!storageLoaded) return;  // Ігнорувати до завершення завантаження
    // ... save new size to storage
});
```

**Критерії приймання:**
- [ ] Розміри popup не «стрибають» при відкритті
- [ ] Після завантаження — resize зберігається коректно

---

## ✅ Верифікація після КОЖНОГО підзавдання

```bash
npm run lint && npm run test && npm run build
```
Потім: відкрити popup в Chrome → перевірити функціональність.

**⚠️ НЕ змінювати ключі storage (наприклад, `syh_yt_collected` → `syh:popup:yt:collected`). Це окрема задача Фази 3в.**
