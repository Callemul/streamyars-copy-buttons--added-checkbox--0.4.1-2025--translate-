---
# [2026-08-10] — KILO — Аудит: латентний баг «NaN у числових налаштуваннях (interval / truncation)»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів (Stage 3, Fallow), при написанні `tests/options_settings.test.js`.
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1.
---

## 1. Що саме зламано

Числові поля форми опцій (`optAntiAfkInterval`, `optTruncationLength`) парсяться
через `readInteger`, який для **порожнього / нечислового** значення повертає **фолбек**,
але **сам фолбек виявляється `NaN`**, і цей `NaN` без перевірки записується в
`StoredOptions` та (після перезавантаження) назад у поле форми.

`readInteger` (`modules/options/form.ts:60-66`, винесено в Stage 3):

```ts
export function readInteger(id: string, fallback: number): number {
    const raw = (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? fallback : parsed;
}
```

Виклики (`modules/options/form.ts`):

```ts
anti_afk_interval_sec:    readInteger('optAntiAfkInterval', ANTI_AFK_INTERVAL_FALLBACK),
text_truncation_length:  readInteger('optTruncationLength', TRUNCATION_LENGTH_FALLBACK),
```

де (`modules/options/form.ts:1-12`):

```ts
const ANTI_AFK_INTERVAL_FALLBACK  = (SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL ?? 30000) / 1000; // 30
const TRUNCATION_LENGTH_FALLBACK  = SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH ?? 100;        // 100
```

**Баг:** `parseInt(undefined, 10)` → `NaN`, і `isNaN(NaN)` → `true`, тому повертається
`fallback`. До цього моменту все ніби ок. Але:

1. `SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL` у `config-defaults` визначено як `30000`
   (коректно), а `SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH` — як **`undefined`**
   (через що `TRUNCATION_LENGTH_FALLBACK = undefined ?? 100 = 100` — ок). Проте
   **доступ до `SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL`** у деяких конфігураціях
   повертає `undefined` (ключ `TIMINGS` відсутній), даючи
   `ANTI_AFK_INTERVAL_FALLBACK = (undefined ?? 30000)/1000 = 30` — ок. Отже самі
   фолбеки **числові**, і це не джерело багу.

2. **Реальне джерело:** якщо користувач **вручну очищає поле** або вводить
   нечисловий текст (напр. «abc»), `parseInt('', 10) === NaN` або
   `parseInt('abc', 10) === NaN`, і повертається `fallback` — число, ок. Але якщо
   в `SYH_CONFIG` не визначено жодного числа і фолбеки стають `NaN`
   (див. п.3), то `readInteger` поверне **`NaN`**, бо `isNaN(NaN)` → `true`, а
   `fallback` уже `NaN`.

3. `ANTI_AFK_INTERVAL_FALLBACK = (SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL ?? 30000) / 1000`.
   Якщо `SYH_CONFIG.TIMINGS` **нечисловий об'єкт без `ANTI_AFK_INTERVAL`** —
   `?? 30000` спрацює → `30`. Якщо ж `SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL`
   **існує і дорівнює `undefined`-подібному** — залишається `undefined / 1000 = NaN`.
   → `readInteger(..., NaN)` поверне `NaN` для будь-якого нечислового вводу.

Помилок `tsc` немає: `readInteger` оголошена як `(id, fallback: number) => number`,
а `NaN` належить до типу `number`. `npx tsc --noEmit` зелений.

## 2. Runtime-наслідки

Трасування (найпростіший сценарій — користувач стирає значення в полі інтервалу):

1. Користувач відкриває опції, поле `optAntiAfkInterval` показує `30`.
2. Користувач **випадково стирає** число → поле порожнє.
3. Натискає «Зберегти» → `readOptionsFromForm` → `readInteger('optAntiAfkInterval', 30)`
   → `parseInt('',10)=NaN` → повертає `fallback=30`. **Поки що ок** — пишеться `30`.
4. **Але** якщо `ANTI_AFK_INTERVAL_FALLBACK` на машині користувача став `NaN`
   (див. п.1/п.3 — залежить від `SYH_CONFIG`), то `readInteger` поверне `NaN`,
   і `StoredOptions.anti_afk_interval_sec = NaN`.
5. Наступне `setOptions` зберігає `NaN` у `chrome.storage.local`.
6. При перезавантаженні `loadOptionsFromStorage` читає `NaN`, а `populateOptionsForm`
   (`modules/options/form.ts:41`):

   ```ts
   setVal('optTruncationLength', String(getDefaultValue(opts.text_truncation_length, defaults.text_truncation_length)));
   ```

   → `String(NaN)` = `"NaN"` → поле форми показує літерали **"NaN"**.
7. Повторне збереження знову парсить `"NaN"` → `parseInt('NaN',10)=NaN` → знову фолбек
   (той самий `NaN`) → **безвихідь**: поле назавжди "NaN", доки користувач не введе
   вручну число.

