# [2026-08-10] — KILO — Аудит: латентний баг «Auto-Heal: незакритий Promise і гонка з перефільтруванням»

> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow.
> Конкретно — під час розбиття `modules/event_comments/auto_heal.ts`
> (`refactoring target`, `priority 26.0`, `complexity_density 0.40` — **найвища
> щільність складності у проєкті**, MI 80.8, fan-in 3; звіт Fallow 3.14.0).
> **Статус:** ⛔ НЕ ВИПРАВЛЕНО. Рефакторинг зберігає поведінку 1-в-1. Виправлення потребує окремого погодження.

---

## 1. Що саме зламано

Прохід Auto-Heal «привиди» викликає **асинхронне** видалення запису з бази як
**синхронну** операцію: без `await`, без `.catch()` і без урахування того, що
подальші кроки залежать від її завершення.

Реальний контракт (`modules/event_comments/database.ts`):

```ts
export async function removeFromDatabase(
    self: SyhEventComments,
    text: string
): Promise<void> {                                  // ← Promise, який може відхилитись
    if (self.UI && self.UI.prayersCache) {
        self.UI.prayersCache = self.UI.prayersCache.filter((item: PrayerItem) => item.text !== text);
    }
    await CommentService.removePrayerRecord(text);  // ← звернення до chrome.storage
}
```

Як його викликають (після рефакторингу — `modules/event_comments/auto_heal_ghosts.ts`,
до рефакторингу — `auto_heal.ts`, функція `processSyhComments`):

```ts
export function processGhostComments(self: SyhEventComments): void {   // ← НЕ async
    document.querySelectorAll(SYH_COMMENT_SELECTOR).forEach((commentBlock: Element) => {
        if (!isGhostComment(self, commentBlock)) return;

        const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (!text) return;

        console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
        self.removeFromDatabase(text);          // ⚠️ floating promise: ні await, ні catch

        resetCommentVisuals(self, commentBlock); // ⚠️ виконується НЕГАЙНО, не чекаючи БД
    });
}
```

А `resetCommentVisuals` планує перефільтрування за фіксовані 100 мс:

```ts
const REFILTER_DELAY_MS = 100;

function resetCommentVisuals(self: SyhEventComments, commentBlock: Element): void {
    const ui = self.UI;
    if (!ui) return;
    ui.updateCommentVisuals(commentBlock, 'none');
    if (typeof ui.filterStarredComments === 'function') {
        setTimeout(() => ui.filterStarredComments(), REFILTER_DELAY_MS);  // ⚠️ гонка з БД
    }
}
```

**Дві розбіжності контракту:**

| # | Контракт | Як викликають | Наслідок |
|---|---|---|---|
| 1 | `removeFromDatabase(): Promise<void>` — може відхилитись | виклик без `await`/`.catch()` | `unhandledrejection` у content script |
| 2 | Запис у БД завершується асинхронно | UI перемальовується через фіксовані 100 мс | перефільтрування може прочитати ще не оновлену БД |

**Помилок `tsc` немає.** TypeScript за замовчуванням не вимагає обробки
плаваючих промісів — потрібне правило `@typescript-eslint/no-floating-promises`
(зараз у `eslint.config.js` не увімкнене), яке працює лише в type-aware режимі.
Саме тому баг не видно жодною автоматичною перевіркою проєкту.

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### Трасування A — незакрите відхилення при інвалідації контексту

1. Користувач оновлює/перезавантажує розширення, поки StreamYard-вкладка відкрита.
2. `SYH_DOM_OBSERVER` фіксує мутацію → `triggerAutoHeal()` → `requestAnimationFrame`.
3. У кадрі викликається `runAutoHeal(self)`. Guard `isExtensionRuntime()` читає
   `chrome.runtime.id` і **проходить** — на цей мікромомент id ще живий.
4. → `processGhostComments(self)` знаходить привида → `self.removeFromDatabase(text)`.
5. Усередині — `await CommentService.removePrayerRecord(text)` → звернення до
   `chrome.storage.local`. **До моменту резолву** контекст помирає.
