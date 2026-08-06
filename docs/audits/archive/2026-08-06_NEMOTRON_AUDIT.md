# АУДИТ КОДУ — StreamYard Helper Extension
**Дата:** 2026-08-06  
**Модель:** Nemotron 3 Ultra

---

## 🎯 ВИСНОВОК: КРИТИЧНІ ПРОБЛЕМИ АРХІТЕКТУРИ

Кодова база **НЕ ГОТУВА** до безпечного додавання нового функціоналу. Виявлено **системне порушення принципу SINGLE SOURCE OF TRUTH** — стан дублюється в 5+ незалежних місцях, що гарантує рассинхронізацію при розширенні.

---

## 🔴 КРИТИЧНІ ДУБЛЮВАННЯ (Blokери для масштабування)

### 1. Множинні локальні кеші стану коментарів — **ПОРУШЕННЯ SSoT**

| Місце | Що кешує | Проблема |
|-------|----------|----------|
| `youtube_content.ts:12-24` | `buttonStates`, `checkboxStates`, `collectedList` | Локальний об'єкт, не синхронізований з адаптером |
| `studio_content.ts:53-58` | `videoSheetMap`, `buttonStates`, `checkboxStates`, `collectedItems` | Клас-контролер з власним кешем |
| `modules/state.ts` | `itemStates` (checkbox state для StreamYard) | Старий синглтон, використовується в `ui_comments.ts:44` |
| `comment_injector.ts:11-19` | `CommentStateCaches` (передається в конструктор) | Очікує зовнішній кеш, але адаптери мають свої |
| `yt_adapter.ts:195-222` | `restoreButtonState`, `restoreCheckboxState` | Дублює логіку відновлення зі свого кешу |
| `studio_adapter.ts:342-380` | `restoreButtonState`, `restoreCheckboxState` + `getEffectiveButtonState` | Складна fallback-логіка з 3 рівнів |

**Ризик:** При додаванні нової платформи (напр. Twitch) потрібно буде повторити всю цю архітектуру. При зміні формата ID коментаря — ламаються 6 місць одночасно.

---

### 2. Повне дублювання пайплайну обробки коментарів на платформу

```
StreamYard (main.ts)     → ui_comments.ts → CommentService
YouTube (youtube_content.ts) → yt_ui.ts + yt_events.ts → CommentService (частково)
Studio (studio_content.ts)   → studio_events.ts + studio_ui.ts → CommentService (частково)
```

Кожна платформа має:
- Власний `MutationObserver` реєстрацію
- Власне створення UI (`ui_factory.ts` / `yt_ui.ts` / `studio_ui.ts`)
- Власне прив'язку подій (`CommentInjector` / `bindYTEvents` / `bindStudioCommentEvents`)
- Власне відновлення стану

**Ризик:** Нова фічча (напр. "Позначити як спам") потребує правок в 3х незалежних пайплайнах.

---

### 3. Дублювання логіки визначення аркуша (sheetId)

| Платформа | Метод | Виклики |
|-----------|-------|---------|
| YouTube | `YouTubeCommentAdapter.getSheetId()` (yt_adapter.ts:105-112) | `detectChannelKey()` + `matchCategory()` |
| Studio | `StudioCommentAdapter.getSheetId()` (studio_adapter.ts:159-163) | `resolveCategoryForVideo()` |
| StreamYard | Неявно через `sheetId` в попапі | Хардкод `'vp_ss'` |

Функція `matchCategory` в `channel_config.ts` викликається з різних місць з різними параметрами. Логіка fallback на `'vp_ss'` розсіяна.

---

### 4. Дублювання роботи з чекбоксами

