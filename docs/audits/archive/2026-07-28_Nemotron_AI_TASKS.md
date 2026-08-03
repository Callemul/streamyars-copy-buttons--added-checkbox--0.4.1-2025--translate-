# 🤖 Задачі для AI-агентів — пост-аудит виправлення (Nemotron 2026-07-28)

> **Джерело:** Незалежний аудит кодової бази (repomix-output.xml)  
> **Дата:** 2026-07-28  
> **Аудитор:** Nemotron (nvidia/nemotron-3-ultra)  
> **Статус:** Всі задачі — нові, не виправлені в попередніх фазах

---

## 🔴 BLOCKER — Критичні (немає)

> У цьому аудиті блокерів не виявлено. Розширення готове до продакшену.

---

## 🟠 HIGH — Пріоритетні виправлення

### Задача H1 — Виправити `return true` для синхронних хендлерів у Service Worker
**Пріоритет:** 🟠 HIGH  
**Файл:** `background/service-worker.ts` (рядки 30, 35, 40)  
**Проблема:** `chrome.runtime.onMessage.addListener` повертає `true` для синхронних обробників (PING, GET_VERSION, BACKGROUND_LOG). Це тримає канал повідомлень відкритим зайво.  
**Що зробити:**
1. Знайди всі `return true` у `switch (message.type)`
2. Залиш `return true` ТІЛЬКИ для асинхронних хендлерів (якщо будуть)
3. Для синхронних — повертай `false` або нічого

**Критерії готовності:**
- [ ] `case 'PING':` — `return false` або без return
- [ ] `case 'GET_VERSION':` — `return false` або без return
- [ ] `case 'BACKGROUND_LOG':` — `return false` або без return
- [ ] `default:` — `return false` (залишається)

---

### Задача H2 — Додати валідацію схеми при імпорті конфігурації в Options
**Пріоритет:** 🟠 HIGH  
**Файл:** `options/options.ts` (рядки 164-172, метод `importConfig`)  
**Проблема:** Імпорт JSON конфігурації не перевіряє структуру — шкідливий/пошкоджений файл може зламати налаштування.  
**Що зробити:**
1. Створи інтерфейс/типи для валідації (`OptionsState`, `db`)
2. Додай функцію `validateImportedConfig(imported: any): boolean`
3. Перевір: наявність `db` та `syh_options`, типи полів, відсутність невідомих ключів
4. При помилці — `alert('Некоректний формат конфігурації')` і не застосовувати

**Критерії готовності:**
- [ ] Валідація структури `db` (newTitleSS, newTitlePreach — string)
- [ ] Валідація структури `syh_options` (всі 7 полів, правильні типи)
- [ ] Відхилення файлів з додатковими/невідомими ключами
- [ ] Тест: імпорт валідного JSON працює, невалідний — відхиляється

---

### Задача H3 — Виправити stale array index при видаленні молитов у попапі
**Пріоритет:** 🟠 HIGH  
**Файл:** `popup/popup_prayers.js` (рядки 193, 217, 343 — `data-index`)  
**Проблема:** Кнопки видалення використовують індекс масиву (`data-index`). При видаленні елемента індекси зсуваються — видаляється не той елемент.  
**Що зробити:**
1. При рендерингу (`renderPrayers`) генеруй унікальний ID для кожного елемента: `item.id = item.id || Date.now() + '_' + Math.random().toString(36).substr(2, 9)`
2. Заміни `data-index` на `data-id` у всіх кнопках (`.del-prayer-btn`, `.del-author-btn`)
3. У обробниках кліку шукай елемент за `id`, а не за індексом
4. При збереженні в storage — зберігай `id` разом з даними

**Критерії готовності:**
- [ ] Кожен елемент масиву `syh_prayers` має унікальне поле `id`
- [ ] Видалення автора (`.del-author-btn`) працює за `data-author-id`
- [ ] Видалення окремого прохання (`.del-prayer-btn`) працює за `data-prayer-id`
- [ ] Порядок елементів не впливає на правильність видалення

---

