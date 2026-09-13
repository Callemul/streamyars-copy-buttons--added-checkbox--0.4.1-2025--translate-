# SKILL: StreamYard Integration & Technical Overview

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля StreamYard (`modules/`, `app.streamyard.com`).

---

## 1. Архітектура та DOM-зони

> Джерело істини для всіх селекторів — `modules/registry/config.ts` → `SYH_CONFIG.SELECTORS`.
> Нижче лише назви полів реєстру, не самі значення — значення можуть змінитись
> при переверстці StreamYard, і тоді дублікат тут одразу застаріє.

- **Коментарі (Comments)**: `SYH_CONFIG.SELECTORS.commentBlock` (текст — `commentText`, автор — `commentAuthor`).
- **Кнопки коментарів**: `SYH_CONFIG.SELECTORS.commentButtonContainer`.
- **Банери (Banners)**: `SYH_CONFIG.SELECTORS.bannerBlock` (текст — `bannerText`).
- **Кнопки банерів**: `SYH_CONFIG.SELECTORS.bannerButtonContainer` (шапка — `bannerHeader`).
- **Права панель (Right Tabs)**: `SYH_CONFIG.SELECTORS.rightTabButtons`.
- **Зіркові коментарі (Starred)**: `SYH_CONFIG.SELECTORS.starredList`.

---

## 2. Події та Ін'єкції

- **Точка ін'єкції кнопок**: Кнопки додаються всередину контейнерів дій коментарів або банерів. Наприклад (див. `modules/streamyard/ui/ui_comments.ts` та `modules/streamyard/ui/ui_banners.ts`):
  ```ts
  import { SYH_CONFIG, queryBySelectorValue } from 'modules/config';

  const targetContainer = queryBySelectorValue(SYH_CONFIG.SELECTORS.commentButtonContainer);
  if (targetContainer && !targetContainer.querySelector('.syh-custom-buttons-comment')) {
      targetContainer.appendChild(myButtonsContainer);
  }
  ```
- **Пайплайн ін'єкції (DOM Observer)**: Замість локальних обсерверів використовується єдиний глобальний `DomObserverService` (`modules/dom/dom_observer.ts`), який слухає `document.body` і сповіщає про появу селекторів (наприклад, `commentBlock` чи `bannerBlock`).
- **Події кнопок коментаря**: слухачі вішаються на самі кнопки — це робить `CommentInjector` (`modules/streamyard/comments/streamyard_comment_binding.ts`) одразу після вставки панелі. Подія береться з реєстру: StreamYard слухає `mouseup`, бо для 🙏 має значення кнопка миші. Обробляє клік `StreamYardCommentAdapter.runAction` (`modules/streamyard/comments/streamyard_adapter.ts`). Стійкість до перемальовувань дає маркер `data-syh-events-bound` на контейнері кнопок: зникла панель — зникла й позначка.
- **Делегування на `document`** лишилось для того, що не належить окремій картці: Auto-Heal, зірка, коліщатко, ПКМ по кнопках платформи (`modules/streamyard/comments/index.ts`) і банери (`modules/streamyard/banners/index.ts`).
- **Idempotency**: Завжди перевіряй наявність власного контейнера (напр. `.syh-custom-buttons-comment` або `.syh-custom-buttons`) перед ін'єкцією, оскільки React-дерево StreamYard постійно перемальовується.
- **Clipboard API**: копіювання йде через `SYH_UTILS.copyAndShowBanner` усередині `StreamYardCommentAdapter.runAction`, а не з UI-обробника напряму.

---

## 3. Діагностичний скрипт для DevTools (F12)

Консоль браузера не має доступу до ES-модулів розширення, тому селектори сюди
не можна імпортувати — їх треба **щоразу підставляти вручну**, скопіювавши актуальне
значення з `modules/registry/config.ts` → `SYH_CONFIG.SELECTORS.<ключ>` (селектор може бути
масивом-фолбеком — тоді об'єднай значення через кому). Не бери значення з якогось
старого запису в цьому скілі чи в пам'яті — тільки з файлу зараз.

```js
// Підстав сюди актуальні рядки з SYH_CONFIG.SELECTORS (modules/registry/config.ts):
const SEL = {
  commentBlock: /* SYH_CONFIG.SELECTORS.commentBlock */ '',
  bannerBlock: /* SYH_CONFIG.SELECTORS.bannerBlock */ '',
  rightTabButtons: /* SYH_CONFIG.SELECTORS.rightTabButtons */ '',
};

console.log({
  comments: document.querySelectorAll(SEL.commentBlock).length,
  banners: document.querySelectorAll(SEL.bannerBlock).length,
  rightTabs: document.querySelectorAll(SEL.rightTabButtons).length,
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
| Селектори StreamYard | `modules/registry/config.ts` → `SYH_CONFIG.SELECTORS` | Селектори в цьому скілі — довідкові. **Джерело істини — `config.ts`**; захардкоджувати їх у коді заборонено, звертайся через `queryBySelectorValue` / `closestBySelectorValue` |
| Кнопки коментаря (склад, іконки, `data-action`) | `modules/comments/comment_actions.ts` | Нова кнопка = один запис у реєстрі; вона з'явиться і на YouTube, і в Studio |
| Вигляд кнопки/чекбокса | `modules/dom/ui_factory.ts` | `document.createElement('button')` вручну не створюємо |
| Аркуші (канали/програми) | `modules/registry/sheets.ts` | |
| Ключі сховища | `modules/storage/storage_keys.ts` | Рядкові літерали заборонені |
| Плагіни StreamYard | `modules/core/plugin_registry.ts` | |

> StreamYard має `CommentPlatformAdapter` — `modules/streamyard/comments/streamyard_adapter.ts` (T7).
> Усі три поверхні працюють однаково: реєстр дій → панель → `CommentInjector` →
> адаптер. Особливості StreamYard (ЛКМ/коліщатко/ПКМ по 🙏, банер копіювання,
> база молитов, `data-syh-just-added`) — усередині адаптера, не в UI-обробниках.

Повна таблиця реєстрів — `docs/ARCHITECTURE.md` §4. Сценарії змін — `docs/HOWTO_ADD.md`.
