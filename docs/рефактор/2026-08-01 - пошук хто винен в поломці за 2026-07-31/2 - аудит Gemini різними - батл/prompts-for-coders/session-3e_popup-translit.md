# Сесія 3E — Міграція popup_translit (JS→TS + ES-модулі + SYH_STORAGE)

## Контекст
Chrome Extension MV3, Vite + TS. Сесії 3A (popup_init), 3B (popup_telegram) і 3C (popup_prayers) вже виконані.
Верифікація: `npm run lint && npm run test && npm run build` + відкрити popup в Chrome.

## Скоуп
Читай і змінюй ТІЛЬКИ: `popup/popup_translit.js` (→ `.ts`), `popup/popup.html`
Довідкові файли: `popup/popup_init.ts`, `modules/storage.ts`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## Крок 1: JS → TypeScript + ES модулі та SYH_STORAGE

1. Перейменувати `popup/popup_translit.js` → `popup/popup_translit.ts`
2. `window.translitToRussian = function(...)` → `export function translitToRussian(...)`
3. Всі виклики `chrome.storage.local.set` замінити на `SYH_STORAGE.set(...)`
4. В `popup/popup.html`: заповнити або замінити підключення скрипта `<script src="popup_translit.js">` на `<script type="module" src="popup_translit.ts">`
5. **Прибрати залежність від jQuery** (актуальний файл використовує `$(document).ready(...)` та `$("#Translate").click(...)`):
   - `$(document).ready(function() { ... })` → викликати ініціалізацію напряму (ES-модуль виконується після завантаження DOM)
   - `$("#Translate").click(function() { ... })` → `document.getElementById('Translate')!.addEventListener('click', () => { ... })`
6. Переконатися, що обробник кліку `#Translate` функціонує без помилок.

---

## Приймання (всі критерії)
- [ ] `popup_translit.js` перетворено на `.ts`
- [ ] 0 присвоєнь на `window.translitToRussian`
- [ ] 0 прямих викликів `chrome.storage.local.*` (використовується `SYH_STORAGE`)
- [ ] 0 використань `$()` / `$(document).ready` (jQuery видалено з цього файла)
- [ ] `popup.html` підключає `popup_translit.ts` як `<script type="module">`
- [ ] Транслітерація та збереження `tg_translit_old` / `tg_translit_new` працюють коректно
- [ ] `npm run lint && npm run test && npm run build` — чисто
