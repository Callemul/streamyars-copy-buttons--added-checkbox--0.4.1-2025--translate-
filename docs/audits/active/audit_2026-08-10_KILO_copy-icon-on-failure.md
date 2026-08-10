---
# [2026-08-10] — KILO — Аудит: латентний баг «іконка ✅ показується навіть при НЕвдалому копіюванні»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів (Stage 3, Fallow), при написанні `tests/ui_comments_copy_filter.test.js`.
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1.
---

## 1. Що саме зламано

У обробнику кліку кнопки копіювання Starred (`handleStarredCopyClick`) результат
копіювання **обчислюється** (`success`), але **візуальний відгук показується
завжди**, незалежно від нього.

`CommentService.copyToClipboard` (`modules/comment_service.ts:42-58`) має чіткий
контракт — повертає `boolean`:

```ts
public static async copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('... Clipboard API error, falling back to execCommand:', err);
    }
    // ... execCommand-фолбек, повертає false при невдачі
}
```

Викликач (`modules/ui_comments_copy.ts:119-139`, винесено в Stage 3):

```ts
async function handleStarredCopyClick(copyBtn: HTMLElement, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    e.preventDefault();
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentsToCopy = collectCommentsToCopy(selectors, SYH_UI_STATE.prayersCache);
    if (commentsToCopy.length === 0) {
        SYH_UTILS.copyAndShowBanner('', 'Немає коментарів для копіювання');
        return;
    }
    const formattedText = formatCommentsForClipboard(commentsToCopy);
    const success = await CommentService.copyToClipboard(formattedText);
    if (success) {
        SYH_UTILS.copyAndShowBanner(formattedText, `Скопійовано коментарів: ${commentsToCopy.length} 📋`);
    }
    flashCopyIcon(copyBtn);     // ⛔ викликається ЗАВЖДИ, поза перевіркою success
}
```

`flashCopyIcon` (`modules/ui_comments_copy.ts:107-117`) безумовно міняє іконку на
`✅` і анімує кнопку:

```ts
export function flashCopyIcon(copyBtn: HTMLElement): void {
    const iconSpan = copyBtn.querySelector(`.${COPY_ICON_CLASS}`);
    if (!iconSpan) return;
    iconSpan.textContent = SUCCESS_ICON;            // ✅
    copyBtn.classList.add(SUCCESS_ANIMATION_CLASS);
    setTimeout(() => {
        iconSpan.textContent = IDLE_ICON;
        copyBtn.classList.remove(SUCCESS_ANIMATION_CLASS);
    }, SUCCESS_ICON_RESET_MS);
}
```

Тобто `if (success)` керує **лише тостом**, а іконка «успіх» показується
**і при `success === false`**. Це навмисна квіра (задокументована в заголовку
модуля, `modules/ui_comments_copy.ts:12`), але з погляду користувача — це баг.

Помилок `tsc` немає: `success` типу `boolean`, `flashCopyIcon` приймає
`HTMLElement`; обидва шляхи типізовано валідні. `npx tsc --noEmit` зелений.

## 2. Runtime-наслідки

- `CommentService.copyToClipboard` повертає `false` у двох випадках:
  1. `navigator.clipboard` недоступний **і** `document.execCommand('copy')`
     не спрацював (заборона буфера в небезпечному контексті, відсутність фокусу,
     політика браузера на `file://` тощо);
  2. `document.body` відсутній (екзотика).
- Коли це стається, користувач бачить:
  - ❌ **жодного тосту** (бо `if (success)` пропущено);
  - ✅ **іконку ✅ на кнопці**, що моргає анімацією «скопійовано».
- Висновок користувача: «копіювання пройшло», хоча буфер порожній. Дані
  **не потрапили в буфер обміну**, але UI стверджує протилежне.
- Додатково: при `success === false` не викликається `copyAndShowBanner`, тож
  користувач навіть не бачить діагностичного повідомлення про невдачу — лише
  оманливу ✅.

**Що бачить користувач:** натискає «копіювати всі», бачить зелену галочку, йде
вставляти в чат — а там порожньо або старий вміст буфера. Дуже високий ризик
«тихої» втрати даних саме в момент, коли вони потрібні (ефір).

## 3. Пропоноване виправлення (НЕ застосоване)

