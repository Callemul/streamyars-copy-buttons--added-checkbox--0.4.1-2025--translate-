# План рефакторингу StreamYard Helper

## Фаза 1: Критичні баги (P0)
- [Сесія 1A: Memory leak cleanup](session-1a_memory-leak.md)
- [Сесія 1B: Stale closure fix](session-1b_stale-closure.md)
- [Сесія 1C: JSON.parse safety](session-1c_json-parse.md)
- [Сесія 1D: eval() → JSON5](session-1d_eval-removal.md)
- [Сесія 1E: Global namespace](session-1e_global-namespace.md)

## Фаза 2: Стабілізація (P1)
- [Сесія 2A: lastError checks](session-2a_last-error.md)
- [Сесія 2B: Storage adapter SYH_STORAGE](session-2b_storage-adapter.md)
- [Сесія 2C: Interval cleanup](session-2c_interval-cleanup.md)

## Фаза 3: Архітектура (P2)
- [Сесія 3A: popup_init JS→TS](session-3a_popup-init.md)
- [Сесія 3B: popup_telegram JS→TS](session-3b_popup-telegram.md)
- [Сесія 3C: popup_prayers JS→TS](session-3c_popup-prayers.md)
- [Сесія 3D: Storage namespacing](session-3d_storage-namespacing.md)

## Фаза 4: Полірування (P3)
- [Сесія 4A: TypeScript strict mode](session-4a_strict-mode.md)
- [Сесія 4B: Inline styles → CSS](session-4b_inline-styles.md)
- [Сесія 4C: jQuery removal](session-4c_jquery-removal.md)
- [Сесія 4D: Naming + observers](session-4d_naming-cleanup.md)

## Загальні вимоги
1. **Формат звіту:** Після кожної сесії — таблиця змінених файлів, статус критеріїв приймання, повний вивід `npm run lint && npm run test && npm run build`
2. **Зупинка при розбіжностях:** Якщо код не збігається з описом у сесії — зупинитися і доповісти, не вигадувати рішення
3. **Ручне тестування:** Кожна сесія завершується перевіркою в Chrome (popup відкривається, кнопки працюють, дані зберігаються)
4. **Git:** Кожна сесія — окремий коміт з повідомленням формату `refactor(phase-X): description`

## Порядок виконання
Строго послідовно: 1A → 1B → ... → 4D. Не пропускати фази, бо пізніші сесії залежать від раніших (наприклад, 3D вимагає SYH_STORAGE з 2B).
