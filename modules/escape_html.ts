// modules/escape_html.ts
//
// Централізовані хелпери екранування для безпечної інтерполяції
// користувацького введення у HTML-розмітку.
//
// Єдине джерело правди (SSOT) для екранування — використовується у
// `ui_starred_markup.ts` (value інпута) та `ui_empty_state.ts` (повідомлення
// порожнього стану), щоб усунути латентну XSS-вразливість через `searchQuery`.
// Див. docs/audits/active/audit_2026-08-09_KILO_html-injection-searchquery-xss.md

/** Екранує рядок для безпечної вставки як HTML-вміст (між тегами). */
export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Екранує рядок для безпечної вставки у значення HTML-атрибуту в подвійних
 * лапках. Той самий набір символів, що й для контенту, є безпечним і тут.
 */
export function escapeAttr(s: string): string {
    return escapeHtml(s);
}
