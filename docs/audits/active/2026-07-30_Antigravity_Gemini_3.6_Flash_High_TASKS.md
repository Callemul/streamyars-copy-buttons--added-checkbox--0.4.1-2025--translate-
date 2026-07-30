# YouTube Sub-Module & Code Health — Список Задач для ШІ

> **Створено:** 2026-07-30  
> **Модель:** Antigravity Gemini 3.6 Flash (High)  
> **На базі аудиту:** [2026-07-30_Antigravity_Gemini_3.6_Flash_High_AUDIT.md](file:///d:/Chrome%20Extension/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/docs/audits/active/2026-07-30_Antigravity_Gemini_3.6_Flash_High_AUDIT.md)

---

## Фаза 1: Очищення Dead Code та Лінтер Warning'ів

- [x] **1.1** Очистити недосяжний код (unreachable code) у `popup/popup_telegram.js` (поза `return;` у `window.updateNewInputStats`).
- [x] **1.2** Виправити ESLint warnings у `popup/popup_telegram.js` (заміна невикористовуваного `let` на `const`).
- [x] **1.3** Виправити ESLint warnings у `popup/popup_prayers.js` (заміна `let` на `const`, обробка порожніх блоків `catch`).
- [x] **1.4** Виправити ESLint warnings у `popup/popup_init.js` (заміна `let` на `const` для змінних у ресайзері).

---

## Фаза 2: Інфраструктура Та Конфігурація

- [x] **2.1** Створити файл `.gitignore` у корені проєкту з ігноруванням `node_modules/`, `dist/`, `.kilo/`, `*.log`, `litellm-config.yaml`.
- [x] **2.2** Оновити `tsconfig.json` — додати `"youtube/**/*"`, `"options/**/*"` та `"background/**/*"` у масив `"include"`.
- [x] **2.3** Оновити `eslint.config.js` для чистої роботи з JS модулями та DOM-тестами.
- [x] **2.4** Оновити `repomix.config.json` — включити `youtube/` та `options/` у зріз проєкту.

---

## Фаза 3: Автоматичний Захист Та Тестування (Verification)

- [x] **3.1** Запустити `npm run lint` — перевірити відсутність помилок та зауважень лінтера.
- [x] **3.2** Запустити `npm run test` — пересвідчитись, що всі 45 тестів пройшли 100%.
- [x] **3.3** Запустити `npm run build` — перевірити чисту збірку розширення.
