# [2026-08-09] — KILO — Аудит: латентний баг «атака HTML-ін’єкцією через `searchQuery` у розмітці Starred»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow (етап 3, `modules/ui_starred_controls.ts`, модуль `addStarredTabControls`). Вынос размітки в чисту функцію `buildStarredControlsMarkup` (новий `modules/ui_starred_markup.ts`) дозволив легко ємпірично підтвердити уразливість.

> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження (це UX/функціональна зміна, а не чистий рефакторинг).

---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

`SYH_UI_STATE.searchQuery` — це рядок, який користувач вводить у пошуковий інпут вкладки **Starred** у попапі. Його значення інтерполюється **без екранування** у атрибут `value` інпута та у блок порожнього стану (через спільну `renderSharedEmptyState`).

Контракт рядка, який стає значенням `value` інпута: **будь-який користувальницький ввід**. Реальність — рядок інтерполюється у середину подвійних лапок HTML-атрибуту через шаблонний рядок:

```ts
// modules/ui_starred_markup.ts (buildStarredControlsMarkup), оригінал — ui_starred_controls.ts:30
<input type="text" id="syh-starred-search" value="${searchQuery}" ...>
```

Якщо `searchQuery` містить `"`, то він **перериває** атрибут і дозволяє ін’єкцію додаткових атрибутів або тегів.

### Емпіричний доказ (happy-dom)

```
value attr       : ""
onfocus attr     : "alert(1)"
ATTR INJECTED?   : true
IMG INJECTED?    : true
tabs still there : 4
```

Вхід `"` onfocus="alert(1)" x="` має **результатом**: у DOM-інпуті з’являється атрибут `onfocus="alert(1)"`. Це **справжній HTML-ін'єкційний вектор self-XSS**.

`tsc` тут **нічого не каже** — це жод разу не помилка типів, а помилка семантики розмітки.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### Шлях до вразливого коду

1. `bindFilterDocClickHandler` / `bindFilterSearchControls` (`modules/ui_shared_utils.ts`) вішають `input`-слухач на `#syh-starred-search`.
2. Кожен ввід користувача оновлює `SYH_UI_STATE.searchQuery` (через сетер у `modules/ui_state.ts:74`).
3. Якщо `searchQuery !== ''` — викликається `filterStarredComments()` (129ms debounce), **і навіть якщо** `''` — скидання також каскадує.
4. Після SPA-перерендеру StreamYard **правий панель знищується і створюється заново**.
5. `bootstrap_dom.ts:53` спостерігає за `starredHeaderWrap`; `onAdded → addStarredTabControls(el)`.
6. `addStarredTabControls` викликає `buildStarredControlsMarkup(activeFilter, searchQuery)`.
7. `innerHTML = markup` → **браузер парсує рядок ін’єкції → скрипт виконується**.

### Наслідок A — виконання скрипту (self-XSS)

```
" onfocus="alert(document.cookie)" x="
```

→ У DOM з’являється `<input onfocus="alert(document.cookie)" ...>`. Скрипт виконується на `focus`/`blur`/`onchange` — достатньо легко нав’язати користувачеві.

### Наслідок B — ламання value атрибуту (функціональний баг навіть без скрипту)

```
" > <img src=x onerror=1>
```

→ `value="" > <img src=x onerror=1>"` → інпут має порожнє значення (введений текст **видаляється з поля**), а тег `<img>` вставляється у DOM. Пошук у цей же момент продовжує працювати на фоні.

### Масштаб

Не лише Starred. `ui_empty_state.ts:62` робить те ж саме для повідомлення порожнього стану:

```ts
const messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${config.searchQuery}"</b>`;
```

→ це **другий** вход у ту ж уразливість. Оскільки `renderSharedEmptyState` спільний для `Starred` і `Banners` (через `renderBannerEmptyState`), пошук у банерах теж уразливий, коли `query === ''` є `nullish`. Тобто для `null`/`undefined` вона повертає `false`. Це безпечно.

### Чи є remote‑триггер?

`searchQuery` записується **лише** з сетера у `ui_state.ts:74` (користувацький ввід або очищення). Жодного `message`‑хендлера, ніякого зовнішнього `SYH_BUS.emit('…')` не записує значення `searchQuery` назад. Тому ін’єкція **повинна починатися з користувача** (self-XSS), а не з повідомлення від background‑скрипта чи іншої вкладки.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

**Крок 1** — ввести екранування для атрибутів та HTML‑контексту.

```ts
// modules/ui_starred_markup.ts

