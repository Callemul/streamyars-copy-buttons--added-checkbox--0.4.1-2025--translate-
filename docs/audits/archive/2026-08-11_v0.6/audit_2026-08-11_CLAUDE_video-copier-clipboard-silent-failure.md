---
# [2026-08-11] — CLAUDE — Аудит: латентний баг «копіювач відео мовчки ковтає помилки буфера обміну»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow
> (`npx fallow health --max-crap 30`), при декомпозиції `modules/video_copier_ui.ts`
> (371 рядок, cyclomatic 68, 48 функцій) і написанні `tests/video_copier_ui_injection.test.js`.
> Баг існував в оригінальному коді й **не створений** цим рефакторингом.
>
> **Статус:** ✅ ВИПРАВЛЕНО (2026-08-11). Рефакторинг зберіг поведінку 1-в-1, після
> чого `copyAndFlash` переведено на SSOT-контракт `CommentService.copyToClipboard`
> (повертає `boolean`, має фолбек `execCommand`, ніколи не кидає), усі 4 точки
> виклику отримали явний відгук про невдачу (`LABELS.copyFailed` / `copyUrlFailed`
> / `❌`). Змінилась UX — тепер при відмові буфера користувач бачить попередження
> замість тиші. Перевірено: `tsc --noEmit` (0), `npm run test` (1959 ✅/0),
> `npm run lint` (0), `fallow dead-code` (circular/re-export/unresolved = 0).
> Перенесено в `archive/2026-08-11_v0.6/`.
---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

У проєкті є **єдине джерело правди** для запису в буфер обміну — `CommentService.copyToClipboard`.
Копіювач відео StreamYard його **повністю обходить** і викликає `navigator.clipboard.writeText`
напряму, без жодного `catch`.

### Реальний контракт SSOT (`modules/comment_clipboard.ts`, після рефакторингу)

```ts
export async function writeTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    if (await tryClipboardApi(text)) return true;          // Clipboard API + catch
    if (typeof document === 'undefined' || !document.body) return false;
    return tryExecCommandCopy(text);                        // фолбек execCommand + catch
}
```

Три гарантії контракту:
1. **ніколи не кидає** — усі винятки перехоплені всередині;
2. **повертає `boolean`** — виклик зобов'язаний розрізнити успіх і невдачу;
3. **має фолбек** `execCommand('copy')` для сторінок, де Clipboard API недоступний.

Еталонний споживач цього контракту — `modules/ui_comments_copy.ts:139-145`:

```ts
const success = await CommentService.copyToClipboard(formattedText);
if (success) {
    SYH_UTILS.copyAndShowBanner(formattedText, `Скопійовано коментарів: ${commentsToCopy.length} 📋`);
    flashCopyIcon(copyBtn);
} else {
    SYH_UTILS.copyAndShowBanner('', '⚠️ Не вдалося скопіювати в буфер обміну');
}
```

### Як його викликали в копіювачі відео (оригінал, `modules/video_copier_ui.ts:141-144`)

```ts
export async function copyAndFlash(text: string, onCopied: () => void): Promise<void> {
    await navigator.clipboard.writeText(text);   // ❌ ні catch, ні фолбеку, ні boolean
    onCopied();
}
```

І всі **чотири** точки виклику гасять проміс через `void`, тобто не обробляють відмову:

| Місце (оригінальна нумерація рядків `video_copier_ui.ts`) | Виклик |
|---|---|
| `buildTitleButton` → `onclick`, рядок 183 | `void copyAndFlash(h2.innerText.trim(), ...)` |
| `buildModalButton` → `onclick`, рядок 220 | `void copyShareUrl(btnUrl, inputWrapper)` → всередині `await copyAndFlash(...)` |
| `createCopyTitleButton`, рядок 262 | `void copyAndFlash(videoTitle, ...)` |
| `createCopyUrlButton` → `copyVideoUrl`, рядок 272 | `void copyVideoUrl(btn, videoUrl)` → всередині `await copyAndFlash(...)` |

Два дефекти:

1. **Немає жодного `catch`.** `navigator.clipboard.writeText` — це проміс, який реально
   реджектиться (`NotAllowedError`, `DOMException`). Оператор `void` не додає обробника,
   він лише вимикає попередження лінтера про «плаваючий» проміс.
