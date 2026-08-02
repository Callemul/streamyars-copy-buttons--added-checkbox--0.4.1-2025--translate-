# Сесія 1A — Memory leak + Stale closures (studio_events.ts)

## Контекст
Chrome Extension MV3, Vite + TS.
Верифікація: `npm run lint && npm run test && npm run build`

## Скоуп
Читай і змінюй ТІЛЬКИ: `youtube/studio/studio_events.ts`
Номери рядків орієнтовні — шукай за назвою функції.
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід `npm run lint && npm run test && npm run build`

---

## H1: Memory leak — накопичення document-level click listeners (~2 год)

**Функція:** `bindStudioCommentEvents()` (~рядок 270)

**Проблема:** Додає `document.addEventListener('click', ...)` для закриття dropdown **при кожному виклику**. Функція викликається для кожного коментаря при віртуальному скролінгу. За сесію — сотні дублюючих listeners.

**Рішення — глобальний одноразовий listener:**
```typescript
// ❌ ЗАРАЗ — всередині bindStudioCommentEvents(), множиться:
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.style.display = 'none';
});

// ✅ ПІСЛЯ — один раз при ініціалізації модуля:
let activeDropdown: HTMLElement | null = null;

document.addEventListener('click', (e) => {
    if (activeDropdown && !activeDropdown.contains(e.target as Node)) {
        activeDropdown.style.display = 'none';
        activeDropdown = null;
    }
});

// У bindStudioCommentEvents() — лише оновлювати activeDropdown:
toggleBtn.addEventListener('click', () => {
    activeDropdown = dropdown;
    dropdown.style.display = 'block';
});
```

**Приймання:**
- [ ] `document.addEventListener('click')` — рівно 1 раз за lifecycle модуля
- [ ] Dropdown закривається при скролінгу 50+ коментарів
- [ ] Жодних нових listeners після повторних `bindStudioCommentEvents()`

---

## H3: Stale Closures — кнопки копіюють дані ПОПЕРЕДНЬОГО коментаря (~3 год)

**Виконувати ПІСЛЯ H1** (той самий файл, менше конфліктів).

**Функція:** `bindStudioCommentEvents()` (~рядки 190-280)

**Проблема:** YouTube Studio `iron-list` (Polymer virtual scrolling) перевикористовує DOM-вузли `ytcp-comment`. Прапор `dataset.syhBound = 'true'` блокує повторний bind, але замикання зберігають **застарілі** значення `author`/`text` від попереднього мешканця DOM-вузла.

**Рішення — зчитування в момент кліку:**
```typescript
// ❌ ЗАРАЗ — замикання захоплює значення при першому bind:
const author = getAuthorNameText(threadEl);
const text = getCommentText(threadEl);
copyBtn.addEventListener('click', () => {
    copyToClipboard(`${author}: ${text}`);  // ← stale!
});

// ✅ ПІСЛЯ — fresh read:
copyBtn.addEventListener('click', () => {
    const freshAuthor = getAuthorNameText(threadEl);
    const freshText = getCommentText(threadEl);
    copyToClipboard(`${freshAuthor}: ${freshText}`);
});
```

**Приймання:**
- [ ] Прокрутити 30+ коментарів вниз→вгору, Copy на перевикористаному — текст **поточний**
- [ ] Працює для обох кнопок: Copy і Add to Questions
