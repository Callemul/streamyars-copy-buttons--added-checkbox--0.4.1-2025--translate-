---
# [2026-08-10] — KILO — Аудит: латентний баг «розділювач банерів обриває весь сценарій»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.
---

## 1. Що саме зламано

`processAndCreateBanners` створює основні банери через `executeBannerCreationLoop`,
який має **власний per-item `try/catch`**, а фінальний банер-розділювач —
**прямим викликом без жодного захисту**.

Реальний контракт `createSingleBanner` (`modules/banner_types.ts:23`):

```ts
createSingleBanner(text: string): Promise<void>;
```

Функція **кидає** щонайменше в чотирьох точках (`modules/banner_form.ts`):

| Джерело | Помилка |
|---|---|
| `resolveCreateBannerButton` | `Create banner button not found` |
| `resolveCreateBannerForm` | `Create banner form not found` |
| `readBannerFormControls` | `Textarea or submit button not found in form` |
| `utils.waitForNewBanner` | `New banner with text "..." did not appear within 5000ms` |

Як його викликають (`modules/banner_creator.ts:60-64`):

```ts
if (hasStandardFormat) {
    this.log("Додаю розділювач...");
    await delay(300);
    await this.createSingleBanner("----Питання глядачів----");   // ⛔ без try/catch
}

await this.finalCleanup();                                        // недосяжно при throw
if (this.UI && typeof this.UI.filterBanners === 'function') { ... }
this.UTILS.copyAndShowBanner(`Успішно створено банерів: ${createdCount}`, "🎉 Створення завершено!");
```

Для порівняння — той самий виклик усередині циклу захищений
(`modules/banner_executor.ts:12-28`):

```ts
try {
    await creator.createSingleBanner(cleanQuestion);
    ...
} catch (error: any) {
    console.error(error);
    creator.log(`Помилка: ${error.message}`);
    await creator.finalCleanup();
}
```

Тобто **два виклики однієї функції в одному сценарії мають протилежні
контракти обробки помилок**.

Помилок `tsc` немає: `Promise<void>` формально сумісний, а відсутність
`catch` — не помилка типізації. `npx tsc --noEmit` на момент аудиту зелений.

## 2. Runtime-наслідки

