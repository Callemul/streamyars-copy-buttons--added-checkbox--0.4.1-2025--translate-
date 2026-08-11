/**
 * StreamYard Helper — точкові оновлення DOM-тексту та розмітки.
 *
 * Виокремлено з `ui_shared_utils.ts`. Обидва оновлювачі свідомо «ліниві»:
 * запис відбувається ЛИШЕ якщо значення реально змінилося. Це не мікро-оптимізація,
 * а захист від нескінченних циклів `MutationObserver → перерендер → мутація`,
 * бо лічильники вкладок оновлюються з обробників тих самих мутацій.
 */

/** Оновлює `textContent` знайденого елемента, якщо текст відрізняється. */
export function safeTextUpdate(selector: string, newText: string): void {
    const el = document.querySelector(selector);
    if (el && el.textContent !== newText) el.textContent = newText;
}

/** Оновлює `innerHTML` переданого елемента, якщо розмітка відрізняється. */
export function safeHtmlUpdate(el: Element | null, newHtml: string): void {
    if (el && el.innerHTML !== newHtml) el.innerHTML = newHtml;
}

/** Пакетне оновлення лічильників вкладок за мапою «селектор → текст». */
export function updateTabCounts(tabSelectorMap: Record<string, string>): void {
    for (const [selector, text] of Object.entries(tabSelectorMap)) {
        safeTextUpdate(selector, text);
    }
}
