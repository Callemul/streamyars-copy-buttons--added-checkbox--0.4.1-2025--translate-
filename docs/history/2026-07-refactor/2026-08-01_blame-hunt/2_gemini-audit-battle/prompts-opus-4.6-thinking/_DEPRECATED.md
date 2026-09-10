# ⚠️ ЦЯ ПАПКА ЗАСТАРІЛА (DEPRECATED)

**Дата архівації:** 2026-08-02

Файли `phase-*.md` у цій папці — **перша версія** промптів для кодера (від Opus 4.6 Thinking). Вони замінені доопрацьованою структурою з урахуванням рекомендацій Kimi K3:

## ✅ Актуальні промпти: `../prompts-for-coders/`

| Старий файл (НЕ використовувати) | Актуальна заміна |
|:---------------------------------|:-----------------|
| `phase-1_critical-bugs.md` | `session-1a_studio-events.md` + `session-1b_quick-wins.md` + `session-1c_chartjs.md` |
| `phase-2_stabilization.md` | `session-2_stabilization.md` |
| `phase-3a_popup-to-ts-modules.md` + `phase-3b_popup-syh-storage.md` | злито: `session-3a_popup-init.md` + `session-3b_popup-telegram.md` + `session-3c_popup-prayers.md` |
| `phase-3c_storage-namespacing.md` | `session-3d_storage-namespacing.md` |
| `phase-4_polishing.md` | `session-4a_strict-mode.md` + `session-4b_inline-styles.md` + `session-4c_jquery-removal.md` + `session-4d_stats-tracker.md` |

## Ключові відмінності нової структури
1. Фаза 1 розбита на 3 **паралельні** сесії (по групах файлів)
2. L7 перенесено з Фази 2 у сесію 3A (файл переписується на TS — debounce двічі марно)
3. M1 пропущена (закривається адаптером SYH_STORAGE у Фазі 3)
4. H5+L5+M2 злиті в один прохід per-file (було: двічі переписувати ті самі файли)
5. Прибрані `file:///d:/...` посилання, mermaid, статус-таблиці (економія токенів)
6. Доданий хедер «Скоуп + зупинись якщо не збігається» у кожен файл

Ці файли залишені для історії. Не давати кодеру.