6. Проміс відхиляється з `Extension context invalidated`.
7. Ніхто його не слухає → `unhandledrejection` у консолі вкладки.
8. **Наслідок:** шум у консолі, який маскує реальні помилки при діагностиці
   (а проєкт за `AGENTS.md` дебажиться саме через DevTools-логи), і — залежно
   від оточення — переривання поточного проходу Auto-Heal.

> Guard `isExtensionRuntime()` перевіряє контекст **один раз на початку**
> `runAutoHeal`, а `processCoverButtons` + `processGhostComments` можуть
> обробляти десятки блоків. Вікно між перевіркою і фактичним записом у storage
> нічим не захищене.

### Трасування B — гонка «БД ще не оновилась, а список уже перефільтрували»

1. У DOM 30 коментарів, з них 8 — «привиди» (зірку знято).
2. `processGhostComments` в одному синхронному циклі `forEach`:
   - стартує **8 паралельних** `removeFromDatabase(...)`, жоден не очікується;
   - для кожного одразу викликає `ui.updateCommentVisuals(block, 'none')`;
   - для кожного планує `setTimeout(filterStarredComments, 100)` — **8 таймерів**.
3. Через 100 мс спрацьовує перший таймер → `filterStarredComments()` читає стан.
4. Якщо хоч один із 8 записів у `chrome.storage` ще не завершився (типово при
   холодному старті, великому обсязі даних або завантаженому профілі), фільтр
   бачить **застарілий** набір і може лишити/повернути коментар у списку
   «відмічених».
5. Далі спрацьовують решта 7 таймерів — список перемальовується ще 7 разів
   поспіль, кожен раз із дещо іншим станом БД.
6. **Наслідок для користувача:** видимий «стрибок» списку молитов/питань;
   коментар, з якого щойно зняли зірку, на секунду повертається; у гіршому
   випадку лишається у списку до наступного циклу Auto-Heal.

### Підсилювач: `prayersCache` мутується синхронно, а storage — асинхронно

`removeFromDatabase` фільтрує `self.UI.prayersCache` **синхронно** (до `await`),
а `CommentService.removePrayerRecord` пише в storage **асинхронно**. Тобто між
кроками 4 і 5 існує вікно, де кеш у пам'яті вже без запису, а сховище — ще з ним.
Будь-яке читання зі storage у цьому вікні (напр. з попапа) поверне іншу картину,
ніж кеш content script — пряме порушення правила Single Source of Truth
з `AGENTS.md`.

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Зробити прохід асинхронним, дочекатися всіх видалень і перефільтрувати **один раз**.

```ts
// modules/event_comments/auto_heal_ghosts.ts

/** Знімає підсвічування негайно; перефільтрування виносимо назовні. */
function resetCommentVisuals(self: SyhEventComments, commentBlock: Element): void {
    self.UI?.updateCommentVisuals(commentBlock, 'none');
}

export async function processGhostComments(self: SyhEventComments): Promise<void> {
    const ghosts: Array<{ block: Element; text: string }> = [];

    document.querySelectorAll(SYH_COMMENT_SELECTOR).forEach((commentBlock: Element) => {
        if (!isGhostComment(self, commentBlock)) return;
        const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (!text) return;
        ghosts.push({ block: commentBlock, text });
    });

    if (ghosts.length === 0) return;

    console.log(`[SYH] Auto-Heal: Виявлено ${ghosts.length} коментар(ів) без зірки. Очищую з бази.`);

    // 1) Чекаємо ВСІ видалення і гасимо кожне відхилення окремо.
    await Promise.allSettled(
        ghosts.map(async ({ text }) => {
            try {
                await self.removeFromDatabase(text);
            } catch (err) {
                console.warn('[SYH] Auto-Heal: не вдалося прибрати запис із бази:', err);
            }
        })
    );

    // 2) Візуали — після того, як БД справді оновилась.
    ghosts.forEach(({ block }) => resetCommentVisuals(self, block));

    // 3) Рівно ОДНЕ перефільтрування замість N таймерів.
    if (typeof self.UI?.filterStarredComments === 'function') {
        self.UI.filterStarredComments();
    }
}
```

