# Сесія 1B — Quick wins: JSON.parse + temp file

## Контекст
Chrome Extension MV3, Vite + TS.
Верифікація: `npm run lint && npm run test && npm run build`

## Скоуп
Читай і змінюй ТІЛЬКИ: `modules/stats_tracker.ts`
Видали: `youtube/studio/studio_styles.css.temp`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## H2: Unsafe JSON.parse у циклі (~30 хв)

**Функція:** `getBrandFromLocalStorage()` (~рядок 290 в `stats_tracker.ts`)

**Проблема:** Цикл по ключах `localStorage` з `JSON.parse()` без `try-catch`. Один зламаний запис — весь цикл падає.

```typescript
// ❌ ЗАРАЗ:
for (const key of Object.keys(localStorage)) {
    const val = JSON.parse(localStorage.getItem(key) || '');
}

// ✅ ПІСЛЯ:
for (const key of Object.keys(localStorage)) {
    try {
        const val = JSON.parse(localStorage.getItem(key) || '""');
    } catch {
        continue;
    }
}
```

**Приймання:**
- [ ] Цикл продовжує роботу при невалідному JSON у localStorage
- [ ] Бренд визначається коректно при валідних записах

---

## L2: Видалити temp файл (~1 хв)

Видалити файл `youtube/studio/studio_styles.css.temp` — він не використовується.
Приймання: файл відсутній, збірка працює.
