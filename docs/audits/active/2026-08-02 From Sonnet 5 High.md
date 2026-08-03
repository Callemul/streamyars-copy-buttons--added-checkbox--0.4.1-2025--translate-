# Аудит архітектури StreamYard Helper

Пройшовся по всій кодовій базі — від `modules/*` до `youtube/*`, `youtube/studio/*` і `popup/*`. Знайшов кілька **реальних, перевірених багів**, що напряму випливають з архітектурних проблем (не просто "стилістика"), плюс системні порушення DRY/SOLID. Розклав за критичністю, з конкретними файлами/функціями.

---

## 🔴 Критично (реальні баги, втрата/дублювання даних)

### 1. Подвійний запис одного коментаря з YouTube → дублікати в UI та статистиці
`youtube/yt_events.ts → saveCollectedItem()`:
```js
await SYH_STORAGE.setAsync({ [STORAGE_KEYS.YT_COLLECTED]: updated });      // легасі-ключ
await CommentService.saveCollectedComment('vp_ss', item).catch(() => {}); // новий ключ syh:popup:collected:vp_ss
```
А потім і `sheet_state_service.ts`, і `popup_telegram.ts::loadYTCollected()` **зливають обидва ключі без дедуплікації**:
```js
ytCollected = [...oldItems, ...ytCollected]; // жодного .filter/Set по id
```
Результат: кожен коментар, доданий зі звичайного YouTube (не Studio), фізично зберігається у двох місцях і потім рендериться **двічі** у вкладці "Telegram/YouTube Питання" для `vp_ss`, подвійно рахується у статистиці "Нові з YouTube". Це не гіпотетичний, а гарантований баг при поточному коді.

### 2. Три різні TTL для однієї сутності `STORAGE_KEYS.PRAYERS` — тихе видалення даних
- `modules/event_comments.ts::saveToDatabase/removeFromDatabase` — тримає записи **30 днів**.
- `modules/retention_service.ts` — видаляє записи, старші **48 годин** (`TWO_DAYS_MS`), коментар каже "Очищення Молитов", але фільтрує **весь масив без перевірки `item.type`**.
- `popup/popup_prayers.ts::renderPrayers()` — при кожному відкритті попапу **ще раз** незалежно видаляє все старіше 48 год, теж без урахування `type`.

Проблема глибша, ніж просто різні цифри: у той самий масив `STORAGE_KEYS.PRAYERS` пишуться і `type: "prayer"`, і `type: "question"` (`event_comments.ts` викликає `saveToDatabase(author, text, "question", "❓")`). Через це **позначені питання зникають через 48 годин**, хоча логіка на сторінці StreamYard розрахована на 30 днів — і разом з ними зникає візуальне підсвічування вже опрацьованих коментарів (`applySavedLabels` у `ui_comments.ts` шукає по цьому кешу). Для багатоденної серії ефірів це відчутна регресія UX, замаскована під "оптимізацію сховища".

