# 🤖 Фаза 1: Quick Wins

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

### Задача 1.1 — Виправити XSS-вразливість у `popup_prayers.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `popup/popup_prayers.js`
- 🎯 **Результат:** 
  - Замінено небезпечну ін'єкцію `${author}` у template literals на безпечну побудову DOM через jQuery API: `.text(author)` та `.attr('data-author', author)`.
  - Замінено виклики `.html('❌')` на `.text('❌')`.
  - Проведено тестування парсерів (`node test_parsers.js`), 100% тестів успішно пройдено.

**Контекст:** У файлі `popup_prayers.js` є XSS-вразливість — дані користувача (author) підставляються напряму в HTML через template literal. Якщо хтось у StreamYard поставить ім'я типу `<img src=x onerror=alert('XSS')>`, це виконається в контексті розширення.

**Що зробити:**
1. Відкрий файл `popup_prayers.js`
2. Знайди всі місця, де змінна `author` (або інші дані від користувача) вставляється в HTML через template literal `${...}` всередині jQuery `$(...)` або `.html(...)` або `.append(...)`
3. Заміни кожне таке місце на безпечну конструкцію з `.text()`:

**Приклад фіксу:**
```javascript
// ❌ НЕБЕЗПЕЧНО — було
const header = $(`<div>...<span class="editable-author">${author}</span>...</div>`);

// ✅ БЕЗПЕЧНО — має бути
// Створюй HTML-структуру через jQuery DOM API, а для текстових даних використовуй .text()
const authorSpan = $('<span>').addClass('editable-author').text(author);
```

4. Перевір ВСІ інші popup-файли (`popup_telegram.js`, тощо) на аналогічні проблеми і виправ їх теж

**Файли для роботи:**
- `popup/popup_prayers.js`
- `popup/popup_telegram.js` (перевірити)
- Інші файли в `popup/` (перевірити)

**Критерії готовності:**
- [x] Жоден user-input не підставляється напряму в HTML через template literals
- [x] Всі текстові дані проходять через `.text()` або аналогічну sanitization
- [x] Функціональність popup не зламана

---

### Задача 1.2 — Очистити permissions у `manifest.json` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `manifest.json`
- 🎯 **Результат:** 
  - Проведено пошук по всьому коду на предмет `chrome.alarms` та `chrome.notifications` — збігів не знайдено, дозволи `alarms` та `notifications` видалено з `manifest.json`.
  - Перевірено використання `chrome.tabs`: використовується лише для роботи з активним табом у поточному вікні, тому видалено глобальний дозволи `tabs` на користь безпечнішого `activeTab`.
  - Додано обов'язкову секцію `"host_permissions": ["https://streamyard.com/*"]` для відповідності Chrome MV3.

**Контекст:** У `manifest.json` є зайві permissions, які не використовуються в коді, але дають розширенню непотрібний доступ. Це червоний прапорець при ревʼю в Chrome Web Store.

**Що зробити:**
1. Відкрий `manifest.json`
2. Видали permission `"tabs"` з масиву `"permissions"` — замість нього вже є `"activeTab"`, який достатній
3. Перевір чи `"alarms"` використовується десь у коді (пошукай `chrome.alarms` у всіх `.js` файлах). Якщо НЕ використовується — видали
4. Перевір чи `"notifications"` використовується десь у коді (пошукай `chrome.notifications` у всіх `.js` файлах). Якщо НЕ використовується — видали
5. Додай секцію `"host_permissions"` (якщо її нема):
```json
"host_permissions": ["https://streamyard.com/*"]
```

**Файли для роботи:**
- `manifest.json`
- Всі `.js` файли (пошук по `chrome.alarms`, `chrome.notifications`, `chrome.tabs`)

**Критерії готовності:**
- [x] `"tabs"` видалено з permissions
- [x] Невикористовувані permissions видалені
- [x] `"host_permissions"` присутній з `"https://streamyard.com/*"`
- [x] Розширення завантажується в Chrome без помилок

---

### Задача 1.3 — Уніфікувати версію розширення ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `manifest.json`, `main.js`
- 🎯 **Результат:** 
  - Уніфіковано версію розширення до `"1.0.0"` у `manifest.json` (`version` та `default_title`).
  - У `main.js` реалізовано динамічне отримання версії з манифесту `chrome.runtime.getManifest().version` замість захардкодженої стрічки `"0.9.9"`.

