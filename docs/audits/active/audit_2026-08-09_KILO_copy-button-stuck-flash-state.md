# [2026-08-09] — KILO — Аудит: латентний баг «кнопка копіювання застрє у стані `✅` після подвійного кліку»

> **Контекст виявлення:** знайдено під час рефакторингу `CommentInjector.handleAction` → `modules/comment_action_runner.ts` (етап 3, CRAP-хотспот `comment_injector.ts`, cyc=13, 85 LOC). Емпірична перевірка rapid‑click сценарію.

> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження (UI‑поведінкова зміна: треба узгодити з UX‑правками).

---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

У `CommentInjector.handleCopyClick` (`modules/comment_injector.ts:151`, після рефактору — делеговано, а логіка не змінена) є фіксований `setTimeout` на 1200 мс, який **зберігає лише одну копію `origHtml`**:

```ts
const origHtml = btn.innerHTML;          // <-- знімок стану на момент кліку
const origTitle = btn.title;
btn.innerHTML = success ? '✓' : '❌';
...
setTimeout(() => {
    btn.innerHTML = origHtml;            // <-- відновлення тієї ж копії
    ...
}, 1200);
```

**Контракт користувача:** кожен клік по кнопці копіювання повинен: (а) показати `✓`/`:(❌)` на 1.2 с, (б) повернути **оригінальну** іконку.

**Реальність:** якщо користувач натискає кнопку **другий раз до спливання першого таймера**, другий клік зберігає `origHtml = '✓'` (стан першого відображення), а перший таймер потім **відновлює `'✓'`** замість оригіналу. Кнопка **застрює** у стані `✓` назавсігді.

`tsc` тут **нічого не каже** — це не помилка типів, а логічна помилка на рівні стану UI‑елемента.

### Емпіричний доказ (happy-dom)

```
start                : PLACEHOLDER_ICON
after click #1       : ✓
after click #2       : ✓
after timer #1 (1.2s): ✓
after timer #2       : ✓   <-- очікувалось PLACEHOLDER_ICON
```

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

1. Користувач тисне 📋 (копіювання коментаря в Starred).
2. `handleCopyClick`: `origHtml = 'PLACEHOLDER_ICON'`, `btn.innerHTML = '✓'`, планує `timer#1`.
3. Через 800 мс користувач **ще раз** тисне ту ж кнопку (не дочекавшись 1200 мс).
4. `handleCopyClick`: `origHtml = '✓'` (поточний вміст), `btn.innerHTML = '✓'` (знову), планує `timer#2`.
5. Оскільки `copyToClipboard` — асинхронна, а в реальному буфері обміну вже є текст → `success = true` → `✓`.
6. `timer#1` спливає: `btn.innerHTML = '✓'` (з `origHtml` першого кліку). Виглядає ніби нічого не відбулося.
7. `timer#2` спливає: `btn.innerHTML = '✓'` (з `origHtml` другого кліку). Кнопка **залишається `✓` назавсігді**.

### Наслідок A — візуальний баг (UX)

Кнопка постійно показує `✓` — користувач бачить, ніби копіювання успішне, навіть якщо фактичне копіювання відбулося тисячу разів тому.

### Наслідок B — відображення невірного стану вдачі

Якщо другий клік завершився `❌` (`copyToClipboard` поверне `false`), `origHtml = '✓'`, і після `timer#2` кнопка **показує `✓`** навіть при невдалому копіюванні — **брешивий сигнал успіху**.

### Масштаб

Цей самий патерн (`setTimeout(() => { btn.innerHTML = origHtml; … }, N)`) є **третім** випадком у проєкті. Подібні блоки в `ui_comments.addStarredTabCopyButton` (70) можуть мати ту ж саму слабкість при подвійному кліку по кнопці копіювання Starred‑списку.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

**Варіант А (мінімальний, 1‑в‑1):** захистити `setTimeout` від «запізнаного» відновлення:

