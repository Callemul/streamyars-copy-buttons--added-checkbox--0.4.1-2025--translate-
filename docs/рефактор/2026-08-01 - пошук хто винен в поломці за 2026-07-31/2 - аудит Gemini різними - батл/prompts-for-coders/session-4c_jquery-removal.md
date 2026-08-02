# Сесія 4C — Видалення jQuery → нативний DOM API (L4)

## Контекст
Chrome Extension MV3, Vite + TS. Фази 1–3 виконані.
Верифікація: `npm run lint && npm run test && npm run build` + ручна перевірка content scripts на живих сторінках.

## Скоуп
Читай і змінюй ТІЛЬКИ: `modules/yt_collector.ts`, `modules/tg_importer.ts`, `modules/stats_exporter.ts`, `modules/studio_comment_exporter.ts`, `modules/studio_transcript.ts`, `manifest.json` (прибрати jquery.js), видалити `popup/jquery.js`
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь. Не вигадуй рішення.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кількість jQuery-викликів до → після (по кожному файлу)
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## Таблиця відповідності jQuery → нативний API

```typescript
// ❌ $(document).ready(fn)
// ✅ document.addEventListener('DOMContentLoaded', fn)
//    або якщо script завантажується з defer / в кінці body — просто викликати fn()

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

// ❌ $('#el').addClass('active') / .removeClass('active') / .toggleClass('active')
// ✅ document.getElementById('el')?.classList.add('active') / .remove('active') / .toggle('active')

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

## Крок 1: Міграція по одному файлу

Порядок: `yt_collector.ts` → `tg_importer.ts` → `stats_exporter.ts` → `studio_comment_exporter.ts` → `studio_transcript.ts`.

Після КОЖНОГО файлу: `npm run build` + перевірка, що файл більше не містить `$(` чи `jQuery`.

## Крок 2: Видалити jQuery з проєкту

1. `manifest.json` — прибрати `jquery.js` з `content_scripts.js` (якщо там є)
2. Видалити файл `popup/jquery.js`
3. Пошук по всьому проєкту: `grep -r "jquery\|jQuery\|\\$(" --include="*.ts" --include="*.json"` — має бути 0 результатів (окрім легітимних `$` у template literals чи regex)

## Крок 3: Ручна перевірка на живих сторінках

- [ ] streamyard.com — кнопка збору коментарів працює, overlay відображається
- [ ] studio.youtube.com — кнопка експорту працює, прогрес відображається
- [ ] popup — всі вкладки, кнопки, списки працюють як раніше

---

## Приймання
- [ ] 0 jQuery-викликів у проєкті
- [ ] `popup/jquery.js` видалено
- [ ] `manifest.json` не посилається на jquery
- [ ] Bundle size зменшився (перевірити вивід `npm run build`)
- [ ] Всі content scripts працюють на живих сторінках
- [ ] `npm run lint && npm run test && npm run build` чисто