2. **Немає фолбеку і немає розрізнення успіх/невдача.** `onCopied()` (тобто `tempIconChange` /
   `tempLabelChange`) стоїть **після** `await`, тому при відмові він просто ніколи не викликається —
   і користувач не отримує ані ✅, ані ❌, ані тексту помилки.

### Помилки `tsc`

Помилок типізації тут **немає**: `npx tsc --noEmit` на поточному коді дає **0 помилок**.
Це саме той випадок, коли типи повністю коректні, а контракт порушено семантично —
статичний аналіз таке не ловить.

> ⚠️ Окремо: `copyVideoUrl` **має** гілку `tempIconChange(btn, '❌')`, але вона спрацьовує
> ЛИШЕ на `videoUrl === null` (немає `href` у картки), а не на відмову буфера обміну.
> Тобто ❌ показується у сценарії, який майже не трапляється, і не показується у тому,
> який трапляється регулярно.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### 2.1 Коли `writeText` реально реджектиться

Три відтворювані сценарії на `https://streamyard.com/*`:

1. **Документ не у фокусі.** Clipboard API вимагає focused document. Якщо користувач
   натиснув кнопку, коли фокус у DevTools, в іншому вікні або у вкладеному iframe —
   `writeText` кидає `NotAllowedError: Document is not focused`.
2. **Відкликаний дозвіл `clipboard-write`** у налаштуваннях сайту Chrome.
3. **`navigator.clipboard === undefined`** — non-secure context або обмежений iframe.
   Тут падає навіть не проміс, а синхронний `TypeError: Cannot read properties of
   undefined (reading 'writeText')`, який усередині `async`-функції перетворюється
   на той самий нікому не потрібний rejected promise.

### 2.2 Трасування для кнопки «📋 Копіювати назву»

```
click
  → buildTitleButton.onclick            (video_copier_title_button.ts)
  → e.preventDefault()                  ← подія вже «проковтнута»
  → void copyAndFlash(title, cb)
      → await navigator.clipboard.writeText(title)   ✗ REJECT (NotAllowedError)
      → onCopied() НЕ ВИКОНУЄТЬСЯ
  → проміс відхилено, обробника немає
  → Unhandled Promise Rejection у консолі контент-скрипта
```

Що бачить користувач: кнопка **залишається** з підписом `📋 Копіювати назву`.
Візуально це не відрізняється від «я не влучив по кнопці». Користувач тисне ще раз —
і отримує той самий мовчазний результат. У буфері при цьому лишається **попередній**
вміст, і при вставці в Telegram/Sheets поїде стара назва.

### 2.3 Найнебезпечніший сценарій — кнопка модалки Share

`buildModalButton` копіює **URL відео для публікації**. Той самий reject дає:

```
click → copyShareUrl() → readShareUrl() = 'https://streamyard.com/abc123'  (URL є!)
      → await copyAndFlash(...)  ✗ REJECT
      → tempLabelChange НЕ ВИКОНУЄТЬСЯ → підпис лишається '🚀 Копіювати URL + Текст'
```

Користувач переходить у месенджер, тисне Ctrl+V — і публікує **чуже попереднє
посилання з буфера**. Помилка виявляється лише постфактум, у вигляді неправильного
відео в анонсі.

### 2.4 Чому баг досі непомітний

- «Щасливий шлях» (сторінка у фокусі, дозвіл виданий) працює бездоганно, а це 95%+ кліків.
- Unhandled rejection пишеться в консоль **контент-скрипта**, яку відкривають рідше за
  консоль сторінки.
- Немає жодного тесту на гілку відмови: `tests/video_copier.test.js` і новий
  `tests/video_copier_ui_injection.test.js` мокають `navigator.clipboard.writeText`
  як завжди-успішний.

### 2.5 Побічний наслідок — SSOT

`AGENTS.md`, п.3: *«Усі обчислення стану та операції зобов'язані йти ВИКЛЮЧНО через
відповідні сервіси та адаптери (`CommentService`, ...)»*. Копіювач відео — єдине місце
в проєкті, яке працює з буфером обміну повз `CommentService`. Тому виправлення
`copyToClipboard` (як у `audit_2026-08-10_KILO_copy-icon-on-failure.md`) на копіювач
відео **не поширилося**.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Перевести `copyAndFlash` на SSOT-контракт і додати гілку відмови.