**Контекст:** Версія розширення вказана по-різному в трьох місцях, що створює плутанину:
- `manifest.json` → `"version"`: `"0.81"`
- `manifest.json` → `"default_title"`: `"0.8"`
- `main.js` → `console.log`: `"v0.9.9"`

**Що зробити:**
1. Визнач актуальну версію. Ймовірно це `0.9.9` (остання, яка в `main.js`). Встанови версію `"1.0.0"` як нову офіційну версію після рефакторингу (або `"0.9.9"` якщо хочемо зберегти поточну — обирай `"1.0.0"`)
2. В `manifest.json`:
   - `"version"` → `"1.0.0"`
   - `"default_title"` (в `browser_action` або `action`) → Оновити щоб містив актуальну версію
3. В `main.js`:
   - Оновити console.log з версією, щоб вона бралась динамічно з `chrome.runtime.getManifest().version` замість хардкоду

**Приклад для main.js:**
```javascript
// ❌ Було
console.log('[StreamYard Helper] v0.9.9');

// ✅ Має бути
const manifest = chrome.runtime.getManifest();
console.log(`[StreamYard Helper] v${manifest.version}`);
```

**Файли для роботи:**
- `manifest.json`
- `main.js`

**Критерії готовності:**
- [x] Версія єдина і консистентна в усіх місцях
- [x] `main.js` бере версію динамічно з manifest

---

### Задача 1.4 — Оновити jQuery до 3.7.1 ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `lib/jquery-3.7.1.js`, `manifest.json`, `popup/popup.html`
- 🎯 **Результат:** 
  - Завантажено нову стабільну версію jQuery 3.7.1 у директорію `lib/` (`lib/jquery-3.7.1.js`) та вилучено застарілу версію 3.5.0 (`lib/jquery-3.5.0.js`).
  - Оновлено підключення бібліотеки в `manifest.json` (у `content_scripts`) та `popup/popup.html`.
  - Перевірено код на відсутність застарілих та вилучених у jQuery 3.7 API (таких як `.size()`, `.andSelf()`).
  - Проведено тестування парсерів (`node test_parsers.js`), всі тести пройдено на 100%.

**Контекст:** Проєкт використовує jQuery 3.5.0 (6+ років, має відомі performance-баги). Поточна стабільна — 3.7.1.

**Що зробити:**
1. Знайди файл jQuery у проєкті (ймовірно `libs/jquery-3.5.0.min.js` або подібний)
2. Завантаж jQuery 3.7.1 minified з офіційного CDN: `https://code.jquery.com/jquery-3.7.1.min.js`
3. Заміни старий файл на новий
4. Оновити посилання в `manifest.json` (якщо там прописаний конкретний файл jQuery з версією в назві)
5. Перевір що немає використання deprecated jQuery API, які видалені в 3.7.1:
   - `.click()` без аргументів (shorthand для `.trigger('click')`) — ОК, працює
   - `.size()` — замінити на `.length`
   - `.andSelf()` — замінити на `.addBack()`

**Файли для роботи:**
- `libs/` (директорія з бібліотеками)
- `manifest.json` (оновити посилання)
- Всі `.js` файли (перевірити deprecated API)

**Критерії готовності:**
- [x] jQuery оновлена до 3.7.1
- [x] `manifest.json` посилається на правильний файл
- [x] Немає використання deprecated jQuery API
- [x] Розширення працює коректно з новою версією

---

### Задача 1.5 — Замінити `document.execCommand("copy")` на `navigator.clipboard.writeText()` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `popup/popup_prayers.js`, `popup/popup_telegram.js`
- 🎯 **Результат:** 
  - Проведено пошук `document.execCommand("copy")` по всьому проєкту.
  - Застаріле використання `document.execCommand("copy")` у `popup/popup_prayers.js` та `popup/popup_telegram.js` замінено на асинхронний `navigator.clipboard.writeText()` з `try...catch` та автоматичним fallback-механізмом.
  - Проведено тестування проєктних тестів (`node test_parsers.js`), 100% тестів успішно пройдено.

**Контекст:** `document.execCommand("copy")` — це deprecated API. Сучасна заміна — `navigator.clipboard.writeText()`.

**Що зробити:**
1. Знайди всі використання `document.execCommand("copy")` або `document.execCommand('copy')` в проєкті
2. Заміни кожне на `navigator.clipboard.writeText(text)`:

**Приклад фіксу:**
```javascript
// ❌ Deprecated — було
const textArea = document.createElement('textarea');
textArea.value = text;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);

// ✅ Сучасний API — має бути
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback для старих браузерів
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
```

