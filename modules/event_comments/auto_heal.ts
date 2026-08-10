// modules/event_comments/auto_heal.ts
//
// Auto-Heal: періодичне вирівнювання нашого стану з тим, що реально показує
// StreamYard. Складається з двох незалежних проходів, які тепер живуть окремо:
//   - `./auto_heal_cover_buttons` — коментарі, приховані платформою;
//   - `./auto_heal_ghosts`        — записи в базі без зірки в UI.
//
// Тут лишився лише життєвий цикл сканера: guard на живий runtime розширення,
// реєстрація в `SYH_DOM_OBSERVER` та батчинг проходів через один кадр
// анімації. Поведінка збережена 1-в-1
// (`tests/event_comments_auto_heal.test.js`,
//  `tests/event_comments_auto_heal_scanner.test.js`).

import type { SyhEventComments } from './types';
import { resolveSelectorString } from '../config';
import { SYH_DOM_OBSERVER } from '../dom_observer';
import { processCoverButtons } from './auto_heal_cover_buttons';
import { processGhostComments } from './auto_heal_ghosts';

/** Фолбек-селектор блоку коментаря, коли конфіг його не задає. */
const FALLBACK_COMMENT_SELECTOR = '[class*="PlatformComment__Wrap"]';

/**
 * Чи живий контекст розширення.
 *
 * Після перезавантаження/оновлення розширення `chrome.runtime.id` зникає, і
 * будь-яке звернення до API кидає «Extension context invalidated».
 */
function isExtensionRuntime(): boolean {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

export function runAutoHeal(self: SyhEventComments): void {
    if (!isExtensionRuntime()) {
        if (self.autoHealObserver) {
            self.autoHealObserver.disconnect();
        }
        return;
    }

    processCoverButtons(self);
    processGhostComments(self);
}

/**
 * Згортає серію мутацій DOM в один прохід за кадр.
 * На прихованій вкладці кадрів немає — робота просто пропускається.
 */
function createFrameBatchedTrigger(self: SyhEventComments): () => void {
    let rafScheduled = false;

    return () => {
        if (document.hidden) return;
        if (rafScheduled) return;

        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            runAutoHeal(self);
        });
    };
}

export function bindAutoHealScanner(self: SyhEventComments): void {
    if (self.unregisterAutoHeal) {
        self.unregisterAutoHeal();
        self.unregisterAutoHeal = null;
    }

    const commentSelector = resolveSelectorString(self.SELECTORS?.commentBlock)
        || FALLBACK_COMMENT_SELECTOR;

    const triggerAutoHeal = createFrameBatchedTrigger(self);

    self.unregisterAutoHeal = SYH_DOM_OBSERVER.register(
        commentSelector,
        () => triggerAutoHeal(),
        () => triggerAutoHeal()
    );

    runAutoHeal(self);
}