```ts
// modules/video_copier_ui_kit.ts
import { CommentService } from './comment_service';

/**
 * Пише текст у буфер через SSOT-адаптер і повертає результат,
 * щоб виклик міг показати різний відгук на успіх і на невдачу.
 */
export async function copyAndFlash(
    text: string,
    onCopied: () => void,
    onFailed?: () => void
): Promise<boolean> {
    const success = await CommentService.copyToClipboard(text);
    if (success) {
        onCopied();
    } else {
        onFailed?.();
    }
    return success;
}
```

Виклики (кожен отримує явний негативний відгук):

```ts
// video_copier_title_button.ts
void copyAndFlash(
    h2.innerText.trim(),
    () => tempLabelChange(btnTitle, LABELS.copied, LABELS.copyTitle),
    () => tempLabelChange(btnTitle, LABELS.copyFailed, LABELS.copyTitle)
);

// video_copier_card_buttons.ts
async function copyVideoUrl(btn: HTMLElement, videoUrl: string | null): Promise<void> {
    if (!videoUrl) {
        tempIconChange(btn, '❌');
        return;
    }
    await copyAndFlash(
        formatVideoShareText(videoUrl),
        () => tempIconChange(btn, '✅'),
        () => tempIconChange(btn, '❌')   // ← зараз цієї гілки НЕМАЄ
    );
}
```

Плюс два нові підписи в `modules/video_copier_theme.ts`:

```ts
export const LABELS = {
    // ...
    copyFailed: '⚠️ Не вдалося скопіювати',
    copyUrlFailed: '⚠️ Не вдалося скопіювати URL'
} as const;
```

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| «📋 Копіювати назву», сторінка у фокусі | назва копіюється, підпис `✅ Скопійовано!` | без змін |
| «📋 Копіювати назву», документ не у фокусі | **нічого не відбувається**, unhandled rejection у консолі | `⚠️ Не вдалося скопіювати` на 2 с, потім дефолт |
| «🚀 Копіювати URL + Текст» при відмові буфера | підпис не змінюється, у буфері лишається старе значення | `⚠️ Не вдалося скопіювати URL`, користувач бачить проблему одразу |
| 📝/🔗 у картці списку при відмові буфера | іконка не змінюється | іконка `❌` на 2 с |
| Clipboard API недоступний (`navigator.clipboard === undefined`) | `TypeError`, копіювання неможливе взагалі | спрацьовує фолбек `execCommand('copy')` — копіювання **працює** |
| Консоль контент-скрипта | Unhandled Promise Rejection на кожній невдачі | чисто |

Останній рядок — це не лише кращий UX, а **відновлення функціональності**: зараз у
контекстах без Clipboard API копіювач відео не працює взагалі, хоча фолбек у проєкті
вже написаний і протестований.

### 3.2 Ризики міграції

- **Нова залежність `video_copier_ui_kit` → `comment_service`.** Циклу не утворює
  (`comment_service` не знає про `video_copier_*`), але fan-in `CommentService`
  зросте з 28 до 29 — це вже найзв'язаніший модуль проєкту.
  Перевірити після зміни: `npx fallow dead-code --circular-deps --format json`
  має лишитись `circular_dependencies: 0`.
- **Зміна сигнатури `copyAndFlash`**: `Promise<void>` → `Promise<boolean>` плюс
  третій необов'язковий параметр. Зворотно сумісно для всіх наявних викликів
  (усі вони через `void`), але `tests/video_copier_ui_injection.test.js` (тест 7)
  фіксує поточний порядок «спершу буфер, потім колбек» і потребуватиме оновлення
  під новий контракт.
- **Моки в тестах.** Зараз тести підміняють `navigator.clipboard.writeText`.
  Після переходу на `CommentService.copyToClipboard` мокати треба буде саме сервіс
  (як це вже робить `tests/ui_comments_copy_filter.test.js:52`).
- Ризик регресії низький: зміни локалізовані в `video_copier_ui_kit.ts` та
  чотирьох викликах; сховища й мережі не торкаються.

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

Рефакторинг розділив `video_copier_ui.ts` на сім модулів, тому борг тепер точно локалізований:

