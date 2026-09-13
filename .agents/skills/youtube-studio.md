# SKILL: YouTube Studio, Polymer Virtualization & Issues

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля YouTube Studio (`youtube/` та `youtube/studio/`, `studio.youtube.com`).

---

## 1. Polymer `<iron-list>` Virtualization & Recycling

- **Node Recycling**: Polymer перевикористовує пулик з ~15-25 DOM-вузлів (`<ytcp-comment>`). При скролі нові вузли НЕ додаються.
- **MutationObserver Warning**: `MutationObserver` на `childList` **НЕ працює** під час скролу.
- **Capture-Phase Scroll Listener**: Реагуй на скрол через capture-phase обробник на `window`:
  ```ts
  window.addEventListener('scroll', () => this.processVisibleComments(), { capture: true, passive: true });
  ```
- **Очищення застарілих даних (Stale State)**:
  При рециклінгу вузла перевіряй `commentKey`. Якщо ключ змінився, скидай застарілі атрибути (`syhStudioEventsBound`, `syhCommentKey`).

---

## 2. Зчитування Смайликів та Подій

- **Смайлики Polymer**: Текст смайликів знаходиться в `alt`-атрибутах зображень (`<img alt="🙏">`). `textContent` повертає порожній рядок.
- **Контекстне меню (ПКМ)**: Слухай події ПКМ тільки через глобальний Capture-Phase обробник на `window`:
  ```ts
  window.addEventListener('contextmenu', (e) => {
    // Ваша логіка перемикання прапорця
    e.stopImmediatePropagation();
  }, { capture: true });
  ```

---

## 3. Нативні помилки та Очищення ресурсів

- **Нативна помилка `Error: rp at a.maybeShowTooltip`**:
  Генерується самим YouTube при наведенні курсору на серце автора (`#creator-heart`). Вона НЕ ламає розширення. НЕ намагайся її чистити або приховувати.
- **Очищення при `stopModule()`**:
  Обов'язково зупиняй таймери (`clearInterval`) та видаляй event listeners (`removeEventListener`) при зупинці модуля.

---

## 4. DevTools Діагностика

```js
// Перевірка наявності iron-list та розміру пулу
console.log('iron-list:', !!document.querySelector('iron-list'));
console.log('Nodes count:', document.querySelector('iron-list')?.shadowRoot?.querySelectorAll('slot > *').length);
```

---

## 5. DOM-особливості інбоксу Studio (`/comments/inbox`) та тестові фікстури

- **Відсутність `href` в інбоксі**: У загальному інбоксі коментарів елемент `<a id="body">` мініатюри відео рендериться в Polymer з `attrHref === null` та `propHref === ""`.
- **Єдиний якір відео — `#video-title`**: Визначення категорії та зіставлення відео в інбоксі спирається виключно на текстовий вміст `#video-title`.
- **Реалістичність тестових моків**: Заборонено підставляти фіктивні посилання (`/watch?v=...`) у тестові об'єкти коментарів Studio за замовчуванням. Тестові фікстури повинні відтворювати реальний DOM (порожній `href` при наявності `#video-title`).



---

## Реєстри, яких треба триматися

| Що | Реєстр | Правило |
|---|---|---|
| Селектори Studio | `youtube/studio/studio_selectors.ts` | Селектори в скілі — довідкові; джерело істини — реєстр. Для масивів селекторів — послідовний перебір, не групування через кому (`docs/rules/dom-selectors.md`) |
| Селектори YouTube (перегляд) | `youtube/yt_selectors.ts` | |
| Кнопки коментаря | `modules/comments/comment_actions.ts` | Studio-оверайди (`studio-copy`, `syh-studio-btn-*`) живуть у реєстрі, не в `studio_ui.ts` |
| Контракт платформи | `modules/comments/comment_platform_adapter.ts` → `youtube/studio/studio_adapter.ts` | Логіка дії (`comment_action_runner.ts`) не дублюється в Studio |
| Аркуші / категорії каналів | `modules/registry/sheets.ts`, `youtube/studio/studio_category_*.ts` | |
| Ключі стану кнопок і чекбоксів | `modules/storage/storage_keys.ts` через `getButtonStatesKey()` / `getCheckboxStatesKey()` | Legacy-ключі читаються далі (`docs/rules/storage.md`) |

Повна таблиця реєстрів — `docs/ARCHITECTURE.md` §4. Сценарії змін — `docs/HOWTO_ADD.md`.
