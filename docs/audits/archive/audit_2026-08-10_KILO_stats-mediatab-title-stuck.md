# Audit: `checkSabbathSchoolBrandMismatch` лишає попереджувальний `title` «висіти»

- **Дата:** 2026-08-10
- **Модель:** KILO
- **Статус:** ✅ ВИПРАВЛЕНО (2026-08-10). Скидання стилю та відновлення `title` тепер атомарні — `restoreMediaTabTitle` викликається завжди в гілці «не попередження», незалежно від `brandName`. Оновлено тест 27 у `tests/stats_header_controls.test.js`.
- **Локація:** `modules/stats_brand_detector.ts:111-122` (винесено з `modules/stats_tracker.ts`)

---

## Context

Селектор медіа-вкладки (`#broadcast-aside-tab-assets`) підсвічується червоним і
отримує `title = "⚠️ ПОМИЛКА: Папка медіа має бути "Субботняя школа"!"`, коли йде
ефір «Суботньої школи», а вибраний бренд — інший. Початковий `title` зберігається
в `dataset.originalTitle` і відновлюється, коли умова більше не виконується.

## What broken

У `checkSabbathSchoolBrandMismatch`:

```ts
mediaTabBtn.style.cssText = '';
if (brandName) restoreMediaTabTitle(mediaTabBtn);
```

`restoreMediaTabTitle` викликається **лише якщо `brandName` істинне**. Коли бренд
тимчасово порожній (`brandName === ''` — вузол бренда ще не відрендерився або
`readBrandNodeText` повернув `''`), вітка попередження пропускається, `style.cssText = ''`
**скидає червоний стиль**, але `title` **НЕ відновлюється**, бо захист `if (brandName)`
його блокує.

Результат: візуальне червоне підсвічування зникає, але тултіп `title` лишається
попереджувальним (`MEDIA_TAB_WARNING_TITLE`). Стан вкладки стає неконсистентним —
користувач бачить звичайну вкладку, але при наведенні отримує помилкове
попередження.

## Runtime impact

- Користь: нульова (попередження вже не валідне, бо стиль скинуто).
- Шкода: оманливий тултіп, що суперечить візуальному стану вкладки.
- Частота: виникає щоразу, коли `checkSabbathSchoolBrandMismatch` викликається з
  порожнім `brandName` на вкладці, що *вже перебувала* в стані WARNING
  (тобто `dataset.originalTitle` встановлено, а `title` = попередження).

## Proposed fix

Розв'язати захист `restoreMediaTabTitle` від `brandName`:

```ts
mediaTabBtn.style.cssText = '';
restoreMediaTabTitle(mediaTabBtn); // завжди, коли не в стані WARNING
```

Або явно: скидання стилю і відновлення `title` мусять бути атомарними — обидва
виконуються в одній і тій самій гілці «не попередження».

## User impact

| Сценарій | Зараз | Після фіксу |
|---|---|---|
| Бренд визначено, не субота → скидання | title відновлено ✅ | title відновлено ✅ |
| Бренд порожній (`''`), вкладка БУЛА в WARNING | title **залишається попереджувальним** ❌ | title відновлено ✅ |
| Бренд порожній, вкладка НЕ в WARNING | title без змін ✅ | title без змін ✅ |

## Migration risks

- Низькі: `restoreMediaTabTitle` ідемпотентна (`if (dataset.originalTitle)` → відновлює
  і видаляє ключ). Виклик на вкладці без `dataset.originalTitle` нічого не робить.
- Ризик регресії в тестах: `tests/stats_header_controls.test.js` (тест 27)
  **навмисно фіксує поточний квірк** («порожній бренд → title НЕ відновлюється»).
  Після фіксу цей тест треба переписати на зворотну поведінку.

## Where debt lives

- `modules/stats_brand_detector.ts:111-122` — `checkSabbathSchoolBrandMismatch`, рядок 121.
- Історичний коментар про квірк уже додано в код (рядки 108-110), але він
  **зафіксовує баг як поведінку**, а не позначає його до виправлення.

## Verification checklist

- [ ] Відтворити: поставити вкладку в WARNING (`brandName` валідний + субота),
      потім викликати `checkSabbathSchoolBrandMismatch('', true)`.
- [ ] Перевірити, що `mediaTabBtn.getAttribute('title')` після скидання дорівнює
      `dataset.originalTitle` (а не `MEDIA_TAB_WARNING_TITLE`).
- [ ] Оновити тест 27 у `tests/stats_header_controls.test.js` під нову поведінку.
- [ ] `npm run test && npx tsc --noEmit` зелені.

## Side observations

- `restoreMediaTabTitle` зберігає `title` лише як `data-original-title`; якщо
  вкладка має власний змістовний `title` (не лише `aria-label`/дефолт), він
  відновлюється коректно.
- Дублювання логіки попередження між `stats_tracker`/`stats_brand_detector`
  усунено в Stage 3 (тепер єдине джерело правди тут). Це спростить фікс.
