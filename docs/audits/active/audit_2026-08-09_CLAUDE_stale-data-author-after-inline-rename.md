# [2026-08-09] — CLAUDE — Аудит: латентний баг stale `data-author` після інлайн-перейменування

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow (етап 3, модуль `popup/prayer_handlers_focus.ts`).
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.

---

## 1. Що саме зламано

У попапі молитов кожен рядок автора будується у `popup/prayer_dom_builders.ts`:
- `buildAuthorActions()` вішає на кнопку видалення атрибут `data-author` = **поточне** ім'я автора (`delBtn.setAttribute('data-author', author)`).
- `buildAuthorLabel()` робить `<span class="editable-author" contenteditable>` для інлайн-редагування ім'я.

Редагування імені відбувається у `popup/prayer_handlers_focus.ts` (після рефакторингу — `popup/prayer_focus_rules.ts` + `popup/prayer_handlers_focus.ts`). Обробник `focusout` для `.editable-author`:

1. читає `oldAuthor = el.getAttribute('data-old-val')` (запам'ятовано на `focusin`);
2. читає `newAuthor = el.textContent.trim()`;
3. викликає `applyAuthorRename(list, oldAuthor, newAuthor)` — оновлює `item.author` у **збереженому** списку в `chrome.storage`;
4. зберігає список у сховище **без повторного рендера**.

Видалення автора відбувається у `popup/prayer_handlers_click.ts` (`handleDeleteAuthorPrayers`): воно бере `authorToDelete = delAuthorBtn.getAttribute('data-author')` **з того самого DOM-атрибута кнопки**, який НЕ оновлювався після інлайн-правки.

**Контракт виклику:** `handleDeleteAuthorPrayers` очікує `data-author === актуальне author у сховищі`. Реальність: після перейменування `data-author` лишається старим, а `storage` вже містить нове ім'я.

`tsc` помилок тут НЕМАЄ — це чисто runtime-логічна розбіжність між DOM-атрибутом і джерелом істини (сховищем).

---

## 2. Runtime-наслідки

Сценарій (1-в-1 з поточною логікою):
1. У списку є автор `Іван` (одне прохання).
2. Користувач клікає в ім'я `Іван` → фокус → змінює на `Іванна` → виходить з поля (`focusout`).
3. Сховище: `item.author` стає `Іванна`. DOM-кнопки `.del-author-btn` досі мають `data-author="Іван"`.
4. Користувач тисне 🗑️ «видалити автора».
   - `handleDeleteAuthorPrayers` читає `data-author="Іван"`.
   - `confirm('Видалити всі прохання від @Іван?')` — вікно показує **застаріле** ім'я.
   - `splitPrayersByAuthor(list, 'Іван')` → у сховищі вже немає `author==='Іван'` → `removed=[]`.
   - Список **не змінюється**, `sendUnstarMessagesForList([])` нічого не знімає зі зірки у StreamYard.
   - Повідомлення інформує про «успішне видалення», хоча нічого не видалено.

Баг повторюваний: перший клік «видалити автора» після інлайн-правки імені завжди мовчки не працює. Лише після повного перерендера списку (наступне додавання/оновлення) кнопка отримує правильний `data-author` і видалення починає працювати.

Другорядний ефект того ж кореня: інлайн-правка **тексту** прохання (`editable-prayer`) теж не перерендерює список, тож `data-raw-text` контейнера (звідки копіює «📋 Копіювати», див. `readRawPrayerText`) залишається старим до наступного рендера.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

У `applyAuthorRename` (або у `saveAuthorRename` у `popup/prayer_handlers_focus.ts`) після запису у сховище викликати `renderPrayers(list)`, щоб DOM (зокрема `data-author` на `.del-author-btn`) синхронізувався зі сховищем:

```ts
// popup/prayer_handlers_focus.ts (ЧЕРНОВИК — НЕ ЗАСТОСОВАНО)
function saveAuthorRename(el: HTMLElement): void {
    unhighlightEditable(el);
    const oldAuthor = el.getAttribute(AUTHOR_OLD_VALUE_ATTR);
    const newAuthor = readTrimmedText(el);
    if (!shouldRenameAuthor(oldAuthor, newAuthor)) return;

    updateStoredPrayers(list => {
        const changed = applyAuthorRename(list, oldAuthor as string, newAuthor);
        // ↓ єдина нова строка — синхронізує DOM із джерелом істини
        if (changed) renderPrayers(list);
        return changed;
    });
}
```

Альтернатива без повного рендера: оновлювати `data-author` на всіх `.del-author-btn` того ж автора безпосередньо в обробнику `focusout`.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Перейменував `Іван`→`Іванна`, натиснув «видалити автора» | confirm показує `@Іван`, список не змінюється (тихий no-op) | confirm показує `@Іванна`, прохання автора видаляються |
| Перейменував автора, натиснув «копіювати» | копіюється старий текст (до ре-рендера) | копіюється оновлений текст |
| Зірки у StreamYard | не знімаються (бо список «порожній» для старого імені) | знімаються коректно |

### 3.2 Ризики міграції

- `renderPrayers` перебудовує вузли: каретка/фокус губиться, `scroll` скидається, групи перераховуються. Для інлайн-edit це може відчуватися як «стрибок» списку після кожного редагування імені.
- Якщо автор перейменовано у вже існуюче ім'я (злиття груп), порядок/згортання зміниться відразу — це бажано, але змінює поточну поведінку «злиття лише після ре-рендера».
- Потрібна додаткова перевірка зорово (DevTools), бо це UI-зміна — за правилом AGENTS.md «ДЕБАГ ТІЛЬКИ ЧЕРЕЗ DevTools».

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

- Чистий предикат/мутатор: `popup/prayer_focus_rules.ts` → `applyAuthorRename()`, `shouldRenameAuthor()`.
- Біндер з побічними ефектами: `popup/prayer_handlers_focus.ts` → `saveAuthorRename()` (викликає `SYH_STORAGE.set` без `renderPrayers`).
- Створення `data-author`: `popup/prayer_dom_builders.ts` → `buildAuthorActions()` (рядок із `delBtn.setAttribute('data-author', author)`).
- Споживач застарілого атрибута: `popup/prayer_handlers_click.ts` → `handleDeleteAuthorPrayers()` через `readAuthorAttribute()` з `popup/prayer_click_rules.ts`.
- Джерело істини (сховище): `SYH_STORAGE` у `modules/storage.ts`; рендер — `renderPrayers` у `popup/prayer_render.ts`.

---

## 5. Перевірка після виправлення (чек-ліст)

- [ ] `handleDeleteAuthorPrayers` після інлайн-перейменування видаляє саме нове ім'я (перевірити `data-author` на `.del-author-btn` після `focusout`).
- [ ] `confirm()` показує актуальне (нове) ім'я автора.
- [ ] `sendUnstarMessagesForList` отримує непорожній список → зірки у StreamYard знімаються.
- [ ] Інлайн-правка тексту прохання відображається в «📋 Копіювати» без додаткового рендера.
- [ ] `npm run test` та `npm run build` зелені; список не «стрибає» неприйнятно при редагуванні.
- [ ] Ручна перевірка в DevTools (F12) на реальному попапі.

---

## 6. Побічні спостереження

- Загальний `tsc --noEmit` по проєкту містить ~107 помилок, **але жодна з них не у ланцюжку молитов** (`popup/prayer_*`, `modules/storage.ts` чисті). Переважно це помилки у `modules/anti_afk.ts` (`SYH_BUS` не знайдено), `event_comments/*`, `youtube/studio/*`, а також `popup_translit.ts` (`replaceAll` вимагає `lib: es2021+`) та `popup_ui_state_restorer.ts` (невідоме `db`). Це існуючий борг, не пов'язаний із цим рефакторингом.
- Рефакторинг знизив CRAP оброблених модулів: `popup/prayer_handlers_click.ts` 42→2, `popup/prayer_handlers_focus.ts` 42→2, `youtube/yt_init.ts` 42→3, `youtube/yt_comment_processor.ts` 42→3 (усі < 15). Цикли залежностей — 0.
