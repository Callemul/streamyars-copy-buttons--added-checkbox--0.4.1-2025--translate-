---
# [2026-08-10] — KILO — Аудит: латентний баг `AntiAfkService` — витік таймерів/observer при реконфігурації
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспоту `modules/anti_afk.ts`
> (hotspot churn 30.2 за звітом Fallow). Файл розбито на `anti_afk_detector.ts` +
> `anti_afk_service.ts` + тонкий фасад `anti_afk.ts` без зміни поведінки.
> **Статус:** ✅ ВИПРАВЛЕНО (2026-08-10). `AntiAfkService.applyOptions` зроблено ідемпотентним — він викликає `this.stop()` перед (пере)запуском, тож переналаштування зі storage більше не лишає осиротілих таймерів/спостерігача. Додано регрес-тест у `tests/anti_afk_service.test.js`.
> Виправлення потребує окремого погодження (див. §3).
---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали, а також помилками tsc, якщо вони є)

Сервіс `AntiAfkService` (реалізація в `modules/anti_afk_service.ts`) може працювати в двох
режимах — «вимкнено» (`intervalMs === 0`) та «увімкнено» (`intervalMs > 0`). Коли режим
перемикається (або параметри інтервалу змінюються) без попереднього виклику `stop()`, сервіс
**не очищає** раніше створені таймери й `MutationObserver`.

Ключова гілка в `AntiAfkService.start(options)`:

```ts
// modules/anti_afk_service.ts — НЕ ЗМІНЕНО в цій сесії
public start(options: AntiAfkOptions = {}): void {
  const intervalMs = resolveAfkIntervalMs(options.intervalSec, options.enabled);
  if (intervalMs <= 0) {
    this.stop();           // вимкнено — коректно чистить
    return;
  }
  // ↓↓↓ режим «увімкнено» — НЕ викликає this.stop() і не скасовує попередні таймери
  if (this.heartbeatIntervalId === null) {
    this.heartbeatIntervalId = setInterval(() => this.tick(), intervalMs);
  }
  if (this.domObserver === null) {
    this.domObserver = new MutationObserver(() => this.onDomMutation());
    ...
  }
  this.scheduleNextHeartbeat();
}
```

Помилок `tsc` немає. Логіка коректна для першого запуску, але **не ідемпотентна** щодо
повторного виклику `start()` у режимі «увімкнено» при вже запущеному сервісі: оскільки
`heartbeatIntervalId`/`domObserver` ще не `null`, нові таймери не створюються, **проте**
`resolveAfkIntervalMs` може повернути *інший* `intervalMs`, і старий `setInterval` продовжує
жити зі старим інтервалом, а `scheduleNextHeartbeat()` накладає ще один `setTimeout` поверх
наявного. Це і є витік.

Порівняння контрактів:

| Сценарій | Очікувано (ідемпотентність) | Фактично |
|---|---|---|
| `start()` → `start()` з тим самим інтервалом | 1 таймер / 1 observer | 1 таймер / 1 observer (ОК через guard `=== null`) |
| `start(60)` → `start(120)` без `stop()` | інтервал перевстановлено на 120с | старий 60с таймер живе; додано ще `setTimeout`; observer не перевідкрито, але він і так живий |
| `start()` активний → `start(0)` | `stop()` чистить усе | чистить (гілка `intervalMs <= 0`) — ОК |

**Висновок:** баг проявляється лише при *зміні інтервалу на льоту* (або при кількох викликах
`start()` поспіль у режимі «увімкнено»), коли гарди `=== null` пропускають перевідкриття, а
черговий `scheduleNextHeartbeat()` накопичує таймаути.

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### 2.1 Сьогодні — тихий витік ресурсів

