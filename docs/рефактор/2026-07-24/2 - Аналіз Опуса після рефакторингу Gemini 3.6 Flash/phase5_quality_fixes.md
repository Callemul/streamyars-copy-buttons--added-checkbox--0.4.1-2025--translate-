# 🔧 Фаза 5: Виправлення проблем якості (post-refactoring review)

> **Контекст:** Після завершення фаз 1–4 рефакторингу було проведено code review 13 ключових файлів.
> Знайдено 22 проблеми різної серйозності. Цей файл містить задачі для їх виправлення.
> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.

---

## 🔴 BLOCKER

### Задача 5.1 — Chart.js не працює в Isolated World (MV3)

**Пріоритет:** 🔴 BLOCKER — графіки аналітики ймовірно зламані

**Контекст:** `loadChartJs()` у `stats_exporter.js` створює `<script>` тег і додає в `document.head`. В Manifest V3 такі скрипти виконуються в **Main World** сторінки, а content scripts працюють в **Isolated World**. `typeof Chart` завжди `undefined` у content script.

**Що зробити:**
1. Повернути `lib/chart.js` у `content_scripts.js` масив у `manifest.json` (найпростіший варіант)
2. АБО використати `chrome.scripting.executeScript({ world: 'MAIN' })` для завантаження
3. АБО використати динамічний `import()` якщо Chart.js підтримує ESM

**Файли для роботи:**
- `modules/stats_exporter.js`
- `manifest.json`

**Критерії готовності:**
- [x] `typeof Chart !== 'undefined'` у content script після lazy load
- [x] Графіки аналітики відкриваються та рендеряться коректно
- [x] Забезпечено завантаження та виконання Chart.js в Isolated World

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `manifest.json`: додано `lib/chart.js` у масив `content_scripts[0].js`.
  - `modules/stats_exporter.js`: переписано `loadChartJs()` — видалено створення DOM `<script>` елемента (який інжектив скрипт у Main World сторінки), реалізовано перевірку наявності `Chart` в Isolated World та фолбек завантаження через `fetch` + global `eval` в контексті Isolated World content script.

---

## 🟠 HIGH

### Задача 5.2 — RAF batching зависає у фоновій вкладці

**Пріоритет:** 🟠 HIGH — витік пам'яті та затримка UI при тривалих стрімах

**Контекст:** `requestAnimationFrame` призупиняється браузером коли вкладка у фоні. Мутації накопичуються в `pendingMutations` без обробки → масив росте безконтрольно + затримка при поверненні до вкладки.

**Що зробити:**
1. Додати `setTimeout` fallback для фонових вкладок:
```javascript
if (!rafScheduled) {
    rafScheduled = true;
    const process = () => {
        processMutations(pendingMutations);
        pendingMutations = [];
        rafScheduled = false;
    };
    if (document.hidden) {
        setTimeout(process, 200);
    } else {
        requestAnimationFrame(process);
    }
}
```
2. Додати ліміт на розмір `pendingMutations` (наприклад, 500 елементів) з примусовою обробкою при переповненні

**Файли для роботи:**
- `main.js`

**Критерії готовності:**
- [x] Мутації обробляються навіть коли вкладка у фоні
- [x] `pendingMutations` не росте безконтрольно
- [x] При поверненні до вкладки немає помітної затримки

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `main.js`: реалізовано функцію `flushMutations()`. Додано ліміт `MAX_PENDING_MUTATIONS = 500` із примусовим очищенням буфера `pendingMutations` при переповненні. Для фонових вкладок (`document.hidden === true`) додано fallback `setTimeout(flushMutations, 200)`, що запобігає зависанню `requestAnimationFrame` та росту пам'яті.

---

### Задача 5.3 — `smartSearch` ламає transliterate/switchLayout

**Пріоритет:** 🟠 HIGH — пошук працює некоректно

**Контекст:** `normalizeText()` замінює латинські літери на кириличні двійники (`a→а, e→е, o→о`) **до** виклику `transliterate` і `switchKeyboardLayout`. Після цього ці функції отримують вже замінені символи і працюють некоректно.

**Що зробити:**
1. Змінити порядок: спочатку генерувати варіанти (transliterate, switchLayout), потім нормалізувати кожен
2. АБО застосовувати `normalizeText` тільки до фінального порівняння, а не до вхідних даних

**Файли для роботи:**
- `modules/utils.js`