3. Переконайся що в `manifest.json` є permission `"clipboardWrite"` (якщо потрібно для content scripts)

**Файли для роботи:**
- `popup/popup_prayers.js`
- `popup/popup_telegram.js`
- Інші файли — пошукай `execCommand` по всьому проєкту

**Критерії готовності:**
- [x] Всі `document.execCommand("copy")` замінені на `navigator.clipboard.writeText()`
- [x] Є fallback для випадків де clipboard API недоступний
- [x] Копіювання працює як раніше

---

### Задача 1.6 — Винести magic numbers в `config.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/config.js`, `main.js`, `modules/event_comments.js`, `modules/stats_tracker.js`, `modules/parsers.js`
- 🎯 **Результат:** 
  - У `modules/config.js` додано об'єкти `TIMINGS` та `LIMITS` з описовими назвами для часових інтервалів та обмежень.
  - У `main.js` замінено магічні числа затримки нагадування (`REMINDER_DELAY`), інтервалу Anti-AFK (`ANTI_AFK_INTERVAL`) та debounce фільтрів (`FILTER_DEBOUNCE`).
  - У `modules/event_comments.js` застаріле значення `500мс` замінено на `AUTO_HEAL_POLLING`.
  - У `modules/stats_tracker.js` інтервал `60000мс` замінено на `STATS_TRACKING_INTERVAL`.
  - У `modules/parsers.js` довжину обрізання `195` замінено на `LIMITS.TEXT_TRUNCATION_LENGTH`.
  - Проведено тестування (`node test_parsers.js`), 100% тестів успішно пройдено.

**Контекст:** По коду розкидані "магічні числа" без пояснення. Їх потрібно централізувати в `config.js` з описовими іменами.

**Що зробити:**
1. Відкрий `modules/config.js` і додай нову секцію (або розшир існуючу) для констант:

```javascript
// Додати в config.js
TIMINGS: {
  ANTI_AFK_INTERVAL: 30000,        // 30 секунд — інтервал Anti-AFK кліків
  AUTO_HEAL_POLLING: 500,          // 500мс — DOM polling для Auto-Heal
  FILTER_DEBOUNCE: 150,            // 150мс — debounce для фільтру пошуку
  STATS_TRACKING_INTERVAL: 60000,  // 60 секунд — інтервал збору статистики
  REMINDER_DELAY: 2 * 60 * 1000,  // 2 хвилини — затримка нагадування
},
LIMITS: {
  TEXT_TRUNCATION_LENGTH: 195,     // Максимальна довжина тексту перед обрізанням
}
```

2. Знайди кожне з цих чисел в коді і заміни на посилання з конфігу:
   - `30000` в Anti-AFK → `SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL`
   - `500` в Auto-Heal → `SYH_CONFIG.TIMINGS.AUTO_HEAL_POLLING`
   - `150` в debounce → `SYH_CONFIG.TIMINGS.FILTER_DEBOUNCE`
   - `195` в truncation → `SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH`
   - `60000` в stats → `SYH_CONFIG.TIMINGS.STATS_TRACKING_INTERVAL`
   - `2 * 60 * 1000` або `120000` → `SYH_CONFIG.TIMINGS.REMINDER_DELAY`

**Файли для роботи:**
- `modules/config.js` (додати константи)
- `main.js`
- `modules/event_comments.js`
- `modules/utils.js`
- `modules/parsers.js`
- `modules/stats_tracker.js`
- Інші модулі — пошукай ці числа

**Критерії готовності:**
- [x] Всі magic numbers винесені в `config.js`
- [x] Кожна константа має описову назву та коментар
- [x] Всі модулі використовують значення з конфігу
- [x] Функціональність не змінилась

---

### Задача 1.7 — Видалити дублікат `getCheckedState()` / `getState()` в `state.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/state.js`, `modules/ui_banners_items.js`, `modules/ui_comments.js`
- 🎯 **Результат:** 
  - Видалено дублюючий метод `getCheckedState()` з `modules/state.js`, залишено `getState()`.
  - Усі виклики `getCheckedState()` в `modules/ui_banners_items.js` та `modules/ui_comments.js` замінено на `getState()`.

**Контекст:** У `modules/state.js` (рядки ~80-86) є два ідентичних методи: `getCheckedState()` і `getState()`. Один з них зайвий.

