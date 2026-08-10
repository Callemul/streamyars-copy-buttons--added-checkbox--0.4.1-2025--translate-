// modules/event_comments/auto_heal_ghosts.ts
//
// Прохід «привиди»: у нашій базі лишився коментар, з якого користувач уже зняв
// зірку в StreamYard. Такий запис треба прибрати і скинути візуальні мітки.
//
// Виділено з `auto_heal.ts` (Fallow 3.14: `complexity_density 0.40`).
// Поведінка збережена 1-в-1, включно з:
//   - пропуском щойно доданих коментарів (`data-syh-just-added`), щоб не
//     видалити запис, який ще не встиг отримати зірку;
//   - відкладеним на 100 мс перефільтруванням (дає DOM устоятися);
//   - логом у консоль із тим самим текстом.

import type { SyhEventComments } from './types';
import { queryBySelectorValue } from '../config';

const SYH_COMMENT_SELECTOR = '[data-syh-type="prayer"], [data-syh-type="question"]';
const JUST_ADDED_ATTR = 'data-syh-just-added';
const UNSTARRED_ARIA_VALUE = 'false';
/** Затримка перед перефільтруванням списку після зняття зірки, мс. */
const REFILTER_DELAY_MS = 100;

/**
 * Чи є блок «привидом»: наш власний коментар, у якого зірка знята,
 * і який не позначений як щойно доданий.
 */
function isGhostComment(self: SyhEventComments, commentBlock: Element): boolean {
    const starBtn = queryBySelectorValue(self.SELECTORS?.starButton, commentBlock);
    if (!starBtn || starBtn.getAttribute('aria-selected') !== UNSTARRED_ARIA_VALUE) return false;

    return commentBlock.getAttribute(JUST_ADDED_ATTR) !== 'true';
}

/** Скидає підсвічування блоку і відкладено перефільтровує список. */
function resetCommentVisuals(self: SyhEventComments, commentBlock: Element): void {
    const ui = self.UI;
    if (!ui) return;

    ui.updateCommentVisuals(commentBlock, 'none');
    if (typeof ui.filterStarredComments === 'function') {
        setTimeout(() => ui.filterStarredComments(), REFILTER_DELAY_MS);
    }
}

export function processGhostComments(self: SyhEventComments): void {
    document.querySelectorAll(SYH_COMMENT_SELECTOR).forEach((commentBlock: Element) => {
        if (!isGhostComment(self, commentBlock)) return;

        const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (!text) return;

        console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
        self.removeFromDatabase(text);

        resetCommentVisuals(self, commentBlock);
    });
}
