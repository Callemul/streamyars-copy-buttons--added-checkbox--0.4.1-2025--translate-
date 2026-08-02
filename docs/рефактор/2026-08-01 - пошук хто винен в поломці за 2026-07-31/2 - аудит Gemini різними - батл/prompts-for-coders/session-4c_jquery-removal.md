# Сесія 4C — Видалення jQuery → нативний DOM API (L4)

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1–3 виконані.
Верифікація: `npm run lint && npm run test && npm run build` + ручна перевірка content scripts на живих сторінках.

## Скоуп
Читай і змінюй ТІЛЬКИ: файли, знайдені на Кроці 0 (інвентаризація), + `manifest.json` і `popup/jquery.js` (видалення — тільки за умови, див. Крок 3).
Аудит вказує на `modules/ui_*.ts`, `modules/event_*.ts` — але фактичний список визначає Крок 0.
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Крок 0: повний список файлів з jQuery + кількість викликів у кожному
- Змінено: `файл` → `функція/блок`, кількість jQuery-викликів до → після
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## Крок 0: Інвентаризація jQuery (ОБОВ'ЯЗКОВИЙ, до будь-яких змін)

Виконай пошук і запиши результат у звіт:

```bash
grep -rn "jQuery\|\\$(\|\\$\\." --include="*.ts" --include="*.js" --include="*.html" --include="*.json" .
```

(виключи `node_modules`, `dist`, легітимні `$` у template literals `${...}` і regex)

Зафіксуй: які файли використовують jQuery, скільки викликів у кожному, звідки jQuery підключається (`manifest.json` content_scripts? `popup.html` `<script>`? npm-пакет?).

> Якщо jQuery знайдено у файлах поза `modules/` (наприклад, у popup) — НЕ мігруй їх у цій сесії, доповісти. Пріоритет сесії — content scripts.

## Крок 1: Міграція по одному файлу

Порядок: від файлу з найменшою кількістю jQuery-викликів до найбільшої.

Після КОЖНОГО файлу: `npm run build` + перевірка, що файл більше не містить `$(` чи `jQuery`.

### Таблиця відповідності jQuery → нативний API

```typescript
// ❌ $(document).ready(fn)
// ✅ document.addEventListener('DOMContentLoaded', fn)
//    або якщо script з defer / в кінці body — просто викликати fn()

// ❌ $('#btn').on('click', handler)
// ✅ document.getElementById('btn')?.addEventListener('click', handler)

// ❌ $(document).on('click', '.selector', handler)   // делегування
// ✅ document.addEventListener('click', (e) => {
//        const target = (e.target as HTMLElement).closest('.selector');
//        if (target) handler(e);
//    });

// ❌ $('.items').each(function() { ... })
// ✅ document.querySelectorAll('.items').forEach(el => { ... })

// ❌ $('#el').text('value')
// ✅ document.getElementById('el')!.textContent = 'value'

// ❌ $('#el').html('<div>...</div>')
// ✅ document.getElementById('el')!.innerHTML = '<div>...</div>'

// ❌ $('#el').val()
// ✅ (document.getElementById('el') as HTMLInputElement).value

// ❌ $('#el').addClass('x') / .removeClass('x') / .toggleClass('x')
// ✅ el.classList.add('x') / .remove('x') / .toggle('x')

// ❌ $('#el').show() / .hide()
// ✅ el.style.display = '' / el.style.display = 'none'
//    (або краще: classList.toggle('syh-hidden') з CSS .syh-hidden { display: none; })

// ❌ $('#el').attr('data-id') / .attr('data-id', value)
// ✅ el.getAttribute('data-id') / el.setAttribute('data-id', value)

// ❌ $('#el').data('id')
// ✅ el.dataset.id

// ❌ $('#el').append(htmlString)
// ✅ el.insertAdjacentHTML('beforeend', htmlString)

// ❌ $('#el').find('.child')
// ✅ el.querySelector('.child') / el.querySelectorAll('.child')

// ❌ $('#el').parent() / .closest('.ancestor')
// ✅ el.parentElement / el.closest('.ancestor')

// ❌ $('#el').remove()
// ✅ el.remove()
```

## Крок 2: Повторна інвентаризація

Після міграції всіх content scripts — повтори пошук з Кроку 0.

## Крок 3: Видалення jQuery (УМОВНЕ!)

Видаляй jQuery ТІЛЬКИ якщо Крок 2 показує **0 використань у всьому проєкті**:

1. `manifest.json` — прибрати `jquery.js` з `content_scripts.js` (якщо там є)
2. Видалити файл `popup/jquery.js` — **ТІЛЬКИ якщо жоден popup-файл його не використовує** (перевір і `popup.html` на `<script src=`)
3. Якщо jQuery — npm-пакет: `npm uninstall jquery`

> ⚠️ Якщо використання лишились (наприклад, у popup) — НЕ видаляй `popup/jquery.js`. Доповідь: де лишилось, скільки викликів. Видалення jQuery відкладається.

## Крок 4: Ручна перевірка на живих сторінках

- [ ] streamyard.com — кнопка збору коментарів працює, overlay відображається
- [ ] studio.youtube.com — кнопка експорту працює, прогрес відображається
- [ ] popup — всі вкладки, кнопки, списки працюють як раніше

> Нативний DOM API може мати subtle відмінності від jQuery (наприклад, `text()` vs `textContent` щодо прихованих елементів, `.val()` vs `.value`). Перевіряй поведінку, а не тільки компіляцію.

---

## Приймання
- [ ] Звіт Кроку 0 містить повну інвентаризацію (файли + кількість викликів)
- [ ] 0 jQuery-викликів у content scripts (`modules/`)
- [ ] `popup/jquery.js` видалено АБО задокументовано, чому лишився (з кількістю використань)
- [ ] `manifest.json` не посилається на jquery (якщо видалено)
- [ ] Bundle size зменшився (вивід `npm run build`) — якщо jQuery видалено
- [ ] Всі content scripts працюють на живих сторінках
- [ ] `npm run lint && npm run test && npm run build` чисто
