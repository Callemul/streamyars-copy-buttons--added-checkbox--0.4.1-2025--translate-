# 2026-08-09 — CLAUDE — Аудит: латентний баг персистентності `right_tabs_compact`

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow
> (`npx fallow health --max-crap 30`). Баг **не був створений** цим рефакторингом — він
> існував в оригінальному коді і підтверджений baseline-помилками `tsc`.
>
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг свідомо зберігає поведінку 1-в-1.
> Виправлення потребує окремого погодження (змінює UX).

---

## 1. Що саме зламано

Модуль `modules/right_tabs_compact.ts` (до рефакторингу) викликав адаптер сховища
`SYH_STORAGE` з **неправильними сигнатурами**.

### Реальний контракт (`modules/storage.ts`, рядки 214–227)

```ts
export interface StorageAdapter {
    // КОЛБЕЧНІ (повертають void):
    get<T = Record<string, any>>(keys: StorageKeyValues | StorageKeyValues[], cb: (result: T) => void): void;
    set(items: Record<string, any>, cb?: () => void): void;
    remove(keys: StorageKeyValues | StorageKeyValues[], cb?: () => void): void;

    // ПРОМІС-ВАРІАНТИ (саме їх треба було використовувати):
    getAsync<T = Record<string, any>>(keys: StorageKeyValues | StorageKeyValues[]): Promise<T>;
    setAsync(items: Record<string, any>): Promise<void>;
    removeAsync(keys: StorageKeyValues | StorageKeyValues[]): Promise<void>;
}
```

Ключовий нюанс: `getAsync` повертає **об'єкт-мапу** `{ [key]: value }`, а не саме значення.
`setAsync` приймає **об'єкт** `{ [key]: value }`, а не пару `(key, value)`.

### Як його викликали (оригінал, `modules/right_tabs_compact.ts`)

```ts
// рядок 32 — очікували значення, отримували undefined
const savedCollapsed = await SYH_STORAGE.get<string[]>(STORAGE_KEYS.COLLAPSED_TABS);

// рядок 37 — те саме
const savedExpanded = await SYH_STORAGE.get<string[]>('syh:streamyard:expanded_tabs');

// рядок 42 — те саме
const opts = await SYH_STORAGE.get<StoredOptions>(STORAGE_KEYS.OPTIONS);

// рядки 133-134 — ключ передано як `items`, масив — як колбек
await SYH_STORAGE.set(STORAGE_KEYS.COLLAPSED_TABS, Array.from(this.collapsedTabIds));
await SYH_STORAGE.set('syh:streamyard:expanded_tabs', Array.from(this.expandedTabIds));
```

### Підтвердження від `tsc` на **оригінальному** коді

Отримано через `git stash` + `npx tsc --noEmit` (123 помилки в проєкті загалом, з них у цьому файлі):

```
modules/right_tabs_compact.ts(32,54):  error TS2554: Expected 2 arguments, but got 1.
modules/right_tabs_compact.ts(37,53):  error TS2554: Expected 2 arguments, but got 1.
modules/right_tabs_compact.ts(42,44):  error TS2554: Expected 2 arguments, but got 1.
modules/right_tabs_compact.ts(43,17):  error TS1345: An expression of type 'void' cannot be tested for truthiness.
modules/right_tabs_compact.ts(43,37):  error TS2339: Property 'compact_secondary_tabs_default' does not exist on type 'never'.
modules/right_tabs_compact.ts(44,50):  error TS2339: Property 'compact_secondary_tabs_default' does not exist on type 'never'.
modules/right_tabs_compact.ts(133,35): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Record<string, any>'.
modules/right_tabs_compact.ts(134,35): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Record<string, any>'.
```

> ⚠️ `npm run build` (Vite) і `npm run lint` (ESLint) **не роблять type-check**,
> тому ці помилки ніколи не блокували збірку. `npx tsc --noEmit` у проєкті не налаштований як CI-гейт.

---

## 2. Runtime-наслідки (трасування)

### 2.1 Читання — `loadState()`

`SYH_STORAGE.get(keys, cb)` оголошений як `void`. Виклик без другого аргументу:

1. `cb` === `undefined`;
2. усередині `get` спрацьовує `if (cb) cb(...)` → колбек не викликається, результат нікуди не йде;
3. сама функція повертає `undefined`;
4. `await undefined` → `undefined`;
5. `Array.isArray(undefined)` → `false` → `collapsedTabIds` / `expandedTabIds` лишаються **порожніми**;
6. `opts` === `undefined` → гілка `else` → `autoCompactSecondary = true`.

**Підсумок:** явний вибір користувача через ПКМ (згорнути/розгорнути вкладку)
**ніколи не відновлюється** після перезавантаження сторінки. Працює лише
дефолтне автозгортання Recording/Widgets, бо воно жорстко зашите в `true`.

### 2.2 Запис — `saveState()`

`SYH_STORAGE.set(items, cb)` викликано як `set(KEY_STRING, ARRAY)`:

1. `items` === `'syh:streamyard:collapsed_tabs'` (рядок);
2. `migrateItemKeys(items)` робить `Object.entries('syh:...')`
   → `{ '0': 's', '1': 'y', '2': 'h', ... }` — **посимвольний сміттєвий об'єкт**;
3. `chrome.storage.local.set(garbage, cb)`, де `cb` — масив, а не функція
   → Chrome кидає `TypeError` на валідації колбека;
4. `catch { if (cb) cb(); }` — масив truthy → спроба `cb()` → **другий `TypeError`**,
   який вилітає з `SYH_STORAGE.set`;