- **`modules/video_copier_ui_kit.ts` → `copyAndFlash`** — епіцентр: `await navigator.clipboard.writeText(text)`
  без `catch`, без фолбеку, без `boolean`.
- **`modules/video_copier_title_button.ts` → `buildTitleButton`** — `void copyAndFlash(...)` в `onclick`.
- **`modules/video_copier_share_modal.ts` → `copyShareUrl`** — `await copyAndFlash(...)`,
  викликається як `void copyShareUrl(...)` з `buildModalButton`.
- **`modules/video_copier_card_buttons.ts` → `createCopyTitleButton`** — `void copyAndFlash(...)`.
- **`modules/video_copier_card_buttons.ts` → `copyVideoUrl`** — має `❌` лише для порожнього URL,
  не для відмови буфера.
- **`modules/video_copier_theme.ts` → `LABELS`** — місце, куди треба додати підписи помилок.

Незмінний еталон для порівняння: `modules/comment_clipboard.ts` → `writeTextToClipboard`
(SSOT) і `modules/ui_comments_copy.ts:139-145` (правильний споживач).

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

1. `npx tsc --noEmit` → **0 помилок** (базова лінія цього етапу — теж 0, регресій бути не має).
2. `npm run test` → усі тести зелені. Оновити/додати у `tests/video_copier_ui_injection.test.js`:
   - мок `CommentService.copyToClipboard = async () => false` → клік по «📋 Копіювати назву»
     показує `LABELS.copyFailed`, а не лишає дефолтний підпис;
   - мок `... => false` → клік по 🔗 у картці показує `❌`;
   - мок `... => true` → поведінка успіху не змінилася (тести 11, 18, 22, 23);
   - окремий тест: `navigator.clipboard = undefined` → копіювання все одно успішне
     через `execCommand`-фолбек, unhandled rejection відсутній.
3. `npx fallow dead-code --format json` → `unused_exports`, `unused_types`,
   `unresolved_imports`, `circular_dependencies`, `re_export_cycles` = **0**.
4. `npm run lint` → без нових попереджень у `modules/video_copier_*`.
5. `npm run build` → збірка проходить.
6. **Ручна перевірка в StreamYard** (обов'язково, бо баг проявляється лише в браузері):
   - відкрити сторінку відео → зняти фокус із документа (клікнути в DevTools) →
     натиснути «📋 Копіювати назву» → має з'явитись попередження, консоль чиста;
   - відкрити модалку Share → те саме для «🚀 Копіювати URL + Текст»;
   - повернути фокус → переконатися, що успішний шлях працює як раніше.

---

## 6. Побічні спостереження

- **Загальний стан type-check здоровий.** `npx tsc --noEmit` на поточному коді дає
  **0 помилок** (для порівняння: `2026-08-09_KILO_AUDIT.md` фіксував 109, а
  `2026-08-09_CLAUDE_AUDIT.md` — 123). Скрипт `npm run typecheck` уже є в `package.json`.
  Варто додати його в CI-гейт, доки лічильник дорівнює нулю.
- **Два аудити в `docs/audits/active/` застаріли** і їх варто перенести в `archive/`:
  - `2026-08-09_KILO_AUDIT.md` описує дефекти `modules/event_banners/mouseup_handler.ts`
    (предикат `copy-banner` із трьома параметрами, вільна змінна `action` у `mark-*`).
    У поточному коді предикат — `(action, type)`, а `handle` бере
    `button.dataset.action!`; п'ять помилок `tsc` із того звіту відсутні.
  - `2026-08-09_CLAUDE_AUDIT.md` (`right_tabs_compact`) — теж потребує перевірки
    на актуальність тими самими критеріями.
- **Fallow: жодна функція продакшн-коду не має CRAP > 30.** Усі 8 знахідок за порогом —
  у DOM-моках тестів (`tests/studio_adapter.test.js`, `tests/anti_afk.test.js` тощо).
  Найбільший внесок у зниження health-score (78.3, grade B) дають `hotspots` (10.0)
  і `unit_size` (10.0), а не складність.
- **`navigator.clipboard` мокається у трьох тестових файлах по-різному.**
  Варто винести спільний clipboard-мок у `tests/setup/`, як це вже зроблено
  для Chrome API (`tests/setup/chrome_mock.ts`).
