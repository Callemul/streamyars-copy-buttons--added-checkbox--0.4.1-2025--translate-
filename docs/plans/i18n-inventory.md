# Інвентар i18n після T20 — C4.5a

Дата: 2026-09-11. Production snapshot: HEAD `b826edd`, поточне дерево після T20.
Рішення користувача: повний UI uk/en/ru. Це план міграції, не реалізація C4.5c.
Конвенція — [../rules/i18n.md](../rules/i18n.md). Ownership цієї роботи: лише
цей новий файл і правило; AGENTS, код, helper і тести не редагуються.

## 1. Метод і фактичний обсяг

Перевірено **284 production TS/HTML файлів: 282 TS + 2 HTML**:
`main.ts` та рекурсивно `modules/`, `popup/`, `options/`, `youtube/`,
`background/`. Тести, docs, node_modules, dist, CSS і build-config не входять
до знаменника. Manifest та три каталоги додатково прочитані як i18n-контракт.
Старі 227 файлів / ~599 літералів не використовуються як поточний результат.

Пошук кирилиці виконано по AST TypeScript: StringLiteral, NoSubstitutionTemplateLiteral,
TemplateExpression, без коментарів. TemplateExpression рахується один раз, його
фрагменти повторно не додаються. Знайдено **642 кириличних source occurrences**.
Далі перевірені споживачі та англійські UI-рядки; кирилиця не дорівнює UI.

У таблицях **U = 244 source occurrences UI/читабельного виходу**,
**D = 358 occurrence даних/парсерних та інтеграційних токенів**,
**L = 43 occurrence технічних повідомлень**. Сума включає також 3
перевірені англійські occurrence (version badge, fallback Media assets, заголовок
видимого diagnostic export), тому більша за кириличний підрахунок на 3.
Це не кількість унікальних ключів: повторення рахуються окремо, цілий TS HTML/MD
шаблон — один source occurrence. Тому U — точний обсяг **місць у коді**, а не
оцінка вартості перекладу чи кількості коротких фраз.

HTML пораховано окремо як текстові вузли з літерами та значення title, placeholder,
aria-label, alt, включно з template.content, без comments/script/style. Це
**146 текстових/атрибутних slots**. Сюди входять власні назви й
автоніми мов, які треба свідомо зберегти; це не все нові translation keys.
Не сумувати slots HTML і occurrences TS як однорідні «рядки».
Порожні/цифрові/emoji-only вузли не рахуються; доступні підписи рахуються.

| Зона | TS файлів з U | U occurrences |
|---|---:|---:|
| P1 Options | 5 | 18 |
| P1 Popup | 12 | 40 |
| P2 Shared actions / StreamYard | 14 | 68 |
| P2 Visible cleaning diagnostics | 3 | 3 |
| P3 YouTube / Studio | 6 | 22 |
| P4 Banner modal | 4 | 25 |
| P5 Analytics / reports | 9 | 55 |
| P6 Video | 4 | 13 |

| HTML | Текстові вузли | Атрибутні slots | Разом |
|---|---:|---:|---:|
| `options/options.html` | 60 | 3 | 63 |
| `popup/popup.html` | 39 | 44 | 83 |

## 2. Поточний i18n — що реально підключено

Три `_locales/{uk,en,ru}/messages.json` мають однакові 13 ключів.
`manifest.json` використовує extName/extDescription, default_locale=uk.
Вісім ключів popup (tabPrayers, tabTelegram, tabSettings, copyPrayers, fetch,
clear, processList, copyText) не мають production TS/HTML lookup. Статичний
popup не локалізується самим фактом наявності messages.json.

У production є чотири зовнішні call expressions getMessage для трьох ключів:
`modules/registry/config.ts:181` (timerOff),
`modules/video/video_copier_downloader.ts:42` (download), дві альтернативні
гілки `modules/streamyard/anti_afk/anti_afk_detector.ts:61–62` (stayInStudio).
Внутрішній Chrome lookup адаптера не є ще одним UI-споживачем. Усі три
ключі пов'язані з інтеграцією/пошуком тексту сайту, а не повним UI.

`options/option_fields.ts:73` зберігає ui_locale=auto; тип є у storage_keys.
Runtime-споживача цієї опції зараз немає. `getMessage(key, fallback)` не
обирає explicit uk/en/ru. Повнота каталогів і працездатний перемикач мови —
окремі критерії, обидва потрібні для завершення T10.

Уточнення користувача: helper реалізується окремо ним у
`modules/dom/localize.ts`, export `localize(root: ParentNode)`, імпорт
`registry/i18n.ts`. Чотири атрибути: data-i18n/textContent, data-i18n-title,
data-i18n-placeholder, data-i18n-aria-label. Missing translation зберігає
поточний рядок. Ніякого innerHTML. Адаптер зараз не змінюється.

## 3. Пріоритетні хвилі C4.5c

Кожна зона — окремий коміт, спільні файли не віддавати паралельним writers.
Точні producer-файли та рядки для кожної хвилі — у §5.