### Задача H4 — Виправити floating-point parsing sub-index у popup_telegram.js
**Пріоритет:** 🟠 HIGH  
**Файл:** `popup/popup_telegram.js` (пошук `fid % 1` або подібного)  
**Проблема:** Парсинг sub-index через `fid % 1` дає IEEE-754 артефакти (наприклад, `1.1 % 1 = 0.099999...`).  
**Що зробити:**
1. Знайди місце, де парситься `fid` (ймовірно рядок типу `"8.1"`)
2. Заміни на: `const parts = String(fid).split('.'); const main = parts[0]; const sub = parts[1] || ''`
3. Або `Math.round(fid * 10) % 10` для однозначного sub-index

**Критерії готовності:**
- [ ] Парсинг `"8.1"` дає `main=8, sub=1`
- [ ] Парсинг `"8"` дає `main=8, sub=''`
- [ ] Жодних floating-point артефактів

---

### Задача H5 — Додати закриття модалки аналітики по Escape та клік по backdrop
**Пріоритет:** 🟠 HIGH  
**Файл:** `modules/stats_exporter.ts` (рядки 71-80, метод `showModal`)  
**Проблема:** Модальне вікно графіків не закривається по Escape або клік по фону — тільки кнопка ×.  
**Що зробити:**
1. Додай `keydown` listener на `document` для Escape
2. Додай клік по модальному оверлею (backdrop) для закриття
3. При закритті — cleanup: видали listener, знищ Chart.js instance

**Критерії готовності:**
- [ ] Escape закриває модалку
- [ ] Клік по фоні (поза контентом) закриває модалку
- [ ] Клік по контенту НЕ закриває (stopPropagation)
- [ ] Chart.js instance знищується при закритті

---

### Задача H6 — Розв'язати зв'язок state.ts ↔ SYH_UTILS для дати
**Пріоритет:** 🟠 HIGH  
**Файл:** `modules/state.ts` (рядки 25, 100 — виклик `SYH_UTILS.getTodayDateString()`)  
**Проблема:** `state.ts` безпосередньо залежить від `SYH_UTILS` для отримання дати — це порушує separation of concerns.  
**Що зробити (варіант А — рекомендований):**
1. Додай `getTodayDateString` як метод у `SYH_STATE` (або приватну функцію в модулі)
2. Або передай дату як параметр в `init()` та `saveStateImmediate()`
3. Використовуй `new Date().toLocaleDateString('sv-SE')` безпосередньо в state

**Критерії готовності:**
- [ ] `state.ts` НЕ імпортує `SYH_UTILS`
- [ ] Дата генерується всередині state або передається ззовні
- [ ] Тести `state.test.js` прходять (mock дати працює)

---

## 🟡 MEDIUM — Технічний борг (планово)

### Задача M1 — Продовжити міграцію на TypeScript
**Пріоритет:** 🟡 MEDIUM  
**Файли:** `modules/*.ts` (залишилось 15/17 модулів)  
**План:** Поступово конвертуй `.js` → `.ts` з типами:
1. `parsers.ts` (простий, чисті функції)
2. `i18n.ts` (вже .ts)
3. `anti_afk.ts` (вже .ts)
4. `utils.ts` → `utils.ts` (rename, додай типи)
5. `ui_core.ts`, `ui_comments.ts`, `ui_banners.ts`
6. `event_comments.ts`, `event_banners.ts`
7. `stats_exporter.ts`, `stats_tracker.ts`
8. Решта

**Критерії готовності:**
- [ ] `npm run build` прходить без помилок типізації
- [ ] IDE підказки працюють для конвертованих модулів

---

### Задача M2 — Замінити jQuery на нативний DOM API (де можливо)
**Пріоритет:** 🟡 MEDIUM  
**Файли:** `modules/*.ts`, `popup/*.js`  
**Примітка:** Аудит прийняв рішення — jQuery залишається, але 95% потреб покриває нативний DOM.  
**План:** Поступово заміняй:
- `$(sel)` → `document.querySelectorAll(sel)`
- `$el.find(sel)` → `el.querySelectorAll(sel)`
- `$el.text()` → `el.textContent`
- `$el.prop('checked', v)` → `el.checked = v`
- `$el.on('event', fn)` → `el.addEventListener('event', fn)`