**Критерії готовності:**
- [x] Пошук латинською знаходить кириличні записи через транслітерацію
- [x] Пошук з перемиканням розкладки працює коректно
- [x] Нормалізація візуально схожих символів все ще працює

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/utils.js`: змінено порядок створення варіантів у `smartSearch()` — функції `transliterate` та `switchKeyboardLayout` тепер отримують оригінальні вхідні рядки (`rawTarget`, `word`) до обробки `normalizeText()`. Це усунуло передчасне перетворення латинських символів на кириличні гомогліфи (наприклад, 'h' -> 'н', 't' -> 'т'), яке ламало пошук розкладок і транслітерацію.
  - `tests/utils.test.js`: додано нові юніт-тести для `smartSearch()` (пошук латиницею `natasha` -> `Наташа`, `artem` -> `Артем` та пошук з розкладкою й гомогліфними клавішами `fhntv` -> `Артем`).

---

## 🟡 MEDIUM

### Задача 5.4 — MutationObserver ніколи не перепідключається до контейнера чату

**Пріоритет:** 🟡 MEDIUM

**Контекст:** Якщо при старті контейнер `[data-testid="chat-container"]` ще не існує — observer підключається до `document.body` і **ніколи не перепідключається** після завантаження чату. Це зводить нанівець оптимізацію з задачі 3.3.

**Що зробити:**
1. Додати періодичну перевірку (або окремий observer) для появи контейнера чату
2. При знаходженні — відключити старий observer від `document.body` і підключити до контейнера

**Файли для роботи:**
- `main.js`
- `modules/event_comments.js`

**Критерії готовності:**
- [x] Observer перепідключається до контейнера чату коли той з'являється
- [x] Старий observer на `document.body` коректно відключається

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `main.js`: додано функцію `checkAndReattachObserver()`, яка при спрацьовуванні observer перевіряє наявність конкретного чат-контейнера (`[data-testid="chat-container"]`, `.chat-container` тощо), відключає головний `MutationObserver` від `document.body` та перепідключає його безпосередньо до знайденого контейнера.
  - `modules/event_comments.js`: реалізовано динамічне відстеження контейнера чату та перепідключення для `autoHealObserver` (`checkAndReattachAutoHeal()`) з автоматичним `disconnect()` попереднього обзвервера при повторному зв'язуванні подій.

---

### Задача 5.5 — `checkForStreamEnd()` ніколи не викликається

**Пріоритет:** 🟡 MEDIUM

**Контекст:** Функція визначена в `main.js` (рядки 39–54) але ніде не викликається. Детекція кінця стріму та автоматичне нагадування в Telegram не працюють.

**Що зробити:**
1. Додати виклик `checkForStreamEnd()` в потрібному місці (наприклад, в `processMutations` або `setInterval`)
2. АБО видалити dead code якщо функціонал не потрібен

**Файли для роботи:**
- `main.js`

**Критерії готовності:**
- [x] Функція або викликається коректно, або видалена

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `main.js`: додано виклик `checkForStreamEnd()` при ініціалізації розширення (`init()`), а також на кожній ітерації обробки мутацій DOM (`processMutations()`). Це забезпечує своєчасне виявлення завершення стріму та створення нагадування про публікацію в Telegram.

---

### Задача 5.6 — Falsy zero bug в `stats_exporter.js`

**Пріоритет:** 🟡 MEDIUM

**Контекст:** `st1.avg || '-'` — якщо `avg === 0`, показує `'-'` замість `'0'`.

**Що зробити:**
```javascript
// ❌ Було
st1.avg || '-'

// ✅ Має бути
st1.avg ?? '-'
```

**Файли для роботи:**
- `modules/stats_exporter.js`

**Критерії готовності:**
- [x] Нульові значення відображаються як `0`, а не як `-`

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/stats_exporter.js`: замінено оператор `||` на nullish coalescing `??` (`st1.avg ?? '-'`, `st1.max ?? '-'`, `st1.median ?? '-'` і аналоги для `st2`, `st3`). Тепер значення `0` відображаються коректно як `0`, а не замінюються на дефіс `-`.

---

### Задача 5.7 — Blob URL memory leak в `stats_exporter.js`

**Пріоритет:** 🟡 MEDIUM

**Контекст:** `URL.createObjectURL(blob)` без `URL.revokeObjectURL()`. Кожен експорт — витік пам'яті.

**Що зробити:**
```javascript
const url = URL.createObjectURL(blob);
link.href = url;
link.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

**Файли для роботи:**
- `modules/stats_exporter.js`

**Критерії готовності:**
- [x] `URL.revokeObjectURL()` викликається після скачування

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/stats_exporter.js`: додано `setTimeout(() => URL.revokeObjectURL(url), 1000)` після виклику `link.click()`, що звільняє виділену для Blob URL пам'ять і запобігає витокам після скачування звітів.

---

### Задача 5.8 — `state.js` все ще має coupling з UI

**Пріоритет:** 🟡 MEDIUM

**Контекст:** `state.js` напряму викликає `window.SYH_UI.restoreDomCheckboxes()` — це порушує separation of concerns. State layer не повинен знати про UI.

