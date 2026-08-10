# [2026-08-09] — KILO — Аудит: латентний баг «розбіжність ключа studio_enabled між Options і Studio»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow (етап 3, модулі `youtube/studio/storage_handler`, `studio_init`).
> **Статус:** ✅ ВИПРАВЛЕНО (2026-08-10). `studio_storage_handler.ts` та `studio_init.ts` читають `STUDIO_ENABLED` із `STORAGE_KEYS` (канонічний `syh:core:studio_enabled`), а `videoMap` — через `VIDEO_MAP_STORAGE_KEY`. Options і Studio тепер узгоджені.

---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

**Два різні ключі зберігання для однієї й тієї ж настройки «Studio увімкнено»:**

| Місце | Ключ | Джерело |
|---|---|---|
| **Options (popup/options.ts)** — **пише** | `STORAGE_KEYS.STUDIO_ENABLED` = `'syh:core:studio_enabled'` | `modules/storage_keys.ts:57` |
| **StudioStorageController (studio_storage_handler.ts)** — **читає** | Локальний `STUDIO_ENABLED_KEY = 'syh:studio:enabled'` | `youtube/studio/studio_storage_handler.ts:12` |
| **studio_init.loadStorageData** — **читає** | Жорстко закодований `'syh:studio:enabled'` | `youtube/studio/studio_init.ts:47` |

**Результат:** Options записує значення в `'syh:core:studio_enabled'`, а Studio-модулі читають з `'syh:studio:enabled'` — ключ, в який **ніхто ніколи не пише**.

У `storage_keys.ts` миграція `'syh_studio_enabled' → STORAGE_KEYS.STUDIO_ENABLED` (рядок 133) працює правильно — старі ключі мігрують у **нові** (`syh:core:studio_enabled`). Але Studio-код ігнорує цю конвенцію.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### Сценарій відмови:
1. Користувач у попапі Options вимикає перемикач «Studio» (checkbox → `studio_enabled: false`).
2. `options.ts:100` виконує `SYH_STORAGE.set({ [STORAGE_KEYS.STUDIO_ENABLED]: false })` → записує в `syh:core:studio_enabled = false`.
3. Користувач відкриває YouTube Studio → запускається `initializeStudioModule` → `StudioStorageController.loadStorageData()`.
4. Контролер читає `keysToFetch`, включаючи `'syh:studio:enabled'` (рядок 67).
5. `chrome.storage.local.get` повертає `undefined` для цього ключа (бо нічого там не було записано).
6. Рядок 75: `this.enabled = res[STUDIO_ENABLED_KEY] ?? true` → **завжди `true`** (fallback спрацьовує, бо значення `undefined`).
7. Studio-модуль **завжди працює**, незалежно від налаштування користувача.

### Додаткова проблема (videoMap):
Аналогічно `'syh:studio:videoMap'` (studio_init.ts:48) vs правильний `VIDEO_MAP_STORAGE_KEY = 'syh:studio:video_sheet_map'` (studio_video_map.ts:8). `studio_storage_handler` використовує правильний ключ, але `studio_init` — жорстко неправильний. Це означає, що `studio_init` **ніколи не бачить** збережене відображення відео → аркуш, а `StudioStorageController` — бачить.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

### Варіант А (мінімальний, 1-в-1): зробити Studio читати правильний ключ

```ts
// youtube/studio/studio_storage_handler.ts
// БУЛО:
const STUDIO_ENABLED_KEY = 'syh:studio:enabled';

// СТАЛО:
import { STORAGE_KEYS } from '../../modules/storage_keys';
const STUDIO_ENABLED_KEY = STORAGE_KEYS.STUDIO_ENABLED;  // 'syh:core:studio_enabled'
```

```ts
// youtube/studio/studio_init.ts
// БУЛО:
const keysToFetch = [
    'syh:studio:enabled',
    'syh:studio:videoMap',
    ...

// СТАЛО:
import { STORAGE_KEYS } from '../../modules/storage_keys';
import { VIDEO_MAP_STORAGE_KEY } from './studio_video_map';

const keysToFetch = [
    STORAGE_KEYS.STUDIO_ENABLED,   // 'syh:core:studio_enabled'
    VIDEO_MAP_STORAGE_KEY,         // 'syh:studio:video_sheet_map'
    ...
```

### Варіант Б (спільний модуль ключів Studio): винести всі Studio-ключі в `studio_keys.ts`