### 3. Один debounce-таймер на 4 незалежні аркуші попапу → втрата введеного тексту
`popup/popup_init.ts`:
```js
let oldListTimer: ReturnType<typeof setTimeout> | null = null;
...
SHEET_IDS.forEach(sId => {
    $(`#oldList__${sId}`).on('input', function () {
        if (oldListTimer) clearTimeout(oldListTimer);
        oldListTimer = setTimeout(() => { SYH_STORAGE.set({...}); }, 300);
    });
});
```
Змінна `oldListTimer` (як і `newTelegramTimer`, `answeredIdsTimer`, `finalResultTimer`) **одна на всі 4 аркуші**. Якщо користувач набирає текст в аркуші "Опарин", за <300мс перемикається на "Молчанов СШ" і теж щось вводить — таймер першого аркуша скасовується, і його останні зміни ніколи не зберігаються в storage. Це класичний наслідок "економії" на іменах змінних замість Map<sheetId, Timer> чи замикання per-елемент.

### 4. `vp_ss` захардкожений як спеціальний виняток у щонайменше 3 місцях
`sheet_state_service.ts::loadSheetState`, `popup_telegram.ts::loadYTCollected`, `popup_telegram.ts::deleteYTCollectedItem` — усі містять `if (sheetId === 'vp_ss') { ...особлива логіка... }`. `deleteYTCollectedItem` взагалі має **два різні шляхи видалення** залежно від того, де знайшовся елемент. `SHEET_REGISTRY` заявлений як "динамічний реєстр" (`registerSheet()`), але фактично додати новий sheetId неможливо без правок у декількох файлах — тобто абстракція існує лише номінально.

---

## 🟠 Високо (системні DRY/SOLID порушення в ключовій логіці)

### 5. Повне дублювання інʼєкції коментарів: `youtube/*` vs `youtube/studio/*`
`yt_ui.ts::addButtonsToYTComment` і `studio_ui.ts::injectStudioCommentUI`, `yt_events.ts::bindYTEvents` і `studio_events.ts::bindStudioCommentEvents`, `extractCommentId` vs `generateCommentKey` — це два незалежні, майже 1:1 паралельні рушії (~600+ рядків) для концептуально однієї задачі: "показати кнопки на коментарі, зберегти стан, скопіювати в буфер". Вони вже розійшлися функціонально (Studio має бейдж категорії й dropdown, звичайний YouTube — ні), і кожна майбутня фіча (наприклад, нова кнопка дії) потребуватиме реалізації двічі.

### 6. `event_comments.ts` / `event_banners.ts` — God Objects
`SYH_EVENT_COMMENTS.bindEvents()` — це одна функція на ~230 рядків, яка одночасно: піднімає окремий `MutationObserver` для "Auto-Heal", вішає нативні `click/mousedown/contextmenu/mouseup/change` прямо на `document`, форматує текст для банерів, працює зі storage напряму (`saveToDatabase`/`removeFromDatabase` — дублюють логіку `CommentService`, див. п.2). `event_banners.ts` повторює майже ідентичний контекстний обробник ПКМ. SRP порушено кардинально: DOM-делегування + бізнес-класифікація + storage + auto-heal-синхронізація в одному об'єкті.

### 7. Один і той самий "магічний" regex для emoji-нумерації скопійований у 4+ місцях
```
/^(?:\d+\uFE0F?\u20E3|🔟)+\s*$/   // modules/parsers.ts
/^(?:\d+\uFE0F?\u20E3|🔟)+\s*$/   // modules/telegram_parser.ts (emojiNumberRegex)
/(?:\d+\uFE0F?\u20E3|🔟)/         // modules/telegram_parser.ts (hasKeycapInRemainingLines)
/❓❓❓|🙏+|(?:\d+\uFE0F?\u20E3|🔟)/iu  // sheet_state_service.ts — двічі (processSheetData, computeSheetCounters)
```
Це найкрихкіша частина застосунку (парсинг реальногоユーザ-тексту з Telegram/YouTube) — і вона не має єдиного джерела правди. Зміна формату emoji в майбутньому = ризик забути одне з місць.

### 8. Два незалежні "рушії" парсингу списку питань без спільного ядра
`modules/parsers.ts` (`SYH_PARSERS`, для банерів StreamYard) і `modules/telegram_parser.ts` (для попапу) вирішують ту саму задачу — розбір нумерованого/emoji-нумерованого списку питань з ім'ям автора — двома повністю окремими state-машинами. Немає спільного "парсера домену", хоча логічно це одна предметна область.

### 9. Кілька незалежних `MutationObserver` замість вже готового `DomObserverService`
`main.ts` і `youtube/youtube_content.ts` коректно використовують централізований `modules/dom_observer.ts` (з RAF-батчингом і throttling для прихованих вкладок). А `youtube/studio/studio_content.ts` створює **свій власний** `new MutationObserver(...)` без цих оптимізацій — саме на сторінці з найважчим DOM (віртуалізований список коментарів Studio). Додатково, `event_comments.ts` на StreamYard-сторінці піднімає **ще один, другий** обсервер ("Auto-Heal") паралельно з тим, що вже слухає `main.ts` через `SYH_DOM_OBSERVER` — тобто на одній сторінці одночасно працюють 2 незалежні спостерігачі за тим самим DOM-деревом.

---

## 🟡 Середньо (структурні неузгодженості, незавершені міграції)

10. **Sheets не по-справжньому динамічні**: `popup/popup.html` хардкодить 4 кнопки `<button data-sheet="vp_ss">` вручну в HTML, тоді як вміст аркушів рендериться динамічно з `<template>` (`renderSheetTemplates`). Половина міграції на data-driven підхід зроблена, половина — ні.

11. **`UiFactory` створений, але одразу обходиться**: `video_copier.ts::createSquareButton` і `stats_tracker.ts` викликають `UiFactory.createButton()`, а потім одразу перезаписують `btn.style.cssText` 10-15 рядками інлайн-стилів з ручними `onmouseover/onmouseout` — тобто фабрика для консистентного вигляду існує, але не використовується за призначенням.

12. **`SYH_UI` — зайвий проксі-шар над `SYH_UI_STATE`**: `ui_core.ts` визначає `SYH_UI` як об'єкт з getter/setter-ами, які просто проксіюють кожну властивість до `SYH_UI_STATE` (`get activeFilter() { return SYH_UI_STATE.activeFilter }`). Подвійна індирекція без реальної користі — схоже на недоведену до кінця міграцію.

13. **`modules/i18n.ts` (`SYH_I18N`) існує, але ігнорується**: `config.ts` (гетер `timerOffTextResult`), `anti_afk.ts`, `video_copier.ts` — кожен окремо реалізує той самий `typeof chrome !== 'undefined' && chrome.i18n && ...` try/catch замість виклику `SYH_I18N.getMessage()`.

14. **Дві незалежні реалізації визначення каналу YouTube**: `youtube/yt_channel_gate.ts::isAllowedChannel()` і `youtube/studio/studio_channel.ts::getStudioChannelInfo()` шукають ім'я каналу через **різні** DOM-селектори, хоча обидва зрештою викликають спільний `detectChannelKey()`. Сам пошук "хто зараз власник сторінки" не уніфікований.

15. **4 різні механізми "оновити UI при зміні даних"** співіснують без чіткого поділу відповідальності: власний `SYH_BUS` (EventBus), `SYH_STORAGE.onChanged`, `SYH_MESSAGING` (chrome.runtime), і прямі виклики методів (`self.UI.filterStarredComments()` напряму з `event_comments.ts`, хоча для цього існує подія `FILTER_COMMENTS_REQUESTED`). Складно передбачити, що саме викличе оновлення в конкретному місці.

16. **`popup_prayers.ts::renderPrayers()` дублює CSS інлайном**: додає клас `editable-author` (який уже повністю стилізований у `popup.css`) і одразу поверх ставить ідентичні властивості через `.css({color: '#0b5394', fontWeight: 'bold', ...})`. Це не просто зайвий код — це робить майбутню зміну дизайну через CSS неможливою без правки JS.

---

## 🟢 Низько (полірування)

17. Псевдо-DI (`init(config?, state?, utils?, ui?)` з опційними параметрами) реально не використовується ніде, крім тестів — додає шум без користі, справжню тестованість це не дає (тести все одно мокають `global.chrome`/`global.document`).
18. Магічні hex-кольори (`#28a745`, `#005DF7`, `#f39c12`) розкидані по TS-файлах замість CSS-змінних, вже визначених у `popup.css` (`--primary`, `--new-border` тощо).
19. Інтерфейс `SyhUi` в `ui_core.ts` об'єднує 11+ методів з двох різних доменів (коментарі + банери) в один — порушення ISP, споживачу, якому потрібні лише банери, доводиться залежати від усього API.
20. Мова помилок непослідовна: `banner_creator.ts` кидає англійські `Error("Create banner button not found")`, тоді як решта інтерфейсу — українською.

---

## Чи правильно побудована архітектура глобально?

Чесна відповідь: **ні, не оптимально**, але не тому, що хтось помилився в дизайні — це наслідок органічного росту з userscript-стилю (`SYH_*` глобальні неймспейс-об'єкти) в TypeScript без завершення переходу на справжню шарувату архітектуру. Показово, що **найякісніші частини кодової бази — це саме нещодавно додані класи**: `DomObserverService`, `PluginRegistry`, `CommentService`, `RetentionService`, `AntiAfkService`, `StudioModuleController` — усі вони інкапсульовані, без глобального стану, легко тестовані. А проблемні частини (`event_comments.ts`, `event_banners.ts`, `ui_core.ts`, `stats_tracker.ts`) — це старіші `SYH_*`-синглтони з мутабельним `this.SELECTORS = config.SELECTORS`, куди все ще звалюється нова логіка.

Тобто **правильний напрямок вже є в самому коді** — просто застосований частково.

### Рекомендована цільова структура (на основі того, що вже добре працює)

```
Domain (чисте, тестоване)          — parsers.ts + telegram_parser.ts → об'єднати в один
                                      "question-parsing" модуль з єдиним джерелом regex-правил;
                                      channel_config.ts (вже добре)

Application/Services                — CommentService, RetentionService, SheetStateService (вже добре,
                                      розширити тим самим підходом на StreamYard-молитви/питання,
                                      прибравши saveToDatabase/removeFromDatabase з event_comments.ts)

Platform Adapters (новий шар)       — один інтерфейс CommentPlatformAdapter
                                      (getAuthor/getText/getToolbar/injectButtons/getVideoContext),
                                      3 тонкі реалізації: StreamYardAdapter, YouTubeAdapter,
                                      StudioAdapter — і ОДИН спільний "CommentInjector" рушій
                                      замість трьох паралельних (п.5, п.6)

Infrastructure                      — storage.ts, messaging.ts, event_bus.ts, dom_observer.ts
                                      (вже добре зроблені — треба лише довести адопцію до 100%,
                                      прибрати "додаткові" MutationObserver, п.9)

UI                                   — popup: замінити стрінг-інтерполяцію `#id__${sheetId}` та
                                      спільні debounce-змінні на клас SheetPanel, що інстанціюється
                                      по одному на sheetId і володіє власним станом/таймерами
```

---

## Пріоритетний план дій

1. **Критично, зробити негайно** (низький ризик регресії, високий impact):
   - Прибрати подвійний запис у `yt_events.ts::saveCollectedItem` (п.1)
   - Уніфікувати TTL для `STORAGE_KEYS.PRAYERS` в одному місці (`RetentionService`), з урахуванням `item.type`, і прибрати дублюючу логіку з `event_comments.ts` та `popup_prayers.ts` (п.2)
   - Замінити спільні debounce-таймери в `popup_init.ts` на `Map<sheetId, Timer>` (п.3)
2. **Розв'язати `vp_ss`-виняток**: мігрувати легасі-ключ `syh:popup:yt:collected` у `syh:popup:collected:vp_ss` один раз (схожий механізм на `migrateStorageIfNeeded()` вже є в `storage.ts`) і прибрати спецкейси (п.4)
3. **Витягнути спільний `CommentInjector`/`CommentPlatformAdapter`**, звести `youtube/*` і `youtube/studio/*` до тонких адаптерів (п.5) — найбільший виграш у зменшенні коду
4. **Об'єднати `parsers.ts` + `telegram_parser.ts`** в один домен-модуль з константами для emoji-regex (п.7, п.8)
5. Довести адопцію `DomObserverService`, `CommentService`, `SYH_I18N` до 100% у решті модулів (п.9, п.6, п.13)
6. Поступово переводити `SYH_*` синглтони на класи, що інстанціюються в composition root (`main.ts`/content scripts), а не імпортуються як глобальний мутабельний стан — це і дасть реальну тестованість найкрихкішого коду (парсинг + DOM-автоматизація банерів), який зараз взагалі не покритий тестами.