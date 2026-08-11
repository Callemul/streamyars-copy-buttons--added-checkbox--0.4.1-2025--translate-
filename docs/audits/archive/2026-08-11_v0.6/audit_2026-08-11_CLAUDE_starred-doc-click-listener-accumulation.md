---
# [2026-08-11] — CLAUDE — Аудит: латентний баг «накопичення delegated-слухачів `document` у вкладці Starred»
> **Контекст виявлення:** знайдено під час рефакторингу CRAP-хотспотів за звітом Fallow
> (`npx fallow health --max-crap 30`), при декомпозиції `modules/ui_shared_utils.ts`
> (171 рядок, cyclomatic 51, fan-in 7) і написанні `tests/ui_shared_utils.test.js`.
> Баг існував в оригінальному коді й **не створений** цим рефакторингом.
>
> **Статус:** ✅ ВИПРАВЛЕНО [2026-08-11]. Див. розділ «7. Статус виправлення» в кінці файлу.
---

## 1. Що саме зламано (з порівнянням реального контракту і того, як його викликали)

`bindFilterDocClickHandler` вішає **делегований** слухач на `document` і не має ані
захисту від повторного біндінгу, ані способу відписатися. Два його споживачі
поводяться по-різному: банери захищені прапорцем, вкладка Starred — **ні**.

### Реальний контракт (`modules/ui_filter_controls.ts`, після рефакторингу)

```ts
export function bindFilterDocClickHandler(config: FilterDocClickConfig): void {
    document.addEventListener('click', function(e: MouseEvent) {
        // ...
    });
    // ⚠️ повертає void: жодного `off()`, жодного guard, жодного { once: true }
}
```

Кожен виклик = **ще один** назавжди живий слухач на `document`.

### Споживач А — банери (правильно), `modules/ui_banners_header.ts:67-88`

```ts
let filterControlsBound = false;

export function bindBannersFilterControls(): void {
    bindFilterSearchControls({ /* ... */ });   // прямі onclick/oninput — перезаписуються, дублів немає

    if (filterControlsBound) return;           // ✅ модульний guard
    filterControlsBound = true;

    bindFilterDocClickHandler({ /* ... */ });
}
```

### Споживач Б — Starred (зламано), `modules/ui_starred_controls.ts:57-96`

```ts
export function bindStarredControls(): void {
    const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');

    bindFilterSearchControls({ /* ... */ });

    // ❌ НЕМАЄ guard-прапорця — виклик щоразу додає новий слухач на document
    bindFilterDocClickHandler({
        // ...
        onFilterSelect: (filterBtn) => {
            updateFilterTabSelection(filterBtn, '.syh-filter-btn');
            SYH_UI_STATE.activeFilter = filterBtn.dataset.filter || 'all';
            filterStarredComments();

            if (SYH_UI_STATE.searchQuery && searchInput) {   // ❌ замикання над СТАРИМ елементом
                searchInput.classList.remove('syh-search-pulse');
                void searchInput.offsetWidth;
                searchInput.classList.add('syh-search-pulse');
            }
        }
    });
}
```

Два дефекти:

1. **Немає guard на делегований слухач.** Guard `if (starredHeaderNode.querySelector('.syh-starred-controls')) return;`
   у `addStarredTabControls` (рядок 44) захищає лише **конкретний DOM-вузол**. Коли StreamYard
   перемонтовує шапку Starred, приходить **новий** вузол — guard пропускає, `bindStarredControls()`
   викликається знову, слухач додається знову.
2. **Замикання над `searchInput`, захопленим на момент біндінгу.** Після перемонтування
   шапки старий `#syh-starred-search` від'єднаний від документа, але слухач №1 і далі
   тримає на нього посилання й намагається анімувати саме його.

### Ланцюг, який робить повторний виклик неминучим

```
modules/bootstrap_dom.ts:53
    { selectorKey: 'starredHeaderWrap', onAdded: el => SYH_UI.addStarredTabControls(el) }
        → SYH_DOM_OBSERVER спрацьовує на КОЖНУ появу вузла шапки
            → addStarredTabControls(newNode)   // guard пройдено: вузол новий
                → bindStarredControls()
                    → document.addEventListener('click', ...)   // +1 слухач назавжди
```

### Помилки `tsc`

Помилок типізації немає: `npx tsc --noEmit` дає **0 помилок**. Це дефект життєвого циклу,
а не типів — статичний аналіз його не бачить. `fallow dead-code --circular-deps` теж чистий.

---

## 2. Runtime-наслідки (детальний аналіз та трасування помилки)

### 2.1 Трасування накопичення

StreamYard — SPA на React. Панель правих вкладок перемонтовується при перемиканні
Starred ↔ Comments ↔ Banners, при зміні розміру панелі та при переході між сценами.

