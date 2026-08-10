---
# [2026-08-10] — KILO — Аудит: латентний баг `SYH_STORAGE.updateAsync` (read-modify-write без атомарності)
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.
---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали, а також помилками tsc, якщо вони є)

`StorageAdapter.updateAsync` оголошено в `modules/storage_keys.ts` як метод «оновлення значення»:

```ts
updateAsync<T = Record<string, any>>(
    keys: StorageKeyValues | StorageKeyValues[],
    updateFn: (current: T) => T | Promise<T>
): Promise<T>;
```

Реалізація (після рефакторингу — `modules/storage_ops_async.ts`, функція `storageUpdateAsync`) є звичайним
неатомарним read-modify-write:

```ts
const currentData = await this.getAsync<T>(keys);   // 1. читання
const updatedData = await updateFn(currentData);    // 2. трансформація (може бути async!)
await this.setAsync(updatedData as Record<string, any>); // 3. запис УСЬОГО об'єкта
return updatedData;
```

Розбіжність між обіцяним і реальним контрактом:

| Обіцянка | Реальність |
|---|---|
| Назва тесту в `tests/storage.test.js:210` — **«updateAsync() atomically modifies storage value»** | Атомарності немає: між кроками 1 і 3 є два `await`, тобто щонайменше два вікна, у які втручається інша задача |
| Сигнатура натякає, що оновлюються **саме передані `keys`** | Крок 3 пише **всі** ключі об'єкта, який повернув `updateFn`, а не лише змінені |
| `updateFn` отримує «поточні дані» | Насправді отримує результат `processGetResult`, у якому **кожен легасі-ключ продубльовано канонічним** (`syh_options` **і** `syh:core:options` з тим самим значенням) |

**Помилок `tsc` немає.** Це принципово: `npx tsc --noEmit` проходить чисто (exit 0), бо
проблема суто поведінкова, а не типова. Компілятор не може побачити гонку.

Додатково, тип `StorageSchema` має «глушник» `[key: string]: any;` (`modules/storage_keys.ts:61`),
через що жодне зайве/помилкове поле у записуваному об'єкті не буде відхилене типізацією.

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### 2.1 Втрачене оновлення (lost update)

Трасування двох паралельних інкрементів лічильника `syh:core:checkbox_state`:

```
t0  Задача A: getAsync  -> { checked: 5 }
t1  Задача B: getAsync  -> { checked: 5 }        // A ще не записала
t2  Задача A: updateFn  -> { checked: 6 }
t3  Задача B: updateFn  -> { checked: 6 }
t4  Задача A: setAsync({ checked: 6 })
t5  Задача B: setAsync({ checked: 6 })           // перезаписує результат A
    Очікувано: 7. Фактично: 6. Один інкремент зник безслідно.
```

Вікно гонки не мікроскопічне: `getAsync` і `setAsync` — це реальні IPC-виклики
`chrome.storage.local`, тобто десятки мілісекунд. Крім того, `updateFn` **дозволено бути
async** (`T | Promise<T>`), і тоді вікно розтягується на весь час її виконання.

### 2.2 Write-amplification (побічне затирання сусідніх ключів)

Якщо викликати `updateAsync(['syh:core:checkbox_state', 'syh:popup:prayers'], fn)` і змінити
лише `checkbox_state`, крок 3 однаково перезапише **і** `prayers` — значенням, прочитаним на
кроці 1. Будь-який паралельний запис у `prayers` буде відкочено. Тобто гонка зачіпає не тільки
той ключ, який оновлюють, а всі ключі, які прочитали.

### 2.3 Чому користувач цього ЩЕ не бачить

Пошук по кодовій базі (`rg -n "updateAsync" --glob "!node_modules" --glob "!docs"`) показує:

```
modules/storage.ts:62        updateAsync: storageUpdateAsync,   // монтування в адаптер
modules/storage_keys.ts:18   updateAsync<T = ...>(...)          // оголошення в інтерфейсі
tests/storage.test.js:210+   4 виклики
tests/storage_adapter.test.js:208+  3 виклики
```

**Продакшн-викликачів — нуль.** Тому це саме *латентний* борг: пастка, яка спрацює на
першому ж реальному споживачі. Найімовірніші кандидати — лічильники статистики
(`modules/stats_tracker.ts`) та стан чекбоксів, які оновлюються з кількох контекстів
(контент-скрипт + попап + service worker) одночасно.

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Серіалізація операцій через чергу промісів на рівні ключа + запис лише зміненого зрізу:

```ts
// modules/storage_ops_async.ts — НЕ ЗАСТОСОВАНО
const updateQueues = new Map<string, Promise<unknown>>();

function queueKey(keys: StorageKeyValues | StorageKeyValues[]): string {
    return (Array.isArray(keys) ? [...keys].sort() : [keys]).join('|');
}

export async function storageUpdateAsync<T = Record<string, any>>(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[],
    updateFn: (current: T) => T | Promise<T>
): Promise<T> {
    const lane = queueKey(keys);
    const previous = updateQueues.get(lane) ?? Promise.resolve();

    const run = previous.then(async () => {
        const currentData = await this.getAsync<T>(keys);
        const updatedData = await updateFn(currentData);

        // Пишемо лише ті ключі, значення яких дійсно змінилося.
        const changed: Record<string, any> = {};
        for (const [k, v] of Object.entries(updatedData as Record<string, any>)) {
            if ((currentData as Record<string, any>)[k] !== v) changed[k] = v;
        }
        if (Object.keys(changed).length > 0) {
            await this.setAsync(changed);
        }
        return updatedData;
    });

    // Черга не має «залипати» через помилку одного оновлення.
    updateQueues.set(lane, run.catch(() => undefined));
    return run;
}
```

> ⚠️ Це усуває гонку **лише в межах одного JS-контексту**. Справжня між-контекстна
> атомарність (попап + контент-скрипт + SW — це різні процеси) потребує або
> `navigator.locks`, або маршрутизації всіх записів через service worker.

## 3.1 Що зміниться для користувача (таблиця сценаріїв "Зараз" та "Після")

| # | Сценарій | Зараз | Після |
|---|----------|-------|-------|
| 1 | Один виклик `updateAsync`, без конкуренції | Працює коректно | Працює коректно (без змін) |
| 2 | Два паралельні інкременти лічильника з одного контексту | Один інкремент губиться (5 → 6 замість 7) | Обидва застосовуються (5 → 7) |
| 3 | `updateAsync` для 2 ключів, змінено лише 1 | Перезаписуються обидва; паралельний запис у другий ключ відкочується | Пишеться лише змінений ключ; сусідній не чіпається |
| 4 | `updateFn` кидає виняток | Проміс реджектиться; стан не записано | Так само реджектиться; черга не блокується для наступних викликів |
| 5 | Оновлення з різних контекстів (попап + SW) | Гонка | **Гонка лишається** — потрібен окремий крос-контекстний механізм |
| 6 | Кількість викликів `chrome.storage.local.set` | Завжди 1 | 0, якщо нічого не змінилося (менше зайвих `onChanged` → менше перемальовувань бейджа) |

## 3.2 Ризики міграції

1. **Зміна семантики запису.** Зараз `setAsync` викликається завжди; після фіксу — лише за
   наявності змін. Код, який (можливо, неявно) покладається на подію `chrome.storage.onChanged`
   як на «пінг» навіть без зміни даних, перестане її отримувати. У проєкті на `onChanged`
   зав'язані `background/service-worker.ts` (бейдж) і `youtube/studio/studio_storage_handler.ts`.
2. **Порівняння через `!==`** — поверхневе. Для об'єктів/масивів воно майже завжди дасть
   «змінено», тож оптимізація з п.6 таблиці спрацює переважно для примітивів. Глибоке
   порівняння додасть вартості й ризику — свідомо не пропонується.
3. **Витік пам'яті в `updateQueues`.** Мапа росте за кількістю унікальних наборів ключів.
   Для розширення це десятки записів, але за динамічних ключів (`syh:popup:collected:<sheetId>`)
   потрібна зачистка завершених «доріжок».
4. **Зміна порядку виконання.** Оновлення стають послідовними, тож сумарна латентність серії
   викликів зросте (раніше вони йшли паралельно, хоч і некоректно).
5. **Тест `tests/storage.test.js:210` треба перейменувати** — його назва «atomically» стане
   правдивою лише після фіксу; зараз вона вводить в оману.

## 4. Де зараз живе цей борг у коді (вказати конкретні файли та функції після рефакторингу)