Створити `youtube/studio/studio_keys.ts`, що реекспортує відповідні `STORAGE_KEYS.*` і додає специфічні для Studio константи, щоб уникнути жорстких рядків.

---

## 3.1 Що зміниться для користувача (таблиця сценаріїв "Зараз" та "Після")

| # | Сценарій | Зараз | Після |
|---|---|---|---|
| 1 | Користувач вимкнув Studio в Options, відкрив Studio | Studio **працює** (ігнорує вимкнення) | Studio **не завантажується** / не ін’єктує кнопки |
| 2 | Користувач увімкнув Studio назад | Працює (було б так само) | Працює |
| 3 | Перший запуск без попередніх налаштувань | Studio працює (дефолт `true`) | Studio працює (дефолт `true`) |
| 4 | Міграція старих ключів (`syh_studio_enabled`) | Не працює для Studio (читає інший ключ) | Працює — мігрує в правильний ключ, Studio бачить |

---

## 3.2 Ризики міграції

1. **Зворотна сумісність:** якщо хтось вручну правив `chrome.storage` і поставив значення в старий ключ `'syh:studio:enabled'`, після виправлення воно перестане читано. Але це крайне маловірогідно — ключ ніколи не записувався кодом.
2. **Розділені конфігурації:** `studio_init` і `StudioStorageController` тепер мають читати з однакових ключів — це **виправляє** існуючий баг розбіжності між двома шляхами завантаження.
3. **Тестування:** потрібно перевірити на живому Studio: перемикання в Options → перезавантаження Studio → перевірка наявності/відсутності кнопок.

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

| Файл | Місце | Що саме |
|---|---|---|
| `youtube/studio/studio_storage_handler.ts` | рядок 12, 30, 67, 75 | `STUDIO_ENABLED_KEY = 'syh:studio:enabled'` — локальний неправильний ключ |
| `youtube/studio/studio_init.ts` | рядки 46-48 | Жорсткі `'syh:studio:enabled'`, `'syh:studio:videoMap'` замість констант з `storage_keys` / `studio_video_map` |
| `modules/storage_keys.ts` | рядок 57, 133 | Правильні константи існують (`STORAGE_KEYS.STUDIO_ENABLED = 'syh:core:studio_enabled'`), але Studio їх не використовує |
| `options/options.ts` | рядки 57, 60, 94, 100 | Правильно пише в `STORAGE_KEYS.STUDIO_ENABLED` |

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] `STORAGE_KEYS.STUDIO_ENABLED` імпортується і використовується в `studio_storage_handler.ts` та `studio_init.ts`
- [ ] `VIDEO_MAP_STORAGE_KEY` імпортується і використовується в `studio_init.ts` замість `'syh:studio:videoMap'`
- [ ] `npx tsc --noEmit` — 0 помилок
- [ ] `npm test` — усі тести зелені (додати тест: Options пише → Studio читає)
- [ ] **Ручна перевірка на живому YouTube Studio:**
  - [ ] Вимкнути Studio в Options → перезавантажити Studio → кнопки відсутні
  - [ ] Увімкнути Studio → перезавантажити → кнопки з'явилися
  - [ ] Перевірити, що `videoSheetMap` коректно завантажується в обох місцях
- [ ] DevTools: `chrome.storage.local.get(['syh:core:studio_enabled', 'syh:studio:enabled'])` — показує значення лише в першому ключі

---

## 6. Побічні спостереження

1. **Повторюваний патерн «жорсткі рядки замість констант»:** у проєкті вже виправлено подібне для `event_comments/types.ts` (відсутні імпорти), `ui_selector_validator` (валидатор селекторів). Цей баг — той самий клас: копіпаст рядків замість використання єдиного джерела правди (`storage_keys.ts`).

2. **Два незалежні шляхи завантаження Studio:** `studio_init.loadStorageData` (викликається при старті контент-скрипта) І `StudioStorageController.loadStorageData` (викликається при зміні storage). Обидва мають читати **одні й ті самі ключі**. Зараз вони читають різні — це архітектурна розбіжність.

3. **Fallow не виявив цю проблему:** `npx fallow dead-code --circular-deps --re-export-cycles` показує 0, бо це не мертвий код і не цикл — це семантична помилка (читання з порожнього ключа). Це підтверджує, що **Fallow і `tsc` не взаємозамінні** для логічних багів.

4. **Стан type-check:** проєкт проходить `tsc --noEmit` (0 помилок) після рефакторингу Етапу 3. Цей баг — runtime-логічний, `tsc` його не ловить.

---