**Що зробити:**
1. Замінити прямий виклик на event/callback pattern:
```javascript
// state.js — емітити подію
if (this._onStateLoaded) this._onStateLoaded(this._state);

// main.js або ui_core.js — підписатися
SYH_STATE.onStateLoaded = () => SYH_UI.restoreDomCheckboxes();
```

**Файли для роботи:**
- `modules/state.js`
- `modules/ui_core.js` або `main.js`

**Критерії готовності:**
- [x] `state.js` не містить жодних посилань на `SYH_UI`
- [x] Чекбокси все ще відновлюються при завантаженні

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/state.js`: додано властивість `onStateLoaded: null` до об'єкта `SYH_STATE`. Видалено прямі виклики `window.SYH_UI.restoreDomCheckboxes()`. При ініціалізації стану викликається кастомний callback `this.onStateLoaded(this.itemStates)`, що повністю усуває прямий зв'язок `state.js` із шаром UI.
  - `modules/ui_core.js`: у виклику `SYH_UI.init(config, state)` додано реєстрацію `this.STATE.onStateLoaded = () => self.restoreDomCheckboxes()`, що забезпечує автоматичне відновлення чекбоксів при завантаженні стану.
  - `tests/state.test.js`: додано новий юніт-тест (Тест 11) для перевірки спрацьовування `onStateLoaded` при ініціалізації стану `SYH_STATE`.

---

### Задача 5.9 — `ui_core.js` — однобічна синхронізація чекбоксів

**Пріоритет:** 🟡 MEDIUM

**Контекст:** `restoreDomCheckboxes()` ставить `checked = true`, але ніколи не скидає `checked = false`. Якщо стан змінився — DOM не оновиться.

**Що зробити:**
```javascript
// ❌ Було — тільки true
if (textKey && itemStates[textKey]) $checkbox.prop('checked', true);

// ✅ Має бути — обидва напрямки
$checkbox.prop('checked', !!(textKey && itemStates[textKey]));
```

**Файли для роботи:**
- `modules/ui_core.js`

**Критерії готовності:**
- [x] Чекбокси коректно скидаються коли стан `false`

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/ui_core.js`: у функції `restoreDomCheckboxes()` оновлено встановлення атрибуту `checked` для чекбоксів з урахуванням збереженого стану (`$checkbox.prop('checked', !!itemStates[textKey])`). Це забезпечує двосторонню синхронізацію — чекбокси тепер не лише встановлюються в `true`, а й коректно скидаються в `false`, якщо стан елемента змінюється або видаляється зі `SYH_STATE`.

---

### Задача 5.10 — `storage.ts` — тихе ковтання помилок

**Пріоритет:** 🟡 MEDIUM

**Контекст:** Всі `catch` блоки порожні. `QuotaExceededError`, помилки зомбі-контексту — все замовчується без логування.

**Що зробити:**
```javascript
// ❌ Було
catch (e) {}

// ✅ Має бути
catch (e) { console.warn('[SYH Storage] Fallback to localStorage:', e.message); }
```
Також додати перевірку `chrome.runtime.lastError` у callbacks `chrome.storage.local`.

**Файли для роботи:**
- `modules/storage.ts`

**Критерії готовності:**
- [x] Помилки storage логуються в консоль (warn рівень)
- [x] `chrome.runtime.lastError` перевіряється в callbacks

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/storage.ts`: додано логування помилок рівнем `console.warn` в усіх `catch` блоках для `get()`, `set()`, `remove()` та `onChanged()` (включаючи фолбек на `localStorage`). В колбеках `chrome.storage.local` додано перевірку `chrome.runtime.lastError` з логуванням попереджень у консоль.

---

### Задача 5.11 — `popup_telegram.js` — regex typo

**Пріоритет:** 🟡 MEDIUM

**Контекст:** Рядок 57: `\Snapshot_or_time` — `\S` інтерпретується як regex `\S` (будь-який непробільний символ), а не літерал `S`.

**Що зробити:**
- Перевірити чи це навмисно. Якщо ні — екранувати: `\\Snapshot_or_time` або замінити на `Snapshot_or_time`

**Файли для роботи:**
- `popup/popup_telegram.js`

**Критерії готовності:**
- [x] Regex працює як задумано

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `popup/popup_telegram.js`: виправлено помилку в оголошенні `tgHeaderRegex` (видалено зіпсований літерал `\Snapshot_or_time`) та вилучено дублюючу змінну `cleanRegex`. Цикл парсингу повідомлень у `parseAndFilterOldList()` переведено на коректний `tgHeaderRegex`.

---

## 🟢 LOW

### Задача 5.12 — `storage.ts` — `null` vs `undefined` між backends

**Що зробити:** Уніфікувати повернення для відсутніх ключів (`null` або `undefined` — обрати одне).

**Файли:** `modules/storage.ts`

- [x] Відсутні ключі повертають однакове значення незалежно від backend

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/storage.ts`: уніфіковано значення для відсутніх ключів під час використання фолбеку `localStorage` — тепер для відсутніх елементів повертається `undefined` замість `null`, що відповідає поведінці API `chrome.storage.local.get`.

