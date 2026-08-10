# 2026-08-10 — KILO — Аудит: латентний баг розбіжності ключів стану чекбокса (write ↔ read path)

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow
> (файл `modules/event_comments/actions.ts` мав найвищу когнітивну складність продакшн-коду,
> `modules/ui_checkbox_restorer.ts` — один із пріоритетних таргетів). Баг **існував в оригінальному
> коді**; підтверджений **прямим runtime-прогоном** (Node + happy-dom, програма-зонд у `Тимчасові файли`).
>
> **Статус:** ✅ **ВИПРАВЛЕНО** (2026-08-10, за прямим погодженням користувача «усі баги які найшов зроби»).
> `getCheckboxTextKey` тепер розв'язує `SelectorValue` тим самим пріоритетним перебором,
> що й write-path (`closestBySelectorValue` + `queryBySelectorValue` з `./config`), без
> власних `DEFAULT_*`-фолбеків. Тести `ui_facade.test.js` (№30, 30a, 30b, 13) оновлено/додано
> як регресійний щит бієктивності запису/читання. Повна перевірка: `npm run test` 1584 pass,
> `npx tsc --noEmit` — 0 помилок, `npm run lint` — 0 errors.

---

## 1. Що саме зламано

Єдине джерело правди для ключа чекбокса в стані (`SYH_STATE.itemStates`) має **два різні
розв'язки селекторів** між записом і читанням. Контракт `SelectorValue = string | string[]`
читається по-різному:

### Запис (write path) — через `queryBySelectorValue`
- `modules/event_comments/handlers/checkbox.ts:14` — `handleCheckboxChange`:
  ```ts
  const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent || '';
  CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
  ```
- `modules/event_comments/action_dom_sync.ts` (викликається з `applyCommentActionState`)
  використовує той самий `queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)`.

`queryBySelectorValue` клеїть **масив селекторів у єдиний selector-list через кому**
(`resolveSelectorString`), тобто шукає **усі** варіанти розмітки відразу. Для
`commentText = ["[class*=\"PlatformCommentShell__ContentSpan\"]", "[data-testid=\"comment-content\"]"]`
реальний запит:
`document.querySelector("...ContentSpan], [data-testid=\"comment-content\"]")`.

### Читання (read path) — через `getCheckboxTextKey`
- `modules/ui_checkbox_restorer.ts:29-47` — `getCheckboxTextKey`:
  ```ts
  const selCommentText = resolveFirstSelector(selectors.commentText) || '';
  ...
  return commentBlock?.querySelector(selCommentText || DEFAULT_COMMENT_TEXT)?.textContent || "";
  ```
- `resolveFirstSelector` бере **лише перший** елемент масиву:
  `selectorValue[0]` = `"[class*=\"PlatformCommentShell__ContentSpan\"]"`.

Отже read path шукає **тільки primary-селектор**, ігноруючи фолбек-масив.

### Додаткова асиметрія
Коли `selectors` порожній/не завантажений, read path має жорсткі дефолти
(`DEFAULT_COMMENT_TEXT = '[class*="PlatformCommentShell__ContentSpan"]'`, блок — `DEFAULT_COMMENT_BLOCK`),
тоді як write path через `queryBySelectorValue` з `null`/порожнім повертає `''` → ключ порожній,
стан не пишеться. Це окрема, вужча розбіжність (порожній конфіг).

---

## 2. Runtime-наслідки (емпірика, Node + happy-dom)

Програма-зонд на реальному `SYH_CONFIG` і реальному `getCheckboxTextKey`:

```
commentText SelectorValue = ["[class*=\"PlatformCommentShell__ContentSpan\"]","[data-testid=\"comment-content\"]"]
resolveFirstSelector(commentText) = [class*="PlatformCommentShell__ContentSpan"]
--- сценарій 1: у DOM лише фолбек-розмітка (data-testid) ---
WRITE key = "Текст коментаря"
READ  key = ""
KEYS MATCH = false
--- сценарій 2: обидва варіанти присутні одночасно ---
WRITE key = "ПЕРШИЙ (fallback у DOM-порядку)"
READ  key = "ДРУГИЙ (primary)"
KEYS MATCH = false
```

