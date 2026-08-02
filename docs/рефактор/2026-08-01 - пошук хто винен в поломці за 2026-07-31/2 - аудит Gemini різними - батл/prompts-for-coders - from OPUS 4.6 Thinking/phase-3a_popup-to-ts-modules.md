# Задача: Фаза 3а — Міграція popup JS → TypeScript + ES Modules

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 3а з 4 (архітектурна) | **Оцінка:** ~4 год  
**Передумова:** Фази 1-2 вже виконані.  
**Мета:** Перевести popup-скрипти з глобальних `window.*` функцій на ES-модулі з TypeScript.

> ⚠️ **УВАГА: Високий ризик!** 35+ функцій на `window`, 3 файли. Працювати **по одному файлу** з верифікацією після кожного.

---

## Контекст проблеми

Зараз у popup 35+ функцій забруднюють глобальний `window`:
- `window.getStorage`, `window.loadData`, `window.saveData`
- `window.processTelegramData`, `window.deleteYTCollectedItem`
- та ще ~30 інших

Це блокує tree-shaking, ізольоване тестування, і створює ризик колізій імен.

**Еталон:** Файл `popup/options.ts` — вже коректно працює як ES-модуль з imports/exports. Орієнтуйся на нього.

---

## ⚠️ Порядок виконання (СУВОРО ПО ОДНОМУ)

### Етап 1: `popup_init.js` → `popup_init.ts`
> Найбільший файл, 17 storage calls, основна ініціалізація popup

1. Перейменувати `popup_init.js` → `popup_init.ts`
2. Замінити всі `window.functionName = function(...)` → `export function functionName(...)`
3. Додати TypeScript типи для параметрів та return values
4. Оновити `popup.html`: замінити `<script src="popup_init.js">` → `<script type="module" src="popup_init.ts">`
5. Додати `import` для залежностей з інших модулів
6. **ВЕРИФІКАЦІЯ:** `npm run build` + відкрити popup + перевірити всі функції

### Етап 2: `popup_telegram.js` → `popup_telegram.ts`
> 9 storage calls, Telegram-інтеграція

1-6: Ті самі кроки, що й для Етапу 1.
- Якщо є залежності від `popup_init` — замінити `window.X` на `import { X } from './popup_init'`

### Етап 3: `popup_prayers.js` → `popup_prayers.ts`
> 16 storage calls, молитви/нотатки

1-6: Ті самі кроки.

---

## Шаблон трансформації

```typescript
// ❌ БУЛО (popup_init.js):
window.loadData = function(key, callback) {
    chrome.storage.local.get([key], function(result) {
        callback(result[key]);
    });
};

window.saveData = function(key, value) {
    var obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj);
};

// ✅ СТАЛО (popup_init.ts):
export function loadData(key: string, callback: (value: unknown) => void): void {
    chrome.storage.local.get([key], (result) => {
        callback(result[key]);
    });
}

export function saveData(key: string, value: unknown): void {
    chrome.storage.local.set({ [key]: value });
}
```

```html
<!-- ❌ БУЛО (popup.html): -->
<script src="popup_init.js"></script>
<script src="popup_telegram.js"></script>

<!-- ✅ СТАЛО (popup.html): -->
<script type="module" src="popup_init.ts"></script>
<script type="module" src="popup_telegram.ts"></script>
```

---

## Критерії приймання (для всіх 3 файлів)

- [ ] Жодних `window.functionName = ...` у popup-скриптах
- [ ] Всі функції працюють як ES-модулі з `import/export`
- [ ] `popup.html` підключає скрипти через `<script type="module">`
- [ ] Popup відкривається і працює без помилок у консолі
- [ ] `npm run build` проходить без помилок

---

## ✅ Верифікація ПІСЛЯ КОЖНОГО ФАЙЛУ (не після всіх!)

```bash
npm run lint && npm run test && npm run build
```
Потім: відкрити popup в Chrome → перевірити базову функціональність.

**⚠️ НЕ чіпати файли, що не стосуються popup-міграції.**  
**⚠️ НЕ замінювати `chrome.storage.local.*` на `SYH_STORAGE` — це окрема задача Фази 3б.**
