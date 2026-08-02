# Implementation Plan: Telegram/YouTube Питання (4 напрямки) + YouTube Studio модуль

Базується на `docs/ТЗ для YouTube Studio.md` та уточненнях в чаті.

---

## 0. Визначення каналу (Автоматичне розпізнавання за назвою та handle)

Старий модуль (`youtube/*`) та модуль Studio (`studio/*`) визначають канал автоматично:
1. За назвою каналу в DOM (наприклад, елемент `#entity-name` у Studio або `#channel-name` на YouTube).
   - Якщо назва містить `"время перемен"` або `"времяперемен"` (case-insensitive) ➔ Канал `"vp"`.
   - Якщо назва містить `"слово живое"` або `"словоживое"` (case-insensitive) ➔ Канал `"slovo"`.
2. За `href="/@handle"`, якщо handle присутній у DOM та зареєстрований у конфігу.

Це дозволяє розпочати розробку та роботу розширення **одразу без очікування точних handle'ів**.

---

## 1. Відкрите архітектурне питання (не блокує, але потребує підтвердження)

Старий YouTube-модуль (regular youtube.com) і надалі **не** маршрутизує коментарі
автоматично (рішення B). Але тепер замість одного YouTube-стовпчика в попапі — 4 окремих
(по одному на кожен аркуш). Куди тоді показувати те, що зібрав старий модуль?