І відповідно в оркестраторі:

```ts
// modules/event_comments/auto_heal.ts
export function runAutoHeal(self: SyhEventComments): void {
    if (!isExtensionRuntime()) {
        self.autoHealObserver?.disconnect();
        return;
    }
    processCoverButtons(self);
    void processGhostComments(self).catch(err =>
        console.warn('[SYH] Auto-Heal: прохід «привиди» завершився помилкою:', err)
    );
}
```

Додатково варто увімкнути захист від повторення класу помилок:

```js
// eslint.config.js — потребує type-aware конфігурації (projectService)
rules: {
    '@typescript-eslint/no-floating-promises': 'error',
}
```

## 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Знято зірку з 1 коментаря | список перемальовується через 100 мс, іноді до запису в БД | список перемальовується один раз, після запису |
| Знято зірку з 8 коментарів одразу | 8 перемальовувань поспіль, видимий «стрибок» | 1 перемальовування |
| Повільний storage (холодний старт) | коментар може на мить повернутись у список | коментар зникає стабільно, з першого разу |
| Оновлення розширення під час скану | `unhandledrejection` у консолі | попередження `console.warn`, прохід завершується коректно |
| Немає привидів у DOM | планується таймер (порожня робота) | ранній вихід, таймер не створюється |
| `UI === null` (headless-режим) | видалення з БД відбувається, візуали пропускаються | без змін |
| Затримка перед перефільтруванням | фіксовані 100 мс | прив'язана до факту завершення запису |

## 3.2 Ризики міграції

1. **Зміна сигнатури на `Promise<void>`** зачіпає `SyhEventComments`
   (`modules/event_comments/types.ts`) і оркестратор `runAutoHeal`. Якщо
   `runAutoHeal` теж стане async — під удар потрапляє `bindAutoHealScanner`,
   який викликає його і з rAF-колбека, і напряму.
2. **Зникнення 100-мс затримки.** Тести `tests/event_comments_auto_heal.test.js`
   (№ 5) і `tests/event_comments_auto_heal_scanner.test.js` (№ 19) навмисно
   чекають `setTimeout` ~110–130 мс. Після фіксу очікування треба замінити на
   `await`, інакше тести стануть флакі.
3. **Зміна кількості викликів `filterStarredComments`** з N на 1 — якщо десь у
   коді на цю кратність спираються (лічильники, аналітика), поведінка зміниться.
4. **`Promise.allSettled` змінює порядок побічних ефектів:** зараз візуали
   гаснуть миттєво, після фіксу — з невеликою затримкою. Візуально це виглядає
   як «підвисання» на повільному storage; можливо, варто лишити
   `updateCommentVisuals` синхронним, а асинхронним зробити лише перефільтрування.
5. **Порядок проходів.** `processCoverButtons` має лишитись **перед**
   `processGhostComments`: перший ставить чекбокси, другий читає підсумковий стан.
6. **Правило `no-floating-promises`** увімкнеться на весь проєкт і, найімовірніше,
   підсвітить інші місця — це окремий обсяг робіт, не частина цього фіксу.

## 4. Де зараз живе цей борг у коді (після рефакторингу)

| Файл | Функція | Роль у баґу |
|---|---|---|
| `modules/event_comments/auto_heal_ghosts.ts` | `processGhostComments` | Плаваючий `self.removeFromDatabase(text)` без `await`/`catch` |
| `modules/event_comments/auto_heal_ghosts.ts` | `resetCommentVisuals` | `setTimeout(..., REFILTER_DELAY_MS)` на кожен привид → N таймерів |
| `modules/event_comments/auto_heal_ghosts.ts` | `REFILTER_DELAY_MS` | Магічні 100 мс замість очікування факту запису |
| `modules/event_comments/auto_heal.ts` | `runAutoHeal` | Синхронний оркестратор; guard контексту спрацьовує лише один раз на прохід |
| `modules/event_comments/auto_heal.ts` | `createFrameBatchedTrigger` | Батчинг за кадр не рятує від паралельних записів усередині одного проходу |
| `modules/event_comments/database.ts` | `removeFromDatabase` | Синхронна мутація `prayersCache` + асинхронний запис у storage |
| `modules/event_comments/types.ts` | `SyhEventComments.removeFromDatabase` | Тип уже `Promise`, але виклик цього не вимагає |

