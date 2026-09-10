# План рефакторингу StreamYard Helper

**Майстер-трекер задач:** `../2026-08-02_Claude_Opus_4.6_Thinking_TASKS.md` — тільки для людини (чекбокси, статуси). Кодер його не бачить — йому даються тільки session-файли з цієї папки.

> ⚠️ Папка `../prompts-for-coders - from OPUS 4.6 Thinking/` (файли `phase-*.md`) — **ЗАСТАРІЛА**. Не використовувати. Актуальні промпти — тільки тут.

## Фаза 1: Критичні баги (P0) — сесії незалежні, можна ПАРАЛЕЛЬНО
- [Сесія 1A: studio_events — memory leak (H1) + stale closures (H3)](session-1a_studio-events.md)
- [Сесія 1B: quick wins — JSON.parse safety (H2) + видалення temp-файлу (L2)](session-1b_quick-wins.md)
- [Сесія 1C: Chart.js eval() → Vite import (H4)](session-1c_chartjs.md)

## Фаза 2: Стабілізація (P1) — незалежна від Фази 1 (інші файли)
- [Сесія 2: clearInterval SPA (M3) + observer disconnect (L6)](session-2_stabilization.md)

> Задача **M1** (lastError checks у popup) свідомо **пропущена**: закривається автоматично у Фазі 3 через адаптер SYH_STORAGE. Окремо робити не потрібно.

## Фаза 3: Архітектура popup (P2) — СТРОГО ПОСЛІДОВНО
- [Сесія 3A: popup_init → TS + ES-модулі + SYH_STORAGE + L7/L9/L10](session-3a_popup-init.md)
- [Сесія 3B: popup_telegram → TS + ES-модулі + SYH_STORAGE](session-3b_popup-telegram.md)
- [Сесія 3C: popup_prayers → TS + ES-модулі + SYH_STORAGE](session-3c_popup-prayers.md)
- [Сесія 3E: popup_translit → TS + ES-модулі + SYH_STORAGE](session-3e_popup-translit.md)
- [Сесія 3D: storage namespacing + міграція даних (M4)](session-3d_storage-namespacing.md)

## Фаза 4: Полірування (P3) — після Фаз 1–3, порядок довільний
- [Сесія 4A: TypeScript strict mode (L1)](session-4a_strict-mode.md)
- [Сесія 4B: inline styles → CSS класи (L3)](session-4b_inline-styles.md)
- [Сесія 4C: jQuery removal (L4)](session-4c_jquery-removal.md)
- [Сесія 4D: stats_tracker — observer throttling + interval cleanup + storage cleanup (L8)](session-4d_stats-tracker.md)

## Покриття задач аудиту (18/18 верифіковано + M1 skip)

| Задача | Сесія | Задача | Сесія |
|--------|-------|--------|-------|
| H1 memory leak | 1A | M1 lastError | пропущена (→ Фаза 3) |
| H2 JSON.parse | 1B | M2 → SYH_STORAGE | 3A/3B/3C/3E |
| H3 stale closures | 1A | M3 clearInterval | 2 |
| H4 eval() | 1C | M4 namespacing | 3D |
| H5 window globals | 3A/3B/3C/3E | L1 strict | 4A |
| L2 temp-файли | 1B | L6 observer disconnect | 2 |
| L3 inline styles | 4B | L7 debounce | 3A |
| L4 jQuery | 4C | L8 stats_tracker observer | 4D |
| L5 popup .js→.ts | 3A/3B/3C/3E | L9 resizers | 3A |
| L10 race condition | 3A | | |

## Порядок виконання

```
1A ‖ 1B ‖ 1C   (паралельно — різні файли)
      ↓
Фаза 2         (можна і паралельно з Фазою 1)
      ↓
3A → 3B → 3C → 3E → 3D   (строго послідовно! спільний скоуп popup/storage)
      ↓
4A – 4D        (довільний порядок; 4A strict — краще останньою)
```

## Загальні вимоги
1. **Формат звіту:** після кожної сесії — список змінених файлів → функцій, статус кожного критерію приймання (✅/❌), повний вивід `npm run lint && npm run test && npm run build`
2. **Зупинка при розбіжностях:** якщо код не збігається з описом у сесії — зупинитися і доповісти, не вигадувати рішення
3. **Ручне тестування:** кожна сесія завершується перевіркою в Chrome (popup відкривається, кнопки працюють, дані зберігаються)
4. **Git:** кожна сесія — окремий коміт `refactor(phase-X): description`. Провалилася сесія — відкотили один коміт, а не змішаний диф на 5 файлів
5. **Після сесії:** відмітити задачі в майстер-трекері TASKS.md
