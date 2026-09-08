# SKILL: StreamYard Integration & Technical Overview

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля StreamYard (`modules/streamyard/`, `app.streamyard.com`).

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
