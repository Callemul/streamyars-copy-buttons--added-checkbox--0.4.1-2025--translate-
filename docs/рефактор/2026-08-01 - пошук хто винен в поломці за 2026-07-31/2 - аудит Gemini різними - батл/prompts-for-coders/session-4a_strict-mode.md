# Сесія 4A — tsconfig strict: true (L1)

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1–3 виконані (критичні баги, стабілізація, popup-міграція, storage namespacing).
Верифікація: `npm run lint && npm run test && npm run build`

## Скоуп
Читай і змінюй ТІЛЬКИ: `tsconfig.json` + `.ts` файли, де компілятор покаже помилки.
**Якщо помилок більше ~50 — ЗУПИНИСЬ і доповідь кількість і топ-10 файлів за кількістю помилок. Не намагайся виправити все мовчки.**

## Формат звіту
- Початкова кількість помилок → фінальна кількість
- Змінено: `файл` → що саме виправлено (типи, null-checks)
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## Крок 1: Увімкнути strict mode

У `tsconfig.json` встановити:

    "strict": true

Запустити `npm run build` — зібрати повний список помилок.

## Крок 2: Виправити помилки по одному файлу

Порядок: від файлу з найменшою кількістю помилок до найбільшої. Типові патерни виправлень:

```typescript
// 1. Parameter implicitly has an 'any' type
// ❌ function process(data) { ... }
// ✅ function process(data: CommentData) { ... }

// 2. Object is possibly 'null'
// ❌ document.querySelector('.btn').click()
// ✅ document.querySelector('.btn')?.click()
// ✅ або з перевіркою: const btn = document.querySelector('.btn'); if (btn) { ... }

// 3. Type 'string | undefined' is not assignable to type 'string'
// ❌ const name: string = el.textContent
// ✅ const name: string = el.textContent ?? ''

// 4. Type 'string | null' from getAttribute
// ❌ const id: string = el.getAttribute('data-id')
// ✅ const id = el.getAttribute('data-id'); if (!id) return;
```

## Заборонені «обхідні» рішення

- ❌ `as any` — для придушення помилки
- ❌ `// @ts-ignore` / `// @ts-nocheck`
- ❌ `!` (non-null assertion) без реальної гарантії non-null
- Якщо без assertion ніяк — додай коментар ЧОМУ це безпечно

## Крок 3: Фінальна перевірка

`npm run lint && npm run test && npm run build` — все чисто зі `strict: true`.

---

## Приймання
- [ ] `tsconfig.json` містить `"strict": true`
- [ ] `npm run build` проходить без помилок
- [ ] 0 нових `as any`, `@ts-ignore`, `@ts-nocheck` (порівняти з baseline до сесії)
- [ ] Розширення працює: popup відкривається, content scripts інжектяться, кнопки працюють
