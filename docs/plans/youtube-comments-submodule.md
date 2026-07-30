# YouTube Comments Sub-Module — План Впровадження

> **Дата створення:** 2026-07-30
> **Підмодуль до:** Вкладка Телеграм у попапі
> **Тип:** YouTube Watch (перегляд відео)
> **Майбутнє розширення:** YouTube Studio (окремий підмодуль)

---

## Мета

Створити підмодуль "YouTube Watch" для Chrome-розширення, який додає до коментарів YouTube:
- Кнопки **"Додати до питань"** / **"Додати до молитов"** з персистентним станом
- **Чекбокси** прочитано/не прочитано (зберігаються між сесіями, очищуються через місяць)
- **Копіювання** тексту + автора (одна кнопка, як у Streamyard)
- **Хайлайт тригерних слів** (спільний модуль із Streamyard — `"вопрос"` тощо)
- **ПКМ-блокування** контекстного меню → тогл чекбоксу (як у Streamyard)
- **Перемикач** увімкнення/вимкнення всієї YouTube-функціональності

Інтеграція з попапом: **дві колонки** на кроці 3 вкладки Телеграм — ліва (ручний ввід) та права (YouTube-коментарі), з ресайзабельною межею, трьома групами лічильників та розширеною статистикою обробки.

---

## Вирішені питання

| # | Питання | Рішення |
|---|---|---|
| Q1 | Розташування кнопок "Додати до..." | **Навпроти нікнейма** — кнопки розміщуються у `#header-author` поруч із ніком автора |
| Q2 | Формат правої колонки попапу | **Картки** — інтерактивні картки (автор, текст, тип, можливість видалення) |
| Q3 | "Скопійовано" — clipboard? | **Так, в буфер обміну** — кнопка 📄 копіює автора і коментар у clipboard |
| Q4 | Збільшити ширину попапу? | **Так** — збільшити для комфортних двох колонок |

---

## Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Scripts                           │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │   main.ts        │    │ youtube/youtube_content.ts    │    │
│  │  (Streamyard)    │    │     (YouTube Watch)           │    │
│  └───────┬──────────┘    └──────────┬───────────────────┘    │
│          │                          │                        │
│          ▼                          ▼                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Shared Modules                          │    │
│  │  modules/storage.ts  (SYH_STORAGE)                   │    │
│  │  modules/comment_assistant.ts  (Highlight Engine)     │    │
│  │  modules/state.ts  (SYH_STATE)                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  YouTube-Specific Modules:                                   │
│  youtube/yt_selectors.ts  — DOM-селектори YouTube            │
│  youtube/yt_ui.ts         — Кнопки, чекбокси, копіювання     │
│  youtube/yt_events.ts     — Обробники подій                  │
│  youtube/youtube_styles.css — Стилі для YouTube              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Popup                                   │
│  popup/popup_telegram.js  — розширений обробкою правої       │
│                             колонки (YouTube-коментарі)      │
│  popup/popup.html         — дві колонки на кроці 3           │
│  popup/popup.css          — ресайзер, нові стилі             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Options                                  │
│  options/options.html  — перемикач YouTube                    │
│  options/options.ts    — збереження/завантаження тогла        │
└─────────────────────────────────────────────────────────────┘
```

---

## Storage Keys (Нові)

| Ключ | Формат | Призначення |
|---|---|---|
| `syh_yt_collected` | `Array<{id, author, text, type, timestamp, videoId}>` | Зібрані коментарі з YouTube для правої колонки попапу |
| `syh_yt_button_states` | `Record<commentId, 'question'\|'prayer'>` | Стан кнопок "Додано до питань"/"Додано до молитов" — для відображення після перезавантаження |
| `syh_yt_checkbox_state` | `Record<commentId, {checked: boolean, timestamp: number}>` | Стан чекбоксів YouTube-коментарів з часовою позначкою для 30-денного очищення |
| `syh_options.youtube_enabled` | `boolean` | Перемикач YouTube-функціональності |
| `syh_popup_divider_pos` | `number` (відсоток, 0-100) | Позиція розділювача між колонками у попапі |

---

## Proposed Changes

---

### Компонент 1: Manifest

#### [MODIFY] manifest.json

Зміни:
- Додати `*://*.youtube.com/*` до `host_permissions`
- Додати новий `content_scripts` запис для YouTube з окремим entry-point та стилями
- Додати YouTube-стилі до `web_accessible_resources`