---

### Задача 5.13 — `storage.ts` — `for...in` без `hasOwnProperty`

**Що зробити:** Замінити на `Object.keys(items).forEach(...)` або `Object.entries()`.

**Файли:** `modules/storage.ts`

- [x] `for...in` замінено на безпечну ітерацію

**Звіт про виконання:**
- **Статус:** ✅ Виконано (`modules/storage.ts`: `for...in` замінено на `Object.keys(items).forEach()` для безпечної ітерації).

---

### Задача 5.14 — `config.ts` — Styled-Components хеші зламаються при оновленні StreamYard

**Що зробити:** Замінити точні хеші на `[class*="StarredCommentList__HeaderWrap"]` pattern matching для `starredHeaderWrap`, `starredItemWrap`, `starredList` (як вже зроблено для `starredCommentItem`).

**Файли:** `modules/config.ts`

- [x] Селектори використовують `[class*="..."]` замість точних хешів

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/config.ts`: замінено точні хеші Styled-Components для `starredHeaderWrap`, `starredItemWrap`, `starredList` на селектори типу `[class*="..."]`.

---

### Задача 5.15 — `config.ts` — `timerOffTextResult` обчислюється один раз при завантаженні

**Що зробити:** Замінити на getter або функцію для lazy evaluation i18n рядка.

**Файли:** `modules/config.ts`

- [x] i18n рядки обчислюються при кожному зверненні

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/config.ts`: `timerOffTextResult` перетворено на getter властивість `get timerOffTextResult(): string` в об'єкті `SELECTORS`, що забезпечує ліниве (lazy) обчислення i18n рядка `chrome.i18n.getMessage('timerOff')` при кожному зверненні.

---

### Задача 5.16 — `state.js` — `saveState()` без debounce

**Що зробити:** Додати debounce (100-200мс) для `saveState()` щоб уникнути множинних записів при масовому оновленні.

**Файли:** `modules/state.js`

- [x] `saveState()` має debounce

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/state.js`: додано механізм debounce (150 мс за замовчуванням) для `saveState()`, що усуває надлишкові виклики збереження в storage при масових оновленнях. Створено метод `saveStateImmediate()` для негайного збереження за потреби.
  - `tests/state.test.js`: оновлено тести та додано новий юніт-тест (Тест 12) для перевірки коректної затримки та об'єднання викликів `saveState()`.

---

### Задача 5.17 — `event_comments.js` — дублікати observers при повторному `bindEvents()`

**Що зробити:** Додати guard або `disconnect()` попереднього observer перед створенням нового.

**Файли:** `modules/event_comments.js`

- [x] Повторний виклик `bindEvents()` не створює дублікатів

**Звіт про виконання:**
- **Статус:** ✅ Виконано
- **Файли:**
  - `modules/event_comments.js`: додано прапорець `isBound` в `SYH_EVENT_COMMENTS.bindEvents()`, що запобігає повторному підключенню observers та реєстрації подій.

---

### Задача 5.18 — `service-worker.ts` — `return true` для синхронних handlers

**Що зробити:** Повертати `true` тільки для асинхронних обробників `onMessage`. Для синхронних — не повертати або повертати `false`.

**Файли:** `background/service-worker.ts`

- [ ] `return true` тільки для async handlers

---

### Задача 5.19 — `options.ts` — невалідований імпорт JSON конфігурації

**Що зробити:** Додати перевірку схеми/типів при імпорті конфігурації. Відхиляти файли з невідомими ключами або невалідними значеннями.

**Файли:** `options/options.ts`

- [ ] Імпорт конфігурації валідується

---

### Задача 5.20 — `popup_prayers.js` — stale array index при видаленні

**Що зробити:** Використовувати унікальний ID (наприклад, timestamp або uuid) замість індексу масиву для `data-index` атрибутів кнопок видалення.

**Файли:** `popup/popup_prayers.js`

- [ ] Видалення елементів працює коректно незалежно від порядку

---

### Задача 5.21 — `popup_telegram.js` — IEEE-754 floating point для sub-index

**Що зробити:** Використовувати `Math.round()` або string split для парсингу sub-index замість float modulo (`fid % 1`).

**Файли:** `popup/popup_telegram.js`

- [ ] Sub-index парситься коректно без floating point артефактів

---

### Задача 5.22 — `stats_exporter.js` — модальне вікно не закривається на Escape / backdrop

**Що зробити:** Додати обробники:
- `keydown` → Escape закриває модалку
- Клік по фону (backdrop) закриває модалку

**Файли:** `modules/stats_exporter.js`

- [ ] Escape закриває модалку
- [ ] Клік по фону закриває модалку
