# Список задач з рефакторингу (на основі аудіту Fallow 2026-08-06)

## 📌 1. Декомпозиція гігантських функцій (Large Functions)
- [x] **TASK-01:** Рефакторинг `popup/popup_init.ts` → `initPopup` (612 рядків). Розбити на ізольовані модулі ініціалізації UI, підписки на події та завантаження початкових даних.
- [x] **TASK-02:** Декомпозиція `modules/event_comments.ts` → `bindEvents` (274 рядки).
- [x] **TASK-03:** Рефакторинг `popup/popup_prayers.ts` → `renderPrayers` (231 рядок) та `initPopupPrayersListeners` (226 рядків).
- [x] **TASK-04:** Оптимізація `modules/telegram_parser.ts` → `parseAndFilterOldList` (212 рядків).

## ⚡ 2. Зниження цикломатичної та когнітивної складності (High Complexity / CRAP)
- [x] **TASK-05:** Оптимізація анонімної функції у `popup/popup_init.ts` (L152): зменшення цикломатичної (54) та когнітивної (71) складності.
- [x] **TASK-06:** Спрощення логіки `processTelegramData` у `popup/popup_telegram.ts` (cyclomatic 43, cognitive 41).
- [x] **TASK-07:** Рефакторинг складності в `modules/event_banners.ts` (L81, cyclomatic 42).
- [x] **TASK-08:** Спрощення фільтрації `filterStarredComments` у `modules/ui_comments.ts` та `filterBanners` у `modules/ui_banners.ts`.

## 🔄 3. Усунення дублювання коду (Code Duplication)
- [x] **TASK-09:** Виділення спільного модуля для `modules/ui_banners.ts` та `modules/ui_comments.ts` (4 групи дублікатів, 75 рядків).
- [x] **TASK-10:** Винесення дубльованої функції зі `storage.ts` у спільний хелпер.

## 🔗 4. Архітектурні покращення та очищення
- [x] **TASK-11:** Знаходження та усунення циклічної залежності (1 circular dependency).
- [x] **TASK-12:** Очищення невикористовуваного коду (2.2% dead files).