**Сценарій 1 (найнебезпечніший):** якщо StreamYard віддає картку коментаря лише у
fallback-розмітці (`[data-testid="comment-content"]`), а primary class відсутній у DOM:
- `WRITE` знаходить текст → `setStreamYardCheckboxState("Текст коментаря", true)` пише в `SYH_STATE.itemStates`.
- `READ` (`restoreDomCheckboxes`) не знаходить `ContentSpan` → `textKey = ""` →
  `if (textKey)` **false** → чекбокс **не торкається взагалі**.
- Результат: стан, записаний під час сесії, **ніколи не відновлюється** після перезавантаження
  сторінки на цьому лейауті. Користувач бачить «скинутий» чекбокс.

**Сценарій 2:** коли обидва варіанти є одночасно, порядок DOM-вузлів різний, тому
`querySelector(...ContentSpan], ...comment-content])` повертає перший за DOM-порядком
(фолбек), а read path — `ContentSpan` (primary). Ключі різні → стан теж не збігається.

Те саме стосується `commentBlock`: write path клеїть
`"[class*=\"PlatformComment__Wrap\"], [data-testid=\"platform-comment\"]"`, read path бере
лише `[class*="PlatformComment__Wrap"]` і ще й має власний `DEFAULT_COMMENT_BLOCK`.
Блок — це проміжна ланка до `commentText`, але розбіжність селектора блоку підсилює ризик
(якщо `closest` за primary-селектором не знаходить блок, read path іде у `DEFAULT_COMMENT_BLOCK`,
write — у comma-join; на StreamYard-лейаутах це різні DOM-піддерева).

---

## 3. Пропоноване виправлення (НЕ застосоване)

Звести read path до **того самого** пріоритетного перебору, що й write path.
Єдине джерело правди для читання `SelectorValue` уже існує — `resolveSelector` / `resolveSelectorAll`
(`./config.ts`), які ітерують `toSelectorList` і беруть **перший знайдений** елемент
(той самий порядок пріоритету, що й у write path через comma-join `querySelector`).

```ts
// modules/ui_checkbox_restorer.ts — getCheckboxTextKey (варіант виправлення)
import { resolveSelector, resolveSelectorString, type SelectorValue } from './config';

export function getCheckboxTextKey(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue>
): string {
    const type = checkbox.dataset.type;
    const selCommentBlock = resolveSelectorString(selectors.commentBlock);
    const selCommentText = resolveSelectorString(selectors.commentText);
    const selBannerBlock = resolveSelectorString(selectors.bannerBlock);
    const selBannerText = resolveSelectorString(selectors.bannerText);

    if (type === 'comment') {
        const commentBlock = selCommentBlock
            ? checkbox.closest(selCommentBlock)
            : checkbox.closest(DEFAULT_COMMENT_BLOCK);
        return commentBlock?.querySelector(selCommentText || DEFAULT_COMMENT_TEXT)?.textContent || "";
    }
    if (type === 'banner') {
        const bannerBlock = selBannerBlock
            ? checkbox.closest(selBannerBlock)
            : checkbox.closest(DEFAULT_BANNER_BLOCK);
        return bannerBlock?.querySelector(selBannerText || DEFAULT_BANNER_TEXT)?.textContent || "";
    }
    return "";
}
```

Або, чистіше: замінити `checkbox.closest(selCommentBlock)` на `closestBySelectorValue(checkbox, selectors.commentBlock)`
та `querySelector(selCommentText)` на `queryBySelectorValue(selectors.commentText, commentBlock)`
— тоді read path чисельно збігається з write path (обидва через той самий `querySelector`
зі склеєним selector-list). Це повертає бієктивність запису/читання без зміни сигнатури.

Також варто усунути другу асиметрію (порожній конфіг): коли `selectors` порожній, read path
має вести себе як write path (ключ `''` → стан не застосовується), а не підставляти
`DEFAULT_*`. І навпаки — якщо write path колись перейде на `resolveSelector`, то фолбеки-дефолти
`ui_checkbox_restorer` стануть зайвими.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Чекбокс поставлено на лейауті з лише fallback-розміткою; F5 | стан **не відновлюється** (чекбокс скинутий) | стан **відновлюється** |
| Чекбокс на лейауті з обома варіантами розмітки; F5 | можлива розбіжність ключа → стан не збігається | стан збігається 1-в-1 |
| Звичайний лейаут (primary-селектор присутній) | працює | працює (без змін) |

