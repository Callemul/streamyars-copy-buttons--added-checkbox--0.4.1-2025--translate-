# SKILL: Chrome Extension Architecture (Manifest V3 + Vite)

> **Контекст:** Використовувати при роботі з маніфестом, service worker, підключати `chrome.*` API чи налаштовувати збірку Vite/CRXJS.

---

## 1. Архітектура Manifest V3

- **Service Workers**: Замість постійних background-сторінок використовуються ефемерні Service Workers. Вони завершуються браузером при простої.
- **Пам'ять & Стан**: ЗАБОРОНЕНО зберігати глобальний стан у змінних background worker. Використовуй `chrome.storage.local` або `chrome.storage.session`.
- **DOM обмеження**: В Service Workers немає `window` та `document`.

## 2. Дозволи та Безпека

- **Permissions**: Використовуй найвужчі дозволи (`activeTab`). Запитуй домени точково.
- **Messaging**: Використовуй `chrome.runtime.sendMessage` / `chrome.runtime.onMessage.addListener`. Якщо відповідь асинхронна — повертай `true` з listener.
- **CSP**: Використання `eval()` та inline-скриптів суворо заборонено.

---

## 3. Реєстри, яких треба триматися

| Що | Реєстр |
|---|---|
| Дозволи, content scripts, домени | `manifest.json` |
| Ключі `chrome.storage` | `modules/storage/storage_keys.ts` (`STORAGE_KEYS`, `POPUP_SHEET_KEYS`) |
| Налаштування розширення | `options/defaults.ts` (`OptionsState`, `DEFAULT_OPTIONS`) |
| Маршрути повідомлень | `background/message_router.ts` |

Повна таблиця реєстрів — `docs/ARCHITECTURE.md` §4.
Сценарії «як додати опцію / платформу» — `docs/HOWTO_ADD.md`.