```diff
  "host_permissions": [
-   "https://streamyard.com/*"
+   "https://streamyard.com/*",
+   "*://*.youtube.com/*"
  ],

  "content_scripts": [
    {
      "matches": ["https://streamyard.com/*"],
      "css": ["styles.css"],
      "js": ["main.ts"]
+   },
+   {
+     "matches": ["*://*.youtube.com/*"],
+     "css": ["youtube/youtube_styles.css"],
+     "js": ["youtube/youtube_content.ts"]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "Release_notes.md",
        "Daily_tips.md",
        "lib/chart.js"
      ],
-     "matches": ["https://streamyard.com/*"]
+     "matches": ["https://streamyard.com/*", "*://*.youtube.com/*"]
    }
  ],
```

---

### Компонент 2: YouTube Content Script (Новий)

#### [NEW] youtube/yt_selectors.ts

DOM-селектори для YouTube Watch:

```typescript
export const YT_SELECTORS = {
    commentsContainer: 'ytd-item-section-renderer #contents',
    commentBlock: 'ytd-comment-thread-renderer',
    commentText: '#content-text',
    commentAuthor: '#author-text span',
    headerAuthor: '#header-author',        // куди вставляти кнопки "Додати до..."
    toolbar: 'ytd-comment-engagement-bar #toolbar',
    commentLink: '#published-time-text a',
    commentBody: '#body',
    mainContent: 'ytd-comments',
};
```

#### [NEW] youtube/yt_ui.ts

UI-модуль для ін'єкції кнопок та чекбоксів у YouTube-коментарі:

- **`addButtonsToYTComment(commentNode)`**: Додає до кожного `ytd-comment-thread-renderer`:
  - У зону `#header-author` (навпроти нікнейма):
    - Кнопку **"Додати до питань"** (стан: початковий → "Скопійовано" → "Додано до питань")
    - Кнопку **"Додати до молитов"** (стан: початковий → "Скопійовано" → "Додано до молитов")
  - Плаваючу кнопку 📄 (копіювання `@автор\n\nтекст` у clipboard)
  - Чекбокс (справа, стиль як у Streamyard)

- **`extractCommentId(commentNode)`**: Витягує ID коментаря з `lc=` параметра URL:
  ```
  /watch?v=VaHtjpTbv9o&lc=UgwdWklUmhc_3qdcYZN4AaABAg
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  ```

- **`restoreButtonState(commentNode, commentId)`**: Відновлює стан кнопок із `syh_yt_button_states`

- **`restoreCheckboxState(commentNode, commentId)`**: Відновлює стан чекбоксу з `syh_yt_checkbox_state`

#### [NEW] youtube/yt_events.ts

Обробники подій для YouTube-коментарів:

- **"Додати до питань" click**:
  1. Копіює `@автор\n\nтекст` у буфер обміну (clipboard)
  2. Зберігає `{id, author, text, type: 'question', timestamp, videoId}` у `syh_yt_collected`
  3. Оновлює `syh_yt_button_states[commentId] = 'question'`
  4. Анімація: текст кнопки → "Скопійовано" (1.5с) → "Додано до питань" (перманентно)
  5. Автоматично ставить чекбокс

- **"Додати до молитов" click**: Аналогічно, але `type: 'prayer'`

- **📄 click**: `navigator.clipboard.writeText('@автор\n\nтекст')`, візуальне підтвердження

- **Checkbox change**: Зберігає у `syh_yt_checkbox_state` з `timestamp: Date.now()`

- **ПКМ на `#body` (тіло коментаря)**:
  - `e.preventDefault()` + `e.stopPropagation()` — блокує контекстне меню
  - Тоглить чекбокс (checked ↔ unchecked)

