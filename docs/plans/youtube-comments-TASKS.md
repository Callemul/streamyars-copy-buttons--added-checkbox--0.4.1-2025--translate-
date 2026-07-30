# YouTube Comments Sub-Module — Список Задач для ШІ

> **Створено:** 2026-07-30
> **На базі:** [youtube-comments-submodule.md](file:///d:/Chrome%20Extension/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/docs/plans/youtube-comments-submodule.md)
> **Модель:** Antigravity Claude Opus 4.6 Thinking

---

## Фаза 1: Manifest + Vite Config (Інфраструктура)

- [x] **1.1** Додати `*://*.youtube.com/*` до `host_permissions` у `manifest.json`
- [x] **1.2** Додати новий запис `content_scripts` для YouTube (`matches`, `css`, `js`) у `manifest.json`
- [x] **1.3** Оновити `web_accessible_resources` — додати `*://*.youtube.com/*` до `matches`
- [x] **1.4** Перевірити `vite.config.js` — чи `@crxjs/vite-plugin` підхоплює новий content script з manifest
- [x] **1.5** Якщо ні — додати `youtube/youtube_content.ts` як окремий input у rollup options
- [x] **1.6** Запустити `npm run build` — перевірити, що збірка проходить без помилок

---

## Фаза 2: YouTube Selectors + Content Script Skeleton

- [x] **2.1** Створити файл `youtube/yt_selectors.ts` з об'єктом `YT_SELECTORS`:
  - `commentsContainer`, `commentBlock`, `commentText`, `commentAuthor`
  - `headerAuthor`, `toolbar`, `commentLink`, `commentBody`, `mainContent`
- [x] **2.2** Створити файл `youtube/youtube_content.ts` (entry point):
  - Перевірка `syh_options.youtube_enabled` (якщо вимкнено — вихід)
  - Ініціалізація `SYH_STORAGE`
  - Завантаження `syh_yt_button_states` та `syh_yt_checkbox_state` у пам'ять
  - Створення `MutationObserver` на `ytd-comments / #contents`
  - Обробка вже існуючих коментарів при завантаженні
  - Слухач `chrome.storage.onChanged` для реактивного оновлення toggle
- [x] **2.3** Перевірити, що content script завантажується на YouTube (без функціональності, лише console.log)

---

## Фаза 3: YouTube UI (Кнопки, Чекбокси, Копіювання)

- [x] **3.1** Створити файл `youtube/yt_ui.ts`
- [x] **3.2** Реалізувати `addButtonsToYTComment(commentNode)`:
  - У зону `#header-author` навпроти нікнейма:
    - Кнопка **"Додати до питань"**
    - Кнопка **"Додати до молитов"**
  - Плаваюча кнопка 📄 (копіювання `@автор\n\nтекст`)
  - Чекбокс (справа, стиль як у Streamyard)
- [x] **3.3** Реалізувати `extractCommentId(commentNode)` — витягування ID з `lc=` параметра URL
- [x] **3.4** Реалізувати `restoreButtonState(commentNode, commentId)` — відновлення стану кнопок з `syh_yt_button_states`
- [x] **3.5** Реалізувати `restoreCheckboxState(commentNode, commentId)` — відновлення стану чекбоксу з `syh_yt_checkbox_state`

---

## Фаза 4: YouTube Events (Click, RMB, Checkbox)

- [x] **4.1** Створити файл `youtube/yt_events.ts`
- [x] **4.2** Обробник кліку **"Додати до питань"**:
  - Копіювання `@автор\n\nтекст` у clipboard
  - Збереження в `syh_yt_collected` (`{id, author, text, type: 'question', timestamp, videoId}`)
  - Оновлення `syh_yt_button_states[commentId] = 'question'`
  - Анімація тексту кнопки: → "Скопійовано" (1.5с) → "Додано до питань" (перманентно)
  - Автоматична установка чекбоксу
- [x] **4.3** Обробник кліку **"Додати до молитов"** — аналогічно з `type: 'prayer'`
- [x] **4.4** Обробник кліку **📄** — `navigator.clipboard.writeText('@автор\n\nтекст')` + візуальне підтвердження
- [x] **4.5** Обробник зміни **Checkbox** — збереження у `syh_yt_checkbox_state` з `timestamp: Date.now()`
- [x] **4.6** Обробник **ПКМ на `#body`** (тіло коментаря):
  - `e.preventDefault()` + `e.stopPropagation()` — блокування контекстного меню
  - Тогл чекбоксу (checked ↔ unchecked)

---

## Фаза 5: Highlight Integration (Хайлайт тригерних слів)

- [x] **5.1** Модифікувати `modules/comment_assistant.ts` для сумісності з YouTube-селекторами
- [x] **5.2** Перевірити/адаптувати `processComment()` для YouTube DOM (можлива адаптація для Shadow DOM / Web Components)
- [x] **5.3** Модифікувати `modules/config.ts` — забезпечити доступ до `TRIGGER_WORDS` з YouTube content script
- [x] **5.4** Ініціалізувати `SYH_COMMENT_ASSISTANT` з `YT_SELECTORS` у `youtube_content.ts`
- [x] **5.5** Перевірити, що хайлайт слова "вопрос" працює на YouTube-коментарях

---

## Фаза 6: Options Toggle (Перемикач YouTube)

- [x] **6.1** Додати у `options/options.html` (секція "UI & Limits") чекбокс `#optYouTubeEnabled` з лейблом та підказкою
- [x] **6.2** Додати `youtube_enabled: true` до `DEFAULT_OPTIONS` у `options/options.ts`
- [x] **6.3** Реалізувати збереження/завантаження нового тогла в `options/options.ts`
- [x] **6.4** Перевірити: вимкнути YouTube → нічого не ін'єктується; увімкнути → функціональність відновлюється

---

## Фаза 7: YouTube Styles

- [x] **7.1** Створити файл `youtube/youtube_styles.css`
- [x] **7.2** Стилі для `.syh-yt-buttons` (контейнер кнопок)
- [x] **7.3** Стилі для `.syh-yt-btn-question`, `.syh-yt-btn-prayer` (кнопки дій)
- [x] **7.4** Стилі для станів `[data-state="added"]` — зелений (питання) / фіолетовий (молитва)
- [x] **7.5** Стилі для `.syh-yt-btn-copy` (плаваюча кнопка копіювання)
- [x] **7.6** Стилі для `.syh-yt-checkbox` (чекбокс 24×24)
- [x] **7.7** Стилі для `mark.syh-trigger-highlight` (жовтий хайлайт — як у Streamyard)
- [x] **7.8** `user-select: none` на тілі коментаря (для ПКМ)

---

## Фаза 8: Popup — Дві колонки + Ресайзер (Layout)

- [x] **8.1** Модифікувати `popup/popup.html` — крок 3 перетворити на двоколонковий layout:
  - Ліва колонка: `#step3Left` (Telegram, ручний ввід, textarea)
  - Розділювач: `#step3Divider` (ресайзер)
  - Права колонка: `#step3Right` (YouTube-коментарі, `#ytCollectedList`, кнопка 🗑)
- [x] **8.2** Додати три групи лічильників у заголовок кроку 3:
  - `#tgTotalCountAll` (синій — загальні)
  - `#tgTotalCountLeft` (зелений — ліва)
  - `#tgTotalCountRight` (фіолетовий — права)
- [x] **8.3** Модифікувати `popup/popup.css` — CSS-змінні для YouTube/фіолетової колонки
- [x] **8.4** Стилі `.step3-columns` (flex layout, height)
- [x] **8.5** Стилі `.step3-col-left`, `.step3-col-right` (flex, min-width)
- [x] **8.6** Стилі `.step3-divider` (cursor: col-resize, background, border-radius)
- [x] **8.7** Стилі `.yt-collected-list` (overflow-y: auto)
- [x] **8.8** Стилі `.yt-collected-item` (картка: автор, текст, бейдж типу, кнопка видалення)
- [x] **8.9** Стилі `.yt-collected-item.is-question` (зелений бордер) / `.is-prayer` (фіолетовий бордер)
- [x] **8.10** Стилі лічильників: `.counter-total` (синій), `.counter-left` (зелений), `.counter-right` (фіолетовий)
- [x] **8.11** Збільшити ширину `body` попапу для двох колонок

---

## Фаза 9: Popup — Лічильники + Обробка (Інтеграція)

- [x] **9.1** Реалізувати `loadYTCollected()` у `popup/popup_telegram.js` — завантаження `syh_yt_collected`, рендеринг карток
- [x] **9.2** Реалізувати `updateRightColumnStats()` — підрахунок питань/молитов у правій колонці
- [x] **9.3** Реалізувати `updateCombinedCounters()` — оновлення 3 груп лічильників (загальні, ліва, права)
- [x] **9.4** Розширити `processTelegramData()`:
  - Зчитування `syh_yt_collected`
  - Конвертація YouTube-коментарів у формат keycap-нумерації
  - `combinedQuestions = [...oldQ, ...newLeftQ, ...newYTQ]`
  - CSS-клас `.q-yt` (фіолетовий тон) для YouTube-питань
- [x] **9.5** Розширити блок статистики до **5 елементів**:
  - `#countOld` — Залишилось старих (жовтий)
  - `#countDel` — Видалено (червоний)
  - `#countNewLeft` — Нові з лівої (зелений)
  - `#countNewYT` — **Нові з YouTube** (фіолетовий) ← НОВИЙ
  - `#countTotal` — Разом (синій)
- [x] **9.6** Реалізувати ресайзер-логіку:
  - `mousedown` → `mousemove` → `mouseup`
  - Збереження `syh_popup_divider_pos` у `chrome.storage.local`
  - Відновлення позиції при відкритті попапу
- [x] **9.7** Реалізувати **30-денне очищення чекбоксів** (при "Обробити список"):
  - Зчитування `syh_yt_checkbox_state`
  - Фільтрація: `Date.now() - entry.timestamp > 30 днів`
  - Збереження очищеного стану
- [x] **9.8** Додати `chrome.storage.onChanged` listener для реактивного оновлення правої колонки
- [x] **9.9** Модифікувати `popup/popup_init.js`:
  - Завантаження `syh_popup_divider_pos` при ініціалізації
  - Завантаження `syh_yt_collected` для правої колонки
  - Ініціалізація ресайзер-логіки

---

## Фаза 10: Тестування + Збірка (Verification)

- [x] **10.1** `npm run build` — перевірка збірки з новим content script
- [x] **10.2** `npm run test` — існуючі тести не повинні зламатись
- [x] **10.3** Ручна перевірка YouTube Content Script:
  - Кнопки навпроти нікнейма
  - Натиснення → "Скопійовано" → "Додано до питань/молитов"
  - Перезавантаження → стан кнопок зберігається
  - ПКМ → контекстне меню заблоковано, чекбокс тоглиться
  - 📄 копіює автора + текст
  - Хайлайт "вопрос" працює
- [x] **10.4** Ручна перевірка Попапу:
  - Крок 3: дві колонки з ресайзером
  - Позиція ресайзера зберігається
  - YouTube-коментарі у вигляді карток
  - Три групи лічильників
- [x] **10.5** Ручна перевірка Обробки:
  - "Обробити список" → 5 елементів статистики
  - YouTube-коментарі у фінальному результаті (фіолетовий тон)
  - 30-денне очищення спрацьовує
- [x] **10.6** Ручна перевірка Перемикача:
  - Вимкнути YouTube → нічого на YouTube не ін'єктується
  - Увімкнути → функціональність відновлюється

---

## Зведення

| Фаза | Опис | Кількість задач |
|---|---|---|
| 1 | Manifest + Vite Config | 6 |
| 2 | YouTube Selectors + Content Script | 3 |
| 3 | YouTube UI | 5 |
| 4 | YouTube Events | 6 |
| 5 | Highlight Integration | 5 |
| 6 | Options Toggle | 4 |
| 7 | YouTube Styles | 8 |
| 8 | Popup Layout | 11 |
| 9 | Popup Інтеграція | 9 |
| 10 | Тестування | 6 |
| **Разом** | | **63** |
