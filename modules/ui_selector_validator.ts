/**
 * StreamYard Helper — синтаксична валідація CSS-селекторів конфігурації.
 *
 * Винесено з `modules/ui.ts` (ціль №1 у `fallow health --targets`:
 * 175 LOC, fan-in 7, fan-out 8, щільність складності 0.38 при порозі 0.3).
 *
 * Поведінка збережена 1-в-1 з оригіналом `SYH_UI.validateSelectorsSyntax`:
 *   • відсутні SELECTORS  -> тихий вихід без звернень до DOM;
 *   • порожнє значення     -> ключ пропускається;
 *   • невалідний селектор  -> `console.error`, але сканування триває далі.
 */

import { SYH_UI_STATE } from './ui_state';

export function validateSelectorsSyntax(): void {
    if (!SYH_UI_STATE.SELECTORS) return;
    console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");
    for (const key in SYH_UI_STATE.SELECTORS) {
        const selector = SYH_UI_STATE.SELECTORS[key];
        if (!selector) continue;
        try {
            // `SelectorValue` — це `string | string[]`. Оригінал передавав масив
            // у `querySelector` як є, покладаючись на неявне зведення до рядка
            // ('.a,.b' — валідна CSS-група). `String(...)` робить те саме
            // перетворення явним: рантайм не змінюється, тип сходиться.
            document.querySelector(String(selector));
        } catch (e) {
            console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
        }
    }
}