#### [NEW] youtube/youtube_content.ts

Головний entry-point YouTube content script:

```
1. Перевіряє налаштування `syh_options.youtube_enabled`
2. Якщо вимкнено — виходить (нічого не ін'єктує)
3. Ініціалізує SYH_STORAGE
4. Завантажує syh_yt_button_states та syh_yt_checkbox_state в пам'ять
5. Ініціалізує SYH_COMMENT_ASSISTANT з YT_SELECTORS
6. Створює MutationObserver на ytd-comments / #contents
7. Для кожного нового ytd-comment-thread-renderer:
   a. addButtonsToYTComment(node)
   b. SYH_COMMENT_ASSISTANT.processComment(node)  // хайлайт
   c. restoreButtonState(node)
   d. restoreCheckboxState(node)
8. Обробляє вже завантажені коментарі
9. Слухає chrome.storage.onChanged для реактивного оновлення toggle
```

#### [NEW] youtube/youtube_styles.css

Стилі для YouTube-ін'єкцій:

- `.syh-yt-buttons` — контейнер кнопок
- `.syh-yt-btn-question`, `.syh-yt-btn-prayer` — кнопки дій
- `.syh-yt-btn-question[data-state="added"]` — перманентний стан (зелений)
- `.syh-yt-btn-prayer[data-state="added"]` — перманентний стан (фіолетовий)
- `.syh-yt-btn-copy` — плаваюча кнопка копіювання
- `.syh-yt-checkbox` — чекбокс 24×24
- `mark.syh-trigger-highlight` — той самий жовтий хайлайт, що й у Streamyard
- `user-select: none` на тілі коментаря (для ПКМ)

---

### Компонент 3: Shared Modules (Модифікація)

#### [MODIFY] modules/comment_assistant.ts

Мінімальні зміни для сумісності з YouTube:
- `processComment()` вже приймає довільний `commentBlock` і шукає текстовий вузол через `this.selectors.commentText`
- Для YouTube ініціалізується з YouTube-селекторами
- Можливо потрібна адаптація для Shadow DOM / Web Components YouTube

#### [MODIFY] modules/config.ts

- Додати `YOUTUBE_SELECTORS` або: YouTube content script створює свій конфіг, імпортуючи тільки `TRIGGER_WORDS`

---

### Компонент 4: Options (Перемикач YouTube)

#### [MODIFY] options/options.html

Додати у секцію "UI & Limits" (`#section-ui`):

```html
<div class="option-group">
    <label class="toggle-label" for="optYouTubeEnabled">
        <input type="checkbox" id="optYouTubeEnabled" checked>
        <span>YouTube коментарі (кнопки, хайлайт, чекбокси)</span>
    </label>
    <small class="option-hint">Вмикає функціональність розширення на YouTube</small>
</div>
```

#### [MODIFY] options/options.ts

- Додати `youtube_enabled: true` до `DEFAULT_OPTIONS`
- Обробка збереження/завантаження нового тогла

---

### Компонент 5: Popup — Дві колонки на кроці 3

#### [MODIFY] popup/popup.html

Крок 3 перетворюється на двоколонковий layout:

```html
<!-- КРОК 3: Дві колонки -->
<div class="input-group">
    <label class="section-title">
        3. Новий список:
        <span id="tgTotalCountAll" class="counter-badge counter-total"></span>
        <span id="tgTotalCountLeft" class="counter-badge counter-left"></span>
        <span id="tgTotalCountRight" class="counter-badge counter-right"></span>
    </label>
    <div class="step3-columns" id="step3Columns">
        <!-- ЛІВА КОЛОНКА: Ручний ввід (Telegram) -->
        <div class="step3-col step3-col-left" id="step3Left">
            <div class="col-header">📝 Telegram (ручний ввід)</div>
            <textarea id="newTelegram" placeholder="Вставте нові питання з Телеграму..."
                      aria-label="Нові питання з Телеграму"></textarea>
        </div>

        <!-- РЕСАЙЗЕР -->
        <div class="step3-divider" id="step3Divider"
             title="Перетягніть для зміни розміру"></div>

        <!-- ПРАВА КОЛОНКА: YouTube коментарі -->
        <div class="step3-col step3-col-right" id="step3Right">
            <div class="col-header">
                🎬 YouTube
                <button id="clearYTCollected" class="col-header-btn"
                        title="Очистити зібрані">🗑</button>
            </div>
            <div id="ytCollectedList" class="yt-collected-list"
                 aria-label="Зібрані коментарі з YouTube"></div>
        </div>
    </div>
</div>
```