1. `SYH_STATE` (modules/state.ts) — старий підхід для StreamYard
2. `CommentInjector.handleCheckboxChange()` (comment_injector.ts:165-185) — через адаптер
3. `YouTubeCommentAdapter.applyCheckboxState()` + `markChecked/unmarkChecked` (yt_adapter.ts:144-172)
4. `StudioCommentAdapter.applyCheckboxState()` + `markChecked/unmarkChecked` (studio_adapter.ts:180-220)
5. `studio_content.ts:222-230` — власний contextmenu handler для чекбоксів

**Ризик:** Зміна поведінки чекбокса (напр. додати undo) — 5 місць правок.

---

## 🟠 СЕРЕДНІ ПРОБЛЕМИ (Технічний борг)

### 5. CommentService vs CommentInjector — розділення відповідальності порушене

- `CommentService` (comment_service.ts): збереження зібраних коментарів, форматування, clipboard
- `CommentInjector` (comment_injector.ts): UI події, **але також пише buttonStates/checkboxStates в storage напряму** (рядки 96, 109, 124, 184)

`CommentInjector` повинен делегувати всі записи стану в сервіс або адаптер, а не лезти в `SYH_STORAGE` сам.

### 6. Адаптери не реалізують повний інтерфейс `CommentPlatformAdapter`

- `YouTubeCommentAdapter` — **не має** `getButtonState`, `beforeAction`, `afterAction`, `unmarkChecked` (опціональні, але потрібні)
- `StudioCommentAdapter` — має всі, але **дублює** логіку fallback в `getEffectiveButtonState` (3 рівні перевірки)

### 7. Storage keys для sheet-specific даних — розкидані

- `getSheetCollectedStorageKey()` в `storage.ts:82`
- `POPUP_SHEET_KEYS` об'єкт в `storage.ts:86-102`
- Використання в `sheet_state_service.ts`, `studio_content.ts`, `comment_service.ts` — кожне місце викликає по-своєму

### 8. Channel/Category конфігурація — жорстко захардкоджена

`channel_config.ts:29-72` — `registerDefaultChannels()` з жорсткими правилами. Додавання нового каналу = кодова зміна + rebuild. Потрібен data-driven підхід (JSON в storage або remote config).

### 9. Event Bus (`event_bus.ts`) — слабка типізація

`SYH_BUS.emit('SHEET_DATA_PROCESSED', {...})` — рядкові івенти без TypeScript контрактів. При рефакторингу легко зламати subscrbiers.

### 10. UI Factory — не уніфікована

- `UiFactory` (ui_factory.ts) — для StreamYard
- `addButtonsToYTComment` (yt_ui.ts) — для YouTube  
- `injectStudioCommentUI` (studio_ui.ts) — для Studio

Спільний базовий інтерфейс відсутній.

---

## 🟡 АРХІТЕКТУРНІ СЛАБКІ МІСЦЯ (Ризики майбутнього)

### 11. Отсутність абстракції "Платформа"

Немає спільного базового класу/інтерфейсу `CommentPlatform`, який інкапсулював би:
- Селектори DOM
- Створення UI
- Визначення sheetId
- Відновлення стану
- Обробку подій

Кожна нова платформа = copy-paste 5 файлів.

### 12. `SYH_UI_STATE` (ui_state.ts) — глобальний синглтон з бізнес-логікою

Містить `prayersCache`, `activeFilter`, `searchQuery` — це **UI стан**, але він мутує в `ui_comments.ts` (filterStarredComments: 274-436). Логіка фільтрації в UI шарі, а не в сервісі.

### 13. `sheet_state_service.ts` — God Class

295 рядків: парсинг Telegram, обчислення статистики, storage IO, очищення логів. Нарушене SRP. Потрібен розділ на:
- `TelegramParser` (вже є `telegram_parser.ts` — дублювання!)
- `SheetStatsCalculator`
- `SheetStorageRepository`

### 14. Тести не покривають інтеграцію між шарами

Є unit-тести для парсерів, storage, але **немає integration тестів** для:
- CommentInjector + Adapter + CommentService
- State sync між content script і popup
- SPA навігація в Studio/YouTube

