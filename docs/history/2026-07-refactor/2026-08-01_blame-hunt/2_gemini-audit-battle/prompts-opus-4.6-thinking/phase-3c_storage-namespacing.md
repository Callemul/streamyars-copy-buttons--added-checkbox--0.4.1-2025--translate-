# Задача: Фаза 3в — Storage namespacing + міграція даних

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 3в з 4 (архітектурна) | **Оцінка:** ~3 год  
**Передумова:** Фаза 3б (popup → SYH_STORAGE) вже виконана.  
**Мета:** Ієрархічні ключі storage + міграція зі старого формату.

> ⚠️ **МАКСИМАЛЬНИЙ РИЗИК:** Без міграційної функції — користувачі ВТРАТЯТЬ ВСІ дані при оновленні!

---

## M4: Плоска структура storage ключів + raw HTML у storage

**Файли:** `modules/storage.ts` (основний), всі popup-скрипти  
**Складність:** 🔴 Висока (~3 год, ризик міграції даних)

### Проблема

Ключі без ієрархії:
```
syh_yt_collected
syh_telegram_data__vp_ss
db
studio_comment_state__abc123
syh_options
tg_finalResultHtml        ← raw HTML!
tg_statsHtml              ← raw HTML!
```

### Цільова структура

```
// Поточний стан:                  → Після неймспейсінгу:
syh_yt_collected                   → syh:popup:yt:collected
syh_telegram_data__vp_ss           → syh:popup:telegram:data:vp_ss
studio_comment_state__abc123       → syh:studio:state:abc123
syh_options                        → syh:core:options
tg_finalResultHtml                 → syh:popup:telegram:finalResult (JSON, не HTML!)
tg_statsHtml                       → syh:popup:telegram:stats (JSON, не HTML!)
```

### Рішення

**Крок 1: Створити mapping старих → нових ключів**
```typescript
// storage.ts
const KEY_MIGRATION_MAP: Record<string, string> = {
    'syh_yt_collected':      'syh:popup:yt:collected',
    'syh_options':           'syh:core:options',
    'syh_telegram_data__':   'syh:popup:telegram:data:',  // prefix-based
    'studio_comment_state__':'syh:studio:state:',          // prefix-based
    // ... всі інші ключі
};
```

**Крок 2: Міграційна функція (одноразова)**
```typescript
const STORAGE_SCHEMA_VERSION = 2;  // Поточна версія: 1 (або без версії)

export async function migrateStorageIfNeeded(): Promise<void> {
    const { _schema_version } = await chrome.storage.local.get('_schema_version');
    if (_schema_version >= STORAGE_SCHEMA_VERSION) return;

    const allData = await chrome.storage.local.get(null);
    const migrated: Record<string, unknown> = {};
    const keysToRemove: string[] = [];

    for (const [oldKey, value] of Object.entries(allData)) {
        const newKey = migrateKey(oldKey);
        if (newKey !== oldKey) {
            migrated[newKey] = migrateValue(oldKey, value);  // HTML → JSON якщо потрібно
            keysToRemove.push(oldKey);
        }
    }

    if (keysToRemove.length > 0) {
        await chrome.storage.local.set(migrated);
        await chrome.storage.local.remove(keysToRemove);
    }
    await chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION });
    console.log(`[SYH] Storage migrated: ${keysToRemove.length} keys renamed`);
}
```

**Крок 3: Викликати міграцію при старті**
```typescript
// background.ts або main.ts — при першому запуску:
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'update') {
        await migrateStorageIfNeeded();
    }
});
```

**Крок 4: Замінити raw HTML на JSON**
```typescript
// ❌ БУЛО:
tg_finalResultHtml: "<div class='stat'>...</div>"

// ✅ СТАЛО:
'syh:popup:telegram:finalResult': {
    items: [...],
    generatedAt: '2026-08-02T12:00:00Z'
}
// Рендеринг HTML — на стороні popup при відображенні
```

**Крок 5: Оновити SYH_STORAGE адаптер** — всі get/set мають використовувати нові ключі.

---

## Критерії приймання

- [ ] Всі ключі мають prefix `syh:module:category:`
- [ ] Міграційна функція конвертує старі ключі при оновленні
- [ ] Raw HTML замінений на структуровані JSON-об'єкти
- [ ] **Тест міграції:** створити mock storage зі старими ключами → запустити міграцію → перевірити нові ключі
- [ ] Popup працює і відображає дані коректно після міграції
- [ ] `_schema_version` записана у storage

---

## ✅ Верифікація

```bash
npm run lint && npm run test && npm run build
```

**Обов'язковий ручний тест:**
1. Встановити СТАРУ версію розширення
2. Наповнити storage даними (зібрати коментарі, телеграм, тощо)
3. Оновити на НОВУ версію
4. Перевірити: дані збереглися та відображаються коректно

**⚠️ НЕ видаляти старі ключі без перенесення даних!**
