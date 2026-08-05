# SKILL: StreamYard Integration & Technical Overview

> **Контекст:** Використовувати виключно під час розробки та дебагінгу модуля StreamYard (`modules/streamyard/`, `app.streamyard.com`).

---

## 1. Архітектура та DOM-зони

- **Broadcast Canvas**: Video preview inside `iframe#broadcast_iframe`.
- **Chat Panel**: `.chat-panel, .chat-messages` (НЕ віртуалізований, стандартний `MutationObserver` на `childList` працює).
- **Studio Toolbar**: `.studio-toolbar button[data-action]` (Go Live, Share, Invite).
- **Control Bar**: `.control-bar button[data-action]` (Mic, Cam, Layout).
- **Link Box**: `.link-box .copy-link-btn`.

---

## 2. Події та Ін'єкції

- **Точка ін'єкції кнопок**: Вставляти після кнопки **Share**:
  ```js
  const ref = document.querySelector('.studio-toolbar button[data-action="share"]');
  ref.insertAdjacentElement('afterend', myBtn);
  ```
- **Кастомні події**: `StreamYard:LiveStateChanged`, `StreamYard:InviteOpened`, `StreamYard:LinkCopied`, `StreamYard:ChatMessageSent`.
- **Idempotency**: Перевіряй наявність кнопки перед вставкою (`document.getElementById('syh-streamyard-copyBtn')`).
- **Перемальовка Toolbar**: StreamYard перемальовує toolbar при зміні стану — використовуй `MutationObserver` на `.studio-toolbar` для відновлення ін'єкції.
- **Clipboard API**: Виклики `navigator.clipboard.writeText` виконувати строго всередині обробника `click`.

---

## 3. Діагностичний скрипт для DevTools (F12)

```js
console.log({
  broadcast: !!document.querySelector('iframe#broadcast_iframe'),
  chat: !!document.querySelector('.chat-panel'),
  toolbar: !!document.querySelector('.studio-toolbar'),
  myBtn: !!document.querySelector('#syh-streamyard-copyBtn')
});
```