| Файл (після рефакторингу) | Символ | Роль у проблемі |
|---|---|---|
| `modules/storage_ops_async.ts` | `storageUpdateAsync()` | **Епіцентр.** Неатомарний read-modify-write; пише весь об'єкт |
| `modules/storage_ops_async.ts` | `storageGetAsync()` | Джерело дубльованих легасі/канонічних ключів у `current` |
| `modules/storage_ops_async.ts` | `storageSetAsync()` | Виконує повний перезапис переданого об'єкта |
| `modules/storage_keys.ts` | `StorageAdapter.updateAsync` (рядок 18) | Оголошення контракту, яке не згадує про відсутність атомарності |
| `modules/storage_keys.ts` | `processGetResult()` | Додає в результат і `k`, і `migrateKey(k)` |
| `modules/storage_keys.ts` | `StorageSchema` (`[key: string]: any`, рядок 61) | Прибирає типовий захист від запису зайвих полів |
| `modules/storage.ts` | `SYH_STORAGE.updateAsync` (рядок 62) | Точка монтування методу в публічний адаптер |

> До рефакторингу весь цей код лежав у `modules/storage.ts` (рядки 160–168). Рефакторинг
> **не змінив жодного рядка логіки** — лише переніс її у файл-шар.

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] Додано тест: 100 паралельних `updateAsync`-інкрементів одного ключа дають рівно 100
      (зараз такий тест впаде).
- [ ] Додано тест: `updateAsync(['a','b'], fn)`, що змінює лише `a`, не викликає `set` для `b`.
- [ ] Додано тест: виняток в `updateFn` реджектить проміс і **не** блокує наступні виклики
      того самого ключа (черга не «залипає»).
- [ ] Додано тест: два `updateAsync` на **різні** ключі виконуються паралельно (не серіалізовані
      без потреби).
- [ ] Перевірено, що бейдж у `background/service-worker.ts` усе ще оновлюється: `npm run test`
      → `tests/service_worker_router.test.js`, `tests/service_worker.test.js`.
- [ ] Тест `tests/storage.test.js:210` перейменовано або посилено, щоб слово «atomically»
      відповідало дійсності.
- [ ] `npm run test` — 100% зелено (зараз 1398/1398).
- [ ] `npx tsc --noEmit` — 0 помилок.
- [ ] `npx fallow dead-code --format json` — без нових `unused_exports` (`updateQueues`,
      `queueKey` мають лишитися приватними для модуля).
- [ ] `npm run lint` — без нових попереджень.

## 6. Побічні спостереження (наприклад, загальний стан type-check у проєкті)

1. **Type-check здоровий:** `npx tsc --noEmit` завершується з exit code 0 без жодної помилки —
   і до, і після рефакторингу.
2. **Тести:** 1398/1398 зелені (базова лінія до рефакторингу — 1311; +87 нових
   характеристичних тестів у `tests/storage_adapter.test.js`, `tests/trigger_manager.test.js`,
   `tests/service_worker_router.test.js`).
3. **Fallow dead-code:** `total_issues: 1` — єдина знахідка `tests/debug_dialog2.mjs`
   (unused file) є **преіснуючою** і не пов'язана зі змінами цієї сесії. Нуль
   `unresolved_imports`, `re_export_cycles`, `circular_dependencies`, `unused_exports`.
4. **Lint:** 3 попередження (0 помилок) — усі преіснуючі, у файлах, яких ця сесія не торкалась
   (`modules/storage_migration.ts`, `modules/ui_shared_utils.ts`,
   `youtube/studio/studio_storage_handler.ts`).
5. **`modules/storage.ts` більше не є ціллю рефакторингу Fallow.** До сесії — пріоритет 41.6
   (№1 у проєкті, fan-in 68). Після розділення на `storage_runtime.ts` /
   `storage_ops_callback.ts` / `storage_ops_async.ts` файл став чистою «бочкою» без функцій і
   зник зі списку цілей; новий максимум по проєкту — 22.5.
6. **Ризик регресії при майбутньому фіксі — низький саме зараз.** Оскільки продакшн-викликачів
   `updateAsync` немає, це найдешевший момент, щоб або зробити метод справді атомарним, або
   свідомо видалити його з `StorageAdapter`, доки він не обріс споживачами.