#### [MODIFY] popup/popup.css

Нові CSS-змінні та стилі:

```css
/* YouTube / Права колонка (Фіолетовий) */
--yt-h: 271;
--yt-s: 76%;
--yt-l: 95%;
--yt-color: hsl(var(--yt-h), var(--yt-s), var(--yt-l));
--yt-border: hsl(var(--yt-h), var(--yt-s), 45%);    /* #9b59b6 */
--yt-text: hsl(var(--yt-h), var(--yt-s), 15%);
```

Основні стилі:
- `.step3-columns` — `display: flex; height: 200px;`
- `.step3-col-left` — `flex: var(--left-flex, 1); min-width: 120px;`
- `.step3-col-right` — `flex: var(--right-flex, 1); min-width: 120px;`
- `.step3-divider` — `width: 6px; cursor: col-resize; background: #555; border-radius: 3px;`
- `.yt-collected-list` — `overflow-y: auto; height: 100%;`
- `.yt-collected-item` — Картка (автор, текст, бейдж типу, кнопка видалення)
- `.yt-collected-item.is-question` — Лівий бордер зелений
- `.yt-collected-item.is-prayer` — Лівий бордер фіолетовий
- `.counter-total` (синій), `.counter-left` (зелений), `.counter-right` (фіолетовий)
- `.stat-item.new-yt` — фіолетовий тон для YouTube-статистики
- Збільшена ширина body для двох колонок

#### [MODIFY] popup/popup_telegram.js

Основні зміни:

1. **`loadYTCollected()`** — завантажує `syh_yt_collected`, рендерить картки у `#ytCollectedList`

2. **`updateRightColumnStats()`** — рахує питання/молитви у правій колонці

3. **`updateCombinedCounters()`** — оновлює 3 групи лічильників:
   - `#tgTotalCountAll` — сума лівої + правої
   - `#tgTotalCountLeft` — лише ліва
   - `#tgTotalCountRight` — лише права

4. **`processTelegramData()` — розширення**:
   - Зчитує `syh_yt_collected`
   - Конвертує YouTube-коментарі у формат keycap-нумерації
   - `combinedQuestions = [...oldQ, ...newLeftQ, ...newYTQ]`
   - YouTube-коментарі отримують CSS-клас `.q-yt` (фіолетовий тон)

5. **Статистика — 5 елементів** замість 4:

   | # | ID | Текст | Колір |
   |---|---|---|---|
   | 1 | `#countOld` | Залишилось старих: X люд. - Y пит. | Жовтий |
   | 2 | `#countDel` | Видалено: X люд. - Y пит. | Червоний |
   | 3 | `#countNewLeft` | Нові з лівої: X люд. - Y пит. | Зелений |
   | 4 | `#countNewYT` | Нові з YouTube: X люд. - Y пит. | **Фіолетовий** |
   | 5 | `#countTotal` | Разом: X люд. - Y пит. | Синій |

6. **Ресайзер логіка**:
   - `mousedown` → `mousemove` → `mouseup`
   - Зберігає `syh_popup_divider_pos` у `chrome.storage.local`
   - Відновлює при відкритті попапу

7. **30-денне очищення чекбоксів** (при натисканні "Обробити список"):
   - Зчитує `syh_yt_checkbox_state`
   - Фільтрує записи, де `Date.now() - entry.timestamp > 30 днів`
   - Зберігає очищений стан

8. **`chrome.storage.onChanged` listener**: Реактивне оновлення правої колонки