**Дефолт, який закладаю в план:** усе, що зібрав старий модуль (`syh_yt_collected`,
без прив'язки до напрямку), відображається в правому стовпчику **першого аркуша**
("Время перемен СШ") — як і зараз, просто перша вкладка стає "домом" для цього списку.
Ви зможете вручну перенести/скопіювати звідти в потрібний аркуш.

Якщо це не підходить — скажіть, зміню до старту Phase 3.

---

## 2. Ключові рішення (зафіксовано)

| # | Рішення |
|---|---|
| A | Вкладка "Telegram Питання 🚀" → **"Telegram/YouTube Питання 🚀"**. Всередині — 4 під-вкладки (pill-nav, той самий стиль що й `.tabs`), кожна з яких містить статично зпродубльовану структуру елементів у `popup.html` з суфіксами `__{sheetId}` (наприклад: `#oldList__vp_ss`, `#oldList__oparin` тощо). |
| B | Старий модуль — без auto-routing, лишається як є (тільки додається channel-gate, п.0). |
| C | Studio: категорія визначається **автоматично, fuzzy** (толерантно до регістру та описок), з можливістю ручного перевибору через Badge-dropdown. Кожен ручний вибір/корекція логується (канал, назва відео, авто-визначення, що обрав адмін, дата) — лог можна скопіювати з Options для передачі розробнику. |
| D | Storage cleanup для Studio (30 днів) — за зразком `syh_yt_checkbox_state`. |
| E | Без окремого перемикача "обмежити 2 каналами" — це поведінка за замовчуванням, коли модуль увімкнено. |
| F | **Чекбокс "прочитано" біля кожного коментаря в Studio**, розміщується поруч із Badge (під відео-мініатюрою коментаря, а не в toolbar з 3 кнопками). Тогл — ПКМ по тексту коментаря/його області (як у старому модулі), плюс звичайний клік по самому чекбоксу. Стан зберігається persistent, з 30-денним автоочищенням (як `syh_yt_checkbox_state`). |

---

## 3. Sheet ID мапа (використовується і в попапі, і в Studio-модулі)

```ts
// modules/sheets.ts
export const SHEET_IDS = {
  VP_SS: 'vp_ss',                 // "Время перемен СШ"
  OPARIN: 'oparin',               // "Опарин проповеди"
  MOLCHANOV_SS: 'molchanov_ss',   // "Молчанов СШ"
  MOLCHANOV_PREACH: 'molchanov_preach', // "Молчанов проповеди"
} as const;

export const SHEET_LABELS: Record<SheetId, string> = {
  vp_ss: 'Время перемен СШ',
  oparin: 'Опарин проповеди',
  molchanov_ss: 'Молчанов СШ',
  molchanov_preach: 'Молчанов проповеди',
};
```

---

## 4. Storage schema (нові/змінені ключі)

### Попап, per-sheet namespacing (замінює нинішні глобальні ключі)
Формат: `<стара_назва>__<sheetId>`, напр. `tg_oldList__vp_ss`.

- `tg_oldList__{sheetId}`
- `tg_answered__{sheetId}`
- `tg_newTelegram__{sheetId}`
- `tg_finalResultHtml__{sheetId}`
- `tg_statsHtml__{sheetId}`, `tg_statsVisible__{sheetId}`
- `tg_deletedLogHtml__{sheetId}`, `tg_deletedLogDetailsVisible__{sheetId}`, `tg_deletedLogDetailsOpen__{sheetId}`
- `tg_cleanedLogHtml__{sheetId}`, `tg_cleanedLogDetailsVisible__{sheetId}`, `tg_cleanedLogDetailsOpen__{sheetId}`
- `syh_popup_divider_pos__{sheetId}`
- `syh_collected__{sheetId}` — масив `YTCollectedItem`, наповнюється **тільки** Studio-модулем (auto/manual routing)
- `tg_active_subtab` — який з 4 аркушів зараз відкритий (глобальний, не per-sheet)
- `tg_active_tab` — залишається як є (верхній рівень вкладок попапу)

Не namespaced (лишається як є, п.1):
- `syh_yt_collected` — старий модуль, показується в аркуші `vp_ss` за замовчуванням
- `syh_yt_checkbox_state`, `syh_yt_button_states` — стан старого модуля

### Новий Studio-модуль
- `syh_studio_enabled: boolean` — новий тумблер в Options
- `syh_studio_video_sheet_map: Record<videoKey, { sheetId, source: 'auto'|'manual', channelKey, videoTitle, updatedAt }>`
  - `videoKey` = `href` посилання на відео, якщо є, інакше — текст назви відео
- `syh_studio_button_state: Record<commentKey, 'question'|'prayer'>`
  - `commentKey` = хеш від (назва відео + автор + текст коментаря) — трійна зв'язка з ТЗ
- `syh_studio_checkbox_state: Record<commentKey, { checked: boolean; timestamp: number }>`
  - той самий `commentKey`, що й для кнопок. 30-денне автоочищення за timestamp (аналогічно `syh_yt_checkbox_state` у старому модулі)
- `syh_studio_manual_override_log: Array<{ timestamp, channelKey, channelLabel, videoTitle, autoDetectedSheet: SheetId | null, assignedSheet: SheetId }>`
  - Ліміт: останні 500 записів (FIFO)

---

## 5. Нові/змінені файли

### Спільні модулі
- **Новий** `modules/sheets.ts` — SHEET_IDS, SHEET_LABELS, тип `SheetId`
- **Новий** `modules/fuzzy_match.ts` — Levenshtein + `fuzzyIncludes(haystack, needle, maxDistanceRatio)`
- **Новий** `modules/channel_config.ts` — whitelist handle'ів для старого модуля + карта канал→категорії для Studio (TODO-плейсхолдери з п.0)

### Старий модуль (channel gate)
- **Змінений** `youtube/youtube_content.ts` — виклик `isAllowedChannel()` перед `initYouTubeModule()`
- **Новий** `youtube/yt_channel_gate.ts` — `isAllowedChannel(): boolean`

### Popup (4 аркуші)
- **Змінений** `popup/popup.html` — під-вкладки, 4 блоки-клони структури, перейменування лейблу
- **Змінений** `popup/popup_init.js` — цикл по 4 sheetId для load/save, відновлення активної під-вкладки
- **Змінений** `popup/popup_telegram.js` — параметризація функцій sheetId'ом, делегування подій
- **Змінений** `popup/popup.css` — стилі під-вкладок

### Options
- **Змінений** `options/options.html` — перейменування `optYouTubeEnabled`, новий блок "YouTube Studio" (тумблер, список каналів, лог-в'ювер)
- **Змінений** `options/options.ts` — логіка нового блоку

### Studio-модуль (новий, весь блок)
- **Новий** `youtube/studio/studio_content.ts` — entry-point, SPA-aware ініціалізація, перевірка `/comments/` у URL
- **Новий** `youtube/studio/studio_selectors.ts` — селектори з ТЗ, включно з селектором зони тексту коментаря для ПКМ (`#expander-container` / `#content-text`) і контейнера відео-мініатюри (`ytcp-comment-video-thumbnail`) для розміщення Badge+чекбокса
- **Новий** `youtube/studio/studio_channel.ts` — визначення `channelKey` з `#entity-name`/href
- **Новий** `youtube/studio/studio_category_matcher.ts` — `matchCategory()` на базі fuzzy_match
- **Новий** `youtube/studio/studio_video_map.ts` — get/set `syh_studio_video_sheet_map`
- **Новий** `youtube/studio/studio_comment_key.ts` — хеш (відео+автор+текст) + 30-денна автоочистка (спільна логіка перевикористовується і для button_state, і для checkbox_state)
- **Новий** `youtube/studio/studio_ui.ts`:
  - інжект 3 кнопок (копі/питання/молитва) у `#toolbar`
  - інжект **Badge + чекбокс** у контейнер відео-мініатюри під `#video-title` (спільний wrapper `.syh-studio-video-meta`, Badge зліва, чекбокс справа від нього)
  - dropdown вибору аркуша на Badge
  - динамічні tooltips
- **Новий** `youtube/studio/studio_events.ts`:
  - click "копіювати" / "додати до питань/молитов" (з блокуванням, якщо sheet не resolved)
  - click в Badge-dropdown → запис у `video_sheet_map` + лог корекцій
  - **click по чекбоксу** → тогл + запис у `syh_studio_checkbox_state` + клас `.syh-studio-comment-checked` на весь comment-thread (opacity/grayscale, як у старому модулі)
  - **contextmenu (ПКМ) на зоні тексту коментаря** (`#expander-container`/`#content-text`) → `e.preventDefault()` + тогл того ж чекбокса (той самий обробник, що й прямий клік)
  - відновлення стану чекбокса при рендері рядка (виклик при кожній обробці коментаря, аналогічно `restoreCheckboxState` у старому модулі)
- **Новий** `youtube/studio/studio_styles.css` — стилі кнопок/Badge/dropdown/чекбокса

### Manifest
- **Змінений** `manifest.json`:
  - `host_permissions`: додати `"https://studio.youtube.com/*"`
  - `content_scripts`: новий блок для Studio

---

## 6. Fuzzy matching — специфікація

```ts
// modules/fuzzy_match.ts
export function levenshtein(a: string, b: string): number { /* стандартна DP-реалізація */ }

function normalize(s: string): string { /* lowercase, trim, схлопування пробілів */ }

export function fuzzyIncludes(haystack: string, needle: string, maxErrorRatio = 0.25): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  const maxDist = Math.max(1, Math.ceil(n.length * maxErrorRatio));
  for (let i = 0; i <= h.length - n.length + maxDist; i++) {
    for (const winLen of [n.length - 1, n.length, n.length + 1, n.length + 2]) {
      const window = h.slice(i, i + winLen);
      if (window.length === 0) continue;
      if (levenshtein(window, n) <= maxDist) return true;
    }
  }
  return false;
}
```

Ключові слова (стартові пороги, підберемо емпірично):
- `"субботняя школа"` (15 симв.) — `maxErrorRatio ≈ 0.2`
- `"опарин"` (6 симв.) — `maxErrorRatio ≈ 0.34`

### Логіка визначення аркуша

matchCategory(videoTitle, channelKey):
if channelKey === 'vp':
if fuzzyIncludes(videoTitle, "субботняя школа") → VP_SS
if fuzzyIncludes(videoTitle, "опарин") → OPARIN
return null
if channelKey === 'slovo':
if fuzzyIncludes(videoTitle, "субботняя школа") → MOLCHANOV_SS
return MOLCHANOV_PREACH
return null


---

## 7. Лог корекцій (для розробника)

```ts
interface CorrectionLogEntry {
  timestamp: string;
  channelKey: 'vp' | 'slovo' | 'unknown';
  channelLabel: string;
  videoTitle: string;
  autoDetectedSheet: SheetId | null;
  assignedSheet: SheetId;
}
```
Пишеться при кожному ручному виборі в Badge-dropdown. FIFO-ліміт 500 записів.
В Options → секція "YouTube Studio": таблиця + "Скопіювати лог" + "Очистити лог".

---

## 8. Чекбокс "прочитано" — специфікація (п. F)

- **Розміщення**: у контейнері відео-мініатюри коментаря (`ytcp-comment-video-thumbnail`), одразу поруч із Badge — обидва per-comment елементи, бо в Studio кожен `ytcp-comment-thread` має власний блок відео/назви (див. приклад HTML у ТЗ).
- **Активація**:
  - звичайний клік по самому чекбоксу — стандартний toggle;
  - ПКМ (contextmenu) по тексту коментаря / його області (`#expander-container` чи `#content-text`) — `preventDefault()` рідного контекстного меню + toggle того ж чекбокса. Не вішати на весь `#body`, щоб не перехоплювати ПКМ біля автора/аватарки/дій.
- **Персистентність**: `syh_studio_checkbox_state[commentKey] = { checked, timestamp }`, той самий `commentKey`-хеш, що й для кнопок питання/молитва. 30-денне автоочищення за `timestamp` (той самий підхід, що вже є для `syh_yt_checkbox_state` у старому модулі — виконується при кожній обробці списку коментарів, не окремим таймером).
- **Відновлення після перезавантаження**: при повторному рендері рядка (в т.ч. після recycle віртуалізованого списку) — читати `syh_studio_checkbox_state[commentKey]` і виставляти `checked` + клас `.syh-studio-comment-checked` (візуально притлумлює рядок, як у старому модулі).

---

## 9. Ризики / нотатки для агентів

- **SPA-навігація в Studio**: перевірити, чи content script переживає навігацію між відео/вкладками в межах `/comments/` без перезавантаження; слідкувати за зміною `location.href`.
- **Віртуалізований список** (`tp-yt-iron-list`): рядки коментарів можуть перевикористовуватись (DOM recycling) — переконатись, що і кнопки, і Badge, і **чекбокс** коректно переприв'язуються/оновлюються при ре-рендері рядка з новим коментарем, інакше стан "прочитано" від одного коментаря може "прилипнути" до іншого.
- **ПКМ-обробник для чекбокса**: прив'язувати вузько (тільки до зони тексту), інакше можна ненавмисно заблокувати нативне ПКМ-меню в інших частинах рядка коментаря (аватар, кнопки, посилання на автора).
- **Рефакторинг popup_telegram.js на 4 копії** — найбільший обсяг роботи; спершу параметризувати функції й прогнати наявні `tests/*.test.js` на одному sheetId, лише потім розмножувати.
- **`syh_yt_collected` (старий модуль) в аркуші `vp_ss`** — тимчасове рішення (п.1), позначити TODO-коментарем у коді.
- **Зворотна сумісність з `npm test`**: усі глобальні функції в `popup_telegram.js` (`window.processTelegramData`, `window.parseAndFilterOldList` тощо) повинні мати дефолтний параметр `sheetId = 'vp_ss'`, щоб існуючі автоматичні тести залишалися працездатними.

---

## 10. Порядок виконання (фази)

1. Config/handles (блокер, п.0)
2. Спільні модулі (`sheets.ts`, `fuzzy_match.ts`, `channel_config.ts`)
3. Channel gate для старого модуля
4. Popup: параметризація JS → розмноження на 4 аркуші
5. Options: нові контроли + лог-в'ювер
6. Studio-модуль (кнопки, Badge, dropdown, **чекбокс**, persistence)
7. Manifest + збірка + ручне тестування на реальних каналах