Це **зміна поведінки відновлення стану** (оживляє коректне відновлення), тому винесено в окрему задачу.

### 3.2 Ризики міграції
- Ризик середній: зміна локалізована в одній чистій функції `getCheckboxTextKey` і її викликачі
  `applyCheckboxStates`/`restoreDomCheckboxes`. Жодних побічних ефектів на запис/мережу.
- Після виправлення бажано прогнати зонд (розділ 2) і переконатися, що `KEYS MATCH = true`
  для обох сценаріїв. Тести на `getCheckboxTextKey` уже існують — їх треба розширити
  кейсом «масив-селектор, у DOM лише фолбек».

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

- `modules/ui_checkbox_restorer.ts:29-47` — `getCheckboxTextKey` (read path, `resolveFirstSelector`).
- `modules/event_comments/handlers/checkbox.ts:14` — `handleCheckboxChange` (write path, `queryBySelectorValue`).
- `modules/event_comments/action_dom_sync.ts:16-17` — `checkPrimaryCommentCheckbox` (write path,
  `queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)`).
- `modules/config.ts:26-31` — `resolveFirstSelector` (бере `[0]`, ігнорує решту масиву).
- `modules/config.ts:37-42` — `resolveSelectorString` (клеїть масив через кому — те, що використовує write path).
- `modules/config.ts:93-121` — `resolveSelector` / `resolveSelectorAll` (кандидат на уніфікацію read path).

Рефакторинг не торкався ані `ui_checkbox_restorer.ts`, ані `checkbox.ts`, і **не змінив** жодного
селектора — борг залишився 1-в-1 на тих самих рядках.

---

## 5. Перевірка після виправлення (чек-лист для наступного ШІ)

1. `npx tsc --noEmit` → чистий (зміна всередині `modules/ui_checkbox_restorer.ts`).
2. Зонд (розділ 2) → `WRITE key === READ key` для обох сценаріїв.
3. `npm run test` → `tests/*checkbox*` та `tests/ui_checkbox_restorer*` зелені; додати кейс
   «`commentText` як масив, у DOM лише `[data-testid="comment-content"]`».
4. Ручна перевірка в StreamYard: поставити чекбокс → F5 → стан відновлено (і на legacy-, і на
   data-testid-лейауті).
5. `npx fallow dead-code --circular-deps --format json` → без нових знахідок у змінених файлах.

---

## 6. Побічні спостереження (загальний стан проєкту)

- **`npx tsc --noEmit` на цьому стані — 0 помилок** (перевірено під час етапу 3 після рефакторингу;
  історичні 109–123 помилки з попередніх звітів уже погашені в минулих сесіях).
- **Збірка `npm run build` (Vite) проходить**, `npm run lint` — 0 errors (лише 3 попередження
  `no-unused-vars` у файлах, які цей рефакторинг не чіпав: `storage_migration.ts`,
  `ui_shared_utils.ts`, `studio_storage_handler.ts`).
- **Циркулярні залежності:** 0 (перевірено `fallow dead-code --circular-deps`). Рефакторинг
  `actions.ts` → `action_marking.ts` / `action_dom_sync.ts`, `comment_context.ts` →
  `comment_context_fields.ts`, `banner_parser.ts` → `banner_parser_rules.ts` **не створив**
  жодного циклу (перевірено через граф Fallow).
- **Дублювання логіки обходу `#content-text`** (підсвічене у звіті Fallow як `studio_comment_text.ts`
  дублювався в `comment_context.ts`) — **усунуто** в рамках цього ж рефакторингу: інлайнований
  обхід винесено у спільний `readCommentNodesText` (`studio_comment_text.ts`) і використано
  з `comment_context_fields.ts`. Поведінка 1-в-1.
- Після рефакторингу CRAP/когнітивна складність цільових модулів різко впала:
  `event_comments/actions.ts` MI 86.4→91.2 / CRAP 12→2; `comment_context.ts` MI 81.3→90.5 /
  CRAP 13→5; `banner_parser.ts` MI 80.7→88.5 / CRAP 14→5. Раніше critical-функції
  (`applyCommentActionState`, `getCommentContextForRestore`, `detectBlockCategory`, `parseBlock`)
  зникли з топу складності.
