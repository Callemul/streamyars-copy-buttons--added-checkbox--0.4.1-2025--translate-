/**
 * StreamYard Helper — відновлення стану чекбоксів у DOM.
 *
 * Винесено з `modules/ui.ts` (ціль №1 у `fallow health --targets`).
 * Раніше `getCheckboxTextKey` був приватною функцією фасаду і не мав тестів;
 * тут він експортується як самостійна одиниця, а `applyCheckboxStates`
 * приймає залежності явно, тож гілку «немає селекторів» нарешті видно з тестів.
 *
 * Поведінка збережена 1-в-1 з оригіналом `SYH_UI.restoreDomCheckboxes`:
 *   • джерело селекторів  — `SYH_UI_STATE.SELECTORS`, інакше `SYH_CONFIG.SELECTORS`;
 *   • джерело станів      — `SYH_UI_STATE.STATE.itemStates`, інакше `{}`;
 *   • порожній textKey    — чекбокс не чіпаємо взагалі;
 *   • непорожній textKey  — завжди перетираємо `checked` (у т.ч. на false).
 */

import { SYH_CONFIG, closestBySelectorValue, queryBySelectorValue, type SelectorValue } from '../../config';
import { SYH_UI_STATE } from './ui_state';

/**
 * Текст елемента, до якого прив'язаний чекбокс. Саме він є ключем у
 * `itemStates`, тому порожній рядок означає «стан застосовувати нікуди».
 *
 * ВАЖЛИВО: ключ читається тим самим пріоритетним перебором `SelectorValue`,
 * що й на write-path (`handleCheckboxChange`, `applyCommentActionState` →
 * `action_dom_sync`). Раніше read-path брав лише `resolveFirstSelector` ([0])
 * і мав власні `DEFAULT_*`-фолбеки, тому на лейаутах StreamYard із
 * fallback-розміткою записаний стан ніколи не відновлювався. Див. аудит
 * `audit_2026-08-10_KILO_checkbox-text-key-mismatch`.
 */
export function getCheckboxTextKey(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue>
): string {
    const type = checkbox.dataset.type;

    if (type === 'comment') {
        const commentBlock = closestBySelectorValue(checkbox, selectors.commentBlock);
        if (!commentBlock) return "";
        return queryBySelectorValue(selectors.commentText, commentBlock)?.textContent || "";
    }
    if (type === 'banner') {
        const bannerBlock = closestBySelectorValue(checkbox, selectors.bannerBlock);
        if (!bannerBlock) return "";
        return queryBySelectorValue(selectors.bannerText, bannerBlock)?.textContent || "";
    }
    return "";
}

/** Проганяє всі `.syh-checkbox` у документі й синхронізує їх зі збереженим станом. */
export function applyCheckboxStates(
    selectors: Record<string, SelectorValue> | null | undefined,
    itemStates: Record<string, boolean>
): void {
    if (!selectors) {
        console.warn("[SYH_UI] Конфігурація SELECTORS ще не завантажена.");
        return;
    }

    console.log("[SYH_UI] Відновлення стану чекбоксів у DOM...");

    document.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach((checkbox) => {
        const textKey = getCheckboxTextKey(checkbox, selectors);
        if (textKey) {
            checkbox.checked = !!itemStates[textKey];
        }
    });
}

/** Зв'язка з єдиним джерелом правди — саме її експонує `SYH_UI`. */
export function restoreDomCheckboxes(): void {
    applyCheckboxStates(
        SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS,
        SYH_UI_STATE.STATE?.itemStates || {}
    );
}
