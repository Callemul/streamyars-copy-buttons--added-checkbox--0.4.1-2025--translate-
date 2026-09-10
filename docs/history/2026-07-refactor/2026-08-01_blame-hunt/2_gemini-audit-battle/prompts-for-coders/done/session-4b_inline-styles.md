# Сесія 4B — Inline-стилі модальних вікон → CSS класи (L3)

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1–3 виконані.
Верифікація: `npm run lint && npm run test && npm run build` + візуальна перевірка модальних вікон.

## Скоуп
Читай і змінюй ТІЛЬКИ: `modules/info_modal.ts`, `modules/stats_exporter.ts` + новий файл `modules/modal_styles.css` (+ імпорт CSS у відповідний entry point)
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кількість inline-присвоєнь до → після
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## Проблема
Модальні вікна створюються програмно з ~200+ присвоєнь `el.style.X = Y`. Код нечитабельний, стилі неможливо перевизначити, немає консистентності.

## Крок 1: Створити CSS файл

Створи `modules/modal_styles.css`. Всі класи з prefix `syh-` (уникнення колізій з хост-сторінкою):

```css
.syh-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.syh-modal-content {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
}

.syh-modal-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
}

/* ... решта класів за фактичними стилями з коду */
```

> ⚠️ Не вигадуй стилі «від себе» — переноси ТОЧНІ значення з існуючих inline-присвоєнь. Візуальний вигляд має бути ІДЕНТИЧНИМ.

## Крок 2: Замінити inline-присвоєння на класи

```typescript
// ❌ БУЛО:
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.right = '0';
overlay.style.bottom = '0';
overlay.style.background = 'rgba(0,0,0,0.5)';
overlay.style.zIndex = '9999';

// ✅ СТАЛО:
overlay.classList.add('syh-modal-overlay');
```

## Крок 3: Винятки — динамічні значення

Inline `style` дозволений ТІЛЬКИ для динамічних значень, які неможливо виразити класом:

```typescript
// ✅ Дозволено (динамічна ширина графіка, позиція, тощо):
chartEl.style.width = `${computedWidth}px`;
```

## Крок 4: Підключити CSS

Імпортуй `modal_styles.css` у Vite entry point (або додай у `content_scripts.css` у manifest — перевір, як підключені існуючі стилі проєкту, і зроби так само).

---

## Приймання
- [ ] 0 inline `style`-присвоєнь у `info_modal.ts` і `stats_exporter.ts` (окрім динамічних значень)
- [ ] Всі CSS класи мають prefix `syh-`
- [ ] Візуальний вигляд модальних вікон ІДЕНТИЧНИМ попередньому (порівняти скріншотами до/після)
- [ ] Стилі не ламають хост-сторінку і не ламаються нею (перевірити на streamyard.com і studio.youtube.com)
- [ ] `npm run build` чисто