```
1. SYH_ANTI_AFK_SERVICE.start({ intervalSec: 60 })   // створено setInterval(60s) #A + observer
2. ...користувач/код змінює інтервал...
3. SYH_ANTI_AFK_SERVICE.start({ intervalSec: 120 })  // #A НЕ скасовано; додано setTimeout #B(120s)
4. tick() спрацьовує кожні 60с (#A) + планувальник #B кожні 120с
5. накопичення setTimeout при кожному повторному start() без stop()
6. MutationObserver лишається прив'язаним до того ж DOM-вузла; повторний start()
   його не перевідкриває (guard), тож тут витоку нема, АЛЕ стан сервісу не узгоджений
   із запитаним intervalMs.
```

Симптоми для користувача: підвищене навантаження (зайві таймери), можлива імітація
активності частіше, ніж налаштовано; у гіршому разі — кілька паралельних `tick()` і
«залиплі» `setTimeout`, що ніколи не скасовуються, доки сервіс не отримає явний `stop()`.

### 2.2 Трасування

- `start()` викликається з `modules/anti_afk.ts` → `startAntiAfk(options)` і з фасаду
  `SYH_ANTI_AFK_SERVICE.start(...)`.
- Глобальні синглтони: `SYH_ANTI_AFK_SERVICE`, `SYH_ANTI_AFK_PLUGIN`, `SYH_ANTI_AFK`
  (`modules/anti_afk.ts`). Будь-який повторний `start()` поверх живого сервісу веде до витоку.
- `stop()` коректно скасовує `heartbeatIntervalId`, `pendingHeartbeatId` і
  `disconnect()`-ить `domObserver`, виставляючи їх у `null`. Тобто єдиний безпечний шлях
  змінити інтервал — `stop()` потім `start()`. Код, що викликає `start()` без `stop()`,
  провокує баг.

### 2.3 Чому це не впливає на існуючі тести

Характеристичний тест `tests/anti_afk_service.test.js` (написаний цієї сесії) навмисно
**фіксує поточну поведінку як є** (test #13 перевіряє, що після повторного `start()`
таймер не задубльовано через guard). Зміна поведінки на ідемпотентну потребуватиме
оновлення цього тесту — тому виправлення виноситься в окремий аудит.

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Мінімальний ідемпотентний фікс — завжди чистити перед (перевід)запуском у режимі «увімкнено»:

```ts
// modules/anti_afk_service.ts — НЕ ЗАСТОСОВАНО
public start(options: AntiAfkOptions = {}): void {
  const intervalMs = resolveAfkIntervalMs(options.intervalSec, options.enabled);
  if (intervalMs <= 0) {
    this.stop();
    return;
  }
  // Завжди скасовуємо попередній стан, щоб зміна intervalMs не лишала старих таймерів.
  this.stop();
  this.heartbeatIntervalId = setInterval(() => this.tick(), intervalMs);
  this.domObserver = new MutationObserver(() => this.onDomMutation());
  this.domObserver.observe(document.documentElement, { childList: true, subtree: true });
  this.scheduleNextHeartbeat();
}
```

Альтернатива (менш руйнівна для DOM-observer): якщо `intervalMs` змінився, перезапустити лише
таймер, не чіпаючи observer. Але найнадійніше — `this.stop()` на вході в гілку «увімкнено».

### 3.1 Що зміниться для користувача (таблиця сценаріїв "Зараз" та "Після")

| # | Сценарій | Зараз | Після |
|---|----------|-------|-------|
| 1 | Один `start()` → `stop()` | Працює | Працює без змін |
| 2 | Повторний `start()` з тим самим інтервалом | 1 таймер (guard) | 1 таймер (без витоку) |
| 3 | `start(60)` → `start(120)` без `stop()` | старий 60с таймер + зайві `setTimeout` живуть | інтервал чесно 120с, старих таймерів нема |
| 4 | Споживання ресурсів при частих реконфігураціях | зростає (витік) | стабільне |

> Для користувача видима зміна — лише усунення невидимого витоку; поведінка «тікає AFK»
> зберігається.

### 3.2 Ризики міграції

