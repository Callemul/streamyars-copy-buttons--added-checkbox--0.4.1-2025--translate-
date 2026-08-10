---
# [2026-08-10] — KILO — Аудит: латентний баг «createSingleBanner не використовує resolveSelector» — СПРОСТОВАНО

> **Статус:** ❌ **ХИБНОПОЗИТИВНИЙ** — не є багом. Залишено для прозорості.
> Перевірено 2026-08-10 на актуальному коді після рефакторингу.

## Висновок

Початкове припущення (що `createSingleBanner` хардкодить CSS-літерал
`.banner-editor__publish-button` замість `resolveSelector`) **не підтвердилось**.

Фактичний код `modules/banner_creator.ts:102-117` (`createSingleBanner`) передає
селектори через `this.SELECTORS?.createBannerButton` / `this.SELECTORS?.createBannerForm`
у `resolveCreateBannerButton` / `resolveCreateBannerForm` (`modules/banner_form.ts`),
які всередині викликають `document.querySelector(selector)`. Гріхардкодженого
літерала немає (перевірено `rg "banner-editor__|\.publish-button"` → 0 збігів).

`ensureCleanStart`/`finalCleanup` теж працюють із `this.SELECTORS?.createBannerForm`
через `resolveSelector` — тобто **усі три точки використовують один і той самий
централізований шлях читання селекторів** (`SelectorValue` → `document.querySelector`),
без розбіжностей.

## Що справді є «квірком» (не баг)

`resolveCreateBannerButton`/`resolveCreateBannerForm` приймають «сирий» `SelectorValue`
і кладуть його безпосередньо в `document.querySelector`, тому **масив-селектор**
(`string[]`) не отримує пріоритетного перебору, а неявно склеюється в selector-list
через `Array.prototype.toString`. Це стосується і `createSingleBanner`, і
`ensureCleanStart`/`finalCleanup` однаково — отже не є розбіжністю між ними.

Детальніше див. коментар у `modules/banner_form.ts:80-86` (квірк 1-в-1 збережено
під час рефакторингу, не змінювався).

## Статус виправлення

Не потребує змін. Відповідний пункт виключено з `TASKS.md`.
