# AUDIT — yt checkbox selector mismatch (latent bug)

- Дата: 2026-08-11
- Модель: KILO
- Статус: ВИПРАВЛЕНО (2026-08-11)

## Короткий опис

Функція `applyCheckboxStateFromCache` (модуль `youtube/yt_comment_visual_state.ts`)
шукала чекбокс коментаря за селектором `.syh-yt-checkbox`, але жоден створюваний
елемент не мав такого класу. Через це стан «прочитано» (галочка) ніколи не
відновлювався з кешу для коментарів, що вже є на сторінці.

## Дефект

- `youtube/yt_comment_visual_state.ts` — `const CHECKBOX_SELECTOR = '.syh-yt-checkbox';`
- `youtube/yt_comment_panel.ts` — обгортка чекбокса отримувала клас `syh-yt-checkbox-wrap`
  (`CHECKBOX_WRAP_CLASS`), а не `.syh-yt-checkbox`.
- `modules/ui_factory.ts` — `UiFactory.createCheckbox` встановлює інпуту клас `syh-checkbox`
  і `data-type` (для YouTube — `'yt-comment'`).

Отже в реальному DOM чекбокс — це:
  `<div class="syh-yt-checkbox-wrap"><input type="checkbox" class="syh-checkbox" data-type="yt-comment" ...></div>`

Селектор `.syh-yt-checkbox` не співпадає ані з `syh-yt-checkbox-wrap`, ані з `syh-checkbox`.
Тому `container.querySelector(CHECKBOX_SELECTOR)` повертав `null`, `applyCheckboxStateFromCache`
завершувалася на `if (!checkbox) return;` і стан не застосовувався.

## Наслідок

Функція `restoreCheckboxState` не відновлювала візуальний стан галочки «прочитано»
для коментарів, що вже є на сторінці. Користувач бачив невідмічені чекбокси навіть
для раніше прочитаних коментарів.

## Виправлення

`youtube/yt_comment_visual_state.ts`: змінено селектор на реальний клас інпуту
з урахуванням типу:

```ts
const CHECKBOX_SELECTOR = '.syh-checkbox[data-type="yt-comment"]';
```

Це узгоджено з тим, як `modules/ui_banners.ts` шукає банерний чекбокс
(`.syh-checkbox[data-type="banner"]`).

Тест `tests/yt_ui_api.test.js` (№20, №23) оновлено: раніше він фіксував дефектну
поведінку, тепер перевіряє, що стан відновлюється.

## Перевірка

- `npm test` — 1857 проходить / 0 падає (після виправлення).
- `npx fallow dead-code --circular-deps` — `total_issues: 0`.
- `npx tsc --noEmit` — чистий.
