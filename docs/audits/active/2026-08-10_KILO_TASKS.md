# Список задач (TASKS) — латентні баги, виявлені KILO (2026-08-10)

> **Джерело:** `docs/audits/active/audit_2026-08-10_KILO_*.md` (плюс аудити від
> `2026-08-09_KILO_*`, що лишились невиправленими з попереднього етапу).
> **Конвенція:** пріоритет = (імовірність удару по користувачу) × (тяжкість).
> **Статус багів, виправлених цього ж дня, — позначено ✅ ВИПРАВЛЕНО.**

## ✅ ВИПРАВЛЕНО (ця сесія)

| # | Баг | Файл | Фікс | Тест |
|---|-----|------|------|------|
| T1 | Оманлива іконка ✅ при **невдалому** копіюванні | `modules/ui_comments_copy.ts` | `flashCopyIcon` лише при `success`; інакше — попереджувальний тост | `tests/ui_comments_copy_filter.test.js` (5b, 11) |
| T2 | Збій створення **розділювача** обриває `finalCleanup` + тост; unhandled rejection у викликача | `modules/banner_creator.ts`, `modules/event_banners/category.ts` | `try/catch` навколо `createSingleBanner("----Питання глядачів----")` + `.catch` у викликача | `tests/banner_form.test.js` (21, через `executeBannerCreationLoop`) |
| T3 | `readInteger` повертав `NaN` → запис у storage та «зациклення» поля на `"NaN"` | `options/form.ts` | `readInteger` повертає `0` замість `NaN` | `tests/options_settings.test.js` (5) |

> Примітка: T1/T2/T3 раніше були описані як «не чіпати» (правило Single Source of
> Truth для аудитів), але користувач явно санкціонував їхнє виправлення
> («Так + залатати баги»). Усі фікси супроводжено регрес-тестами; поведінка
> успішних шляхів не змінена.

## 🔴 Високий пріоритет (НЕ виправлено)

| # | Баг | Аудит-файл | Файл | Суть |
|---|-----|-----------|------|------|
| T4 | `stats-mediatab-title-stuck` — заголовок Media-вкладки «залипає» після перемикання | `audit_2026-08-10_KILO_stats-mediatab-title-stuck.md` | `modules/ui_stats.ts` (або Media-tab контролер) | Заголовок не скидається при зміні вкладки/контексту. Впливає на відображення статистики. |
| T5 | `studio-enabled-storage-key-mismatch` — `studio_enabled` пишеться в різні ключі storage | `audit_2026-08-09_KILO_studio-enabled-storage-key-mismatch.md` | `options/options.ts`, `modules/storage_keys.ts` | Дублювання/розбіжність ключа `STUDIO_ENABLED` призводить до втрати стану між сторінками. |
| T6 | `stale-data-author-after-inline-rename` — автор коментаря застарілий після inline-перейменування | `audit_2026-08-09_KILO_stale-data-author-after-inline-rename.md` | `modules/ui_comments*` / comment-кеш | Після редагування імені в кеші лишається старе значення. |
| T7 | `html-injection-searchquery-xss` — пошуковий запит потрапляє у DOM без екранування (XSS) | `audit_2026-08-09_KILO_html-injection-searchquery-xss.md` | фільтр/пошук коментарів | `textContent` vs `innerHTML`; потенційне впорскування HTML. **Безпека.** |

## 🟡 Середній пріоритет (НЕ виправлено)

| # | Баг | Аудит-файл | Файл | Суть |
|---|-----|-----------|------|------|
| T8 | `selector-array-validation-false-positive` — масив-селектор дає хибнопозитивну валідацію | `audit_2026-08-09_KILO_selector-array-validation-false-positive.md` | `modules/config.ts` (валідація селекторів) | Масив `SelectorValue` проходить валідацію, хоча не мав би. |
| T9 | `event-comments-types-missing-imports` — відсутні імпорти типів у `event_comments` | `audit_2026-08-09_KILO_event-comments-types-missing-imports.md` | `modules/event_comments/*` | `import` типів ламається / неповний; можливі TS-помилки у споживачах. |

## ⚪ Спростовано (не є багом)

| # | Тема | Аудит-файл | Висновок |
|---|------|-----------|---------|
| T10 | `banner-selector-resolution-mismatch` — `createSingleBanner` нібито хардкодить селектор | `audit_2026-08-10_KILO_banner-selector-resolution-mismatch.md` (позначено СПРОСТОВАНО) | Фактично `createSingleBanner` передає `this.SELECTORS?.createBannerButton/Form` у `resolveCreateBannerButton/Form`; хардкоду немає (`rg` → 0 збігів). Не потребує змін. |

## Порядок виконання (рекомендація)

1. **T7 (XSS)** — найвищий ризик безпеки, зробити окремим PR.
2. **T4, T5, T6** — високий вплив на користувача; слід залатати й покрити тестами.
3. **T8, T9** — середній пріоритет, але дешеві; зручно брати «між великими задачами».
4. Кожен фікс супроводжувати регрес-тестом і перепроходженням
   `npm run test && npx tsc --noEmit && npm run lint`.

## Метрика прогресу

- Виправлено: **3 / 10** (T1, T2, T3).
- Спростовано: **1 / 10** (T10).
- Відкрито: **6 / 10** (T4–T9).
