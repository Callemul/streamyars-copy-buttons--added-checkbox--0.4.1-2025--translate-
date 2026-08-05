# Skill: StreamYard Technical Overview (Українською)

---

## Мета
Надати AI‑агентам **повний технічний огляд** веб‑інтерфейсу StreamYard, його DOM‑структуру, ключові UI‑зони, стратегії віртуалізації та готові діагностичні інструменти. Це дозволить розширенням (наприклад, копіювальникам кнопок) безпечно та стабільно інтегруватися у платформу.

---

## 1. Технічний стек
- **React** – головний фреймворк (версія визначається у глобальній змінній `__REACT_VERSION__` або через `React.version`).
- **Web Components / Shadow DOM** – використовуються для деяких модальних вікон та iframe‑контейнерів.
- **WebRTC** – обробка відео/аудіо потоків.
- **CSS‑in‑JS** (styled‑components) для внутрішніх стилізацій.
- **Інтерфейс iframe** (`https://app.streamyard.com/*`) – основна частина трансляції.

---

## 2. Основні UI‑зони та селектори
| Зона | Опис | CSS‑селектор (рекомендований) |
|------|------|-------------------------------|
| **Broadcast Canvas** | Прев’ю трансляції (вкладений iframe) | `iframe#broadcast_iframe` |
| **Chat Panel** | Чат у правій колонці (або внизу на мобільних) | `.chat-panel, .chat-messages` |
| **Studio Toolbar** | Верхня панель керування (Go Live, Invite, Share, Settings, Leave) | `.studio-toolbar button[data-action]` |
| **Participants List** | Список гостей/учасників | `.participants-list .participant` |
| **Control Bar (низ)** | Кнопки мікрофон, камера, screen‑share, layout, record | `.control-bar button[data-action]` |
| **Link Box** | Поп‑ап з URL‑ом трансляції та кнопкою копіювання | `.link-box .copy-link-btn` |
| **Streams List** | Список створених трансляцій у *Dashboard* | `.streams-list .stream-item` |
| **Recordings List** | Список записаних відео | `.recordings-list .recording-item` |
| **Banners / Alerts** | Сповіщення про підключення, помилки, підказки | `.banner, .alert, .toast` |

---

## 3. Події та їх обробка
1. **Start / Stop Stream** – `click` на `.studio-toolbar button[data-action="go-live"]`. Після кліка генерується кастомна подія `StreamYard:LiveStateChanged` на `document`.
2. **Invite Guests** – відкриття модального ` .modal-invite`. Після відкриття генерується `StreamYard:InviteOpened`.
3. **Copy Stream URL** – натискання кнопки копіювання генерує `StreamYard:LinkCopied`.
4. **Chat Message Sent** – `submit` форми в `.chat-panel form` → `StreamYard:ChatMessageSent`.
5. **Participant Join/Leave** – зміни у `.participants-list` (DOM‑мутативи) – можна слухати за допомогою `MutationObserver` (childList, subtree).

---

## 4. Надійні точки ін’єкції
| Точка | Як ін’єкціювати | Пояснення |
|-------|----------------|-----------|
| **Toolbar** | `const ref = document.querySelector('.studio-toolbar button[data-action="share"]'); ref.insertAdjacentElement('afterend', myBtn);` | Після кнопки **Share** – стабільне місце, не перестає раніше ніж toolbar готовий. |
| **Link Box** | `const copyBtn = document.querySelector('.link-box .copy-link-btn'); const newBtn = copyBtn.cloneNode(true); newBtn.id = 'myExt-copyBtn'; newBtn.textContent = '📋'; copyBtn.parentNode.appendChild(newBtn);` | Використовує існуючий шаблон, тому стиль зберігається. |
| **Chat Panel (повідомлення)** | `const chatContainer = document.querySelector('.chat-messages'); const mo = new MutationObserver(muts => { muts.forEach(m => { if (m.addedNodes.length) { /* додати іконку копіювання */ } }); }); mo.observe(chatContainer, { childList: true });` | Чат не віртуалізований – простий observer працює. |
| **Participants List** | `const list = document.querySelector('.participants-list'); const mo = new MutationObserver(...); mo.observe(list, { childList: true, subtree: true });` | Елементи у списку рециклюються – треба слідкувати за змінами. |
| **Streams / Recordings List** (Dashboard) | `document.querySelector('.streams-list')` або `.recordings-list` – аналогічно використати observer. |

