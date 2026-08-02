# Сесія 3B — Повна міграція popup_telegram (JS→TS + модулі + SYH_STORAGE)

## Контекст
Chrome Extension MV3, Vite + TS. Сесія 3A (popup_init) вже виконана.
Верифікація: `npm run lint && npm run test && npm run build` + відкрити popup в Chrome.

## Скоуп
Читай і змінюй ТІЛЬКИ: `popup/popup_telegram.js` (→ `.ts`), `popup/popup.html`
Довідкові файли (лише читати): `popup/popup_init.ts`, `popup/options.ts`, `modules/storage.ts`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

> ⚠️ Виконуй **покроково**, верифікуй після кожного кроку.
> ⚠️ **НЕ змінювати ключі storage** (`syh_telegram_data__vp_ss` тощо) і **НЕ чіпати raw HTML** (`tg_finalResultHtml` тощо) — це окрема сесія 3D.

## Крок 1: JS → TypeScript + ES модулі

1. `popup_telegram.js` → `popup_telegram.ts`
2. Всі `window.functionName = function(...)` → `export function functionName(...)`
3. Додати TypeScript типи для параметрів та return values
4. В `popup.html`: `<script src="popup_telegram.js">` → `<script type="module" src="popup_telegram.ts">`
5. Залежності від popup_init: `window.X` → `import { X } from './popup_init'`

Приклад трансформації:

    // ❌ БУЛО:
    window.processTelegramData = function(rawText) {
        // ...
        window.saveData('syh_telegram_data__vp_ss', result);
    };

    // ✅ СТАЛО:
    import { saveData } from './popup_init';

    export function processTelegramData(rawText: string): void {
        // ...
        saveData('syh_telegram_data__vp_ss', result);
    }

**Верифікація:** `npm run build` + popup відкривається, Telegram-вкладка відображається.

---

## Крок 2: chrome.storage.local → SYH_STORAGE (9 замін)

Вивчи API в `modules/storage.ts`. Еталон використання: `popup/options.ts` (0 прямих storage calls).

    // ❌ БУЛО:
    chrome.storage.local.get(['syh_telegram_data__vp_ss'], function(result) {
        const data = result['syh_telegram_data__vp_ss'];
        // ... process
    });
    chrome.storage.local.set({ 'syh_telegram_data__vp_ss': newData });

    // ✅ СТАЛО:
    import { SYH_STORAGE } from '../modules/storage';

    const data = await SYH_STORAGE.get('syh_telegram_data__vp_ss');
    // ... process
    await SYH_STORAGE.set('syh_telegram_data__vp_ss', newData);

> Якщо SYH_STORAGE використовує async/await — callback-стиль перетворити на async функції.
> Обробка `chrome.runtime.lastError` автоматично закрита адаптером — окремих перевірок НЕ додавати.

**Верифікація:** `npm run build` + Telegram-дані зберігаються/завантажуються.

---

## Приймання (всі критерії)
- [x] 0 штук `window.functionName = ...`
- [x] Всі функції — ES-модулі з `import/export`
- [x] `popup.html` → `<script type="module">`
- [x] 0 прямих `chrome.storage.local.get/set`
- [x] Всі 9 storage-викликів через `SYH_STORAGE`
- [x] Залежності від popup_init — через `import`, не через `window`
- [x] Telegram-функції працюють: імпорт даних, обробка, видалення елементів
- [x] Popup працює без помилок у консолі
