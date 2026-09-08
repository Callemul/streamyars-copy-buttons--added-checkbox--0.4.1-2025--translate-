# SKILL: StreamYard Integration & Technical Overview

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля StreamYard (`modules/`, `app.streamyard.com`).

---

## 1. Архітектура та DOM-зони

- **Коментарі (Comments)**: `[class*="PlatformComment__Wrap"]` (включає текст `[class*="PlatformCommentShell__ContentSpan"]` та автора `[class*="PlatformCommentShell__NameText"]`).
- **Кнопки коментарів**: `[class*="PlatformComment__TopRightButtonGroup"]`.
- **Банери (Banners)**: `[class*="Banner__LiWrap"]` (включає текст `[class*="Banner__BannerText"]`).
- **Кнопки банерів**: `[class*="Banner__DesktopTopIconRow"]` (та шапка `[class*="BannersHeader__Header"]`).
- **Права панель (Right Tabs)**: Вкладки перемикаються кнопками `button[class*="RightTabButton__StyledButton"]` (або `[id*="broadcast-aside-tab-"]`).
- **Зіркові коментарі (Starred)**: `[class*="StarredCommentList__List"]`.

---

## 2. Події та Ін'єкції

- **Точка ін'єкції кнопок**: Кнопки додаються всередину контейнерів дій коментарів або банерів. Наприклад (див. `modules/ui_comments.ts` та `modules/ui_banners.ts`):
  ```js
  const targetContainer = document.querySelector('[class*="PlatformComment__TopRightButtonGroup"]');
  if (!targetContainer.querySelector('.syh-custom-buttons-comment')) {
      targetContainer.appendChild(myButtonsContainer);
  }
  ```
- **Пайплайн ін'єкції (DOM Observer)**: Замість локальних обсерверів використовується єдиний глобальний `DomObserverService` (`modules/dom_observer.ts`), який слухає `document.body` і сповіщає про появу селекторів (наприклад, `commentBlock` чи `bannerBlock`).
- **Делегування подій**: Жодні `click`-слухачі не вішаються на самі кнопки під час ін'єкції. Всі події обробляються через глобальне делегування на `document` (`mousedown`, `mouseup`, `contextmenu`, `change`), що реалізовано в `modules/event_comments/index.ts` та `modules/event_banners/index.ts`.
- **Idempotency**: Завжди перевіряй наявність власного контейнера (напр. `.syh-custom-buttons-comment` або `.syh-custom-buttons`) перед ін'єкцією, оскільки React-дерево StreamYard постійно перемальовується.
- **Clipboard API**: Копіювання (`navigator.clipboard.writeText`) та інші дії відбуваються всередині делегованих глобальних обробників (`mouseup`, `contextmenu`).

---

## 3. Діагностичний скрипт для DevTools (F12)

```js
console.log({
  comments: document.querySelectorAll('[class*="PlatformComment__Wrap"]').length,
  banners: document.querySelectorAll('[class*="Banner__LiWrap"]').length,
  rightTabs: document.querySelectorAll('button[class*="RightTabButton__StyledButton"]').length,
  injectedCommentButtons: document.querySelectorAll('.syh-custom-buttons-comment').length
});
```

---

## 4. Патерни модальних вікон StreamYard

- **Безпечне монтування**: Монтувати оверлей через fallback:
  ```ts
  const target = document.body || document.documentElement;
  target?.appendChild?.(overlay);
  ```
  Це захищає код у тестах з мінімальними моками DOM.
- **Двоколонковий UI розбору**:
  - Ліва колонка: `<textarea>` + чіпси швидких шаблонів заголовків (`+ ❓`, `+ 🙏`, `+ 📺`) + копіювання діагностичного логу.
  - Права колонка: реактивний Live Preview (150ms debounce) із блоковими перемикачами категорій (`[ 🟣 Ефір | 🟠 Глядачі | 🔵 Молитва ]`).
- **Життєвий цикл сесії**: Зберігати драфт у `sessionStorage` (`syh_banner_modal_draft`) для збереження даних протягом сесії і автоматичного очищення при закритті вкладки.
- **Делегування запуску**: При кліку «Створити» модалка миттєво закривається, а створення виконується через єдину точку входу `bannerCreator.executeCustomBanners(banners, hasStandardFormat)`.


---

## 5. Реєстри, яких треба триматися

| Що | Реєстр | Правило |
|---|---|---|
| Селектори StreamYard | `modules/config.ts` → `SYH_CONFIG.SELECTORS` | Селектори в цьому скілі — довідкові. **Джерело істини — `config.ts`**; захардкоджувати їх у коді заборонено, звертайся через `queryBySelectorValue` / `closestBySelectorValue` |
| Кнопки коментаря (склад, іконки, `data-action`) | `modules/comment_actions.ts` | Нова кнопка = один запис у реєстрі; вона з'явиться і на YouTube, і в Studio |
| Вигляд кнопки/чекбокса | `modules/ui_factory.ts` | `document.createElement('button')` вручну не створюємо |
| Аркуші (канали/програми) | `modules/sheets.ts` | |
| Ключі сховища | `modules/storage_keys.ts` | Рядкові літерали заборонені |
| Плагіни StreamYard | `modules/plugin_registry.ts` | |

> ⚠️ StreamYard поки не має `CommentPlatformAdapter` — кліки обробляє
> `modules/event_comments/*`. Імена дій там уже резолвляться через реєстр
> (`resolveActionId('streamyard', ...)`), повна міграція — задача T7 в
> `docs/audits/active/2026-09-08_CLAUDE_OPUS_5_TASKS.md`.

Повна таблиця реєстрів — `docs/ARCHITECTURE.md` §4. Сценарії змін — `docs/HOWTO_ADD.md`.
