---
# [2026-08-11] — KILO — Аудит: латентний баг «markChecked/unmarkChecked ігнорують переданий кеш»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспоту `youtube/studio/studio_adapter.ts`
> (cyclomatic 56 → 52, винесення `resolveStudioVideoCategory` у `studio_category_resolution.ts`).
> Баг існував в оригінальному коді й **не створений** цим рефакторингом.
>
> **Статус:** ✅ ВИПРАВЛЕНО (2026-08-11). Базовий контракт `CommentPlatformAdapter.markChecked`/
> `unmarkChecked` вимагає використання переданого `caches`; Studio-адаптер ігнорував його на користь
> `this.caches`. Оскільки у Studio адаптер і `CommentInjector` створюються з одним і тим самим
> об'єктом `caches` (`youtube/studio/studio_events.ts:84,103`), перехід на переданий кеш є
> повністю behavior-preserving (1-в-1). Застосовано варіант Б з розділу 3.
---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

`StudioCommentAdapter` успадковує `BaseCommentPlatformAdapter` (`modules/comment_platform_adapter.ts`).
Базовий контракт вимагає, щоб методи `markChecked` / `unmarkChecked` приймали
`commentKey` **і** `caches` (`CommentStateCaches`) і використовували саме переданий кеш:

```ts
// modules/comment_platform_adapter.ts (базовий інтерфейс)
markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
unmarkChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
```

Фактична реалізація в `studio_adapter.ts` (після рефакторингу — `persistChecked`):

```ts
public async markChecked(element: Element, commentKey: string, _caches: CommentStateCaches): Promise<void> {
    await this.persistChecked(element, commentKey, true);
}
private async persistChecked(element: Element, commentKey: string, isChecked: boolean): Promise<void> {
    // ... DOM ...
    await CommentService.saveCheckboxState(
        STUDIO_CHECKBOX_STATE_KEY,
        this.caches.checkboxStates,   // ❌ береться this.caches, а не переданий _caches
        commentKey,
        isChecked
    );
}
```

Параметр `_caches` має префікс `_` і **ніде не використовується** — збереження завжди йде у
`this.caches.checkboxStates`.

### Помилки `tsc`

Помилок типізації **немає**: `_caches` має правильний тип `CommentStateCaches`, тому статичний
аналіз задоволений. Це семантичне розбіжність контракту й реалізації.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

- **Сьогодні:** `this.caches` — це той самий об'єкт, що існує в життєвому циклі адаптера, тож
  на практиці збереження потрапляє в «правильний» кеш. Видимого дефекту у штатному потоці немає.
- **Латентний ризик:** якщо колись викликач (або базовий клас) передасть *інший* екземпляр
  `caches` (наприклад, свіжозчитаний зі сховища), очікується, що чекбокс збережеться саме в нього —
  але реально збережеться в `this.caches`. Це тиха розбіжність стану, яку неможливо помітити без
  рев'ю сигнатури.
- **Аналогічна картина** у `beforeAction` / `afterAction` (`_context: CommentContext`,
  `_caches: CommentStateCaches` у `markChecked`) — префікс `_` сигналізує про навмисне ігнорування,
  що легітимно, але контракт базового класу цього не забороняє, тому помилка маскується під «домовленість».

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Варіант А (мінімальний — прибрати параметр із сигнатури, щоб вона збігалася з тим, що реально робиться):

```ts
public async markChecked(element: Element, commentKey: string): Promise<void> {
    await this.persistChecked(element, commentKey, true);
}
public async unmarkChecked(element: Element, commentKey: string): Promise<void> {
    await this.persistChecked(element, commentKey, false);
}
```

Варіант Б (якщо контракт базового класу важливіший — справді використовувати переданий кеш):

```ts
private async persistChecked(element: Element, commentKey: string, isChecked: boolean, caches: CommentStateCaches): Promise<void> {
    // ...
    await CommentService.saveCheckboxState(STUDIO_CHECKBOX_STATE_KEY, caches.checkboxStates, commentKey, isChecked);
}
```

> Потрібне рішення власника архітектури: чи `BaseCommentPlatformAdapter.markChecked`
> має нести `caches` у сигнатурі взагалі.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення (вар. А) |
|---|---|---|
| Клік по чекбоксу у Studio | стан зберігається в `this.caches` | ідентично (жодної зміни UX) |
| Майбутній виклик із іншим `caches` | ігнорується, зберігається в `this.caches` (тиха помилка) | сигнатура не дозволить передати інший кеш |

Жодної зміни видимої поведінки для користувача. Це чисто інваріант-контракту.

### 3.2 Ризики міграції

- Варіант А змінює сигнатуру публічного методу — треба оновити всіх викликачів та тести, що
  передають третій аргумент (зокрема `tests/studio_adapter.test.js`, якщо він передає `caches`).
- Варіант Б безпечніший для зворотної сумісності, але змінює місце збереження — потребує
  перевірки, що `caches` від викликача ідентичний `this.caches`.

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

- `youtube/studio/studio_adapter.ts` → `markChecked` / `unmarkChecked` (параметр `_caches`,
  делегують у `persistChecked`, який використовує `this.caches.checkboxStates`).
- Базовий контракт: `modules/comment_platform_adapter.ts` →
  `BaseCommentPlatformAdapter.markChecked` / `unmarkChecked`.

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

1. `npx tsc --noEmit` → **0 помилок**.
2. `npm run test` → усі тести зелені (зокрема `tests/studio_adapter.test.js`, 35 тестів).
3. Якщо обрано варіант А — переконатися, що жоден викликач не передає третій аргумент, інакше
   `tsc` впаде (це і є бажаною перевіркою).
4. `npx fallow dead-code --format json` → `unused_exports`/`unresolved_imports` = **0**.
5. `npm run lint` → без нових попереджень у `youtube/studio/studio_adapter.ts`.

---

## 6. Побічні спостереження

- Під час цього етапу жодна функція продакшн-коду не мала CRAP > 30 (усі 8 знахідок Fallow —
  у DOM-моках тестів). Найвищий cyclo у продакшені = 56 (`studio_adapter.ts`), після рефакторингу
  став 52.
- `studio_adapter.ts` після рефакторингу: cyclomatic 56 → **52**, cognitive 29 → **24**,
  fan_out лишився **11** (через type-only імпорти з `comment_platform_adapter`, які Fallow рахує
  як fan_out, хоча вони не створюють runtime-залежності).
- Загальний health-score проєкту не змінився (78.3, grade B). Головні пенальті — `hotspots` (10.0)
  та `unit_size` (10.0), обидва зумовлені історичним churn/розміром файлів, а не складністю нового коду.
- `npx tsc --noEmit` на поточному коді — **0 помилок**; `npm run test` — **1954 пройдено / 0 упало**;
  `npx fallow dead-code --circular-deps` — **0** unresolved/circular/re-export.