**Що бачить користувач:** у полі інтервалу/обрізання з'являється текст `NaN`,
анти-AFK-таймер (якщо `anti_afk_interval_sec` споживається як `ms = sec*1000`)
ставить таймер на `NaN` мс → `setTimeout(NaN)` ≈ `0` (миттєво) або ігнорується —
побічні ефекти в `anti_afk` / `text_truncation` модулях. Поведінка неочевидна й
«липає».

## 3. Пропоноване виправлення (НЕ застосоване)

Гарантувати, що `readInteger` **ніколи не повертає `NaN`**, навіть якщо фолбек
сам по собі `NaN`. Валідувати фолбек і мати абсолютний числовий запас.

```ts
export function readInteger(id: string, fallback: number): number {
    const raw = (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
    const parsed = parseInt(raw, 10);
    const result = isNaN(parsed) ? fallback : parsed;
    return isNaN(result) ? 0 : result;   // або інший «безпечний» мінімум
}
```

Або жорсткіше — перевіряти фолбеки при ініціалізації `ANTI_AFK_INTERVAL_FALLBACK` /
`TRUNCATION_LENGTH_FALLBACK`, щоб вони гарантовано були числами (замінити
`?? 30000`/`?? 100` на `Number.isFinite(...) ? ... : DEFAULT`).

Також у `populateOptionsForm` захистити `String(getDefaultValue(...))` від `"NaN"`
(фільтрувати через `Number.isFinite`).

## 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після |
|---|---|---|
| Поле заповнене числом | Зберігається число ✅ | Без змін ✅ |
| Поле стерте, фолбеки валідні | Фолбек-число ✅ | Без змін ✅ |
| Поле стерте, фолбек=`NaN` (хибна конфігу) | ❌ Зберігається `NaN` → поле показує "NaN" | ✅ Зберігається `0` (чи безпечний мінімум) |
| Поле містить "abc" | `NaN`→фолбек (число) ✅ | Без змін ✅ |
| Повторне збереження "NaN" | ❌ Безвихідь "NaN" | ✅ Розривається |

## 3.2 Ризики міграції

- **Низькі** для основного шляху (числовий ввід не змінюється).
- **Можлива зміна UX:** порожнє/нечислове поле з «NaN-фолбеком» тепер збереже `0`
  замість `30`. Якщо `0` інтервалу трактується як «вимкнено», це змінить поведінку
  для користувачів із хибною конфігурацією — але це краще за завислий `NaN`. Слід
  узгодити «безпечне» значення (напр. повертати `30` як абсолютний мінімум).
- Тест `tests/options_settings.test.js:15` (перевіряє `readOptionsFromForm`) буде
  потрібно доповнити кейсом `NaN`-фолбек → безпечне число.

## 4. Де зараз живе цей борг у коді

| Файл | Функція | Роль |
|---|---|---|
| `modules/options/form.ts:60-66` | `readInteger` | **Джерело багу** — повертає `fallback` без перевірки на `NaN` |
| `modules/options/form.ts:1-12` | — | `ANTI_AFK_INTERVAL_FALLBACK` / `TRUNCATION_LENGTH_FALLBACK` (можуть стати `NaN`) |
| `modules/options/form.ts:104-106` | `readOptionsFromForm` | Передає фолбеки в `readInteger` |
| `modules/options/form.ts:41` | `populateOptionsForm` | `String(NaN)` → поле показує "NaN" |
| `modules/storage_keys.ts:32-34` | `StoredOptions` | Тип полів `?: number` (допускає `NaN`) |

Під час Stage 3 `readInteger` було винесено в `modules/options/form.ts` без зміни
контракту — поведінка ідентична оригіналу в `options/options.ts`.

## 5. Перевірка після виправлення

- [ ] Юніт-тест: `readInteger('optAntiAfkInterval', NaN)` повертає безпечне число,
      не `NaN`.
- [ ] Юніт-тест: порожнє поле + валідний фолбек → фолбек.
- [ ] Інтеграційний: зберегти порожнє поле → перезавантажити → поле форми ≠ "NaN".
- [ ] Перевірити, що `anti_afk`/`text_truncation` споживачі не отримують `NaN`
      (пошук `anti_afk_interval_sec` / `text_truncation_length` по модулях).
- [ ] `npm run test && npx tsc --noEmit && npm run lint` — зелені.

## 6. Побічні спостереження

- `text_truncation_length` зберігається в `StoredOptions` і `DEFAULT_OPTIONS`
  (`options/defaults.ts:25`, `modules/storage_keys.ts:34`), але **не має жодного
  читача/споживача в рантаймі** — можливо, мертва опція (dead setting). Окремий аудит.
- `StoredOptions` використовує `number` для цих полів, тож `NaN` типізовано дозволений;
  звуження типу до `number & {}` (без `NaN`) на рівні TS усунуло б клас помилки.
