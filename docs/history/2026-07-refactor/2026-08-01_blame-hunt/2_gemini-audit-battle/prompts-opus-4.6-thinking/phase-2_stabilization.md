# Задача: Фаза 2 — Стабілізація (3 задачі)

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 2 з 4 | **Оцінка:** ~1.5 год  
**Передумова:** Фаза 1 (критичні баги) вже виконана.  
**Мета:** Усунути потенційні витоки ресурсів та зайві storage writes.

> **Примітка:** Задача M1 (lastError checks у popup, ~1.5 год) ПРОПУСКАЄТЬСЯ — вона стане непотрібною після Фази 3, де popup мігрує на SYH_STORAGE адаптер, який вже має вбудовану обробку lastError.

---

## ⚠️ Порядок виконання

Всі 3 задачі **незалежні** — порядок довільний.

---

## M3: `setInterval(1000)` без cleanup у SPA навігації

**Файл:** `youtube/studio/studio_content.ts` (рядки ~45-65)  
**Складність:** 🟢 Проста (~30 хв)

**Проблема:** `setInterval` для SPA path change detection ніколи не очищується. При навігації "з YouTube Studio і назад" — створюються множинні інтервали.

**Рішення:**
```typescript
private pollInterval: number | null = null;

setupSPAListeners() {
    // Захист від подвійного виклику
    if (this.pollInterval !== null) return;
    this.pollInterval = window.setInterval(() => this.checkPathChange(), 1000);
}

stopModule() {
    if (this.pollInterval !== null) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
    }
}
```

**Критерії приймання:**
- [ ] `stopModule()` зупиняє polling
- [ ] Повторний `setupSPAListeners()` не створює другий інтервал

---

## L6: MutationObserver без `disconnect()` при zombie context

**Файл:** `main.ts`  
**Складність:** 🟢 Проста (~30 хв)

**Проблема:** Після оновлення/перевстановлення розширення, старий content script продовжує спостерігати DOM як "зомбі" — `chrome.runtime` стає `undefined`, але MutationObserver працює далі.

**Рішення:** При виявленні `chrome.runtime?.id === undefined` — викликати `observer.disconnect()` і зупинити всі модулі.

```typescript
// Додати перевірку на початку MutationObserver callback:
const observer = new MutationObserver((mutations) => {
    if (!chrome.runtime?.id) {
        observer.disconnect();
        // Зупинити всі активні модулі
        return;
    }
    // ... існуюча логіка
});
```

**Критерії приймання:**
- [ ] Після оновлення розширення старий content script не продовжує спостерігати DOM
- [ ] Нові mutations обробляються тільки актуальним content script

---

## L7: Un-debounced storage writes на keystroke

**Файл:** `popup/popup_init.js` (рядки ~232-246)  
**Складність:** 🟢 Проста (~30 хв)

**Проблема:** Кожне натискання клавіші у input-полях popup викликає `chrome.storage.local.set()` — десятки зайвих записів при швидкому друці.

**Рішення:**
```javascript
let saveTimer = null;
input.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveToStorage(input.value), 300);
});
```

**Критерії приймання:**
- [ ] Storage write відбувається не частіше ніж раз у 300ms при швидкому друці
- [ ] Збережене значення відповідає фінальному стану input

---

## ✅ Верифікація після КОЖНОЇ задачі

```bash
npm run lint && npm run test && npm run build
```

**⚠️ НЕ чіпати файли, що не стосуються цих 3 задач.**
