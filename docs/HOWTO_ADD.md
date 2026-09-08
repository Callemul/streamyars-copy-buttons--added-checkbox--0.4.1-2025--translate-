# Як додати X

> Практичні сценарії найчастіших змін. Карта проєкту — [ARCHITECTURE.md](ARCHITECTURE.md).

## Правило номер нуль

**Перед тим як створювати UI-елемент, поле чи ключ — знайди його реєстр**
(таблиця реєстрів: [ARCHITECTURE.md §4](ARCHITECTURE.md#4-реєстри-проєкту-ssot-точки)).

- Реєстр є → додай **один запис** у нього.
- Реєстру немає → **створи реєстр**, а не другу копію поруч із першою.
- Скопіювати наявний блок і поправити — заборонено. Саме так у проєкті з'явились три
  незалежні описи однієї панелі кнопок, і кнопка з'являлась лише на одній із трьох поверхонь.

Ознака, що ти йдеш неправильно: доводиться робити ту саму правку вдруге в іншому файлі.

---

## 1. Додати дію над коментарем (кнопку)

Дія над коментарем — це кнопка, яка є **на всіх трьох поверхнях**: StreamYard,
YouTube і YouTube Studio.

### Крок 1 — запис у реєстрі (обов'язковий)

`modules/comment_actions.ts`:

```ts
{
    id: 'thanks',                 // канонічний id — додай його і в CommentActionId
    stateType: 'thanks',          // null, якщо дія нічого не зберігає (як копіювання)
    icon: '💚',
    title: 'Додати до подяк',
    platforms: {
        streamyard: { domAction: 'copy-thanks', type: 'comment' },
        youtube:    { domAction: 'add-thanks', icon: 'Додати до подяк', className: 'syh-yt-btn syh-yt-btn-thanks' },
        studio:     { domAction: 'studio-thanks', className: 'syh-studio-btn syh-studio-btn-thanks' }
    }
}
```

Додай id у `PLATFORM_ACTION_ORDER` для кожної поверхні, де кнопка має бути видима.
Поверхня, якій дія не потрібна, отримує `null` замість оверайду — це свідома,
задокументована відсутність, а не забудькуватість.

**Після цього кроку вже працює:** кнопка малюється на всіх поверхнях у правильному
порядку, слухач кліку навішується автоматично (`CommentInjector` ходить циклом по
реєстру), тип стану виводиться з реєстру.

### Крок 2 — платформна частина (лише якщо дія має стан)

| Що | Де |
|---|---|
| Віддати елемент кнопки | `getButtons()` в `youtube/yt_adapter.ts`, `youtube/studio/studio_adapter.ts` — краще через `actionButtons: { thanks: el }`, а не новим іменованим полем |
| Намалювати активний стан | `applyButtonState()` у тих самих адаптерах |
| CSS | `youtube/youtube_styles.css`, `youtube/studio/studio_styles.css`, `styles.css` |
| Обробка на StreamYard | `modules/event_comments/formatters.ts` — гілка за канонічним id (до виконання T7) |

### Крок 3 — якщо дія зберігає новий тип запису

- Ключ — тільки через `modules/storage_keys.ts`.
- Читання старих даних не ламати: див. `docs/rules/storage.md` (Zero data loss).
- Відображення в попапі — `popup/popup_telegram_collected.ts`, `modules/ui_starred_markup.ts`.

### Крок 4 — перевірка

```bash
npm run verify
```

Тест `tests/comment_actions.test.js` має бути доповнений новою дією: він фіксує
`data-action`, іконки, підписи й порядок для кожної поверхні.

---

## 2. Додати поле на аркуш попапу

> ⚠️ Реєстру полів ще немає (задача **T8**), тому поки що поле реєструється вручну
> в шести місцях. Якщо робиш це вже вдруге — зроби спершу T8.

| # | Що | Де |
|---|---|---|
| 1 | Розмітка з класом-гачком `.js-<field>` | `<template id="sheet-content-template">` у `popup/popup.html` |
| 2 | `setAttrId('.js-<field>', '<field>__${sId}')` | `popup/popup_sheet_renderer.ts` |
| 3 | Канонічний ключ | `POPUP_SHEET_KEYS` у `modules/storage_keys.ts` |
| 4 | Легасі-префікс (якщо поле старе) | `popup/popup_sheet_keys.ts` |
| 5 | `restoreSheet<Field>()` | `popup/popup_sheet_field_restorer.ts` |
| 6 | Збереження при зміні | `popup/popup_sheet_bindings.ts` |

Шаблон клонується для **кожного** аркуша, тому поле з'явиться одразу на всіх —
за умови, що воно оголошене в шаблоні, а не вставлене в один конкретний аркуш кодом.

Перевірка: `npm run verify` + ручний прогін «заповнити → закрити попап → відкрити».

---

## 3. Додати опцію в налаштування

> ⚠️ Дескрипторів опцій ще немає (задача **T9**) — поки що п'ять паралельних списків.

| # | Що | Де |
|---|---|---|
| 1 | Поле в `OptionsState` | `options/defaults.ts` |
| 2 | Значення за замовчуванням у `DEFAULT_OPTIONS` | `options/defaults.ts` |
| 3 | Розмітка (`<input id="opt…">`) | `options/options.html` |
| 4 | Запис у форму — `populateFormElements` | `options/form.ts` |
| 5 | Читання з форми — `readOptionsFromForm` | `options/form.ts` |
| 6 | Валідація (якщо число/діапазон) | `options/validation.ts` |
| 7 | Споживач опції | модуль, який на неї реагує |

**Не лишай опцію без споживача.** Прапорець `show_copy_buttons` два релізи зберігався,
перевірявся в тестах і ніде не використовувався — його довелося видаляти.

---

## 4. Додати нову платформу (наприклад, Twitch)

1. Селектори — окремий файл-реєстр (`twitch/twitch_selectors.ts`), за зразком `yt_selectors.ts`.
2. `CommentPlatformAdapter` — `twitch/twitch_adapter.ts` на базі `BaseCommentPlatformAdapter`.
3. Панель — з реєстру дій: додай `twitch` у `CommentPlatformId`, оверайди в кожну дію
   та порядок у `PLATFORM_ACTION_ORDER`.
4. Entry point + запис у `manifest.json` (`content_scripts`, `host_permissions`).
5. Спостерігач DOM — через `modules/dom_observer.ts`, не власний `MutationObserver`.
6. Ключі стану — `getButtonStatesKey()` / `getCheckboxStatesKey()` з `STORAGE_KEYS`.

Логіка дій (`comment_action_runner.ts`) і збереження (`CommentService`) переписуватись
**не мають** — якщо довелось, значить контракт адаптера обійдено.

---

## 5. Додати правило для агентів

- Довготривале технічне правило → `docs/rules/<тема>.md` (і рядок-посилання в `AGENTS.md`).
- Правило про поверхню (StreamYard / Studio / MV3) → відповідний `.agents/skills/*.md`.
- Селектор у скілі — це **посилання на реєстр** (`modules/config.ts`, `yt_selectors.ts`),
  а не скопійований рядок: скопійований рядок протухає мовчки.

---

## Чекліст перед комітом

```bash
npm run verify
```

- [ ] зміна зроблена в реєстрі, а не продубльована в UI-обробнику;
- [ ] нова дія/поле/опція має споживача і тест;
- [ ] старі дані читаються (легасі-ключі не зламані);
- [ ] `npm run verify` зелений;
- [ ] якщо змінювався DOM поверхні — ручна перевірка в браузері.