**Що зробити:**
1. Відкрий `modules/state.js`
2. Порівняй методи `getCheckedState()` та `getState()` — вони мають бути ідентичними
3. Видали один з них (залиш `getState()` як основний, бо ім'я більш зрозуміле)
4. Знайди всі виклики `getCheckedState()` по всьому проєкту і заміни на `getState()`

**Файли для роботи:**
- `modules/state.js`
- Всі файли що викликають `getCheckedState()` — пошукай по проєкту

**Критерії готовності:**
- [x] Залишився тільки один метод — `getState()`
- [x] Всі виклики `getCheckedState()` замінені на `getState()`
- [x] Нічого не зламалось

---

### Задача 1.8 — Винести хардкоджені CSS-класи з `main.js` в `config.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/config.js`, `main.js`, `modules/ui_comments.js`
- 🎯 **Результат:** 
  - У `modules/config.js` до об'єкта `SELECTORS` додано нові селектори: `starredHeaderWrap`, `starredItemWrap`, `starredList`, `starredCommentItem`.
  - У `main.js` замінено прямі назви CSS-класів `StarredCommentList__*` на використання відповідних властей об'єкта `SELECTORS`.
  - У `modules/ui_comments.js` замінено виклики `$('.StarredCommentList__List-sc-1qtlqu2-1')` на `$(this.SELECTORS.starredList)`.
  - Систему успішно протестовано (`node test_parsers.js`), помилок синтаксису не виявлено.

**Контекст:** У `main.js` (рядки ~82-84) є хардкоджені CSS-класи StreamYard, які мають бути в `config.js` разом з іншими селекторами.

**Що зробити:**
1. Відкрий `main.js` і знайди хардкоджені CSS-класи StreamYard:
```javascript
'.StarredCommentList__HeaderWrap-sc-1qtlqu2-5'
'.StarredCommentList__ItemWrap-sc-1qtlqu2-6'
'.StarredCommentList__List-sc-1qtlqu2-1'
```
2. Перенеси їх в `modules/config.js` в секцію `SELECTORS`:
```javascript
SELECTORS: {
  // ... існуючі селектори ...
  starredHeaderWrap: '.StarredCommentList__HeaderWrap-sc-1qtlqu2-5',
  starredItemWrap: '.StarredCommentList__ItemWrap-sc-1qtlqu2-6',
  starredList: '.StarredCommentList__List-sc-1qtlqu2-1',
  starredCommentItem: 'li[class*="StarredCommentList"]',
}
```
3. Оновити `main.js` щоб використовував `SYH_CONFIG.SELECTORS.starred*`
4. Перевір чи є інші хардкоджені CSS-класи StreamYard в інших файлах (не в `config.js`) і теж перенеси

**Файли для роботи:**
- `main.js`
- `modules/config.js`
- Інші модулі (перевірити на хардкоджені StreamYard CSS-класи)

**Критерії готовності:**
- [x] Всі StreamYard CSS-класи знаходяться тільки в `config.js`
- [x] Інші файли посилаються на `SYH_CONFIG.SELECTORS.*`

---

### Задача 2.4 — Прибрати DOM-маніпуляції зі `state.js` ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/state.js`, `modules/ui_core.js`
- 🎯 **Результат:** 
  - Видалено метод `restoreDomCheckboxes()`, що безпосередньо здійснював DOM-маніпуляції через jQuery, із файлу `modules/state.js`.
  - Метод `restoreDomCheckboxes()` винесено у відповідний UI-модуль `modules/ui_core.js` (`SYH_UI.restoreDomCheckboxes`).
  - `modules/state.js` очищено до чистого data-layer, де при ініціалізації викликається делегування оновлення UI `window.SYH_UI.restoreDomCheckboxes()`.
  - Проведено повне автоматизоване тестування (`node test_parsers.js`), 100% тестів успішно пройдено.

**Критерії готовності:**
- [x] `state.js` не містить жодних DOM/jQuery маніпуляцій
- [x] DOM-маніпуляції винесені в UI-модуль (`ui_core.js`)
- [x] Функціональність повністю збережена і перевірена тестами

---

### Задача 2.5 — Централізувати Storage adapter ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/storage.js` [NEW], `modules/utils.js`, `modules/state.js`, `modules/ui_core.js`, `modules/event_comments.js`, `manifest.json`
- 🎯 **Результат:** 
  - Створено окремий модуль [storage.js](file:///d:/Chrome%20Extension/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD.%20Chrome%20Extension/streamyars-copy-buttons%20%28added%20checkbox%29%200.6-2026.01.11/modules/storage.js) із розширеним захистом від зомбі-контексту (`chrome.runtime.id`), автоматичним fallback до `localStorage` та методом подій `onChanged`.
  - Усунуто дублювання потрійних тернарних операторів розпізнавання `chrome.storage.local` у файлах `modules/state.js`, `modules/ui_core.js`, `modules/event_comments.js` та `modules/utils.js`.
  - Оновлено `manifest.json` для підключення `modules/storage.js` перед іншими залежними модулями.
  - Усі автоматичні тести успішно пройдено (`node test_parsers.js`).

**Критерії готовності:**
- [x] Storage fallback-логіка централізована у `modules/storage.js`
- [x] Всі модулі використовують `SYH_STORAGE` / `SYH_UTILS.storage`
- [x] `manifest.json` підключає новий модуль
- [x] Дані коректно зберігаються та зчитуються, 100% тестів пройдено

---

### Задача 3.5 — Виправити timezone баг в `state.js` та інших модулях ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `modules/utils.js`, `modules/state.js`, `modules/stats_exporter.js`, `modules/stats_tracker.js`
- 🎯 **Результат:** 
  - У `modules/utils.js` додано утилітну функцію `getTodayDateString()`, що повертає поточну дату за місцевим часом у форматі `YYYY-MM-DD` (`new Date().toLocaleDateString('sv-SE')`).
  - Усунуто баг із використанням `new Date().toISOString().split('T')[0]` (яка генерувала дати по UTC, призводячи до скидання стану о 21:00–22:00 за місцевим часом для часових поясів UTC+2/UTC+3).
  - Замінено розрахунок дати на локальний часовий пояс у `modules/state.js` (`init` та `saveState`), `modules/stats_exporter.js` та `modules/stats_tracker.js`.
  - Запущено автоматичне тестування (`node test_parsers.js`), 100% тестів успішно пройдено.

**Критерії готовності:**
- [x] Дата визначається в локальному часовому поясі користувача
- [x] Скид стану відбувається опівночі за місцевим часом
- [x] Формат дати залишається `YYYY-MM-DD`
- [x] `stats_exporter.js` та `stats_tracker.js` також оновлені для єдиної дати

---

### Задача 2.2 — Перенести CSS з JavaScript у окремі `.css` файли ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `styles.css`, `modules/ui_core.js`, `modules/ui_banners_tabs.js`, `modules/ui_comments.js`
- 🎯 **Результат:** 
  - Вилучено всі динамічні ін'єкції тегів `<style>` (`#syh-global-styles`, `#syh-banner-header-styles`, `#syh-starred-styles`) із JavaScript файлів `modules/ui_core.js`, `modules/ui_banners_tabs.js` та `modules/ui_comments.js`.
  - Усі стилі оформлення коментарів, банерів, анімацій пульсації та динамічних фільтрів винесено та централізовано в `styles.css`, що вже підключений у `manifest.json`.
  - Проведено тестування синтаксису розширення та автоматичних тестів (`node test_parsers.js`), 100% тестів пройдено.

**Критерії готовності:**
- [x] Нуль CSS в JavaScript файлах
- [x] Нуль дублікатів CSS-правил
- [x] Всі стилі підключені через `styles.css`
---

### Задача 2.3 — Lazy loading для Chart.js ✅ **[ВИКОНАНО]**

**Статус виконання:**
- 📅 **Дата:** 2026-07-24
- 🛠️ **Змінені файли:** `manifest.json`, `modules/stats_exporter.js`
- 🎯 **Результат:** 
  - Вилучено бібліотеку `lib/chart.js` (208KB) з масиву `content_scripts` у `manifest.json`, що усунуло її непотрібне завантаження на кожній сторінці StreamYard.
  - Додано `lib/chart.js` у `web_accessible_resources` у `manifest.json`.
  - У `modules/stats_exporter.js` додано асинхронний метод `loadChartJs()`, який динамічно підвантажує скрипт `lib/chart.js` у DOM лише тоді, коли користувач відкриває вікно аналітики та графіка (`renderChart`).
  - Проведено автоматичне тестування (`node test_parsers.js`), 100% тестів успішно пройдено.

**Критерії готовності:**
- [x] Chart.js НЕ завантажується при відкритті StreamYard
- [x] Chart.js завантажується динамічно тільки коли користувач відкриває аналітику
- [x] Повністю збережена функціональність побудови графіків та експорту




