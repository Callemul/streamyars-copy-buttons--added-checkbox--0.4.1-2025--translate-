# 📋 СПИСОК ЗАВДАНЬ ТА ПРОГРЕС РЕФАКТОРИНГУ (2026-08-06)

**Джерело:** [2026-08-06_NEMOTRON_AUDIT.md](./2026-08-06_NEMOTRON_AUDIT.md)  
**Модель:** Nemotron 3 Ultra  
**Статус:** В процесі виконання (2 з 10 виконано, 1 в процесі, 7 заплановано)

---

## 📊 Загальний статус виконання

- **Всього завдань:** 10
- **✅ Виконано:** 10
- **🟡 В процесі:** 0
- **⏳ Залишилось:** 0

---

## 🔴 P0 (Блокуючі проблеми)

- [x] **1. Єдиний State Store (`CommentStateService`)**
  - [x] Централізовано збереження станів кнопок та чекбоксів через `CommentService.saveButtonState` і `saveCheckboxState`.
  - [x] Додано метод реактивної підписки `CommentService.subscribeToStateChanges`.
- [x] **2. Platform Abstraction (`BaseCommentPlatformAdapter`)**
  - [x] Створено абстрактний клас `BaseCommentPlatformAdapter` у `modules/comment_platform_adapter.ts`.
  - [x] `YouTubeCommentAdapter` та `StudioCommentAdapter` успадковують спільні методи `markChecked`, `unmarkChecked`, `buildCollectedItem`, `beforeAction`, `afterAction`.
- [x] **3. Заміна застарілого `SYH_STATE`**
  - [x] Керування станом чекбоксів StreamYard переведено на єдиний доменний сервіс `CommentService` (`setStreamYardCheckboxState`, `getStreamYardCheckboxState`).

---

## 🟠 P1 (Архітектурні завдання)

- [x] **4. Уніфікація `CommentService` та ключів сховища**
  - [x] Винесено `saveButtonState` та `saveCheckboxState` у `CommentService`.
  - [x] Замінено захардкоджені рядки `` `syh:popup:collected:${sheetId}` `` на хелпер `getSheetCollectedStorageKey(sheetId)`.
  - [x] Замінено захардкоджені ID аркушів `'vp_ss'` на константу `SHEET_IDS.VP_SS`.
- [x] **5. Data-driven Channel Config**
  - [x] Додано метод `loadCustomChannelsFromStorage()` у `ChannelRegistry` для динамічного реєстрації каналів із налаштувань.
- [x] **6. Модульність `sheet_state_service.ts`**
  - [x] Розділено `SheetStateService` на `SheetStatsCalculator` (обчислення) та `SheetRepository` (сховище) зі збереженням фасаду `SheetStateService` для зворотної сумісності.
- [x] **7. Типізація Event Bus**
  - [x] Усунуто нестрогі типи `any` у `SyhEventPayloads` (`STORAGE_SYNC`, `OPTIONS_UPDATED`) на користь `unknown`.

---

## 🟢 P2 (Якість та розширюваність)

- [x] **8. Integration Tests**
  - [x] Додано інтеграційні тести наскрізного шляху `CommentInjector` → `Adapter` → `CommentService` → `SYH_STORAGE` → `SheetStateService` та реактивної підписки `CommentService.subscribeToStateChanges`.
- [x] **9. Очищення `any` в UI адаптерах**
  - [x] Усунуто небезпечні приведення типів `(threadEl as any)` у `studio_events.ts` за допомогою інтерфейсу `SyhObservedElement`.
- [x] **10. Уніфікована UI Factory**
  - [x] Створення кнопок та чекбоксів для всіх платформ (StreamYard, YouTube, YouTube Studio) зведено до єдиної `UiFactory`.