### 15. TypeScript `any` / небезпечні приведення

Багато `as any`, `as HTMLElement`, `@ts-ignore` в UI коді (studio_ui.ts, yt_ui.ts). При зміні DOM YouTube/Studio — runtime помилки.

---

## 📋 ПРІОРИТЕТНІ ЗАВДАННЯ ДЛЯ РЕФАКТОРИНГУ

*(Відстеження прогресу також збережено у файлі [2026-08-06_NEMOTRON_TASKS.md](./2026-08-06_NEMOTRON_TASKS.md))*

### P0 (Блокуючі нові фіччі)
1. [x] **1. Єдиний State Store** — Централізовано збереження станів у `CommentService` та додано метод реактивної підписки `subscribeToStateChanges`.
2. [x] **2. Platform Abstraction** — Створено `BaseCommentPlatformAdapter` у `modules/comment_platform_adapter.ts`, від якого успадковано `YouTubeCommentAdapter` та `StudioCommentAdapter`.
3. [x] **3. Заміна `SYH_STATE`** — Переведено StreamYard чекбокси на єдиний інтерфейс `CommentService.setStreamYardCheckboxState` / `getStreamYardCheckboxState`.

### P1 (Архітектурні)
4. [x] **4. Уніфікувати `CommentService`** — Винесено `saveButtonState` та `saveCheckboxState` у `CommentService`, усунуто захардкоджені ключі та використано `getSheetCollectedStorageKey` і `SHEET_IDS.VP_SS`.
5. [x] **5. Data-driven Channel Config** — Додано динамічне розширення конфігурації каналів через `loadCustomChannelsFromStorage()`.
6. [x] **6. Розділити `sheet_state_service.ts`** — Розділено на `SheetStatsCalculator` та `SheetRepository`.
7. [x] **7. Типізація Event Bus** — Завершено сувору типізацію `SyhEventPayloads` без `any`.

### P2 (Якість)
8. [x] **8. Integration Tests** — Додано наскрізні інтеграційні тести `CommentInjector` → `Adapter` → `CommentService` → `SYH_STORAGE` → `SheetStateService`.
9. [x] **9. Видалити `any`** у викликах DOM елементів у `studio_events.ts`.
10. [x] **10. Уніфікувати UI Factory** — Створення чекбоксів у YouTube Studio переведено на `UiFactory.createCheckbox`.

---

## 🔍 ДЕТАЛЬНИЙ АНАЛІЗ ОСНОВНИХ ФАЙЛІВ

### `modules/comment_injector.ts` (201 рядок)
- **Проблема:** Пише в storage напряму (рядки 96, 109, 124, 184) — порушує SSoT
- **Проблема:** `handleAction` — 70 рядків з глибокою вкладеністю, важко тестувати
- **Хороче:** Чиста делегація в адаптер для UI маніпуляцій

### `modules/comment_service.ts` (192 рядок)
- **Хороче:** Централізоване збереження зібраних коментарів
- **Проблема:** `copyToClipboard`, `formatForClipboard` — утиліти, не бізнес-логіка коментарів
- **Проблема:** Не керує buttonStates/checkboxStates — це робить CommentInjector

### `modules/storage.ts` (425 рядок)
- **Хороче:** Чіткі ключі, міграція, type-safe helpers
- **Проблема:** `getSheetCollectedStorageKey` + `POPUP_SHEET_KEYS` — два способи генерації ключів для sheet-specific даних

### `youtube/yt_adapter.ts` (223 рядки)
- **Проблема:** `restoreButtonState`, `restoreCheckboxState` дублюють логіку, яка має бути в State Store
- **Проблема:** `detectChannelKey` кешується в адаптері — має бути в ChannelService