**Критерії готовності:**
- [ ] Кожен PR — один файл/модуль
- [ ] Функціональність не зламана (тести прходять)

---

### Задача M3 — Уніфікувати патерн лінивого i18n у config.ts
**Пріоритет:** 🟡 MEDIUM  
**Файл:** `modules/config.ts` (рядки 49-51, getter `timerOffTextResult`)  
**Проблема:** Один селектор — getter, що викликає `chrome.i18n` при кожному зверненні. Інші — статичні строки.  
**Що зробити:**
1. Або зроби всі i18n-селектори геттерами
2. Або винеси i18n-ключі в окремий об'єкт, а в SELECTORS — лише ключі
3. Рекомендовано: `SELECTORS.timerOffTextKey = 'timerOff'`, а резолвинг — в UI модулі

**Критерії готовності:**
- [ ] Консистентний патерн для всіх локалізованих селекторів/текстів
- [ ] Без викликів `chrome.i18n` в конфігурації

---

### Задача M4 — Зробити залежність storage в utils.ts явною
**Пріоритет:** 🟡 MEDIUM  
**Файл:** `modules/utils.ts` (рядок 292: `(window as any).SYH_UTILS = SYH_UTILS` + `storage` getter)  
**Проблема:** `SYH_UTILS.storage` — getter, що читає з `window.SYH_STORAGE` — неявна залежність.  
**Що зробити:**
1. Додай `setStorage(adapter)` метод у `SYH_UTILS`
2. Викликай `SYH_UTILS.setStorage(SYH_STORAGE)` в `main.ts` при ініціалізації
3. Прибери присвоєння в `window`

**Критерії готовності:**
- [ ] `utils.ts` не читає `window.SYH_STORAGE`
- [ ] Storage передається явно при ініціалізації
- [ ] Тести працюють (mock storage передається в тестах)

---

## ✅ ВИКОНАНО (в цьому аудиті — лише документування)

- [x] Незалежний аудит кодової бази
- [x] Створено звіт: `2026-07-28_Nemotron_AUDIT.md`
- [x] Створено список задач: `2026-07-28_Nemotron_TASKS.md`
- [x] Цей файл задач для AI-агентів

---

## 📋 Як працювати з цими задачами

1. **Одне завдання за раз** — давай агенту одну задачу (H1, потім H2, тощо)
2. **Повний контекст** — агент читає вказаний файл, розуміє проблему, робить фікс
3. **Перевірка** — після кожної задачі: `npm run lint && npm test && npm run build`
4. **Коміт** — лише якщо всі перевірки пройшли
5. **Наступна задача** — тільки після готовності попередньої

---

## 🔗 Корисні посилання у коді

| Модуль | Головний файл | Тести |
|--------|---------------|-------|
| Storage | `modules/storage.ts` | — |
| State | `modules/state.ts` | `tests/state.test.js` |
| Utils | `modules/utils.ts` | `tests/utils.test.js` |
| UI Core | `modules/ui_core.ts` | — |
| UI Comments | `modules/ui_comments.ts` | — |
| UI Banners | `modules/ui_banners.ts` | — |
| Event Comments | `modules/event_comments.ts` | — |
| Event Banners | `modules/event_banners.ts` | — |
| Stats Exporter | `modules/stats_exporter.ts` | — |
| Anti-AFK | `modules/anti_afk.ts` | `tests/anti_afk.test.js` |
| Parsers | `modules/parsers.ts` | `test_parsers.js` |
| Service Worker | `background/service-worker.ts` | — |
| Options | `options/options.ts` | — |
| Popup Prayers | `popup/popup_prayers.js` | — |
| Popup Telegram | `popup/popup_telegram.js` | — |

---

*Згенеровано на основі незалежного аудиту 2026-07-28. Жодних попередніх документів не використовувалося.*