#### [MODIFY] popup/popup_init.js

- Завантаження `syh_popup_divider_pos` при ініціалізації
- Завантаження `syh_yt_collected` для правої колонки
- Ініціалізація ресайзер-логіки

---

### Компонент 6: Vite Build Config

#### [MODIFY] vite.config.js

- Перевірити, чи `@crxjs/vite-plugin` автоматично обробляє додатковий content script з `manifest.json`
- Якщо ні — додати `youtube/youtube_content.ts` як окремий input у rollup options

---

## YouTube Comment ID — Метод ідентифікації

Кожен YouTube-коментар має унікальний ID у параметрі `lc=` посилання:

```
/watch?v=VaHtjpTbv9o&lc=UgwdWklUmhc_3qdcYZN4AaABAg
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                          Унікальний ID коментаря
```

Цей ID: стабільний між перезавантаженнями, унікальний глобально, доступний через DOM.

---

## Колірна схема

| Елемент | Колір | Hex | Використання |
|---|---|---|---|
| Telegram / Ліва колонка | Зелений | `#27ae60` | "Нові з лівої" |
| YouTube / Права колонка | Фіолетовий | `#9b59b6` | "Нові з YouTube" |
| YouTube prayer badge | Фіолетовий світлий | `rgba(155, 89, 182, 0.15)` | Фон картки молитви |
| YouTube question badge | Зелений світлий | `rgba(39, 174, 96, 0.15)` | Фон картки питання |
| Хайлайт тригерів | Жовтий | `#ffe066` | Спільний (Streamyard + YouTube) |

---

## Структура нових файлів

```
youtube/
├── youtube_content.ts      # Entry point для YouTube content script
├── youtube_styles.css       # Стилі для YouTube-ін'єкцій
├── yt_selectors.ts          # DOM-селектори YouTube
├── yt_ui.ts                 # UI: кнопки, чекбокси, копіювання
└── yt_events.ts             # Обробники подій
```

---

## Порядок Імплементації

1. 🔧 **Manifest + Vite config** — базова інфраструктура
2. 🎯 **YouTube selectors + content script skeleton** — entry point
3. 🖼️ **YouTube UI (кнопки, чекбокси, копіювання)** — візуальна частина
4. ⚡ **YouTube events (click, RMB, checkbox)** — інтерактивність
5. 🔍 **Highlight integration** — хайлайт тригерних слів
6. ⚙️ **Options toggle** — перемикач YouTube
7. 📊 **Popup: дві колонки + ресайзер** — layout
8. 📈 **Popup: лічильники + обробка** — інтеграція з processing
9. 🧹 **30-денне очищення** — cleanup logic
10. ✅ **Тестування + збірка** — verification

---

## Verification Plan

### Automated Tests
```bash
npm run build    # Перевірка збірки з новим content script
npm run test     # Існуючі тести не повинні зламатись
```

### Manual Verification

1. **YouTube Content Script**:
   - Відкрити YouTube відео з коментарями
   - Кнопки навпроти нікнейма: "Додати до питань" / "Додати до молитов"
   - Натиснути → "Скопійовано" (1.5с) → "Додано до питань" (перманентно)
   - Перезавантажити → кнопка показує "Додано до питань"
   - ПКМ на тілі коментаря → контекстне меню заблоковано, чекбокс тоглиться
   - 📄 копіює автора+текст у clipboard
   - Хайлайт "вопрос" працює

2. **Попап — Дві колонки**:
   - Крок 3 має дві колонки з ресайзером
   - Позиція ресайзера зберігається між відкриттями
   - YouTube-коментарі відображаються як картки у правій колонці
   - Три групи лічильників: загальні, ліва, права

3. **Обробка**:
   - "Обробити список" → 5 елементів статистики
   - YouTube-коментарі включені у фінальний результат (фіолетовий тон)
   - 30-денне очищення чекбоксів спрацьовує

4. **Перемикач**:
   - Вимкнути YouTube в налаштуваннях → нічого на YouTube не ін'єктується
   - Увімкнути → функціональність відновлюється