### `youtube/studio/studio_adapter.ts` (493 рядки)
- **Проблема:** Найбільший адаптер, містить UI логіку (dropdown, badge), state fallback (3 рівні), retroactive updates
- **Проблема:** `getEffectiveButtonState` / `getEffectiveCheckboxState` — 50 рядків fallback логіки кожен
- **Хороче:** `beforeAction` / `afterAction` pattern для async category resolution

### `modules/sheet_state_service.ts` (295 рядків)
- **Проблема:** `processSheetData` — 85 рядків, змішує парсинг, статистику, логування
- **Проблема:** `computeSheetCounters` дублює частину логіки `processSheetData`
- **Дублювання:** `parseAndFilterOldList`, `parseTelegramExportLineByLine` викликаються і тут, і в `telegram_parser.ts` тестах

---

## ✅ ЧОМУ ЦЕ БУДЕ ЛАМАТИСЬ ПРИ НОВОМУ ФУНКЦІОНАЛІ

### Сценарій: Додати нову дію "Архівувати коментар" (кнопка 📦)

**Поточний стан — потрібно змінити:**
1. `CommentPlatformAdapter` interface — додати `archiveBtn` в `PlatformButtons`
2. `CommentInjector` — додати `handleArchiveClick`, `handleAction` гілку для 'archive'
3. `CommentService` — додати `saveArchivedComment`, `removeArchivedComment`
4. `YouTubeCommentAdapter` — додати UI кнопку в `yt_ui.ts`, стилі, `applyButtonState` для archive
5. `StudioCommentAdapter` — додати UI кнопку в `studio_ui.ts`, `applyButtonState`, `getButtonState` fallback
6. `youtube_content.ts` — оновити `StateCache` тип, додати `archiveStates`
7. `studio_content.ts` — оновити `caches` тип, додати `archiveStates`
8. `ui_comments.ts` (StreamYard) — додати кнопку в `UiFactory`, обробку в `CommentInjector`
9. Storage keys — нові ключі для archive states
10. Popup UI — відображення архівованих

**10+ файлів, 5+ незалежних state caches.** Шанс ввести баг — 90%.

---

### Сценарій: Додати підтримку Twitch чату

**Потрібно повторити ВЕСЬ пайплайн:**
1. `twitch/twitch_content.ts` (копія youtube_content.ts)
2. `twitch/twitch_adapter.ts` (копія yt_adapter.ts)
3. `twitch/twitch_ui.ts` (копія yt_ui.ts)
4. `twitch/twitch_events.ts` (копія yt_events.ts)
5. `twitch/twitch_selectors.ts` (копія yt_selectors.ts)
6. Оновити `manifest.json` — content scripts
7. Оновити `channel_config.ts` — додати Twitch канали
8. Popup — нові sheetId для Twitch категорій

**~8 нових файлів з 90% дублюванням логіки.**

---

## 📊 МЕТРИКИ ДУБЛЮВАННЯ

| Категорія | Файлів | Рядків дубльованого коду (оцінка) |
|-----------|--------|-----------------------------------|
| State Management | 6 | ~400 |
| Comment Pipeline | 3 платформи × ~5 файлів | ~1500 |
| UI Creation | 3 файли фабрик | ~600 |
| Category Resolution | 2 адаптери + config | ~200 |
| Checkbox Handling | 5 місць | ~300 |
| **РАЗОМ** | | **~3000 рядків** (~30% кодової бази) |

---

## 🎯 РЕКОМЕНДАЦІЇ ПОЧАТКУ РЕФАКТОРИНГУ

1. **Створити `CommentStateService`** — єдине джерело правди для всіх станів коментарів
2. **Винести `BaseCommentPlatform`** — абстрактний клас з template method для пайплайну
3. **Перенести YouTube на нову архітектуру** (найпростіша платформа)
4. **Перенести Studio** (найскладніша, але найбільше вигоду дасть)
5. **StreamYard останній** (вже частково використовує CommentInjector)

**Не починайте нові фіччі до P0 задач.** Кожна нова фічча на поточній архітектурі множить технічний борг.