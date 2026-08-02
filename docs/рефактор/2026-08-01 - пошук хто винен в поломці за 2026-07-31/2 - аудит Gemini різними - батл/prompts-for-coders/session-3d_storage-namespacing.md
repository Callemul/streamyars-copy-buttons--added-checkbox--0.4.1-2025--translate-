# Сесія 3D — Storage namespacing + міграція даних (M4)

## Контекст
Chrome Extension MV3, Vite + TS. Сесії 3A–3C (popup на TS + SYH_STORAGE) вже виконані.
Верифікація: `npm run lint && npm run test && npm run build` + ОБОВ'ЯЗКОВИЙ ручний тест оновлення (в кінці).

## Скоуп
Читай і змінюй ТІЛЬКИ: `modules/storage.ts`, `background.ts` (або де реєструється `onInstalled`), `popup/*.ts` (тільки рядки з ключами storage)
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Список ВСІХ знайдених старих ключів → нових (повна таблиця)
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

> ⚠️ **МАКСИМАЛЬНИЙ РИЗИК.** Без міграційної функції користувачі ВТРАТЯТЬ ВСІ дані при оновленні.
> ⚠️ **ЗАБОРОНЕНО** видаляти старі ключі без перенесення даних у нові.
> ⚠️ Міграція має бути **ідемпотентною**: повторний запуск не ламає дані.

## Крок 1: Інвентаризація ключів

Перш ніж щось писати — знайди ВСІ ключі storage в проєкті (пошук по `SYH_STORAGE.get(`, `SYH_STORAGE.set(`, по рядкових літералах `syh_`, `studio_comment_state`, `tg_`, `'db'`). Склади повний список у звіт. Ключі з динамічними суфіксами (наприклад `syh_telegram_data__<brand>`, `studio_comment_state__<videoId>`) зафіксуй як prefix-шаблони.

## Крок 2: Mapping старих → нових ключів

Цільова схема `syh:module:category:` (зафіксуй фактичну на основі Кроку 1):

    syh_yt_collected                  → syh:popup:yt:collected
    syh_options                       → syh:core:options
    syh_telegram_data__<brand>        → syh:popup:telegram:data:<brand>
    syh_old_input__<brand>            → syh:popup:telegram:oldInput:<brand>
    studio_comment_state__<videoId>   → syh:studio:state:<videoId>
    db                                → syh:core:db

## Крок 3: Міграційна функція (одноразова, ідемпотентна)

Додай у `modules/storage.ts`:

```typescript
const STORAGE_SCHEMA_VERSION = 2;

export async function migrateStorageIfNeeded(): Promise<void> {
    const { _schema_version } = await chrome.storage.local.get('_schema_version');
    if (typeof _schema_version === 'number' && _schema_version >= STORAGE_SCHEMA_VERSION) return;

    const allData = await chrome.storage.local.get(null);
    const migrated: Record<string, unknown> = {};
    const keysToRemove: string[] = [];

    for (const [oldKey, value] of Object.entries(allData)) {
        if (oldKey === '_schema_version') continue;
        const newKey = migrateKey(oldKey); // mapping з Кроку 2, incl. prefix-шаблони
        if (newKey !== oldKey) {
            migrated[newKey] = value;
            keysToRemove.push(oldKey);
        }
    }

    if (keysToRemove.length > 0) {
        await chrome.storage.local.set(migrated);   // 1) спочатку ЗАПИСАТИ нові
        await chrome.storage.local.remove(keysToRemove); // 2) потім видалити старі
    }
    await chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION });
    console.log(`[SYH] Storage migrated: ${keysToRemove.length} keys renamed`);
}
```

> Порядок критичний: set нових → remove старих. Ніколи навпаки.

## Крок 4: Виклик міграції при оновленні

```typescript
// background.ts:
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'update' || details.reason === 'install') {
        await migrateStorageIfNeeded();
    }
});
```

## Крок 5: Оновити всі звернення

У `popup/*.ts` та всіх інших файлах замінити старі ключі на нові (використовуй константи з `storage.ts`, не хардкодь рядки).

## Крок 6: Raw HTML → JSON (тільки telegram-ключі)

Ключі `tg_finalResultHtml`, `tg_statsHtml`, `tg_deletedLogHtml` (HTML-рядки) → структуровані JSON-об'єкти у нових ключах `syh:popup:telegram:*`. Рендеринг HTML — на стороні popup при відображенні. Якщо обсяг змін виходить за межі сесії — ЗУПИНИСЬ і доповідь, це буде окрема задача.

---

## Приймання
- [ ] Всі ключі мають prefix `syh:module:category:`
- [ ] Міграція ідемпотентна (повторний запуск — no-op)
- [ ] `_schema_version` записується у storage
- [ ] 0 хардкоджених старих ключів у коді
- [ ] Юніт-тест міграції: mock storage зі старими ключами → міграція → нові ключі містять ті самі дані

## Обов'язковий ручний тест оновлення
1. Встановити СТАРУ версію розширення
2. Наповнити storage (зібрати коментарі, telegram-дані, молитви)
3. Оновити на НОВУ версію
4. Перевірити: всі дані на місці та відображаються коректно
- [ ] Ручний тест пройдено, дані не втрачено