/** Екрановує рядок для використання у значенні подвійної лапки HTML-атрибуту. */
function escapeAttr(s: string): string {
    // порядок важливий: & першим, потім лапки
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function buildStarredControlsMarkup(
    activeFilter: string,
    searchQuery: string
): string {
    return `
            <div class="syh-starred-controls" ...>
                <div class="syh-search-wrapper">
                    <input ... value="${escapeAttr(searchQuery)}" ...>
                    ...
            ...
        `;
}
```

**Крок 2** — застосувати той самий хелпер у `modules/ui_empty_state.ts:62`:

```ts
const messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${escapeHtml(config.searchQuery)}"</b><br><br>`;
```

де `escapeHtml` також екранує `<`, `>`, `&`, `"`, `'`.

**Крок 3 (бажательно)** — винести хелпери в окремий файл `modules/escape_html.ts` і покрити тестами (включно з кирилицею та emoji).

### Обговорнення: чому це НЕ зроблено в цьому рефакторингу

1. Технічно це **функціональна зміна поведінки** (екранований `"` більше не ламатиме `value`). За правилом AGENTS.md §6 рефакторинг має бути 1-в-1.
2. Якщо `value` екранується але UI‑логіка інпута порівнює `input.value !== SYH_UI_STATE.searchQuery` (неекрановане), з’явиться **discrepancy** між відображенням і моделлю стану — потребує ручної перевірки в DevTools.
3. Повідомлення порожнього стану також виводяться за допомогою `insertAdjacentHTML` в `ui_empty_state.ts:92`, тому одне патання на складні ін’єкції.

---

## 3.1 Що зміниться для користувача (таблиця сценаріїв «Зараз» та «Після»)

| # | Сценарій | Зараз | Після |
|---|---|---|---|
| 1 | Користувач шукає `субботняя` | Працює | Працює |
| 2 | Користувач шукає `"` (лапка) | `value=""`, текст зникає з інпута | `value="&quot;"`, лапка відображається коректно |
| 3 | Користувач шукає `"><img src=x>` | `<img>` вставляється у DOM, `onerror` можливий | Текст відображається як рядок, ніякого DOM‑впливу |
| 4 | Користувач шукає `"><script>alert(1)<` | self-XSS | Текст виводиться як текст |
| 5 | SPA-перерендер праворуч | `onfocus="alert(1)"` виконується при фокусі | Без ін’єкції атрибутів |

> **Для кінцевого користувача** видимих змін нема — лише коли користувач намагється ввести `"`. Це виправлення безпеки та довдженість, а не UX‑рефакторинг.

---

## 3.2 Ризики міграції

1. **Розмір лінійного diff збільшується**, бо треба екранувати кожне інтерполяне значення. Готовий хелпер `escapeAttr` треба додати в `config.ts` або `utils.ts`.
2. **`escapeHtml` для порожнього стану** потребує окремого екранування (`<`, `>`, `&`), бо `value`‑атрибутне ескейпінг не достатнє.
3. **Регресія**: golden‑тести `ui_comments_starred_controls.test.js` порівнюють `innerHTML` byte‑у‑байт. Якщо `escapeAttr` змінює `"` → `&quot;`, тести з запитами без `"` залишаться зеленими, а для запитів з `"` потрібно буде оновити golden‑fixture (або додати нові кейси).
4. **Performance**: екранування — лише regex‑replace на короткому рядку, незначний overhead.

---

## 4. Де зараз живе цей борг у коді (вказати конкретні файли та функції після рефакторингу)

| Файл | Функція / рядок | Що саме |
|---|---|---|
| `modules/ui_starred_markup.ts` | `buildStarredControlsMarkup`, рядок з `value="${searchQuery}"` | **Головний вход** для Starred: `value` інпута без екранування |
| `modules/ui_empty_state.ts` | `renderSharedEmptyState`, рядок 62 `messageHTML` | **Другий вход**: повідомлення порожнього стану для Starred + Banners |
| `modules/ui_state.ts` | сетер `searchQuery` (74) | джерело: лише користувацький ввід |
| `modules/ui_shared_utils.ts` | `bindFilterSearchControls` | записує `searchQuery` у стан |
| `modules/ui_comments.ts` | `filterCommentListItems`, `renderCommentEmptyState` | споживає `searchQuery` для фільтрації та порожнього стану |
| `modules/ui_banners.ts` | `renderBannerEmptyState` (254) | споживає `bannerSearchQuery`/`searchQuery` |

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] `escapeAttr` імплементовано та підключено у `buildStarredControlsMarkup`.
- [ ] `escapeHtml` імплементовано та підключено у `renderSharedEmptyState`.
- [ ] **DevTools на живому StreamYard**:
  - [ ] увести `"><img src=x onerror=alert(1)>` у пошук Starred → технічно ніякого `onerror` у консолі;
  - [ ] увести `"` у пошук → лапка відображається як `"` або `&quot;` у value, а інпут не втрачає фокус;
  - [ ] увести `"><img src=x>` у пошук Banners → немає `<img>` у DOM.
- [ ] `npm test` — golden‑тести `ui_comments_starred_controls.test.js` зелені (оновити golden‑fixtures для кейсів з `"`).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` — чисто.
- [ ] `npx fallow dead-code --format json` — `escapeAttr`/`escapeHtml` спожито (не `unused_export`).

---

## 6. Побічні спостереження

1. **Той самий патерн «рядок у HTML»**— екранування відсутнє у 2‑х місцях продукту (`ui_starred_markup.ts`, `ui_empty_state.ts`). Це порушує принцип Single Source of Truth з `AGENTS.md`.
2. **`ui_comments.ts:61`** — `restoreCheckboxFromCache(commentNode, commentText)` використовує `commentText` (textContent) для ідентифікації позначки. Якщо текст містить `"` — це не XSS, але `data-syh-state`‑атрибути зберігання не екрановуються, бо використовують `setAttribute` (це безпечно).
3. **Загальний стан type-check**: `tsc --noEmit` чистий (0 помилок) після рефакторингу ETAP 3. Цей баг — runtime/безпеки, `tsc` його не ловить.
4. **Fallow не бачить цю проблему**: `npx fallow dead-code --format json` → 0 `unresolved_imports`, 0 `circular_deps`. Це семантична помилка розмітки, а не модульна. **Fallow і `tsc` тут не взаємозамінні для XSS / HTML‑ін’єкцій.**
