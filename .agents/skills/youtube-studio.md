# SKILL: YouTube Studio, Polymer Virtualization & Issues

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля YouTube Studio (`modules/youtube/`, `studio.youtube.com`).

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
