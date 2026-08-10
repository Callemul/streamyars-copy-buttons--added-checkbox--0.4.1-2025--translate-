# Список задач (TASKS) — латентні баги, виявлені KILO (2026-08-10)

> **Джерело:** `docs/audits/active/audit_2026-08-10_KILO_*.md` (плюс аудити від
> `2026-08-09_KILO_*`, що лишились невиправленими з попереднього етапу).
> **Конвенція:** пріоритет = (імовірність удару по користувачу) × (тяжкість).
> **Статус багів, виправлених цим ж днем, — позначено ✅ ВИПРАВЛЕНО.**

## ✅ ВИПРАВЛЕНО (ця сесія)

| # | Баг | Файл | Фікс | Тест |
|---|-----|------|------|------|
| T1 | Оманлива іконка ✅ при **невдалому** копіюванні | `modules/ui_comments_copy.ts` | `flashCopyIcon` лише при `success`; інакше — попереджувальний тост | `tests/ui_comments_copy_filter.test.js` (5b, 11) |
| T2 | Збій створення **розділювача** обриває `finalCleanup` + тост; unhandled rejection у викликача | `modules/banner_creator.ts`, `modules/event_banners/category.ts` | `try/catch` навколо `createSingleBanner("----Питання глядачів----")` + `.catch` у викликача | `tests/banner_form.test.js` (21, через `executeBannerCreationLoop`) |
| T3 | `readInteger` повертав `NaN` → запис у storage та «зациклення» поля на `"NaN"` | `options/form.ts` | `readInteger` повертає `0` замість `NaN` | `tests/options_settings.test.js` (5) |
| T4 | `stats-mediatab-title-stuck` — заголовок Media-вкладки «залипає» після перемикання | `modules/stats_brand_detector.ts` | `restoreMediaTabTitle` викликається завжди в гілці «не попередження» | `tests/stats_header_controls.test.js` (27) |
| T5 | `studio-enabled-storage-key-mismatch` — `studio_enabled` пишеться в різні ключі storage | `youtube/studio/studio_storage_handler.ts`, `studio_init.ts` | читання `STORAGE_KEYS.STUDIO_ENABLED` та `VIDEO_MAP_STORAGE_KEY` замість хардкоду | `tests/studio_storage_handler.test.js` (3, 9) |
| T6 | `stale-data-author-after-inline-rename` — автор застарілий після inline-перейменування | `popup/prayer_handlers_focus.ts` | після правки — `renderPrayers(list)`, DOM синхронізується зі сховищем | `tests/prayer_handlers.test.js` |
| T7 | `html-injection-searchquery-xss` — пошуковий запит у DOM без екранування (XSS) | `modules/escape_html.ts`, `ui_starred_markup.ts`, `ui_empty_state.ts` | `escapeAttr`/`escapeHtml` на `value` та `searchQuery` | `tests/ui_starred_markup.test.js`, `tests/ui_comments_starred_controls.test.js` |
| T8 | `selector-array-validation-false-positive` — масив-селектор дає хибнопозитивну валідацію | `modules/ui_selector_validator.ts`, `modules/config.ts` | ітерація членів масиву через `toSelectorList` (вже виправлено до 2026-08-10) | `tests/ui_facade.test.js` |
| T9 | `event-comments-types-missing-imports` — відсутні імпорти типів у `event_comments` | `modules/event_comments/types.ts`, `modules/config.ts` | відновлено `import type`; `tsc --noEmit` чистий (вже виправлено до 2026-08-10) | `tests/event_comments*.test.js` |
| T11 | `antiafk-timer-observer-leak-on-reconfigure` — витік таймерів/observer при переналаштуванні | `modules/anti_afk_service.ts` | `applyOptions` ідемпотентний: `this.stop()` перед (пере)запуском | `tests/anti_afk_service.test.js` (13) |
| T12 | `format-category-label-divergence` — дві копії `formatCategoryLabel` з різним підсвічуванням | `youtube/studio/studio_ui.ts` | імпорт канонічного `formatCategoryLabel` з `studio_header_badge_markup.ts` (SSOT) | `tests/studio_header_counters.test.js` |
| T13 | `storage-updateasync-lost-update-race` — втрачене оновлення (read-modify-write без атомарності) | `modules/storage_ops_async.ts` | серіалізація через чергу на ключ + запис лише змінених ключів | `tests/storage_adapter.test.js` |

> Примітка: T1/T2/T3 раніше були описані як «не чіпати» (правило Single Source of
> Truth для аудитів), але користувач явно санкціонував їхнє виправлення
> («Так + залатати баги»). T4–T7, T11–T13 виправлено в цій сесії (2026-08-10) за
> прямим запитом «виправ ці баги». T8/T9 виявилися вже виправленими в коді до сесії
> (код містить `toSelectorList` та всі `import type`); статус аудитів оновлено на
> ✅ ВИПРАВЛЕНО. Усі фікси супроводжено регрес-тестами; поведінка успішних шляхів
> не змінена.

## ⚪ Спростовано (не є багом)

| # | Тема | Аудит-файл | Висновок |
|---|------|-----------|---------|
| T10 | `banner-selector-resolution-mismatch` — `createSingleBanner` нібито хардкодить селектор | `audit_2026-08-10_KILO_banner-selector-resolution-mismatch.md` (позначено СПРОСТОВАНО) | Фактично `createSingleBanner` передає `this.SELECTORS?.createBannerButton/Form` у `resolveCreateBannerButton/Form`; хардкоду немає (`rg` → 0 збігів). Не потребує змін. |

## Метрика прогресу

- Виправлено: **12 / 13** (T1–T9, T11–T13).
- Спростовано: **1 / 13** (T10).
- Відкрито: **0 / 13**.

> Стан верифікації (2026-08-10, після фіксів): `npm test` → **1496/1496 зелених**;
> `npx tsc --noEmit` → 0 помилок; `npm run lint` → 0 errors (3 преіснуючі warnings);
> `npx fallow dead-code --circular-deps --format json` → **0 issues**.
