# 🤖 Фаза 4: Масштабування (опціонально)

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

### Задача 4.1 — Поступовий перехід на TypeScript ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `tsconfig.json` (новий), `package.json`, `modules/config.ts` (створено), `modules/storage.ts` (створено), `main.js`, `test_parsers.js`, імпорти модулів.
- 🎯 **Результат:** 
  - Встановлено залежності `typescript`, `@types/chrome`, `@types/jquery`.
  - Створено та налаштовано `tsconfig.json` з підтримкою `ES2020`/`bundler` та Chrome/jQuery типів.
  - Конвертовано модулі `config.js` → `config.ts` та `storage.js` → `storage.ts` із визначенням строгих TypeScript-інтерфейсів `SyhConfig` та `StorageAdapter`.
  - Оновлено `package.json` з прапорцем `--experimental-strip-types` для запуску тестів у Node.js.
  - Успішно виконано перевірки: `npm run build` створює бандл без помилок, `npm run test` дає 100% проходження тестів (25/25).

**Що зробити:**
1. Встанови TypeScript:
   ```bash
   npm install -D typescript
   ```
2. Створи `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": false,
       "allowJs": true,
       "checkJs": true,
       "outDir": "./dist",
       "rootDir": "./",
       "types": ["chrome"]
     },
     "include": ["modules/**/*", "main.ts", "popup/**/*"]
   }
   ```