---

## 5. Діагностичний скрипт (запуск у DevTools)
```js
// ==== StreamYard Diagnostic Script ==== //
(function(){
  // 1. Визначення стеку
  const reactVersion = (window.__REACT_VERSION__) || (window.React && window.React.version) || 'невідомо';
  console.log('React version:', reactVersion);

  // 2. Перевірка Shadow DOM
  const shadowRoots = [];
  document.querySelectorAll('*').forEach(el=>{ if (el.shadowRoot) shadowRoots.push(el); });
  console.log('Found Shadow DOM roots:', shadowRoots.length);

  // 3. Основні UI‑зони
  const zones = {
    broadcast: !!document.querySelector('iframe#broadcast_iframe'),
    chat: !!document.querySelector('.chat-panel'),
    toolbar: !!document.querySelector('.studio-toolbar'),
    participants: !!document.querySelector('.participants-list'),
    controlBar: !!document.querySelector('.control-bar'),
    linkBox: !!document.querySelector('.link-box'),
    streamsList: !!document.querySelector('.streams-list'),
    recordingsList: !!document.querySelector('.recordings-list'),
    banners: !!document.querySelector('.banner, .alert, .toast')
  };
  console.log('UI zones presence:', zones);

  // 4. Віртуалізовані/рецикльовані списки
  const virtualLists = [];
  document.querySelectorAll('.participants-list .participant').forEach(el=>{
    if (el.dataset && el.dataset.virtualized) virtualLists.push(el);
  });
  console.log('Potential virtualized participants list items:', virtualLists.length);

  // 5. Кастомні події (перевірка слухачів)
  const events = ['StreamYard:LiveStateChanged','StreamYard:InviteOpened','StreamYard:LinkCopied','StreamYard:ChatMessageSent'];
  events.forEach(ev=>{
    const listeners = getEventListeners(document)[ev] || [];
    console.log(`Listeners for ${ev}:`, listeners.length);
  });

  // 6. Перевірка існування наших кнопок (для idempotent injection)
  const myBtn = document.querySelector('#myExt-copyBtn');
  console.log('Our extension button already in DOM?', !!myBtn);
})();
```
> **Як користуватись:** відкрити сторінку `https://app.streamyard.com/` (або `https://studio.streamyard.com/`), відкрити DevTools (F12), вставити скрипт вище у консоль і натиснути **Enter**. Результат‑лог буде виведений у консолі.

---

## 6. Поради щодо інтеграції розширення
1. **host_permissions** у `manifest.json` → `"host_permissions": ["https://app.streamyard.com/*", "https://*.streamyard.com/*"]`.
2. **Content script timing** – `"run_at": "document_idle"` забезпечує, що toolbar вже намальований.
3. **Унікальні ID** – використовуйте префікс `syh-streamyard-` (наприклад, `syh-streamyard-copyBtn`).
4. **Idempotent injection** – перед вставкою перевіряйте `document.getElementById('syh-streamyard-copyBtn')`.
5. **Capture‑phase listeners** – для скролу чи інших UI‑подій реєструйте `addEventListener(..., {capture:true})`.

---

## 7. Типові проблеми та їх вирішення
| Проблема | Чому виникає | Рішення |
|----------|---------------|--------|
| Кнопки зникають після переходу в інший стан | StreamYard перерендирує toolbar | Додати `MutationObserver` на `.studio-toolbar` і повторно інжектити кнопку. |
| `navigator.clipboard` блокує запис | API вимагає взаємодію з користувачем | Викликати `writeText` лише в обробнику `click` вашої кнопки. |
| Дублювання кнопок після навігації | Content script запускається на кожну URL‑зміну | Перед вставкою видаляти існучі елементи (`old && old.remove()`). |
| Нестабільні ID учасників | ID генерується випадковим чином | Спирайтесь на стабільні класи або `data-` атрибути (`.participant[data-role="guest"]`). |

---

## 8. Додаткові ресурси
- Офіційна документація StreamYard UI (відкрити у DevTools → **Elements**).
- `polymer-virtualization-handling` – схожі патерни віртуалізації (хоча StreamYard не використовує Polymer, концепції схожі).
- `chrome-extension-guidance` – правила Manifest V3, permissions, content‑script налаштування.

---

*Кінець навички*
