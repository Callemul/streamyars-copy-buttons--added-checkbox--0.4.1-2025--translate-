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

## 🔗 Панель кнопок коментаря і прив'язка — нерозривна пара

**Інваріант:** там, де в картку коментаря вставляється панель кнопок
(`SYH_UI.addButtonsToComment`), наступним кроком **обов'язково** йде
`bindStreamYardComment` (`modules/streamyard_comment_binding.ts`).

```ts
SYH_UI.addButtonsToComment(el);
bindStreamYardComment(el);        // ← без цього рядка кнопки мовчки мертві
```

Чому це окреме правило, а не «і так очевидно»: після T7 слухачі навішуються на
самі кнопки, а не делегуються з `document`. Тому панель без прив'язки виглядає
абсолютно правильною — кнопки на місці, іконки ті самі, класи ті самі — і просто
нічого не робить. Ані `tsc`, ані `eslint`, ані тести панелі цього не бачать:
панель же побудована коректно.

Симетрично: картка, яку StreamYard прибрав із DOM, знімається через
`unbindStreamYardComment` (`onCommentRemoved`), інакше залишаються висіти
`AbortController` і маркер `data-syh-events-bound`.

Сьогодні єдина точка вставки — `modules/bootstrap_dom.ts` (`onCommentAdded`).
Інваріант тримає `tests/streamyard_panel_binding_invariant.test.js`:

- **поведінково** — проходить по всіх зонах `DOM_REGISTRATIONS`; якщо після
  `onAdded` на картці з'явилась панель, `isEventsBound` мусить бути `true`
  (нова зона в таблиці покривається автоматично);
- **по джерелах** — жоден модуль у `modules/` і `main.ts` не має викликати
  `addButtonsToComment` без `bindStreamYardComment` у тому ж файлі (ловить
  вставку панелі поза `DOM_REGISTRATIONS` — Auto-Heal, новий плагін).