| Пріоритет | Конкретна робота | Критерій готовності / залежність |
|---|---|---|
| P0 — helper користувача | Прийняти modules/dom/localize.ts та його тести. Узгодити обхід Document/Element/DocumentFragment; localize викликати на document або контейнері з позначеними дочірніми вузлами | Чинний getMessage; fallback не стирає текст; повторний виклик без втрати дітей |
| P1a — popup HTML | popup/popup.html, popup/popup_init.ts, popup/popup_sheet_renderer.ts; підписи вкладок/toolbar/усіх полів template/налаштувань, aria/title/placeholder; англійські Transliteration, Translate, Input text... | Локалізувати кожний sheet clone до вставки, зберегти ids та лічильники; branded sheet labels узгодити з P2 |
| P1b — options HTML + runtime | options/options.html, options/options.ts, options/options_config_io.ts, options/options_settings_io.ts, options/options_studio_log.ts, options/studio_log.ts | Version badge не повертає англійський текст після localize; save/reset/import/error та видимий log у трьох мовах; native names мов і назви каналів зберегти |
| P1c — popup runtime | Усі popup-файли з U у §5, включно з prayer_toolbar_actions.ts, prayer_data.ts, popup_telegram_counters.ts та renderers | Порожні/заповнені списки, confirm, toast, transient copy labels, лічильники не повертають старі літерали; Telegram headers не змінені |
| P0b — explicit locale і параметри | Окрема наступна задача після helper: registry/i18n.ts, каталоги, підтримка JSON-імпортів/loader, orchestration entry points popup/options/main/YouTube/Studio | Реалізувати майбутній контракт правила §4–5; потрібна до приймання повного uk/en/ru та параметризованих зон. Не входить у поточну роботу користувача над helper |
| P2 — спільні дії / StreamYard | modules/comments/comment_actions.ts, modules/registry/sheets.ts, modules/streamyard/ui/* з U, modules/streamyard/comments/format.ts, modules/streamyard/banners/{category,deletion_calculations,deletion_handler}.ts, modules/core/utils_notify.ts | Ключі в існуючих реєстрах; shared action titles на всіх трьох поверхнях; не міняти стан/ids; повні речення empty/confirm замість відмінкових фрагментів |
| P2b — видимі cleaning diagnostics | modules/parsers/author.ts, modules/telegram/{telegram_line_export,telegram_old_item}.ts + popup/popup_telegram_renderers.ts | Коди/параметри diagnostics → переклад у renderer, сумісне читання історичних рядків. Не перекладати before/after/імена |
| P3 — YouTube / Studio | youtube/yt_comment_panel.ts, yt_comment_visual_state.ts; youtube/studio/{studio_ui,studio_header_badge_markup,studio_header_updater,studio_header_dom}.ts | Category badge/dropdown, ручний/автоматичний стан, counters, reset/confirm; sheet markup за id, а не replace локалізованих назв |
| P4 — банерна модалка | modules/banners/{banner_modal,banner_modal_parser,banner_creator}.ts та modules/parsers/sabbath_parser.ts | Видима діагностика/section titles/ліміт 10/preview/create count/копія log. Data-template і кінцевий текст банерів без мовної міграції |
| P5 — аналітика | modules/stats/* з U у §5 | Header/manual+auto phase, chart legend/no-data, modal, canvas slide, MD/HTML/CSV; не міняти phase ids і date keys; заголовки CSV — окремо від mime/BOM/розділювачів |
| P6 — відео | modules/video/{video_copier_theme,video_copier_card_buttons,video_copier_downloader,video_copier_links}.ts | Idle/pending/success/error/title, no-fresh-video; host Download lookup та SHARE_TEXT_PREFIX лишаються інтеграцією/контентом |

P1a/P1b — перші зони виносу, як вимагає task plan. P0b можна виконати перед
ними або між ними, але до оголошення перемикача мови працездатним. Повний
C4.5c не обмежується статичним HTML: кожний producer з U має бути закритий.
Після хвилі: npm run verify + візуальна звірка її UI у uk/en/ru; підсумково
перевірити locale, popup cloning, всі три comment surfaces і експорт.

## 4. Не переносити механічно в каталог

- modules/core/utils_text.ts: літери, транслітерація, нормалізація імен та
  cleanTelegramHeaders — дані/алгоритм, навіть коли літералів дуже багато.
- modules/comments/assistant/trigger_words.ts, trigger_regex.ts, registry/config.ts,
  banners/banner_parser_rules.ts, registry/channel_config.ts: пошукові токени,
  категорії, псевдоніми; BLOCK_FORMAT_LOG_MESSAGES у parser_rules — технічний log.
- modules/registry/sheets.ts: 8 label/description literals — метадані з UI-роллю
  (D у таблиці, не пропущено). Локалізувати вбудовані display labels за id у P2;
  перевірити використання descriptions, не перекладати custom registered values.
- youtube/studio/studio_header_badge_markup.ts: старі label replacement patterns
  (D) — змішана display-логіка. При локалізації аркушів замінити її структурно;
  імена людей/каналів зберегти, назви типів програм можна перекладати.
- options/option_fields.ts: СШ Урок / Проповідь — defaults користувацького
  вихідного контенту, не labels форми. Зміна UI locale не переписує ці поля.
- modules/telegram/telegram_old_section.ts, telegram_old_item.ts, telegram_line_export.ts,
  popup/prayer_data.ts, popup/popup_telegram_renderers.ts: МОЛИТВЫ/ВОПРОСЫ та
  анонімні author fallbacks — вихідний формат/дані. UI-пояснення cleaning logs
  у тих самих файлах позначені U. GENERIC_ANONYMOUS_AUTHORS у
  modules/sheets/sheet_stats_calculator.ts використовується для підрахунку людей.
- youtube/yt_comment_identity.ts: Автор, modules/streamyard/bootstrap/bootstrap_messages.ts:
  Глядач та youtube/studio/studio_channel.ts: Невідомий канал — data fallbacks.
  Не підміняти їх локалізованим рядком усередині identity/context. Окремий
  display fallback (studio_header_updater.ts, popup_telegram_collected.ts) — U.
- banner_modal.ts містить одночасно UI чіпса та data-template з російським
  parser header. Великий template зарахований U, але data-template не перекладати.
- banner_modal_parser.ts logs → banner_modal.ts diagnosticsEl.textContent; це U.
  prayer_toolbar_actions.ts [SYH] повідомлення → prayer_handlers_toolbar.ts
  showBanner; це теж U. options/studio_log.ts — видимий та копійований log, U.
- sabbath_parser.ts Error.message потрапляє до UI через banner_creator.ts;
  потребує коду помилки й renderer translation. Технічні DOM timeout/error
  повідомлення не перекладати механічно; на UI-межі дати локалізовану помилку,
  деталі лишити diagnostics.
- stats_report_templates.ts та stats_slide_generator.ts — читабельний експорт,
  тому U, а не console logs. video_copier_links.ts SHARE_TEXT_PREFIX — канонічний
  текст clipboard, D; «Назву не знайдено» — generated fallback для користувача, U.

## 5. Повний файловий ledger

Кожний TS у scope наведено рівно один раз. U refs — початкові рядки AST
літерала/шаблона; кілька occurrence можуть мати той самий рядок. D/L —
кількість кириличних occurrence після класифікації. Нулі означають відсутність
власних знайдених мовних літералів, а не відсутність UI-поведінки: renderer
може споживати рядки реєстру чи дані. Helper, що додається користувачем пізніше
цього snapshot, у цей знаменник не включено.

| Файл | U | D | L | U source refs |
|---|---:|---:|---:|---|
| `background/badge_counter.ts` | 0 | 0 | 0 | — |
| `background/badge_updater.ts` | 0 | 0 | 0 | — |
| `background/message_router.ts` | 0 | 0 | 0 | — |
| `background/service-worker.ts` | 0 | 0 | 0 | — |
| `main.ts` | 0 | 0 | 1 | — |
| `modules/banners/banner_creator.ts` | 5 | 1 | 5 | 45, 58, 84 |
| `modules/banners/banner_executor.ts` | 0 | 0 | 2 | — |
| `modules/banners/banner_form.ts` | 0 | 0 | 0 | — |
| `modules/banners/banner_modal.ts` | 10 | 0 | 0 | 76, 255, 259, 282, 283, 284, 321, 330, 332, 340 |
| `modules/banners/banner_modal_draft.ts` | 0 | 0 | 0 | — |
| `modules/banners/banner_modal_parser.ts` | 9 | 0 | 0 | 45, 49, 73, 76, 82, 96, 99, 105, 110 |
| `modules/banners/banner_parser.ts` | 0 | 0 | 0 | — |
| `modules/banners/banner_parser_rules.ts` | 0 | 7 | 3 | — |
| `modules/banners/banner_types.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/highlighter.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/index.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/processor.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/trigger_category.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/trigger_manager.ts` | 0 | 0 | 0 | — |
| `modules/comments/assistant/trigger_regex.ts` | 0 | 1 | 0 | — |
| `modules/comments/assistant/trigger_words.ts` | 0 | 12 | 0 | — |
| `modules/comments/assistant/types.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_action_runner.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_actions.ts` | 9 | 0 | 0 | 109, 118, 124, 133, 137, 143, 156, 160, 167 |
| `modules/comments/comment_clipboard.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_collected_store.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_injector.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_platform_adapter.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_service.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_state_store.ts` | 0 | 0 | 0 | — |
| `modules/comments/comment_types.ts` | 0 | 0 | 0 | — |
| `modules/comments/prayer_record_store.ts` | 0 | 0 | 0 | — |
| `modules/core/event_bus.ts` | 0 | 0 | 0 | — |
| `modules/core/fuzzy_match.ts` | 0 | 0 | 0 | — |
| `modules/core/fuzzy_window.ts` | 0 | 0 | 0 | — |
| `modules/core/plugin_registry.ts` | 0 | 0 | 0 | — |
| `modules/core/state.ts` | 0 | 0 | 5 | — |
| `modules/core/types.ts` | 0 | 0 | 0 | — |
| `modules/core/utils.ts` | 0 | 0 | 0 | — |
| `modules/core/utils_dom_wait.ts` | 0 | 0 | 0 | — |
| `modules/core/utils_notify.ts` | 1 | 0 | 0 | 14 |
| `modules/core/utils_search.ts` | 0 | 0 | 0 | — |
| `modules/core/utils_storage_ops.ts` | 0 | 0 | 0 | — |
| `modules/core/utils_text.ts` | 0 | 245 | 0 | — |
| `modules/dom/dom_observer.ts` | 0 | 0 | 0 | — |
| `modules/dom/escape_html.ts` | 0 | 0 | 0 | — |
| `modules/dom/localize.ts` | 0 | 0 | 0 | — |
| `modules/dom/ui_factory.ts` | 0 | 0 | 0 | — |
| `modules/messaging/messaging.ts` | 0 | 0 | 0 | — |
| `modules/messaging/messaging_context.ts` | 0 | 0 | 0 | — |
| `modules/messaging/messaging_listener.ts` | 0 | 0 | 0 | — |
| `modules/messaging/messaging_senders.ts` | 0 | 0 | 0 | — |
| `modules/parsers/author.ts` | 1 | 0 | 0 | 37 |
| `modules/parsers/emoji_parser.ts` | 0 | 0 | 0 | — |
| `modules/parsers/index.ts` | 0 | 0 | 0 | — |
| `modules/parsers/question_parsers.ts` | 0 | 0 | 0 | — |
| `modules/parsers/regex.ts` | 0 | 0 | 0 | — |
| `modules/parsers/sabbath_parser.ts` | 1 | 0 | 0 | 40 |
| `modules/parsers/split_prayer.ts` | 0 | 0 | 0 | — |
| `modules/parsers/standard_parser.ts` | 0 | 0 | 0 | — |
| `modules/parsers/truncation.ts` | 0 | 0 | 0 | — |
| `modules/parsers/types.ts` | 0 | 0 | 0 | — |
| `modules/registry/channel_config.ts` | 0 | 10 | 0 | — |
| `modules/registry/config.ts` | 0 | 24 | 0 | — |
| `modules/registry/i18n.ts` | 0 | 0 | 0 | — |
| `modules/registry/sheets.ts` | 0 | 8 | 0 | — |
| `modules/sheets/retention_service.ts` | 0 | 0 | 0 | — |
| `modules/sheets/sheet_processing.ts` | 0 | 0 | 0 | — |
| `modules/sheets/sheet_repository.ts` | 0 | 0 | 0 | — |
| `modules/sheets/sheet_state_service.ts` | 0 | 0 | 0 | — |
| `modules/sheets/sheet_stats_calculator.ts` | 0 | 3 | 0 | — |
| `modules/stats/stats_auto_phase.ts` | 4 | 5 | 0 | 92, 128, 161 |
| `modules/stats/stats_brand_detector.ts` | 1 | 5 | 0 | 31 |
| `modules/stats/stats_brand_storage.ts` | 0 | 0 | 1 | — |
| `modules/stats/stats_chart_data.ts` | 4 | 0 | 0 | 74, 84, 87, 116 |
| `modules/stats/stats_downloads.ts` | 1 | 0 | 0 | 33 |
| `modules/stats/stats_exporter.ts` | 0 | 0 | 1 | — |
| `modules/stats/stats_header_controls.ts` | 8 | 0 | 1 | 48, 49, 66, 67, 77, 78 |
| `modules/stats/stats_header_observer.ts` | 0 | 0 | 0 | — |
| `modules/stats/stats_live_sampler.ts` | 0 | 0 | 0 | — |
| `modules/stats/stats_math.ts` | 0 | 0 | 0 | — |
| `modules/stats/stats_modal.ts` | 9 | 0 | 0 | 38, 124, 128, 129, 130, 131, 144, 220, 227 |
| `modules/stats/stats_phase_marker.ts` | 3 | 0 | 0 | 23, 27, 28 |
| `modules/stats/stats_report_templates.ts` | 11 | 0 | 0 | 12, 22, 58, 105, 110, 136, 157 |
| `modules/stats/stats_session.ts` | 0 | 0 | 0 | — |
| `modules/stats/stats_slide_generator.ts` | 14 | 0 | 1 | 90, 91, 92, 93, 169, 181, 197, 203, 209, 231, 235, 236, 237, 238 |
| `modules/stats/stats_tracker.ts` | 0 | 0 | 1 | — |
| `modules/stats/stats_types.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage_keys.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage_migration.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage_ops_async.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage_ops_callback.ts` | 0 | 0 | 0 | — |
| `modules/storage/storage_runtime.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/anti_afk/anti_afk.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/anti_afk/anti_afk_detector.ts` | 0 | 2 | 3 | — |
| `modules/streamyard/anti_afk/anti_afk_service.ts` | 0 | 0 | 4 | — |
| `modules/streamyard/banners/category.ts` | 1 | 0 | 0 | 21 |
| `modules/streamyard/banners/checkbox.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/deletion.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/deletion_calculations.ts` | 12 | 0 | 0 | 92, 93, 94, 98, 99, 100, 101, 102, 105, 106, 109, 110 |
| `modules/streamyard/banners/deletion_execution.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/deletion_handler.ts` | 1 | 0 | 0 | 25 |
| `modules/streamyard/banners/deps.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/helpers.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/index.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/mouse_handlers.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/mouseup_handler.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/banners/types.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/bootstrap/bootstrap_app.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/bootstrap/bootstrap_dom.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/bootstrap/bootstrap_messages.ts` | 0 | 1 | 1 | — |
| `modules/streamyard/comments/action_dom_sync.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/action_effects.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/action_marking.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/auto_heal.ts` | 0 | 0 | 1 | — |
| `modules/streamyard/comments/auto_heal_cover_buttons.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/auto_heal_ghosts.ts` | 0 | 0 | 2 | — |
| `modules/streamyard/comments/format.ts` | 3 | 0 | 0 | 23, 30, 38 |
| `modules/streamyard/comments/handlers/context_menu.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/handlers/helpers.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/handlers/index.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/handlers/middle_click.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/handlers/star_button.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/handlers/syh_buttons.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/index.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/prayer_database.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/streamyard_adapter.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/streamyard_comment_binding.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/comments/types.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/right_tabs/right_tabs_compact.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/right_tabs/right_tabs_rules.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/right_tabs/right_tabs_storage.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_banners.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_banners_filter.ts` | 8 | 0 | 0 | 109, 110, 111, 114, 115, 116, 117, 119 |
| `modules/streamyard/ui/ui_banners_header.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_banners_inject.ts` | 5 | 0 | 0 | 21, 24, 27, 30, 35 |
| `modules/streamyard/ui/ui_banners_markup.ts` | 2 | 0 | 0 | 14, 30 |
| `modules/streamyard/ui/ui_checkbox_restorer.ts` | 0 | 0 | 2 | — |
| `modules/streamyard/ui/ui_checkbox_utils.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_comment_labels.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_comments.ts` | 1 | 0 | 0 | 23 |
| `modules/streamyard/ui/ui_comments_copy.ts` | 4 | 0 | 0 | 25, 133, 141, 144 |
| `modules/streamyard/ui/ui_comments_filter.ts` | 9 | 0 | 0 | 209, 210, 211, 214, 215, 216, 217, 219, 220 |
| `modules/streamyard/ui/ui_dom_updates.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_empty_state.ts` | 3 | 0 | 0 | 64, 68, 82 |
| `modules/streamyard/ui/ui_filter_controls.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_init.ts` | 0 | 0 | 2 | — |
| `modules/streamyard/ui/ui_scroll_utils.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_selector_validator.ts` | 0 | 0 | 2 | — |
| `modules/streamyard/ui/ui_shared_utils.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_starred_controls.ts` | 0 | 0 | 0 | — |
| `modules/streamyard/ui/ui_starred_markup.ts` | 9 | 0 | 0 | 30, 31, 32, 33, 61 |
| `modules/streamyard/ui/ui_state.ts` | 0 | 0 | 0 | — |
| `modules/telegram/telegram_line_export.ts` | 1 | 1 | 0 | 94 |
| `modules/telegram/telegram_old_item.ts` | 1 | 1 | 0 | 74 |
| `modules/telegram/telegram_old_section.ts` | 0 | 3 | 0 | — |
| `modules/telegram/telegram_parser.ts` | 0 | 0 | 0 | — |
| `modules/telegram/telegram_text_rules.ts` | 0 | 0 | 0 | — |
| `modules/telegram/telegram_types.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier_card_buttons.ts` | 2 | 0 | 0 | 32, 56 |
| `modules/video/video_copier_downloader.ts` | 1 | 0 | 3 | 97 |
| `modules/video/video_copier_fresh.ts` | 0 | 1 | 0 | — |
| `modules/video/video_copier_links.ts` | 1 | 1 | 0 | 28 |
| `modules/video/video_copier_master_button.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier_share_modal.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier_theme.ts` | 9 | 0 | 0 | 13, 14, 15, 16, 17, 18, 19, 20, 21 |
| `modules/video/video_copier_title_button.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier_ui.ts` | 0 | 0 | 0 | — |
| `modules/video/video_copier_ui_kit.ts` | 0 | 0 | 0 | — |
| `options/defaults.ts` | 0 | 0 | 0 | — |
| `options/form.ts` | 0 | 0 | 0 | — |
| `options/option_fields.ts` | 0 | 2 | 0 | — |
| `options/options.ts` | 4 | 0 | 0 | 48, 51, 78, 84 |
| `options/options_config_io.ts` | 4 | 0 | 0 | 78, 95, 98, 101 |
| `options/options_navigation.ts` | 0 | 0 | 0 | — |
| `options/options_settings_io.ts` | 1 | 0 | 0 | 49 |
| `options/options_studio_log.ts` | 5 | 0 | 0 | 42, 48, 50, 56, 60 |
| `options/options_toast.ts` | 0 | 0 | 0 | — |
| `options/studio_log.ts` | 4 | 0 | 0 | 14, 18, 91, 94 |
| `options/validation.ts` | 0 | 0 | 0 | — |
| `popup/popup_dom_utils.ts` | 0 | 0 | 0 | — |
| `popup/popup_init.ts` | 0 | 0 | 0 | — |
| `popup/popup_listeners.ts` | 1 | 0 | 0 | 95 |
| `popup/popup_prayers.ts` | 0 | 0 | 0 | — |
| `popup/popup_resizers.ts` | 0 | 0 | 0 | — |
| `popup/popup_resizers_drag.ts` | 0 | 0 | 0 | — |
| `popup/popup_resizers_observer.ts` | 0 | 0 | 0 | — |
| `popup/popup_scroll.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_bindings.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_clear.ts` | 1 | 0 | 0 | 16 |
| `popup/popup_sheet_field_restorer.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_fields.ts` | 0 | 0 | 1 | — |
| `popup/popup_sheet_keys.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_log_restorer.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_renderer.ts` | 0 | 0 | 0 | — |
| `popup/popup_sheet_state_restorer.ts` | 0 | 0 | 0 | — |
| `popup/popup_state_restorer.ts` | 0 | 0 | 0 | — |
| `popup/popup_storage.ts` | 0 | 0 | 0 | — |
| `popup/popup_telegram.ts` | 3 | 0 | 0 | 167, 186, 188 |
| `popup/popup_telegram_collected.ts` | 6 | 0 | 0 | 30, 37, 46, 70, 118 |
| `popup/popup_telegram_counters.ts` | 10 | 0 | 0 | 27, 28, 56, 96, 97, 133, 185, 224, 234, 235 |
| `popup/popup_telegram_renderers.ts` | 5 | 2 | 0 | 94, 96, 137, 148, 185 |
| `popup/popup_telegram_state.ts` | 0 | 0 | 0 | — |
| `popup/popup_translit.ts` | 0 | 0 | 0 | — |
| `popup/popup_ui_state_appliers.ts` | 0 | 0 | 0 | — |
| `popup/popup_ui_state_restorer.ts` | 0 | 0 | 0 | — |
| `popup/popup_ui_state_rules.ts` | 0 | 0 | 0 | — |
| `popup/prayer_api.ts` | 0 | 0 | 0 | — |
| `popup/prayer_click_actions.ts` | 0 | 0 | 0 | — |
| `popup/prayer_click_rules.ts` | 2 | 0 | 0 | 41, 69 |
| `popup/prayer_data.ts` | 1 | 1 | 0 | 78 |
| `popup/prayer_dom_builders.ts` | 3 | 0 | 0 | 89, 90, 157 |
| `popup/prayer_focus_rules.ts` | 0 | 0 | 0 | — |
| `popup/prayer_handlers.ts` | 0 | 0 | 0 | — |
| `popup/prayer_handlers_click.ts` | 0 | 0 | 0 | — |
| `popup/prayer_handlers_focus.ts` | 0 | 0 | 0 | — |
| `popup/prayer_handlers_toolbar.ts` | 0 | 0 | 0 | — |
| `popup/prayer_messaging.ts` | 0 | 0 | 0 | — |
| `popup/prayer_render.ts` | 1 | 0 | 0 | 36 |
| `popup/prayer_render_helpers.ts` | 0 | 0 | 0 | — |
| `popup/prayer_room_guard.ts` | 1 | 0 | 0 | 22 |
| `popup/prayer_toolbar_actions.ts` | 6 | 0 | 0 | 16, 18, 20, 22, 23, 94 |
| `popup/prayer_utils.ts` | 0 | 0 | 0 | — |
| `popup/render_utils.ts` | 0 | 0 | 0 | — |
| `popup/telegram_sheet_dom.ts` | 0 | 0 | 0 | — |
| `youtube/studio/comment_context.ts` | 0 | 0 | 0 | — |
| `youtube/studio/comment_context_fields.ts` | 0 | 0 | 0 | — |
| `youtube/studio/state_resolvers.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_adapter.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_adapter_context.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_aggregator.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_binding_events.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_binding_state.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_category_matcher.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_category_resolution.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_channel.ts` | 0 | 1 | 0 | — |
| `youtube/studio/studio_comment_key.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_comment_processor.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_comment_text.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_content.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_context_menu.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_dom_helpers.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_events.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_header_badge_markup.ts` | 2 | 19 | 0 | 88, 102 |
| `youtube/studio/studio_header_counters.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_header_dom.ts` | 1 | 0 | 0 | 78 |
| `youtube/studio/studio_header_updater.ts` | 1 | 0 | 0 | 50 |
| `youtube/studio/studio_init.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_retroactive.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_selector_constants.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_selector_queries.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_selectors.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_spa_handler.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_state_helpers.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_storage_handler.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_thread_sorter.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_ui.ts` | 13 | 0 | 1 | 94, 110, 164, 169, 170, 174, 175, 207, 209, 210, 223, 224 |
| `youtube/studio/studio_video_map.ts` | 0 | 0 | 0 | — |
| `youtube/studio/studio_video_metadata.ts` | 0 | 0 | 0 | — |
| `youtube/studio/ui_restorers.ts` | 0 | 0 | 0 | — |
| `youtube/youtube_content.ts` | 0 | 0 | 0 | — |
| `youtube/yt_adapter.ts` | 0 | 0 | 0 | — |
| `youtube/yt_bootstrap_rules.ts` | 0 | 0 | 0 | — |
| `youtube/yt_channel_gate.ts` | 0 | 0 | 0 | — |
| `youtube/yt_comment_identity.ts` | 0 | 1 | 0 | — |
| `youtube/yt_comment_panel.ts` | 1 | 0 | 0 | 25 |
| `youtube/yt_comment_processor.ts` | 0 | 0 | 0 | — |
| `youtube/yt_comment_rules.ts` | 0 | 0 | 0 | — |
| `youtube/yt_comment_visual_state.ts` | 4 | 0 | 0 | 18, 19 |
| `youtube/yt_diagnostics.ts` | 0 | 0 | 0 | — |
| `youtube/yt_events.ts` | 0 | 0 | 0 | — |
| `youtube/yt_init.ts` | 0 | 1 | 0 | — |
| `youtube/yt_observer.ts` | 0 | 0 | 0 | — |
| `youtube/yt_selectors.ts` | 0 | 0 | 0 | — |
| `youtube/yt_state.ts` | 0 | 0 | 0 | — |
| `youtube/yt_storage_handler.ts` | 0 | 0 | 0 | — |
| `youtube/yt_storage_rules.ts` | 0 | 0 | 0 | — |
| `youtube/yt_ui.ts` | 0 | 0 | 0 | — |
| `youtube/yt_video_id.ts` | 0 | 0 | 0 | — |

### HTML slots: перевірний список

Нижче — кожний slot з підрахунку, включно з незмінними власними назвами.
Це дозволяє розмітити data-i18n без припущення, що вся кирилиця — UI борг.
Поділені `<b>` текстові вузли не означають окремі фінальні ключі: зберегти
розмітку, обрати цілісний переклад, не знищувати дочірні вузли textContent.

#### options/options.html

| # | Slot | Поточний текст |
|---|---|---|
| 1 | text | StreamYard Helper — Налаштування |
| 2 | alt | StreamYard Helper |
| 3 | text | StreamYard Helper |
| 4 | text | v1.1.0 — |
| 5 | text | Налаштування та вподобання |
| 6 | text | 💾 Зберегти зміни |
| 7 | text | Загальні |
| 8 | text | Автоматизація |
| 9 | text | Інтерфейс |
| 10 | text | Дані & Резервні копії |
| 11 | text | ⚙️ Загальні налаштування |
| 12 | text | Налаштуйте стандартні шаблони назв для трансляцій та мову розширення. |
| 13 | text | Назва Суботньої Школи (СШ) |
| 14 | placeholder | Напр. СШ Урок 4 |
| 15 | text | Використовується за замовчуванням для форматування запитань Суботньої школи. |
| 16 | text | Назва Проповіді |
| 17 | placeholder | Напр. Тема: Віра і Надія |
| 18 | text | Використовується за замовчуванням для блоку проповідей. |
| 19 | text | Мова інтерфейсу розширення |
| 20 | text | Автоматично (мова браузера) |
| 21 | text | Українська (uk) |
| 22 | text | Англійська (en) |
| 23 | text | Російська (ru) |
| 24 | text | 🤖 Налаштування Автоматизації |
| 25 | text | Керування фоновими модулями захисту від сну та відновлення селекторів. |
| 26 | text | Увімкнути Anti-AFK кликер |
| 27 | text | Запобігає автоматичному відключенню від студії StreamYard при тривалій бездіяльності. |
| 28 | text | Інтервал Anti-AFK (секунди) |
| 29 | text | Частота періодичних перевірок кнопкою "Stay in the studio". За замовчуванням: 30с. |
| 30 | text | Увімкнути Auto-Heal (авто-відновлення селекторів) |
| 31 | text | Автоматично виявляє та адаптується до динамічних змін DOM-структури StreamYard. |
| 32 | text | 🎨 Інтерфейс та Ліміти |
| 33 | text | Налаштування відображення кнопок та параметрів довжини банерів. |
| 34 | text | Максимальна довжина тексту банера (символів) |
| 35 | text | Текст запитань, що перевищує цей ліміт, буде гарно обрізатися з трикрапкою (ліміт StreamYard). |
| 36 | text | Автоматично згортати другорядні кнопки (Recording, Widgets) |
| 37 | text | Згортає по висоті другорядні вкладки правої панелі. Основні вкладки (Chat, Banners, Brand) залишаються звичайними. Будь-яку кнопку можна додатково згортати/розгортати через ПКМ. |
| 38 | text | Увімкнути старий YouTube-модуль (2 канали) |
| 39 | text | Вмикає новий інжекцій кнопок на звичайному веб-сайті YouTube. |
| 40 | text | 🎬 YouTube Studio |
| 41 | text | Увімкнути YouTube Studio модуль |
| 42 | text | Вмикає авто-маршрутизацію, Badge та чекбокси у творчій студії YouTube Studio (studio.youtube.com) |
| 43 | text | Дозволені канали YouTube Studio (лише читання) |
| 44 | text | Время перемен |
| 45 | text | ідентифікатори: |
| 46 | text | @vperemen, @vperementv, @vremyaperemen) |
| 47 | text | Слово живое |
| 48 | text | ідентифікатори: |
| 49 | text | @slovozhivoe, @slovo_zhivoe) |
| 50 | text | Лог ручних корекцій категорій (YouTube Studio) |
| 51 | text | 📋 Скопіювати лог |
| 52 | text | 🗑 Очистити лог |
| 53 | text | Час |
| 54 | text | Канал |
| 55 | text | Відео |
| 56 | text | Авто-категорія |
| 57 | text | Призначено |
| 58 | text | Записи у лозі відсутні |
| 59 | text | 💾 Керування даними та Резервні копії |
| 60 | text | Експортуйте свої налаштування та повний стан для переносу на інший ПК або збереження резервної копії. |
| 61 | text | 📥 Експорт налаштувань та стану (JSON) |
| 62 | text | 📤 Імпорт налаштувань та стану |
| 63 | text | ⚠️ Скинути всі налаштування за замовчуванням |

#### popup/popup.html

| # | Slot | Поточний текст |
|---|---|---|
| 1 | text | StreamYard Tools |
| 2 | aria-label | Вкладки розширення |
| 3 | aria-label | Молитовні |
| 4 | text | 🙏 Молитовні |
| 5 | aria-label | Telegram/YouTube Питання |
| 6 | text | Telegram/YouTube Питання 🚀 |
| 7 | aria-label | Трансліт та Налаштування |
| 8 | text | Трансліт / Налаштування |
| 9 | aria-label | Молитовні |
| 10 | text | Разом: |
| 11 | text | 0 люд. - 0 прохань |
| 12 | aria-label | Скопіювати всі прохання |
| 13 | text | 📋 Скопіювати всі прохання |
| 14 | title | Підтягнути зіркові коментарі з ефіру |
| 15 | aria-label | Підтягнути зіркові коментарі з ефіру |
| 16 | text | 🔄 Підтягнути |
| 17 | title | Очистити список |
| 18 | aria-label | Очистити список прохань |
| 19 | aria-label | Результат молитовних прохань |
| 20 | aria-label | Telegram/YouTube Питання |
| 21 | aria-label | Аркуші питань |
| 22 | aria-label | Время перемен СШ |
| 23 | text | Время перемен |
| 24 | text | СШ |
| 25 | aria-label | Опарин проповеди |
| 26 | text | Опарин |
| 27 | text | проповеди |
| 28 | aria-label | Молчанов СШ |
| 29 | text | Молчанов |
| 30 | text | СШ |
| 31 | aria-label | Молчанов проповеди |
| 32 | text | Молчанов |
| 33 | text | проповеди |
| 34 | text | 1. Старий список |
| 35 | placeholder | Вставте сюди весь текст з минулого разу... |
| 36 | aria-label | Старий список питань |
| 37 | text | 2. Номери ВІДПОВІДЕЙ (видалити): |
| 38 | placeholder | Напр: 1, 3, 8.1 |
| 39 | aria-label | Номери відповідей для видалення |
| 40 | text | 3. Новий список: |
| 41 | text | 📝 Telegram (ручний ввід) |
| 42 | placeholder | Вставте нові питання з Телеграму... |
| 43 | aria-label | Нові питання з Телеграму |
| 44 | title | Перетягніть для зміни розміру |
| 45 | text | 🎬 YouTube Studio |
| 46 | title | Очистити зібрані |
| 47 | aria-label | Очистити зібрані з YouTube |
| 48 | aria-label | Зібрані коментарі з YouTube |
| 49 | aria-label | Обробити коментарі |
| 50 | text | ОБРОБИТИ КОМЕНТАРІ 🚀 |
| 51 | title | Очистити |
| 52 | aria-label | Очистити список питань |
| 53 | text | Залишилось старих: |
| 54 | text | Видалено: |
| 55 | text | Нові з лівої: |
| 56 | text | Нові з YouTube: |
| 57 | text | Разом: |
| 58 | text | Результат: |
| 59 | aria-label | Скопіювати результат |
| 60 | text | 📋 Скопіювати текст |
| 61 | aria-label | Фінальний результат питань Telegram |
| 62 | text | 🗑 Лог видаленого |
| 63 | text | Видалень немає |
| 64 | text | 🧹 Лог чистки тексту |
| 65 | text | Очищених фраз чи нікнеймів немає |
| 66 | aria-label | Трансліт та Налаштування |
| 67 | text | Transliteration |
| 68 | placeholder | Input text... |
| 69 | aria-label | Вхідний текст для транслітерації |
| 70 | aria-label | Результат транслітерації |
| 71 | aria-label | Перекласти |
| 72 | text | Translate |
| 73 | text | Налаштування |
| 74 | placeholder | Назва СШ |
| 75 | aria-label | Назва Суботньої школи |
| 76 | aria-label | Змінити назву Суботньої школи |
| 77 | text | Змінити СШ |
| 78 | placeholder | Назва Проповіді |
| 79 | aria-label | Назва проповіді |
| 80 | aria-label | Змінити назву проповіді |
| 81 | text | Змінити Проповідь |
| 82 | aria-label | Відкрити розширені налаштування |
| 83 | text | ⚙️ Розширені Налаштування (Options) |

## 6. Межі завершення C4.5a/b

Інвентар та правило створено. Реалізація перекладів, explicit locale,
параметрів та інтеграція helper не виконані цією задачею. AGENTS §5 не
змінено за прямою забороною користувача; власнику AGENTS лишається додати
посилання на правило. C4.5c виконувати за пріоритетами вище.
Перевірка цієї документації: існування наведених producer paths, повнота
ledger і суми, parity існуючих каталогів, ownership diff. npm run verify
не запускався: production code не змінювався, коміт не створювався.