| Подія | Вузол шапки | Guard у `addStarredTabControls` | Слухачів на `document` |
|---|---|---|---|
| перший вхід у Starred | `node#1` | пройдено | 1 |
| та сама шапка, повторна мутація | `node#1` | **зупиняє** (`.syh-starred-controls` є) | 1 |
| перехід Comments → Starred (remount) | `node#2` | пройдено | 2 |
| ще один перехід | `node#3` | пройдено | 3 |
| … 10 перемикань за сесію | `node#N` | пройдено | **N** |

Слухачі не знімаються ніколи: `document` живе стільки ж, скільки вкладка браузера,
а `removeEventListener` у коді відсутній (`rg "removeEventListener" modules/ui_*` — порожньо).

### 2.2 Що відбувається при одному кліку по вкладці фільтра

При N накопичених слухачах **один** клік по `.syh-filter-btn` дає:

```
click .syh-filter-btn
  ├─ listener#1 → onFilterSelect(btn) → updateFilterTabSelection() + filterStarredComments()
  │                                   → анімація на searchInput#1 (ВІДІРВАНИЙ від DOM)
  ├─ listener#2 → onFilterSelect(btn) → ... → анімація на searchInput#2 (теж відірваний)
  └─ listener#N → onFilterSelect(btn) → ... → анімація на searchInput#N (актуальний)
```

Наслідки, за спаданням помітності:

1. **`filterStarredComments()` виконується N разів на клік.** Функція проходить увесь
   список коментарів, рахує лічильники, сортує та перебудовує `order`/`display`
   (`modules/ui_starred_controls.ts:98+`). При N=10 і сотні коментарів це десятки тисяч
   зайвих DOM-операцій на один клік — відчутний фриз інтерфейсу.
