# Чекліст задач — YouTube Studio + 4 аркуші

## Phase 0 — Prereq
- [ ] Отримати handle `@...` каналу "Время перемен"
- [ ] Отримати handle `@...` каналу "Слово живое"
- [ ] Вписати їх у `modules/channel_config.ts`

## Phase 1 — Спільні модулі
- [ ] Створити `modules/sheets.ts` (SHEET_IDS, SHEET_LABELS, тип SheetId)
- [ ] Створити `modules/fuzzy_match.ts` (levenshtein, normalize, fuzzyIncludes) + unit-тест на кілька опечаток ("суботня школа", "СУБОТНЯЯ ШКОЛА", "опарін")
- [ ] Створити `modules/channel_config.ts` (whitelist handle'ів + канал→ключ мапа для Studio)

## Phase 2 — Channel gate (старий модуль)
- [ ] Створити `youtube/yt_channel_gate.ts` з `isAllowedChannel()`
- [ ] Інтегрувати виклик у `youtube/youtube_content.ts` перед `initYouTubeModule()`
- [ ] Перевірити: на каналі не з whitelist кнопки/чекбокси не інжектяться, observer не стартує
- [ ] Перевірити: на дозволеному каналі все працює як раніше

## Phase 3 — Popup: 4 аркуші
- [ ] Оновити `popup/popup.html`: під-вкладки (4 pill-кнопки) всередині `#tab-telegram`, перейменувати лейбл вкладки на "Telegram/YouTube Питання 🚀"
- [ ] Клонувати структуру блоку (oldList/answered/newTelegram+YouTube колонка/process/stats/result/logs) x4, id з суфіксом `__{sheetId}`
- [ ] Рефакторити `popup_telegram.js`: усі функції приймають `sheetId` (або `$scope`), event-биндинги через делегування/`data-sheet`
- [ ] Рефакторити `popup_init.js`: завантаження/збереження всіх 4 sheetId в циклі, збереження/відновлення активної під-вкладки (`tg_active_subtab`)
- [ ] Стилі для під-вкладок у `popup.css` (клон `.tabs`, менший розмір/відступи)
- [ ] Переконатись, що ResizeObserver/scroll-save/divider-resizer коректно працюють по кожному з 4 аркушів окремо (`syh_popup_divider_pos__{sheetId}`)
- [ ] Правий YouTube-стовпчик аркуша `vp_ss` показує `syh_yt_collected` (старий модуль), інші 3 аркуші — тільки `syh_collected__{sheetId}` (Studio)
- [ ] Прогнати наявні тести (`tests/state.test.js`, `tests/comment_assistant.test.js` та ін.), поправити під нову сигнатуру функцій
- [ ] Ручне тестування: заповнити/обробити/скопіювати в усіх 4 аркушах незалежно, переконатись немає крос-забруднення даних між аркушами

## Phase 4 — Options
- [ ] Перейменувати підпис `optYouTubeEnabled` → "Увімкнути старий YouTube-модуль (2 канали)"
- [ ] Додати новий тумблер `optStudioEnabled` + секцію "YouTube Studio" в `options.html`
- [ ] Показати read-only список дозволених каналів (з `channel_config.ts`)
- [ ] Таблиця останніх записів `syh_studio_manual_override_log` + кнопка "Скопіювати лог" (буфер обміну, читабельний формат) + "Очистити лог"
- [ ] Реалізувати читання/запис `syh_studio_enabled` в `options.ts`

## Phase 5 — Studio-модуль: базова інфраструктура
- [ ] `youtube/studio/studio_selectors.ts` — селектори з прикладу HTML в ТЗ (у т.ч. зона тексту коментаря для ПКМ і контейнер відео-мініатюри для Badge+чекбокса)
- [ ] `youtube/studio/studio_channel.ts` — визначення `channelKey` з `#entity-name`/href
- [ ] `youtube/studio/studio_category_matcher.ts` — `matchCategory()` на базі fuzzy_match
- [ ] `youtube/studio/studio_video_map.ts` — get/set `syh_studio_video_sheet_map`, генерація `videoKey` (href || title)
- [ ] `youtube/studio/studio_comment_key.ts` — хеш (відео+автор+текст) + функція 30-денної автоочистки, що працює як для `syh_studio_button_state`, так і для `syh_studio_checkbox_state`

## Phase 5b — Studio-модуль: UI (кнопки, Badge, чекбокс)
- [ ] `studio_ui.ts`: інжект 3 кнопок (копі/питання/молитва) у `#toolbar`
- [ ] `studio_ui.ts`: інжект Badge під `#video-title` (текст назви аркуша або "Категорію не визначено")
- [ ] `studio_ui.ts`: Badge-dropdown (4 аркуші + "Скинути до авто")
- [ ] `studio_ui.ts`: **інжект чекбокса поруч із Badge** (той самий wrapper-контейнер під відео-мініатюрою коментаря)
- [ ] Динамічні tooltips для кнопок питання/молитва (звичайний стан / "Відправлено до …")
- [ ] Візуальний стан "прочитано" — клас `.syh-studio-comment-checked` на comment-thread при `checked = true`
- [ ] `studio_styles.css` — стилі кнопок/Badge/dropdown/чекбокса в стилі існуючого `youtube_styles.css`

## Phase 5c — Studio-модуль: події та persistence
- [ ] `studio_events.ts`: click "копіювати" → буфер обміну (автор + текст)
- [ ] `studio_events.ts`: click "додати до питань/молитов" → якщо sheet не resolved, блокувати дію + підсвітити/відкрити Badge-dropdown замість додавання
- [ ] `studio_events.ts`: успішне додавання → запис у `syh_collected__{sheetId}`, стан кнопки → `syh_studio_button_state`
- [ ] `studio_events.ts`: click в Badge-dropdown → оновити `syh_studio_video_sheet_map`, дописати запис у `syh_studio_manual_override_log`, ретроактивно оновити Badge/кнопки для вже відрендерених коментарів цього відео
- [ ] `studio_events.ts`: click по чекбоксу → toggle + запис у `syh_studio_checkbox_state[commentKey]`
- [ ] `studio_events.ts`: **contextmenu (ПКМ)** на зоні тексту коментаря (`#expander-container`/`#content-text`) → `preventDefault()` + виклик того самого toggle-обробника, що й клік по чекбоксу
- [ ] Відновлення стану чекбокса при (ре-)рендері рядка коментаря (в т.ч. після recycle віртуалізованого списку `tp-yt-iron-list`)
- [ ] `studio_content.ts`: перевірка `location.pathname.includes('/comments/')` перед стартом
- [ ] `studio_content.ts`: MutationObserver на список коментарів (`#items`)
- [ ] `studio_content.ts`: обробка SPA-навігації (`history.pushState`/`popstate` або polling) — старт/стоп модуля при вході/виході з `/comments/`
- [ ] `studio_content.ts`: читання `syh_studio_enabled` з storage, реакція на зміну (onChanged) — миттєве вмикання/вимикання без перезавантаження сторінки

## Phase 6 — Manifest & збірка
- [ ] Додати `"https://studio.youtube.com/*"` в `host_permissions`
- [ ] Додати новий блок `content_scripts` для Studio в `manifest.json`
- [ ] `npm run build`, перевірити відсутність помилок vite/crxjs
- [ ] `npm run lint`, поправити помилки

## Phase 7 — Ручне QA (на реальних каналах)
- [ ] Studio: перевірити правильне визначення каналу на обох каналах
- [ ] Studio: перевірити auto-категоризацію на реальних назвах відео (включно з опечатками/регістром)
- [ ] Studio: перевірити ручний перевибір аркуша через Badge + що лог коректно записується і копіюється
- [ ] Studio: перевірити збереження стану кнопок питання/молитва після перезавантаження сторінки/навігації
- [ ] Studio: **перевірити, що чекбокс тогглиться ПКМ по тексту коментаря і звичайним кліком по самому чекбоксу**
- [ ] Studio: **перевірити збереження стану чекбокса після перезавантаження сторінки/навігації**
- [ ] Studio: перевірити, що ПКМ на тексті коментаря не ламає інші елементи керування (не блокує ПКМ біля кнопок/автора)
- [ ] Studio: перевірити коректність стану після recycle рядків у віртуалізованому списку (проскролити довгий список коментарів туди-сюди)
- [ ] Studio: перевірити 30-денне автоочищення (можна форсувати тестовим timestamp у storage)
- [ ] Popup: перевірити всі 4 аркуші незалежно — введення/обробка/копіювання/логи не змішуються між аркушами
- [ ] Popup: перевірити, що правий стовпчик аркуша "Время перемен СШ" коректно показує `syh_yt_collected` зі старого модуля, а інші 3 аркуші — лише свій `syh_collected__{sheetId}`
- [ ] Options: перевірити перемикання обох тумблерів (старий модуль / Studio), перевірити, що вимкнення справді зупиняє відповідний модуль на сторінці без перезавантаження
- [ ] Options: перевірити копіювання логу корекцій (формат читабельний, дані повні) та очищення логу