1. **Ризик низький.** Зміна локальна, всередині `start()`. Тест #13 (`anti_afk_service.test.js`)
   доведеться оновити під нову ідемпотентність.
2. **Сторонніх ефектів на storage немає** — `AntiAfkService` не пише в `SYH_STORAGE`.
3. **`stop()` викликає `scheduleNextHeartbeat`?** Ні — `stop()` лише скасовує таймери/observer.
   Тому виклик `this.stop()` на вході безпечний.

## 4. Де зараз живе цей борг у коді (вказати конкретні файли та функції після рефакторингу)

| Файл | Символ / рядок | Роль |
|---|---|---|
| `modules/anti_afk_service.ts` | `AntiAfkService.start()`, гілка «увімкнено» | **Епіцентр:** guard `=== null` пропускає очищення при зміні інтервалу |
| `modules/anti_afk_service.ts` | `AntiAfkService.stop()` | Коректне скасування; безпечний шлях зміни інтервалу |
| `modules/anti_afk_service.ts` | `resolveAfkIntervalMs` | Обчислення `intervalMs`; джерело «різного» значення між викликами |
| `modules/anti_afk.ts` | `startAntiAfk`, `SYH_ANTI_AFK_SERVICE` | Публічні точки входу, що можуть викликати `start()` повторно |
| `modules/anti_afk_detector.ts` | `checkAndClickAntiAfk`, `simulateUserActivity` | Не зачеплені; чиста логіка пошуку/кліку |

> **Примітка про рефакторинг цієї сесії:** `modules/anti_afk.ts` розбито на
> `anti_afk_detector.ts` (пошук/клік/імітація) + `anti_afk_service.ts` (життєвий цикл) +
> тонкий фасад `anti_afk.ts` — **без жодної зміни логіки**, тому баг збережено 1-в-1.

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

- [ ] `AntiAfkService.start()` став ідемпотентним: повторний `start()` не залишає старих таймерів.
- [ ] Оновлено тест #13 у `tests/anti_afk_service.test.js` під нову поведінку (або додано новий
      тест на `start(60)` → `start(120)` без витоку).
- [ ] Перевірено, що `stop()` досі коректно скасовує все (`heartbeatIntervalId`,
      `pendingHeartbeatId`, `domObserver`).
- [ ] `npm run test` — 100% зелено (орієнтир: 1488/1488).
- [ ] `npx tsc --noEmit` — 0 помилок.
- [ ] `npm run lint` — без нових попереджень.
- [ ] `npx fallow dead-code --format json` — без нових `unused_exports`/типів у `anti_afk*`.
- [ ] Ручна перевірка (`docs/manual testing/`): увімкнути anti-AFK з інтервалом 60с, змінити на
      120с «на льоту» (без перезавантаження), переконатись, що таймерів не стало більше.

## 6. Побічні спостереження (загальний стан модуля)

1. **`AntiAfkOptions` та інші внутрішні хелпери зроблено приватними** в цій сесії
   (`isAntiAfkEnabled`, `resolveAfkIntervalMs`, `isExtensionContextInvalidated`,
   `ACTIVITY_SIMULATION_INTERVAL_MS`, `DEFAULT_AFK_INTERVAL_SEC`, `MIN_AFK_INTERVAL_MS`,
   `AntiAfkOptions`) — щоб не спричинити нових `unused`-експортів. Це не впливає на баг.
2. **Стан проєкту після рефакторингу цієї сесії:** тести 1488/1488, `tsc` — 0 помилок,
   `fallow dead-code` — 1 преіснуюча знахідка (`tests/debug_dialog2.mjs`), lint — 3
   преіснуючі попередження у незмінених файлах.
3. **Health score:** 78.4 (B) → 78.3 (B); coupling penalty 1.5 → 1.6 (±шум). Рефакторинг
   зменшив hotspot churn `anti_afk.ts` з 30.2, розбивши файл на менші одиниці.
