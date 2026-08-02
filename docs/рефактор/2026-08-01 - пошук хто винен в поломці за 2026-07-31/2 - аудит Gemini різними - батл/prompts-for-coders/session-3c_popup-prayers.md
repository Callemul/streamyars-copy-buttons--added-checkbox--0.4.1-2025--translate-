# Сесія 3C — Повна міграція popup_prayers (JS→TS + модулі + SYH_STORAGE)

## Контекст
Chrome Extension MV3, Vite + TS. Сесії 3A (popup_init) і 3B (popup_telegram) вже виконані.
Верифікація: `npm run lint && npm run test && npm run build` + відкрити popup в Chrome.

## Скоуп
Читай і змінюй ТІЛЬКИ: `popup/popup_prayers.js` (→ `.ts`), `popup/popup.html`
Довідкові файли (лише читати): `popup/popup_init.ts`, `popup/options.ts`, `modules/storage.ts`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

> ⚠️ Виконуй **покроково**, верифікуй після кожного кроку.
> ⚠️ **НЕ змінювати ключі storage** — це окрема сесія 3D.
> ⚠️ **НЕ чіпати систему prayer ID** (UUID замість array indices) — вона вже реалізована правильно, лише переноси її на TS як є.

## Крок 1: JS → TypeScript + ES модулі

1. `popup_prayers.js` → `popup_prayers.ts`
2. Всі `window.functionName = function(...)` → `export function functionName(...)` + зберегти `(window as any).functionName = functionName` для сумісності з `popup_init.ts`.
3. Додати TypeScript типи для параметрів та return values
4. В `popup.html`: `<script type="module" src="popup_prayers.js">` → `<script type="module" src="popup_prayers.ts">`
5. Залежності від popup_init: `window.X` → `import { X } from './popup_init'`

```typescript
// ❌ БУЛО:
window.deleteYTCollectedItem = function(id) {
    chrome.storage.local.get(['syh_yt_collected'], function(result) {
        const items = result['syh_yt_collected'] || [];
        const filtered = items.filter(item => item.id !== id);
        chrome.storage.local.set({ 'syh_yt_collected': filtered });
    });
};

// ✅ СТАЛО:
import { SYH_STORAGE } from '../modules/storage.ts';

export function deleteYTCollectedItem(id: string): void {
    SYH_STORAGE.get(['syh_yt_collected'], function(result: Record<string, any>) {
        const items = result['syh_yt_collected'] || [];
        const filtered = items.filter((item: { id: string }) => item.id !== id);
        SYH_STORAGE.set({ 'syh_yt_collected': filtered });
    });
}
(window as any).deleteYTCollectedItem = deleteYTCollectedItem;
```

**Верифікація:** `npm run build` + popup відкривається, вкладка молитв/нотаток відображається.

---

## Крок 2: chrome.storage.local → SYH_STORAGE (17 замін)

Вивчи API в `modules/storage.ts`. Еталон використання: `popup/options.ts` (0 прямих storage calls).

Шаблон трансформації — ідентичний сесіям 3A/3B:

```typescript
// ❌ БУЛО:
chrome.storage.local.get(['key'], function(result) {
    const data = result['key'];
    // ... process
});
chrome.storage.local.set({ 'key': newData });

// ✅ СТАЛО:
SYH_STORAGE.get(['key'], function(result: Record<string, any>) {
    const data = result['key'];
    // ... process
});
SYH_STORAGE.set({ 'key': newData });
```

> `SYH_STORAGE` приймає callback `(keys, cb)` та об'єкт `{ key: val }` (повертає `void`, не Promise).
> Обробка `chrome.runtime.lastError` автоматично закрита адаптером — окремих перевірок НЕ додавати.

**Верифікація:** `npm run build` + молитви/нотатки зберігаються, редагуються, видаляються.

---

## Приймання (всі критерії)
- [ ] Всі функції — ES-модулі з `export` (+ прив'язка до `window` для сумісності з `popup_init.ts`)
- [ ] `popup.html` → `<script type="module" src="popup_prayers.ts">`
- [ ] 0 прямих `chrome.storage.local.get/set`
- [ ] Всі 17 storage-викликів через `SYH_STORAGE` (callback API)
- [ ] Залежності від popup_init — через `import`
- [ ] Prayer ID (UUID) працює як раніше: створення, редагування, видалення
- [ ] Popup працює без помилок у консолі

---

## Фінальна перевірка всієї Фази 3 (після цієї сесії)

Після виконання 3A + 3B + 3C перевір ГЛОБАЛЬНО:
- [ ] У всьому `popup/` — 0 файлів `.js` (окрім сторонніх бібліотек, якщо є)
- [ ] У всьому `popup/` — 0 прямих `chrome.storage.local.*` викликів
- [ ] У всьому `popup/` — 0 присвоєнь на `window.*`
- [ ] `npm run lint && npm run test && npm run build` — чисто
