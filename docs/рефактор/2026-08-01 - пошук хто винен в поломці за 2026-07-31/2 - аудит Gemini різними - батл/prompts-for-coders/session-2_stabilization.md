# Сесія 2 — Стабілізація: clearInterval + observer disconnect

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1 (критичні баги) вже виконані.
Верифікація: `npm run lint && npm run test && npm run build`

## Скоуп
Читай і змінюй ТІЛЬКИ: `youtube/studio/studio_content.ts`, `main.ts`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

> ℹ️ **Чому тут немає M1 (lastError checks у popup) і L7 (debounce input)?**
> M1 свідомо пропущена: у Фазі 3 popup мігрує на адаптер SYH_STORAGE, який вже має вбудовану обробку `chrome.runtime.lastError` — окремі перевірки стануть зайвими.
> L7 перенесена в сесію 3A (файл `popup_init` там повністю переписується на TS — робити debounce двічі марно).

## M3: setInterval без cleanup у SPA навігації (~30 хв)

**Файл:** `youtube/studio/studio_content.ts` (~рядки 45-65)

**Проблема:** `setInterval` для SPA path detection ніколи не очищується. При навігації "з YouTube Studio і назад" — множинні інтервали.

```typescript
// ✅ РІШЕННЯ:
private pollInterval: number | null = null;

setupSPAListeners() {
    if (this.pollInterval !== null) return; // захист від подвійного виклику
    this.pollInterval = window.setInterval(() => this.checkPathChange(), 1000);
}

stopModule() {
    if (this.pollInterval !== null) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
    }
}
```

**Приймання:**
- [ ] `stopModule()` зупиняє polling
- [ ] Повторний `setupSPAListeners()` не створює другий інтервал

---

## L6: MutationObserver без disconnect() при zombie context (~30 хв)

**Файл:** `main.ts`

**Проблема:** Після оновлення розширення старий content script — "зомбі": `chrome.runtime` стає undefined, але observer працює далі.

```typescript
// ✅ РІШЕННЯ — перевірка на початку callback:
const observer = new MutationObserver((mutations) => {
    if (!chrome.runtime?.id) {
        observer.disconnect();
        // зупинити всі активні модулі
        return;
    }
    // ... існуюча логіка
});
```

**Приймання:**
- [ ] Після оновлення розширення старий content script зупиняє спостереження
- [ ] Нові mutations обробляє тільки актуальний content script
