// modules/streamyard_comments/auto_heal_ghosts.ts
//
// Прохід «привиди»: у нашій базі лишився коментар, з якого користувач уже зняв
// зірку в StreamYard. Такий запис треба прибрати і скинути візуальні мітки.
//
// Виділено з `auto_heal.ts` (Fallow 3.14: `complexity_density 0.40`).
//
// Прохід асинхронний (див. `audit_2026-08-10_KILO_autoheal-floating-promise-refilter-race.md`):
//   - усі привиди спершу збираються в масив, і лише потім видаляються з бази;
//   - кожне видалення очікується через `Promise.allSettled` + власний `try/catch`,
//     тож відхилення storage не породжує `unhandledrejection`;
//   - візуали скидаються ПІСЛЯ фактичного оновлення бази, а перефільтрування
//     викликається РІВНО ОДИН РАЗ на прохід (раніше — N таймерів по 100 мс).
//
// Збережено 1-в-1:
//   - пропуск щойно доданих коментарів (`data-syh-just-added`), щоб не
//     видалити запис, який ще не встиг отримати зірку;
//   - пропуск блоків без тексту коментаря.

import type { SyhStreamYardComments } from './types';
import { queryBySelectorValue } from '../config';

const SYH_COMMENT_SELECTOR = '[data-syh-type="prayer"], [data-syh-type="question"]';
const JUST_ADDED_ATTR = 'data-syh-just-added';
const UNSTARRED_ARIA_VALUE = 'false';

/** Знайдений привид: блок у DOM + текст, за яким запис лежить у базі. */
interface GhostComment {
    block: Element;
    text: string;
}

/**
 * Чи є блок «привидом»: наш власний коментар, у якого зірка знята,
 * і який не позначений як щойно доданий.
 */
function isGhostComment(self: SyhStreamYardComments, commentBlock: Element): boolean {
    const starBtn = queryBySelectorValue(self.SELECTORS?.starButton, commentBlock);
    if (!starBtn || starBtn.getAttribute('aria-selected') !== UNSTARRED_ARIA_VALUE) return false;

    return commentBlock.getAttribute(JUST_ADDED_ATTR) !== 'true';
}

/** Збирає всіх привидів за один синхронний обхід DOM. */
function collectGhostComments(self: SyhStreamYardComments): GhostComment[] {
    const ghosts: GhostComment[] = [];

    document.querySelectorAll(SYH_COMMENT_SELECTOR).forEach((commentBlock: Element) => {
        if (!isGhostComment(self, commentBlock)) return;

        const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (!text) return;

        ghosts.push({ block: commentBlock, text });
    });

    return ghosts;
}

/**
 * Прибирає записи з бази і гасить кожне відхилення окремо:
 * один збій storage не має зривати обробку решти привидів.
 */
async function removeGhostsFromDatabase(self: SyhStreamYardComments, ghosts: GhostComment[]): Promise<void> {
    await Promise.allSettled(
        ghosts.map(async ({ text }) => {
            try {
                await self.removeFromDatabase(text);
            } catch (err) {
                console.warn('[SYH] Auto-Heal: не вдалося прибрати запис із бази:', err);
            }
        })
    );
}

/** Скидає підсвічування блоку; перефільтрування винесене на рівень проходу. */
function resetCommentVisuals(self: SyhStreamYardComments, commentBlock: Element): void {
    self.UI?.updateCommentVisuals(commentBlock, 'none');
}

/** Одне перефільтрування на весь прохід — замість таймера на кожен привид. */
function refilterOnce(self: SyhStreamYardComments): void {
    const ui = self.UI;
    if (!ui) return;

    if (typeof ui.filterStarredComments === 'function') {
        ui.filterStarredComments();
    }
}

export async function processGhostComments(self: SyhStreamYardComments): Promise<void> {
    const ghosts = collectGhostComments(self);
    if (ghosts.length === 0) return;

    console.log(`[SYH] Auto-Heal: Виявлено ${ghosts.length} коментар(ів) без зірки. Очищую з бази.`);

    await removeGhostsFromDatabase(self, ghosts);

    ghosts.forEach(({ block }) => resetCommentVisuals(self, block));
    refilterOnce(self);
}