5. цей `TypeError` ловить `try/catch` у `saveState()` → у консоль пишеться
   `[SYH RightTabs] Failed to save collapsed tabs state: ...`.

**Підсумок:** нічого не зберігається; у консолі — стабільне попередження при кожному ПКМ.
Ризик забруднення `chrome.storage.local` посимвольними ключами існує, але на практиці
запис не доходить через ранній `TypeError` на валідації колбека.

### 2.3 Чому баг непомітний

Обидві половини (читання і запис) зламані **узгоджено**: нічого не пишеться і нічого не читається.
Тому зовні модуль виглядає «робочим» — просто без пам'яті між сесіями.
Якщо виправити **лише читання**, стан усе одно не відновиться (ключі порожні).
Якщо виправити **лише запис** — теж нічого не зміниться до виправлення читання.
**Виправляти треба обидві половини одночасно.**

---

## 3. Пропоноване виправлення (НЕ застосоване)

У `modules/right_tabs_storage.ts` замінити легасі-шим `LEGACY_STORAGE` на коректний асинхронний API:

```ts
// ЧИТАННЯ
async function readRightTabsState(): Promise<RightTabsState> {
    const data = await SYH_STORAGE.getAsync<Record<string, unknown>>([
        STORAGE_KEYS.COLLAPSED_TABS,
        EXPANDED_TABS_KEY,
        STORAGE_KEYS.OPTIONS
    ]);

    return {
        collapsedTabIds: parseStoredTabIds(data[STORAGE_KEYS.COLLAPSED_TABS]),
        expandedTabIds: parseStoredTabIds(data[EXPANDED_TABS_KEY]),
        autoCompactSecondary: resolveAutoCompactSecondary(data[STORAGE_KEYS.OPTIONS] as StoredOptions)
    };
}

// ЗАПИС
export async function saveRightTabsState(state: RightTabsState): Promise<void> {
    try {
        await SYH_STORAGE.setAsync({
            [STORAGE_KEYS.COLLAPSED_TABS]: Array.from(state.collapsedTabIds),
            [EXPANDED_TABS_KEY]: Array.from(state.expandedTabIds)
        });
    } catch (err) {
        console.warn('[SYH RightTabs] Failed to save collapsed tabs state:', err);
    }
}
```

Після цього легасі-шим `LegacyStorageCalls` у `modules/right_tabs_storage.ts` треба видалити повністю.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| ПКМ згорнув основну вкладку → F5 | вкладка знову розгорнута | вкладка лишається згорнутою |
| ПКМ розгорнув Recording/Widgets → F5 | знову згорнуті (авто) | лишаються розгорнутими |
| Попередження в консолі при ПКМ | так, кожного разу | зникає |

Це **зміна UX**, тому вона свідомо винесена в окрему задачу.

### 3.2 Ризик міграції

Ключ `'syh:streamyard:expanded_tabs'` **відсутній** у `STORAGE_KEYS` (`modules/storage.ts`)
і зашитий рядковим літералом. Зараз він винесений у константу
`EXPANDED_TABS_KEY` в `modules/right_tabs_storage.ts`.
Разом із виправленням варто перенести його в `STORAGE_KEYS` як
`EXPANDED_TABS: 'syh:streamyard:expanded_tabs'` і додати до `StorageSchema`,
щоб він проходив ту саму міграцію ключів (`migrateKey`), що й решта.

---

## 4. Де зараз живе цей борг у коді

Після рефакторингу вся робота зі сховищем ізольована в одному файлі:

- `modules/right_tabs_storage.ts` — містить `LEGACY_STORAGE`-шим і коментар-маркер.
- `modules/right_tabs_rules.ts` — **чисті** правила згортання (без сховища), уже покриті тестами
  у `tests/right_tabs_compact.test.js`.
- `modules/right_tabs_compact.ts` — тонкий оркестратор.

Тобто після погодження виправлення локалізоване **в одній функції** `readRightTabsState`
і **одній функції** `saveRightTabsState`. Тести на правила згортання при цьому не зміняться.

---

## 5. Перевірка після виправлення (чек-лист для наступного ШІ)

1. `npx tsc --noEmit 2>&1 | Select-String 'right_tabs'` → **порожньо**.
2. `npm run test` → `tests/right_tabs_compact.test.js` проходить без змін.
3. Додати інтеграційний тест на `loadRightTabsState` / `saveRightTabsState`
   з моком `SYH_STORAGE.getAsync` / `setAsync`.
4. Ручна перевірка в StreamYard: ПКМ по вкладці → F5 → стан збережено.
5. `npx fallow health --max-crap 15` → у `modules/right_tabs_*` знахідок немає.

---

## 6. Побічне спостереження — стан type-check у проєкті

`npx tsc --noEmit` на baseline дає **123 помилки** по всьому проєкту
(`modules/event_comments/types.ts`, `modules/ui_comments.ts`, `youtube/yt_ui.ts`, `popup/*` тощо).
Переважна більшість — це `SelectorValue` (`string | string[]`), який передається у
`querySelector(...)`, що очікує `string`. Оскільки ані Vite-збірка, ані ESLint не роблять
type-check, ці помилки накопичуються непоміченими.

**Рекомендація (окрема задача):** додати скрипт `"typecheck": "tsc --noEmit"` і
поетапно зводити кількість помилок до нуля, починаючи з уніфікації `SelectorValue`
через уже наявні хелпери `resolveSelector` / `resolveSelectorString` з `modules/config.ts`.