2. **Анімація пульсації пошуку не спрацьовує.** Клас `syh-search-pulse` вішається
   першим за чергою слухачем на **відірваний** `searchInput#1`. Актуальний інпут
   отримує клас останнім (від listener#N), але перед цим N-1 разів відпрацював
   `void searchInput.offsetWidth` на detached-елементах. У сценарії, коли шапка
   перемонтована, а `SYH_UI_STATE.searchQuery` непорожній, підказка «дивись сюди,
   тут активний фільтр пошуку» глючить або не видно взагалі.
3. **Витік пам'яті.** Кожен слухач тримає замикання на `searchInput#i`, а через нього —
   на цілу відірвану підрозмітку шапки. GC не може її звільнити, доки живий `document`.
4. **`onClearAll` теж дублюється.** Клік по `#syh-empty-clear-link` N разів виконує
   `resetSearchField()` + `filterStarredComments()`.

### 2.3 Чому баг непомітний

- Усі обробники **ідемпотентні за результатом**: `filterStarredComments()` N разів дає
  той самий кінцевий стан списку, що й один раз. Тому візуально нічого не «ламається» —
  просто повільнішає.
- N росте лише в довгих сесіях із багатьма перемиканнями вкладок. На свіжій сторінці N=1
  і поведінка ідеальна — саме так її бачать тести й ручна перевірка.
- У `modules/ui_banners_header.ts` guard **є**, тому банери поводяться правильно, і при
  побіжному читанні коду складається враження, що патерн захищений скрізь.

### 2.4 Чому це не ловиться тестами

`tests/ui_shared_utils.test.js` (тести 27, 28) перевіряє делегований клік у межах
**одного** біндінгу і на свіжому `document.body`. Сценарій «двічі викликали
`bindStarredControls`, потім один клік» не покритий у жодному тестовому файлі:
`tests/ui_comments_starred_controls.test.js` теж біндить рівно один раз.

---

## 3. Пропоноване виправлення (приклад коду, який НЕ був застосований)

Мінімальний варіант — повторити патерн банерів:

```ts
// modules/ui_starred_controls.ts
let starredDocClickBound = false;

export function bindStarredControls(): void {
    bindFilterSearchControls({ /* ... без змін ... */ });

    if (starredDocClickBound) return;
    starredDocClickBound = true;

    bindFilterDocClickHandler({
        // ...
        onFilterSelect: (filterBtn) => {
            updateFilterTabSelection(filterBtn, '.syh-filter-btn');
            SYH_UI_STATE.activeFilter = filterBtn.dataset.filter || 'all';
            filterStarredComments();

            // ВИПРАВЛЕНО: елемент шукається НА МОМЕНТ КЛІКУ, а не на момент біндінгу
            const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');
            if (SYH_UI_STATE.searchQuery && searchInput) {
                searchInput.classList.remove('syh-search-pulse');
                void searchInput.offsetWidth;
                searchInput.classList.add('syh-search-pulse');
            }
        }
    });
}
```

Чистіший варіант — прибрати можливість помилки на рівні самого хелпера, повернувши
функцію відписки:

```ts
// modules/ui_filter_controls.ts
export function bindFilterDocClickHandler(config: FilterDocClickConfig): () => void {
    const handler = (e: MouseEvent) => { /* ... поточне тіло ... */ };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
}
```

Тоді обидва споживачі тримають `off()` і викликають його перед повторним біндінгом —
і guard-прапорці стають непотрібні взагалі. Це чистіше архітектурно, але зачіпає
`ui_banners_header.ts`, тому як перший крок краще мінімальний варіант.

### 3.1 Що зміниться для користувача

| Сценарій | Зараз | Після виправлення |
|---|---|---|
| Перше відкриття Starred, клік по фільтру | працює миттєво | без змін |
| 10 перемикань вкладок, потім клік по фільтру | список перебудовується 10 разів, помітний фриз | одна перебудова, миттєво |
| Пульсація `#syh-starred-search` після перемонтування шапки | вішається на відірваний інпут — анімації не видно | анімація видима на актуальному полі |
| Клік по «скинути все» в порожньому стані | `filterStarredComments()` N разів | рівно один раз |
| Довга сесія (година роботи) | відірвані вузли шапки не звільняються GC | пам'ять стабільна |

Ефект — продуктивність і коректність анімації; ЛОГІКА фільтрації не змінюється,
бо обробники ідемпотентні.

### 3.2 Ризики міграції

- **Модульний прапорець живе стільки ж, скільки контент-скрипт.** Якщо колись з'явиться
  сценарій повного тіру-даун і повторної ініціалізації UI (наприклад,
  `SYH_PLUGIN_REGISTRY.destroyAll()` з наступним `init`), прапорець залишиться `true`
  і слухач **не** переприв'яжеться. Той самий ризик уже існує в `ui_banners_header.ts`
  (`filterControlsBound`), тому обидва місця варто прибирати разом і краще
  через варіант із `off()`.
- **Зміна моменту пошуку `searchInput`** (з часу біндінгу на час кліку) — це і є
  фактичне виправлення поведінки, тобто свідома зміна UX. Погоджувати окремо.
- **Зміна сигнатури** `bindFilterDocClickHandler` на `() => void` (варіант 2) торкається
  двох викликів і `tests/ui_shared_utils.test.js` (тести 27, 28) — вони перевіряють
  лише побічні ефекти, тому оновлення мінімальне.
- Ризик регресії низький: сховища й мережі не торкаємось, зміни локалізовані у двох файлах.

---

## 4. Де зараз живе цей борг у коді (після рефакторингу)

Рефакторинг виніс механіку біндінгу з «шухляди» `ui_shared_utils.ts` в окремий модуль,
тому борг тепер розділений між рівнем механізму і рівнем споживача:

- **`modules/ui_filter_controls.ts` → `bindFilterDocClickHandler`** — механізм:
  `document.addEventListener('click', ...)` без guard і без повернення `off()`.
  Саме сюди додається функція відписки у «чистому» варіанті виправлення.
- **`modules/ui_starred_controls.ts` → `bindStarredControls`** — епіцентр:
  виклик `bindFilterDocClickHandler` без прапорця + замикання над `searchInput`,
  захопленим до `bindFilterSearchControls`.
- **`modules/ui_starred_controls.ts` → `addStarredTabControls`** — guard рівня вузла
  (`querySelector('.syh-starred-controls')`), який не рятує при перемонтуванні.
- **`modules/bootstrap_dom.ts:53`** — реєстрація `starredHeaderWrap` у `SYH_DOM_OBSERVER`,
  тобто джерело повторних викликів.
- **`modules/ui_banners_header.ts:67-88`** — еталон правильного патерну
  (`filterControlsBound`), з яким треба звірятися.
- **`modules/ui_shared_utils.ts`** — тепер лише фасад-бочка, реекспортує
  `bindFilterDocClickHandler`; логіки не містить.

---

## 5. Перевірка після виправлення (чек-лист для наступного розробника/ШІ)

1. `npx tsc --noEmit` → **0 помилок** (базова лінія цього етапу — теж 0).
2. `npm run test` → усі тести зелені. Додати у `tests/ui_shared_utils.test.js`
   регрес-тест на сам механізм:
   - викликати `bindFilterDocClickHandler(cfg)` **двічі** з тим самим `cfg`;
   - один `click` по `.fbtn` → `onFilterSelect` має спрацювати **1 раз**
     (зараз спрацює 2 — тест червоний до виправлення).
3. Додати у `tests/ui_comments_starred_controls.test.js` інтеграційний регрес:
   - двічі викликати `addStarredTabControls` з **різними** вузлами шапки;
   - один клік по `.syh-filter-btn` → `filterStarredComments` виконується один раз
     (наприклад, лічильником через `mock.method`).
4. `npx fallow dead-code --format json` → `unused_exports`, `unused_types`,
   `unresolved_imports`, `circular_dependencies`, `re_export_cycles` = **0**.
5. `npm run lint` → без нових попереджень у `modules/ui_*`.
6. **Ручна перевірка в StreamYard через DevTools** (обов'язково — баг лише рантаймовий):
   ```js
   // до і після 10 перемикань вкладок Starred ↔ Comments
   getEventListeners(document).click.length
   ```
   Значення має лишатися **сталим**, а не зростати на 1 за кожне перемикання.
   Далі: ввести текст у пошук, перемкнути вкладку туди-назад, натиснути фільтр —
   поле пошуку має пульсувати.

---

## 6. Побічні спостереження

- **Загальний стан type-check здоровий.** `npx tsc --noEmit` дає **0 помилок**
  (у `2026-08-09_KILO_AUDIT.md` було 109, у `2026-08-09_CLAUDE_AUDIT.md` — 123).
  Скрипт `npm run typecheck` уже присутній у `package.json`; його варто зробити CI-гейтом.
- **Патерн «делегований слухач без відписки» варто перевірити системно.**
  `rg "document.addEventListener" modules youtube popup` показує кілька місць
  (зокрема `modules/event_banners/index.ts` — `mouseup`), і жодне з них не має
  парного `removeEventListener`. Це окрема задача на ревізію життєвого циклу слухачів.
- **`modules/plugin_registry.ts` має `destroyAll()`** (cyclomatic 6, cognitive 11),
  тобто тір-даун у проєкті концептуально передбачений — але UI-слухачі до нього
  не під'єднані. Це підсилює аргумент на користь варіанта виправлення з `off()`
  замість модульних прапорців.
- **Fallow: жодна функція продакшн-коду не має CRAP > 30.** Усі 8 знахідок за порогом —
  у DOM-моках тестів. Health-score 78.3 (grade B); основні штрафи — `hotspots` (10.0)
  і `unit_size` (10.0), а не складність.
- **Два аудити в `docs/audits/active/` застаріли** (`2026-08-09_KILO_AUDIT.md` про
  `event_banners/mouseup_handler.ts` — описані там дефекти у коді відсутні,
  `2026-08-09_CLAUDE_AUDIT.md` — потребує перевірки). Їх варто перенести
  в `docs/audits/archive/`.

---

## 7. Статус виправлення ✅ (2026-08-11)

Баг **виправлено** без зміни зовнішньої поведінки користувача (фільтрація ідемпотентна,
тому результат списку не змінився — лише усунуто накопичення слухачів і «сліпу» анімацію
на відірваному інпуті).

### 7.1 Застосований патч — `modules/ui_starred_controls.ts` → `bindStarredControls`

1. **Дедуплікація слухача** (повторює патерн `ui_banners_header.ts`):
   додано модульний прапорець `let starredDocClickBound = false;` і ранній вихід
   перед `bindFilterDocClickHandler(...)`, якщо вже був прив'язаний.
2. **Усунення замикання над старим інпутом:** `searchInput` більше не захоплюється
   на момент біндінгу — він запитується всередині `onFilterSelect` у момент кліку:
   `const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');`.
   Тому після перемонтування шапки пульсація застосовується до **актуального** поля пошуку.

### 7.2 Регресійні тести

Додано `tests/ui_starred_controls_regression.test.js` (зареєстровано в `package.json` → `test`):
- *«повторний bindStarredControls не додає другий делегований click-слухач на document»* —
  перевіряє, що другий виклик не реєструє новий `document`-слухач (спіймано через
  `mock.method(document, 'addEventListener')`).
- *«onFilterSelect пульсує ПОТОЧНИЙ #syh-starred-search, а не відірваний після перемонтування»* —
  після заміни інпуту клік пульсує новий елемент, а не старий (відірваний).

Обидва тести **червоні** на оригінальному (не-виправленому) коді і **зелені** після патчу
(перевірено тимчасовим відкоченням фіксу).

### 7.3 Верифікація (Definition of Done)

- `npm run test` → **1951/1951** pass (було 1949; +2 нові регрес-тести).
- `npm run typecheck` (`tsc --noEmit`) → **0 помилок**.
- `npm run lint` → 0 errors (лише 4 pre-existing warnings у неторкнутих файлах).
- `npm run build` → успішно.
- `npx fallow dead-code --format json` → без нових unused-експортів/циклів
  (патч не додав мертвого коду).

### 7.4 Залишені поза цим фіксом (не чіпали навмисно)

- Варіант з поверненням `() => void` (функції відписки) від `bindFilterDocClickHandler`
  і прибиранням модульних прапорців — чистіший архітектурно, але зачіпає
  `ui_banners_header.ts` і сигнатуру хелпера; винесено в окрему задачу.
- Системний перегляд «делегованих слухачів без відписки» по всьому коду
  (див. §6 вище) — окрема задача.
