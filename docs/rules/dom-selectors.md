# Правила: DOM, селектори і TypeScript

> Винесено з `AGENTS.md`. Реєстри селекторів — `docs/ARCHITECTURE.md` §4.

## 🎯 Справжній пріоритет селекторів (Sequential Fallback)

Заборонено використовувати CSS-групування через кому (`querySelector(selectors.join(','))`),
коли один селектор у масиві може бути DOM-батьком іншого (наприклад, `#metadata #name`
vs `.author-text`). Слід використовувати послідовний перебір (`queryOne`), щоб перший
селектор у масиві завжди мав справжній пріоритет над порядком у DOM-дереві.

## 🩺 TypeScript Strict Null Checks у замиканнях

Коли поля класу/об'єкта (`this.someEl`) використовуються всередині ітераторів чи колбеків
(`forEach`, `map`, `addEventListener`), обов'язково кешуйте їх у локальну змінну перед
замиканням:

```ts
const el = this.someEl;
if (!el) return;
```

Інакше — помилка `TS2531: Object is possibly 'null'`.

## Manifest V3

TypeScript / Vite. `host_permissions` обмежені конкретними доменами.
DOM event listeners у попапі — strictly всередині `DOMContentLoaded`.

## Спостереження за DOM

Новий `MutationObserver` напряму не створюється — використовується
`modules/dom_observer.ts` (він має захист колбеків: падіння одного обробника
не зупиняє решту селекторів у кадрі).