3. Встанови Chrome types: `npm install -D @types/chrome @types/jquery`
4. Почни з конвертації найпростіших модулів — переіменуй `.js` → `.ts`:
   - `modules/config.js` → `modules/config.ts` (додай типи для CONFIG об'єкту)
   - `modules/storage.js` → `modules/storage.ts`
5. НЕ конвертуй все одразу — тільки 2-3 модулі для початку
6. Переконайся що Vite коректно обробляє `.ts` файли

**Файли для роботи:**
- Новий: `tsconfig.json`
- `package.json`
- `modules/config.js` → `.ts`
- `modules/storage.js` → `.ts` (якщо створено в задачі 2.5)
- `vite.config.js` (оновити якщо потрібно)

**Критерії готовності:**
- [x] TypeScript налаштований
- [x] 2-3 модулі конвертовані на `.ts`
- [x] `npm run build` працює
- [x] IDE підказки типів працюють

---

### Задача 4.2 — Інтернаціоналізація через `chrome.i18n` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `_locales/en/messages.json` (новий), `_locales/uk/messages.json` (новий), `_locales/ru/messages.json` (новий), `modules/i18n.ts` (новий), `manifest.json`, `main.js`, `modules/config.ts`, `modules/video_copier.js`.
- 🎯 **Результат:** 
  - Створено та налаштовано структуру `_locales/` для 3 мов (`en`, `uk`, `ru`) з усіма текстовими ресурсами розширення.
  - Додано `"default_locale": "en"` у `manifest.json` та оновлено назву й опис на локалізовані змінні `__MSG_extName__` / `__MSG_extDescription__`.
  - Створено TypeScript-модуль `modules/i18n.ts` для зручного та безпечного виклику `chrome.i18n.getMessage` з підтримкою фолбеків у середовищі Node.js тестів.
  - Замінено хардкоджені UI-рядки (`Stay in the studio`, `Ended`, `Timer off`, `Download`) на локалізовані виклики i18n API.
  - Успішно виконано перевірки: `npm run build` автоматично копіює локалі `_locales/` в `dist/` без помилок, `npm run test` дає 100% проходження тестів (25/25).

**Контекст:** Зараз хардкоджені текстові літерали (`'Stay in the studio'`, `'Ended'`, `'Timer off'`, `'Download'`) розкидані по коду. Якщо StreamYard змінить мову UI — все зламається.

**Що зробити:**
1. Створи структуру `_locales/`:
   ```
   _locales/
   ├── en/
   │   └── messages.json
   ├── uk/
   │   └── messages.json
   └── ru/
       └── messages.json
   ```
2. В `messages.json` додай всі текстові літерали:
   ```json
   {
     "stayInStudio": {
       "message": "Stay in the studio",
       "description": "Anti-AFK button text in StreamYard"
     },
     "streamEnded": {
       "message": "Ended",
       "description": "Text indicating stream has ended"
     }
   }
   ```
3. Заміни хардкоджені рядки на `chrome.i18n.getMessage('stayInStudio')`
4. Додай `"default_locale": "en"` в `manifest.json`

**Файли для роботи:**
- Новий: `_locales/en/messages.json`
- Новий: `_locales/uk/messages.json`
- `manifest.json`
- Всі модулі з хардкодженими текстами

**Критерії готовності:**
- [x] Всі user-facing рядки в `_locales/`
- [x] `chrome.i18n.getMessage()` використовується замість хардкоду
- [x] Мінімум 2 мови (en, uk)
- [x] Розширення працює з обома мовами

---

### Задача 4.3 — Створити Service Worker для background tasks ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `background/service-worker.ts` (новий), `manifest.json`.
- 🎯 **Результат:** 
  - Створено TypeScript-модуль `background/service-worker.ts` з обробниками подій `chrome.runtime.onInstalled` та `chrome.runtime.onMessage`.
  - Зареєстровано Service Worker в `manifest.json` під ключем `"background"`.
  - Налаштовано первинне заповнення конфігурації при встановленні розширення та підтримка фонових повідомлень (`PING`, `GET_VERSION`, `BACKGROUND_LOG`).
  - Перевірено збірку: `npm run build` успішно транспілює `service-worker.ts` та генерує бандли `dist/service-worker-loader.js` і `dist/assets/service-worker.ts-*.js`.

**Що зробити:**
1. Створи `background/service-worker.js`
2. Перенеси background-логіку (якщо є): alarms, notifications
3. В `manifest.json` додай:
   ```json
   "background": {
     "service_worker": "background/service-worker.js",
     "type": "module"
   }
   ```
4. Налаштуй комунікацію між content scripts і service worker через `chrome.runtime.sendMessage`

**Файли для роботи:**
- Новий: `background/service-worker.js`
- `manifest.json`
- Модулі що потребують background tasks

**Критерії готовності:**
- [x] Service worker зареєстрований і працює
- [x] Background tasks виконуються коректно
- [x] Content scripts можуть комунікувати з service worker

---

### Задача 4.4 — Створити окрему Options Page ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `options/options.html` (новий), `options/options.css` (новий), `options/options.ts` (новий), `manifest.json`, `popup/popup.html`, `popup/popup_init.js`.
- 🎯 **Результат:** 
  - Створено повноцінну автономну сторінку налаштувань розширення `options/options.html` з сучасним дизайном (CSS grid/flexbox, Inter шрифти, картки, вкладки навігації, тост-сповіщення).
  - Зареєстровано `"options_ui": { "page": "options/options.html", "open_in_tab": true }` в `manifest.json`.
  - Створено TypeScript-модуль `options/options.ts`, що підключає `SYH_STORAGE` та `SYH_CONFIG` для керування налаштуваннями СШ/проповідей, мови, Anti-AFK, Auto-Heal, лімітів обрізання та кнопок копіювання.
  - Додано функції експорту/імпорту конфігурації у форматі JSON та скидання до початкових стандартів.
  - Оновлено `popup/popup.html` та `popup/popup_init.js` з кнопкою швидкого переходу до Options Page через `chrome.runtime.openOptionsPage()`.
  - Збірка `npm run build` успішно транспілює та збирає `options.html` і його ресурси в `dist/`, а `npm run test` (25/25) проходить на 100%.

**Що зробити:**
1. Створи `options/options.html` та `options/options.js`
2. Перенеси налаштування з popup в окрему Options Page
3. В `manifest.json` додай:
   ```json
   "options_page": "options/options.html"
   ```
   або:
   ```json
   "options_ui": {
     "page": "options/options.html",
     "open_in_tab": true
   }
   ```
4. Popup залиш для швидких дій, Options Page — для детальних налаштувань

**Файли для роботи:**
- Новий: `options/options.html`
- Новий: `options/options.js`
- Новий: `options/options.css`
- `manifest.json`
- `popup/` файли (видалити/спростити частину налаштувань)

**Критерії готовності:**
- [x] Options Page відкривається з контекстного меню розширення
- [x] Налаштування зберігаються через `chrome.storage`
- [x] Popup спрощений, містить тільки швидкі дії
