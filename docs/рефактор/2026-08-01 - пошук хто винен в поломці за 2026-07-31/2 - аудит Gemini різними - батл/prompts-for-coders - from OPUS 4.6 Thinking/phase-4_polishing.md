# Задача: Фаза 4 — Шліфування (4 задачі)

**Проєкт:** StreamYard Helper Chrome Extension (Manifest V3, Vite + TypeScript)  
**Фаза:** 4 з 4 (фінальна) | **Оцінка:** ~8 год  
**Передумова:** Фази 1-3 вже виконані.  
**Мета:** Технічний борг: строгий TS, прибирання inline styles, jQuery, observer throttling.

---

## ⚠️ Порядок виконання

Всі 4 задачі **незалежні** — порядок довільний. Рекомендую починати з L1 (strict mode), бо воно виявить потенційні баги в інших файлах.

---

## L1: `tsconfig.json` → `strict: true`

**Файл:** `tsconfig.json` + всі `.ts` файли проєкту  
**Складність:** 🟡 Середня (~2 год — виправити всі type errors)

**Зараз:** `strict: false` (або відсутній) — TypeScript не перевіряє null, undefined, implicit any.

**Рішення:**
1. У `tsconfig.json` встановити `"strict": true`
2. Запустити `npm run build` — зібрати всі помилки
3. Виправити type errors **по одному файлу** (додати типи, null-checks, assertions)

**Стратегія виправлення:**
```typescript
// Типові помилки та їх виправлення:

// 1. Parameter 'x' implicitly has an 'any' type
// ❌ function process(data) { ... }
// ✅ function process(data: CommentData) { ... }

// 2. Object is possibly 'null'
// ❌ document.querySelector('.btn').click()
// ✅ document.querySelector('.btn')?.click()

// 3. Type 'string | undefined' is not assignable to type 'string'
// ❌ const name: string = el.textContent
// ✅ const name: string = el.textContent ?? ''
```

**Критерії приймання:**
- [ ] `tsconfig.json` містить `"strict": true`
- [ ] `npm run build` проходить без помилок
- [ ] Жодних `// @ts-ignore` або `as any` як обхідних рішень (мінімум)

---

## L3: ~200+ inline-стилів у модальних вікнах → CSS класи

**Файли:** `modules/info_modal.ts`, `modules/stats_exporter.ts`  
**Складність:** 🟡 Середня (~2 год)

**Проблема:** Модальні вікна створюються програмно з сотнями `el.style.X = Y` — код нечитабельний, неможливо перевизначити стилі, немає консистентності.

**Рішення:**
1. Створити CSS файл `modules/modal_styles.css` (або додати до існуючого)
2. Визначити CSS класи для всіх елементів модальних вікон:
```css
.syh-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; }
.syh-modal-content { background: #fff; border-radius: 8px; padding: 24px; max-width: 600px; margin: auto; }
.syh-modal-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
/* ... */
```
3. Замінити в TS: `el.style.position = 'fixed'` → `el.classList.add('syh-modal-overlay')`
4. Імпортувати CSS у Vite entry point

**Критерії приймання:**
- [ ] 0 inline `style` присвоєнь у модальних модулях (або мінімум — тільки динамічні значення типу `width`)
- [ ] Візуальний вигляд модальних вікон **ідентичний** попередньому
- [ ] CSS класи мають prefix `syh-` для уникнення колізій з хост-сторінкою

---

## L4: jQuery → нативний DOM API

**Файли:** `modules/ui_*.ts`, `modules/event_*.ts`  
**Складність:** 🟡 Середня (~3 год, поступово)

**Проблема:** jQuery використовується в content scripts, що додає ~90KB до кожної сторінки де активне розширення.

**Таблиця замін:**

| jQuery | Native DOM |
|:-------|:-----------|
| `$(selector)` | `document.querySelector(selector)` |
| `$(selector).each(fn)` | `document.querySelectorAll(selector).forEach(fn)` |
| `$(el).on('click', fn)` | `el.addEventListener('click', fn)` |
| `$(el).off('click')` | `el.removeEventListener('click', fn)` |
| `$(el).addClass('x')` | `el.classList.add('x')` |
| `$(el).html(str)` | `el.innerHTML = str` |
| `$(el).text(str)` | `el.textContent = str` |
| `$(el).val()` | `(el as HTMLInputElement).value` |
| `$(el).show()` / `.hide()` | `el.style.display = '' / 'none'` |
| `$(el).attr('x', 'y')` | `el.setAttribute('x', 'y')` |
| `$.ajax(...)` | `fetch(...)` |
| `$(document).ready(fn)` | `document.addEventListener('DOMContentLoaded', fn)` |

**Стратегія:**
1. Почати з файлів, де jQuery використовується мінімально
2. Перевірити чи jQuery підключається в manifest.json/popup.html — видалити після повної міграції
3. НЕ видаляти jQuery з popup, якщо він там ще використовується — тільки з content scripts

**Критерії приймання:**
- [ ] jQuery не завантажується на StreamYard/YouTube сторінках
- [ ] Всі `$()` виклики замінені на нативні DOM API у content scripts
- [ ] Функціональність ідентична попередній

---

## L8: `stats_tracker.ts` — MutationObserver без throttling + setInterval без clear

**Файл:** `modules/stats_tracker.ts`  
**Складність:** 🟡 Середня (~1 год)

**Проблема:**
1. MutationObserver callback спрацьовує на кожну DOM-мутацію без обмежень — при великій кількості змін (наприклад, оновлення чату) це десятки callback/sec
2. `setInterval` не зберігає ID → неможливо очистити

**Рішення:**
```typescript
// 1. Throttling для MutationObserver:
let pendingRAF: number | null = null;

const observer = new MutationObserver(() => {
    if (pendingRAF) return;
    pendingRAF = requestAnimationFrame(() => {
        pendingRAF = null;
        processNewMutations();  // Основна логіка
    });
});

// 2. Збереження interval ID:
private statsInterval: number | null = null;

startTracking() {
    this.statsInterval = window.setInterval(() => this.collectStats(), 5000);
}

destroy() {
    if (this.statsInterval !== null) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
    }
    if (pendingRAF) {
        cancelAnimationFrame(pendingRAF);
        pendingRAF = null;
    }
    observer.disconnect();
}
```

**Критерії приймання:**
- [ ] MutationObserver callback спрацьовує не частіше 1 раз на animation frame
- [ ] `setInterval` ID зберігається та коректно очищується у `destroy()`
- [ ] `observer.disconnect()` викликається при cleanup

---

## ✅ Верифікація після КОЖНОЇ задачі

```bash
npm run lint && npm run test && npm run build
```

**⚠️ Для L4 (jQuery removal): обов'язково перевірити розширення на РЕАЛЬНИХ сторінках (StreamYard, YouTube Studio) — нативний DOM API може мати subtle відмінності від jQuery.**
