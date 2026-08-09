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

import { SYH_CONFIG, resolveFirstSelector, type SelectorValue } from './config';
import { SYH_UI_STATE } from './ui_state';

/** Дефолтні селектори StreamYard на випадок, коли конфіг їх не задає. */
const DEFAULT_COMMENT_BLOCK = '[class*="PlatformComment__Wrap"]';
const DEFAULT_COMMENT_TEXT = '[class*="PlatformCommentShell__ContentSpan"]';
const DEFAULT_BANNER_BLOCK = '[class*="Banner__LiWrap"]';
const DEFAULT_BANNER_TEXT = '[class*="Banner__BannerText"]';

/**
 * Текст елемента, до якого прив'язаний чекбокс. Саме він є ключем у
 * `itemStates`, тому порожній рядок означає «стан застосовувати нікуди».
 */
export function getCheckboxTextKey(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue>
): string {
    const type = checkbox.dataset.type;
    const selCommentBlock = resolveFirstSelector(selectors.commentBlock) || '';
    const selCommentText = resolveFirstSelector(selectors.commentText) || '';
    const selBannerBlock = resolveFirstSelector(selectors.bannerBlock) || '';
    const selBannerText = resolveFirstSelector(selectors.bannerText) || '';

    if (type === 'comment') {
        const commentBlock = checkbox.closest(selCommentBlock || DEFAULT_COMMENT_BLOCK);
        return commentBlock?.querySelector(selCommentText || DEFAULT_COMMENT_TEXT)?.textContent || "";
    }
    if (type === 'banner') {
        const bannerBlock = checkbox.closest(selBannerBlock || DEFAULT_BANNER_BLOCK);
        return bannerBlock?.querySelector(selBannerText || DEFAULT_BANNER_TEXT)?.textContent || "";
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
