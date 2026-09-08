# YouTube Studio Runtime Evidence (YT-00)

**Дата:** 2026-08-30  
**Ціль:** Отримання фактичних даних з відкритої сторінки коментарів YouTube Studio через DevTools (F12) без персональних даних.

---

## 1. Загальні дані оточення

- **URL Pathname:** `/channel/UCal2OIZ3TUqzS7RU3anfZHg/comments/inbox`
- **Канал (DOM):** `#entity-label-container #entity-name`
  - Довжина назви: 13 символів
  - Хеш: `699729139` ("Время перемен")
  - `detectChannelKey` успішно визначає канал як `'vp'`.

---

## 2. Кількісні показники DOM

- **Треди (`ytcp-comment-thread`):** 10
- **Всі коментарі (`ytcp-comment`):** 12
- **Батьківські коментарі:** 10
- **Вкладені відповіді (`reply`):** 2

---

## 3. Фактична структура DOM

### Батьківський коментар (Parent Comment)
- **Тег:** `<ytcp-comment id="comment" class="style-scope ytcp-comment-thread">`
- **Атрибут `is-reply`:** відсутній (`false`)
- **Метадані автора:** тег `YT-FORMATTED-STRING`, класи `["author-text", "style-scope", "ytcp-comment"]` всередині `#metadata #name`
- **Текст коментаря:** тег `YT-FORMATTED-STRING`, `id="content-text"`, класи `["style-scope", "ytcp-comment"]`
- **Емодзі в тексті:** присутні теги `img[alt]`
- **Панель дій (Toolbar):** тег `DIV` з `id="toolbar"` всередині `YTCP-COMMENT-ACTION-BUTTONS`
- **Мініатюра відео:** тег `YTCP-COMMENT-VIDEO-THUMBNAIL`
- **Назва відео:** присутній `#video-title`
- **Посилання на відео:** `<a id="body" class="style-scope ytcp-comment-video-thumbnail">`
  - `attrHref`: `null` (у загальному інбоксі `/comments/inbox` атрибут `href` не виставляється в розмітку)
  - `propHref`: `""`
  - Фолбек за назвою відео (`videoTitle`) у `generateVideoKey` спрацьовує коректно.

### Вкладена відповідь (Reply Comment)
- **Тег:** `<ytcp-comment is-reply class="expanded-replies style-scope ytcp-comment-replies">`
- **Атрибут `id`:** `""`
- **Атрибут `is-reply`:** присутній (`true`)
- **Метадані автора:** тег `YT-FORMATTED-STRING`, класи `["author-text", "style-scope", "ytcp-comment"]` всередині `#metadata #name`
- **Текст коментаря:** тег `YT-FORMATTED-STRING`, `id="content-text"`, класи `["style-scope", "ytcp-comment"]`
- **Панель дій (Toolbar):** тег `DIV` з `id="toolbar"` всередині `YTCP-COMMENT-ACTION-BUTTONS`
- **Спадкування відео:** мініатюра відсутня безпосередньо у відповіді, успадковується від батьківського треду `closest('ytcp-comment-thread')`.

---

## 4. Висновки для архітектури

1. **Селектор автора:** Селектор `#metadata #name .author-text` є 100% точним. Перехід на послідовний fallback (YT-D3) гарантує, що він вибере цільовий текстовий вузол `YT-FORMATTED-STRING`, а не батьківський `div#name`.
2. **Панель кнопок:** `ytcp-comment-action-buttons #toolbar` є першим і точним селектором для ін'єкції кнопок.
3. **Успадкування у відповідях:** Працює надійно через пошук батьківського треду `ytcp-comment-thread`.
4. **Ідентифікація відео:** Оскільки `a#body` в інбоксі не має `href`, обов'язковим джерелом стабільності є `videoTitle` (через `#video-title`).
