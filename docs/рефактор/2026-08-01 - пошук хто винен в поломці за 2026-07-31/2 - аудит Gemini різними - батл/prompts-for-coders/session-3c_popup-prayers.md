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
2. Всі `window.functionName = function(...)` → `export function functionName(...)`
3. Додати TypeScript типи для параметрів та return values
4. В `popup.html`: `<script src="popup_prayers.js">` → `<script type="module" src="popup_prayers.ts">`
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
import { SYH_STORAGE } from '../modules/storage';

export async function deleteYTCollectedItem(id: string): Promise<void> {
    const items = (await SYH_STORAGE.get('syh_yt_collected')) || [];
    const filtered = items.filter((item: { id: string }) => item.id !== id);
    await SYH_STORAGE.set('syh_yt_collected', filtered);
}
```

**Верифікація:** `npm run build` + popup відкривається, вкладка молитв/нотаток відображається.

---

## Крок 2: chrome.storage.local → SYH_STORAGE (16 замін)

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
const data = await SYH_STORAGE.get('key');
// ... process
await SYH_STORAGE.set('key', newData);
```

> Якщо SYH_STORAGE використовує async/await — callback-стиль перетворити на async функції.
> Обробка `chrome.runtime.lastError` автоматично закрита адаптером — окремих перевірок НЕ додавати.

**Верифікація:** `npm run build` + молитви/нотатки зберігаються, редагуються, видаляються.

---

## Приймання (всі критерії)
- [ ] 0 штук `window.functionName = ...`
- [ ] Всі функції — ES-модулі з `import/export`
- [ ] `popup.html` → `<script type="module">`
- [ ] 0 прямих `chrome.storage.local.get/set`
- [ ] Всі 16 storage-викликів через `SYH_STORAGE`
- [ ] Залежності від popup_init — через `import`, не через `window`
- [ ] Prayer ID (UUID) працює як раніше: створення, редагування, видалення
- [ ] Popup працює без помилок у консолі

---

## Фінальна перевірка всієї Фази 3 (після цієї сесії)

Після виконання 3A + 3B + 3C перевір ГЛОБАЛЬНО:
- [ ] У всьому `popup/` — 0 файлів `.js` (окрім сторонніх бібліотек, якщо є)
- [ ] У всьому `popup/` — 0 прямих `chrome.storage.local.*` викликів
- [ ] У всьому `popup/` — 0 присвоєнь на `window.*`
- [ ] `npm run lint && npm run test && npm run build` — чисто