> До рефакторингу все це було функцією `processSyhComments`
> у `modules/event_comments/auto_heal.ts` (рядки 35–56).

## 5. Перевірка після виправлення (чек-лист)

- [ ] `tests/event_comments_auto_heal.test.js` № 5 переписано з очікування
      `setTimeout(110)` на `await` результату проходу.
- [ ] `tests/event_comments_auto_heal_scanner.test.js` № 19 переписано так само;
      № 15–18 (батчинг rAF і `document.hidden`) лишаються зеленими без змін.
- [ ] Доданий тест: 3 привиди → `filterStarredComments` викликано **рівно 1 раз**.
- [ ] Доданий тест: `removeFromDatabase` відхиляється → прохід не кидає назовні,
      у консоль іде `warn`, решта привидів усе одно обробляється.
- [ ] Доданий тест: `unhandledrejection` не реєструється під час проходу.
- [ ] Доданий тест: порядок збережено — `processCoverButtons` перед `processGhostComments`.
- [ ] `npm run test` — усі тести зелені.
- [ ] `npx tsc --noEmit` — 0 помилок.
- [ ] `npm run lint` — 0 errors.
- [ ] `npx fallow dead-code --format json` — без нових `unused-*` у змінених файлах.
- [ ] `npx fallow health --max-crap 30` — `auto_heal*` не з'явився серед
      complexity findings після переходу на async.
- [ ] Ручна перевірка в StreamYard: зняти зірку з 5+ коментарів поспіль →
      список не «стрибає», жоден коментар не повертається.

## 6. Побічні спостереження

1. **Загальний стан type-check:** `npx tsc --noEmit` на момент аудиту — **0 помилок**;
   `npm run test` — **1311/1311 зелені**; `npm run lint` — **0 errors, 3 warnings**
   (успадковані: `modules/storage_migration.ts:16`, `modules/ui_shared_utils.ts:7`,
   `youtube/studio/studio_storage_handler.ts:7`).
2. **`@typescript-eslint/no-floating-promises` не увімкнене.** Це системна
   прогалина: жоден інструмент проєкту (tsc, eslint, fallow) не бачить
   необроблених промісів. Схожий за природою баг уже фіксувався цього тижня —
   `audit_2026-08-10_KILO_banner-separator-abort-skips-cleanup.md` (T2 у
   `2026-08-10_KILO_TASKS.md`), де незакритий проміс обривав `finalCleanup`.
   Варто закрити клас помилок правилом, а не точковими фіксами.
3. **Тихий пропуск коментарів без тексту.** У `processGhostComments` гілка
   `if (!text) return;` мовчки ігнорує блок. Якщо селектор `commentText`
   застаріє після редизайну StreamYard, Auto-Heal перестане працювати
   **повністю беззвучно** — жодного логу, жодної метрики. Варто хоча б раз на
   прохід писати `console.debug` з кількістю пропущених блоків.
4. **Дзеркальна асиметрія у `processCoverButtons`.** Там теж є гілка
   «текст не знайдено»: чекбокс виставляється в `checked = true`, але
   `CommentService.setStreamYardCheckboxState` не викликається — стан лишається
   тільки в DOM. Зафіксовано тестом № 8 у
   `tests/event_comments_auto_heal_scanner.test.js` як навмисний квірк.
   Формально це друге, дрібніше порушення Single Source of Truth у тому ж модулі.
5. **Guard контексту варто підняти на рівень запису.** Замість однієї перевірки
   `isExtensionRuntime()` на прохід логічніше перевіряти живий контекст
   безпосередньо в `CommentService` перед кожним зверненням до `chrome.storage` —
   тоді трасування A закривається на рівні адаптера, а не кожного викликача.

---