Показувати ✅ **лише** при `success`. При невдачі — або нейтральна іконка, або
окремий «помилковий» візуальний сигнал, і (бажано) тост про помилку.

```ts
async function handleStarredCopyClick(copyBtn: HTMLElement, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    e.preventDefault();
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentsToCopy = collectCommentsToCopy(selectors, SYH_UI_STATE.prayersCache);
    if (commentsToCopy.length === 0) {
        SYH_UTILS.copyAndShowBanner('', 'Немає коментарів для копіювання');
        return;
    }
    const formattedText = formatCommentsForClipboard(commentsToCopy);
    const success = await CommentService.copyToClipboard(formattedText);
    if (success) {
        SYH_UTILS.copyAndShowBanner(formattedText, `Скопійовано коментарів: ${commentsToCopy.length} 📋`);
        flashCopyIcon(copyBtn);
    } else {
        SYH_UTILS.copyAndShowBanner('', '⚠️ Не вдалося скопіювати в буфер');
        // опціонально: flashErrorIcon(copyBtn)
    }
}
```

## 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після |
|---|---|---|
| Копіювання успішне | Тост + ✅ | Без змін ✅ |
| Копіювання **не вдалося** | ❌ Тосту немає, але ✅ показано (оманливо) | ✅ Тост «не вдалося», іконка не моргає «успіхом» |
| Немає коментарів | Тост «Немає…», іконка не змінюється | Без змін ✅ |

## 3.2 Ризики міграції

- **Низькі** для успішного шляху (жодна зміна).
- **Зміна UX при збої:** користувач перестане бачити оманливу ✅. Це **виправлення
  багу**, але формально змінює поведінку — тому винесено в окреме погодження.
- `flashCopyIcon` лишається публічним експортом (`tests/ui_comments_copy_filter.test.js`
  перевіряє його окремо) — варто залишити для тестів, додавши при потребі
  `flashErrorIcon`. Тест на `handleStarredCopyClick` при `success=false` слід
  доповнити перевіркою, що `flashCopyIcon` **не** викликано.

## 4. Де зараз живе цей борг у коді

| Файл | Функція | Роль |
|---|---|---|
| `modules/ui_comments_copy.ts:133-138` | `handleStarredCopyClick` | **Джерело багу** — `flashCopyIcon` поза `if (success)` |
| `modules/ui_comments_copy.ts:107-117` | `flashCopyIcon` | Безумовно ставить ✅ |
| `modules/ui_comments_copy.ts:12` | (заголовок модуля) | Навмисно задокументована квіра |
| `modules/comment_service.ts:42-58` | `copyToClipboard` | Чесний `boolean`-контракт (результат ігнорується для іконки) |
| `tests/ui_comments_copy_filter.test.js` (29 тестів) | — | Перевіряють `flashCopyIcon` і `collect*`; **не** прив'язані до `success` |

Під час Stage 3 тіло `handleStarredCopyClick` перенесено в `modules/ui_comments_copy.ts`
**без зміни порядку викликів** — баг збережено 1-в-1.

## 5. Перевірка після виправлення

- [ ] Юніт-тест: `CommentService.copyToClipboard` застаблений → `false` →
      `flashCopyIcon` **не** викликається, показується тост помилки.
- [ ] Юніт-тест: `copyToClipboard` → `true` → `flashCopyIcon` викликається, тост успіху.
- [ ] Перевірити, що `getComputedStyle`/DOM-позиціювання кнопки не зачіпається.
- [ ] `npm run test && npx tsc --noEmit && npm run lint` — зелені.

## 6. Побічні спостереження

- Та сама патерна «ігнорування булевого результату» може бути в інших місцях,
  що викликають `CommentService.copyToClipboard` — варто прогнати `rg` по
  `copyToClipboard(` і перевірити, чи `success` справді керує UX скрізь.
- `flashCopyIcon` не приймає прапорець «успіх/помилка»; якщо додавати
  `flashErrorIcon`, логічно уніфікувати в `flashCopyIcon(copyBtn, ok: boolean)`.
- happy-dom (тестове середовище) не реалізує `navigator.clipboard`, тому
  тест на `success=false` перевіряє саме гілку без `flashCopyIcon`, а не реальний
  clipboard-збій браузера.