```ts
private async handleCopyClick(e, btn, element) {
    e.stopPropagation();
    const ctx = this.adapter.getCommentContext(element);
    if (!ctx) return;
    const formatted = CommentService.formatForClipboard(ctx.author, ctx.text);
    const success = await CommentService.copyToClipboard(formatted);

    const origHtml = btn.innerHTML;
    const origTitle = btn.title;
    btn.innerHTML = success ? '✓' : '❌';
    btn.classList.add('syh-copied-flash');
    // <-- новий знімок: прив’язуємо таймер до саме цього кліку
    const thisRender = { html: origHtml, title: origTitle };
    setTimeout(() => {
        // відновлюємо ТІЛЬКИ якщо стан не змінився іншим кліком
        if (btn.dataset.lastCopyRenderId !== thisRender.id) return;
        btn.innerHTML = thisRender.html;
        btn.title = thisRender.title;
        btn.classList.remove('syh-copied-flash');
    }, 1200);
}
```

**Варіант Б (без ID):** використовувати `AbortController`/`Signal` або скасовувати попередній таймер:

```ts
const controller = new AbortController();
const prev = btn._copyTimer;
if (prev) { prev.abort(); clearTimeout(prev.id); }
btn._copyTimer = { id: setTimeout(…, 1200), abort: () => clearTimeout(id) };
```

### 3.1 Що зміниться для користувача

| # | Сценарій | Зараз | Після |
|---|---|---|---|
| 1 | Один клік 📋 | `✓` на 1.2 с → `📋` | Без змін |
| 2 | Два кліки швидко | Кнопка **застрює** на `✓` | Кожен клік відновлює оригінал своєму таймеру |
| 3 | Другий клік → `❌`, перший → `✓` | Після timer#2: `✓` (брешивий успіх) | Після timer#2: `❌` (справжній стан) |

### 3.2 Ризики міграції

1. **Кількість кліків**: перевірити на живому попапі (F12) — двічі швидко натиснути 📋 в списку Starred.
2. **Тести**: `tests/comment_injector.test.js` поки не симулює rapid‑click (не має тесту на concurrency таймера). Додати.
3. **UX‑рішення**: питання — чи слід **скасовувати** попередній таймер, чи **запобігати** другому кліку під час анімації. Це виправда потребує UX‑огляду.

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

| Файл | Функція / рядок | Що саме |
|---|---|---|
| `modules/comment_injector.ts` | `handleCopyClick`, рядки 151–171 (делеговано, логіка незмінна) | `setTimeout` з одним `origHtml`‑знімком |
| `modules/ui_comments.ts` | `addStarredTabCopyButton` → click‑handler, рядки 148–156 | **Ідентичний патерн**: `const iconSpan = copyBtn.querySelector('.syh-starred-copy-icon')` + `setTimeout(() => { iconSpan.textContent = '📋'; … })` |
| `modules/comment_action_runner.ts` | (не стосується — `handleCopyClick` залишився у `CommentInjector`) | Лише посилає; логіка `handleAction` винесена |

> **Примітка:** `handleCopyClick` є приватним методом класу `CommentInjector`, тому рефакторинг `handleAction` у `comment_action_runner.ts` не торкає його.

---

## 5. Перевірка після виправлення (чек-лист)

- [ ] DevTools на живому попапі: подвійний швидкий клік по 📋 → кнопка повертає `📋` після 1.2 с кожного кліку.
- [ ] DevTools: другий клік → `❌`, перший → `✓` → після Timer#2 відображається `❌` (справжній стан).
- [ ] `npm test` — додати rapid‑click кейс у `tests/comment_injector.test.js`.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` — чисто.
- [ ] Перевірити `addStarredTabCopyButton` у `ui_comments.ts` на ту саму уразливість (третій випадок).

---

## 6. Побічні спостереження

1. Патерн `setTimeout(() => { restore(orig) }, N)` повторюється в 2‑х місцях продукту — це **Single Source of Truth violation** щодо управління таймерами UI‑анімації. Варто винести хелпер `flashThenRestore(el, flashMs)`.
2. **Загальний стан type-check**: `tsc --noEmit` чистий після рефакторингу Етапу 3 (0 помилок). Цей баг — runtime‑логічний, `tsc` його не ловить.
3. **Fallow не бачить цю проблему**: це логічна помилка у керуванні DOM‑станом, а не модульна/структурна. `npx fallow dead-code` та `npx fallow health` її не рапортують.
4. `copyBtn.title` зберігається, але `title` **ніде не змінюється** під час `✓`/`:`(❌)`‑відображення — це **dead store**: змінна записується, але значення використовується лише для відновлення того ж самого, що було. Не баг, а зайва змінна.
