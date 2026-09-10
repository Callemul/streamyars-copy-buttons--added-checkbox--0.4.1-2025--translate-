/**
 * StreamYard Helper — синтаксична валідація CSS-селекторів конфігурації.
 *
 * Винесено з `modules/ui.ts` (ціль №1 у `fallow health --targets`:
 * 175 LOC, fan-in 7, fan-out 8, щільність складності 0.38 при порозі 0.3).
 *
 * Контракт сканування:
 *   • відсутні SELECTORS   -> тихий вихід без звернень до DOM;
 *   • порожнє значення     -> ключ пропускається;
 *   • масив                -> ЩЕ ОДИН РІВЕНЬ перебору: кожна альтернатива
 *                             валідується окремо (та сама семантика, що в
 *                             `resolveSelector`/`resolveSelectorAll`), порожні
 *                             члени пропускаються;
 *   • невалідний селектор  -> `console.error` із зазначенням саме винного
 *                             члена, але сканування триває далі.
 *
 * Раніше масив зводився до однієї CSS-групи (`'.a,.b'`), через що
 * `['.a', '']` давав хибний `SyntaxError` на цілий ключ, а `[':::broken', '.b']`
 * не показував, який саме селектор зламано.
 * Див. `docs/audits/active/audit_2026-08-09_KILO_selector-array-validation-false-positive.md`.
 */

import { SYH_UI_STATE } from './ui_state';
import { toSelectorList } from '../../registry/config';

export function validateSelectorsSyntax(): void {
    if (!SYH_UI_STATE.SELECTORS) return;
    console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");
    for (const key in SYH_UI_STATE.SELECTORS) {
        // `toSelectorList` — єдине джерело правди для читання `SelectorValue`:
        // рядок -> [рядок], масив -> члени без порожніх значень.
        for (const selector of toSelectorList(SYH_UI_STATE.SELECTORS[key])) {
            try {
                document.querySelector(selector);
            } catch (e) {
                console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
            }
        }
    }
}
