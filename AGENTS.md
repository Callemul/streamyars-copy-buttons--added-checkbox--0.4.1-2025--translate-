# AGENTS.md — Протокол та Інструкція AI Асистентів

## 💬 1. Правила комунікації та діагностики

- 🛑 **ЗАБОРОНА ДОДУМУВАННЯ:** Якщо завдання двозначне — **ЗУПИНИСЯ та запитай уточнення**. Не роби правки "наосліп".
- 🩺 **ДЕБАГ ТІЛЬКИ ЧЕРЕЗ DevTools (F12):** При збоях UI/DOM заборонено змінювати код наосліп. Згенеруй та надай користувачу точковий JS-скрипт для консолі DevTools, попроси лог і спирайся на факти.
- 🔬 **DEEP RESEARCH:** Якщо специфікація сайту/технології (Polymer, Shadow DOM, MV3) невідома на 100% — спочатку сформулюй промт для Deep Research.

---

## ⚡ 2. Тригери та Протокол Аудиту

### 🔹 Тригер "Аудит" / "Code Review" / "Проаналізуй проєкт":
1. 🛑 **НЕ використовуй масивні буфери коду** (захист від `404 APIError` / limit 32k).
2. 🛑 **НЕ читай старі аудити** — аналіз лише "з чистого аркуша".
3. 🛑 **НЕ роби масових паралельних запитів** (захист від `ResourceExhausted`).
4. 📄 Зчитуй лише необхідні сирцеві файли (`src/` тощо).
5. 📝 Збережи звіт у: `docs/audits/active/YYYY-MM-DD_<MODEL_NAME>_AUDIT.md` (наприклад, `2026-07-28_Nemotron_3_Ultra_High_AUDIT.md`).
6. ❓ після збереження запитай: *"Створити список задач (`YYYY-MM-DD_<MODEL_NAME>_TASKS.md`)?"*. Створюй `TASKS.md` ТІЛЬКИ після ствердної відповіді.

### 🔹 Тригер "Повторний аудит" / "Re-audit" / "Перевірь правки":
- Зчитай свій попередній звіт `docs/audits/active/YYYY-MM-DD_<MODEL_NAME>_AUDIT.md` та `TASKS.md` для перевірки виконання.

### 📂 Структура папок:
- Активні: `docs/audits/active/YYYY-MM-DD_<MODEL_NAME>_AUDIT.md`
- Архів: `docs/audits/archive/YYYY-MM-DD_vX.X/`
- 🛑 **ЗАБОРОНЕНО** створювати неіменовані `AUDIT.md` у корені!

---

## 📐 3. Правила розробки та Команди

### 🛠️ Команди
- `npm run dev` — запуск Vite сервера розробки
- `npm run build` — збірка розширення (Vite + CRXJS)
- `npm run test` — запуск тестів (CSS-лінтинг, DOM smoke-тести)
- `npm run lint` — запуск ESLint

### 🤖 Workflow: RPI (Research → Plan → Implement → Verify)
1. **Research** — вивчи граф викликів через `codebase-memory`.
2. **Plan** — сформуй план у пам'яті.
3. **Implement** — напиши код.
4. **Verify** — запуск `npm run lint && npm run test && npm run build`.

### ⚙️ Специфікація коду
- **Manifest V3** (TS / Vite). Не розширюй `host_permissions` за межі `streamyard.com`, `*.youtube.com`, `studio.youtube.com`.
- **DOM Event Listeners** у попапі/опціях — строго всередині `DOMContentLoaded` / `$(document).ready()`.

---

## 📌 4. База знань та Специфіка YouTube Studio (Уроки)

1. **Polymer `<iron-list>` recycling**: DOM-вузли рециклюються при скролі. `MutationObserver` на `childList` не працює! Використовуй Capture-phase scroll listeners.
2. **Смайлики Polymer**: Шукай `<img>` з атрибутом `alt="🙏"`. Простий `textContent` повертає `""`.
3. **Контекстне меню (ПКМ)**: Події втрачаються при рециклінгу. Використовуй тільки глобальний Capture-Phase обробник:  
   `window.addEventListener('contextmenu', e => e.stopImmediatePropagation(), { capture: true })`.
4. **Нативна помилка `Error: rp at a.maybeShowTooltip`**: Помилка самого YouTube при наведенні на серце. Не намагайся її чіпати — capture-phase обробники працюють незалежно від неї.