Трасування збою (найімовірніший сценарій — StreamYard підлагує і банер
не встигає з'явитися за 5 с):

1. Цикл успішно створює, скажімо, 12 банерів. `createdCount === 12`.
2. `hasStandardFormat === true` → починається створення розділювача.
3. `createSingleBanner("----Питання глядачів----")` доходить до
   `await this.UTILS.waitForNewBanner(text, 5000)`.
4. `waitForNewBanner` реджектиться:
   `New banner with text "----Питання глядачів----" did not appear within 5000ms`.
5. `await` пробрасує помилку вгору → **решта тіла `processAndCreateBanners`
   не виконується**:
   - ❌ `finalCleanup()` — форма створення банера **лишається відкритою**
     поверх інтерфейсу StreamYard;
   - ❌ `UI.filterBanners()` — список банерів не перефільтровується,
     нові банери можуть не отримати категорійну підсвітку;
   - ❌ `copyAndShowBanner("Успішно створено банерів: 12")` — користувач
     **не отримує жодного фідбека**.
6. Промис `processAndCreateBanners` реджектиться, а викликач
   (`modules/event_banners/category.ts:5-10`) **не чекає й не ловить його**:

```ts
export function handleCreateBannersAction(bannerCreator: any): void {
    const text = prompt("Вставте список питань для створення банерів:", "");
    if (text && bannerCreator) {
        bannerCreator.processAndCreateBanners(text);   // ⛔ без await, без .catch()
    }
}
```

   → **unhandled promise rejection** у контент-скрипті. У консолі сторінки
   з'явиться `Uncaught (in promise) Error: ...`, але ні тост, ні банер
   користувачу не показуються.

**Що бачить користувач:** 12 банерів створено, зверху висить незакрита форма
створення банера, жодного повідомлення про успіх чи помилку. Виглядає як
«розширення зависло». Наступний запуск відпрацює `ensureCleanStart()` і
закриє форму — тобто симптом «самолікується» через одну ітерацію, що робить
баг важко відтворюваним у баг-репортах.

**Частота:** зростає з довжиною списку — розділювач створюється **останнім**,
коли StreamYard уже оброблює десятки щойно доданих банерів і найімовірніше
не встигне за 5 с.

## 3. Пропоноване виправлення (НЕ застосоване)

Вирівняти контракт: розділювач — це такий самий банер, тож і обробка збою
має бути такою самою, як у циклі.

```ts
// modules/banner_creator.ts
if (hasStandardFormat) {
    this.log("Додаю розділювач...");
    await delay(300);
    try {
        await this.createSingleBanner("----Питання глядачів----");
    } catch (error: any) {
        console.error(error);
        this.log(`Помилка створення розділювача: ${error.message}`);
        // finalCleanup нижче все одно виконається — форму буде закрито
    }
}

await this.finalCleanup();
```

Додатково (друга лінія захисту, окремий крок) — не ковтати реджект у викликача:

```ts
// modules/event_banners/category.ts
export function handleCreateBannersAction(bannerCreator: any): void {
    const text = prompt("Вставте список питань для створення банерів:", "");
    if (text && bannerCreator) {
        bannerCreator.processAndCreateBanners(text).catch((error: unknown) => {
            console.error('[SYH] processAndCreateBanners failed', error);
        });
    }
}
```

## 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після |
|---|---|---|
| Усі банери + розділювач створені успішно | Форма закрита, тост «🎉 Створено: N» | Без змін ✅ |
| Один банер із середини списку впав | Цикл ловить, `finalCleanup()`, тост «🎉 Створено: N-1» | Без змін ✅ |
| **Розділювач не встиг з'явитися за 5 с** | ❌ Форма висить відкритою, тосту немає, unhandled rejection у консолі | ✅ Форма закрита, тост «🎉 Створено: N», помилка залогована |
| **Кнопку/форму створення не знайдено на етапі розділювача** | ❌ Те саме зависання | ✅ Коректне завершення з тостом |
| Текст не розпарсився | Тост «⚠️ Помилка створення банерів» | Без змін ✅ |

## 3.2 Ризики міграції

- **Низькі.** Зміна лише розширює обробку помилок; жоден успішний шлях не
  зачіпається.
- Тост зміниться з «нічого» на «🎉 Створено: N» у збійному сценарії. Формально
  це зміна UX, тому й винесено в окреме погодження: можна віддати перевагу
  окремому попереджувальному тосту («Розділювач не створено»), а не мовчазному
  успіху.
- `createdCount` **не враховує розділювач** ні зараз, ні після фіксу — число в
  тості лишиться тим самим.
- Тести: `tests/banner_form.test.js` (20 тестів) і `tests/banner_creator.test.js`
  перевіряють `createSingleBanner`/`executeBannerCreationLoop` ізольовано і
  фіксом не зачіпаються. Знадобиться **новий** тест на `processAndCreateBanners`
  зі збійним розділювачем.

## 4. Де зараз живе цей борг у коді

| Файл | Функція | Роль |
|---|---|---|
| `modules/banner_creator.ts:60-64` | `processAndCreateBanners` | **Джерело багу** — незахищений `await this.createSingleBanner(...)` |
| `modules/banner_creator.ts:66-72` | `processAndCreateBanners` | Недосяжний при збої код: `finalCleanup`, `UI.filterBanners`, тост |
| `modules/event_banners/category.ts:5-10` | `handleCreateBannersAction` | Ковтає реджект (без `await`/`.catch()`) |
| `modules/banner_executor.ts:12-28` | `executeBannerCreationLoop` | Еталон правильної обробки — з ним і треба вирівнятись |
| `modules/banner_form.ts:88-125` | `resolveCreateBannerButton`, `resolveCreateBannerForm`, `readBannerFormControls` | Точки, які кидають (винесені під час Stage 3) |

Під час Stage 3 сам `createSingleBanner` було розібрано на кроки
(`modules/banner_form.ts`), що зробило перелік кидаючих точок явним, але
**обробку помилок навмисно не змінювали** — це і є предмет цього аудиту.

## 5. Перевірка після виправлення

- [ ] Відтворити збій: застабити `SYH_BANNER_CREATOR.UTILS.waitForNewBanner` так,
      щоб він реджектився **лише** для тексту `"----Питання глядачів----"`.
- [ ] Переконатися, що `finalCleanup()` викликано (форма закрита).
- [ ] Переконатися, що `copyAndShowBanner` викликано з
      `"Успішно створено банерів: N"`.
- [ ] Переконатися, що промис `processAndCreateBanners` **резолвиться**, а не
      реджектиться (`await assert.doesNotReject(...)`).
- [ ] Перевірити, що `UI.filterBanners()` викликано, якщо `UI` заданий.
- [ ] Додати тест у `tests/banner_form.test.js` (або новий
      `tests/banner_creator_flow.test.js`).
- [ ] `npm run test && npx tsc --noEmit && npm run lint` — зелені.

## 6. Побічні спостереження

- **Type-check проєкту:** `npx tsc --noEmit` зелений (0 помилок) як до, так і
  після Stage 3-рефакторингу.
- **ESLint:** 3 попередження, усі про невикористані type-імпорти й **усі
  успадковані** (`modules/storage_migration.ts:16`, `modules/ui_shared_utils.ts:7`,
  `youtube/studio/studio_storage_handler.ts:7`). Жодне не в файлах цього етапу.
- `handleCreateBannersAction` приймає `bannerCreator: any` — типізація тут
  повністю відключена, тож TypeScript не може попередити про необроблений
  промис. Заміна `any` на `SyhBannerCreator` — окремий, дешевий і корисний крок.
- `SyhBannerCreator.UI` теж має тип `any` (`modules/banner_types.ts:15`), через
  що перевірка `typeof this.UI.filterBanners === 'function'` лишається
  рантайм-качиною замість типізованої.
