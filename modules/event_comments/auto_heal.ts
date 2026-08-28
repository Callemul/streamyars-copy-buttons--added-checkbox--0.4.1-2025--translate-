// modules/event_comments/auto_heal.ts
//
// Auto-Heal: періодичне вирівнювання нашого стану з тим, що реально показує
// StreamYard. Складається з двох незалежних проходів, які тепер живуть окремо:
//   - `./auto_heal_cover_buttons` — коментарі, приховані платформою;
//   - `./auto_heal_ghosts`        — записи в базі без зірки в UI.
//
// Тут лишився лише життєвий цикл сканера: guard на живий runtime розширення,
// реєстрація в `SYH_DOM_OBSERVER` та батчинг проходів через один кадр
// анімації (`tests/event_comments_auto_heal.test.js`,
//  `tests/event_comments_auto_heal_scanner.test.js`).
//
// `runAutoHeal` лишається синхронним (його викликають і з rAF-колбека, і
// напряму з `bindAutoHealScanner`), тож асинхронний прохід «привиди»
// запускається без очікування, але з обов'язковим `.catch()`.

import type { SyhEventComments } from './types';
import { resolveSelectorString } from '../config';
import { SYH_DOM_OBSERVER } from '../dom_observer';
import { isExtensionContextValid } from '../messaging_context';
import { processCoverButtons } from './auto_heal_cover_buttons';
import { processGhostComments } from './auto_heal_ghosts';

/** Фолбек-селектор блоку коментаря, коли конфіг його не задає. */
const FALLBACK_COMMENT_SELECTOR = '[class*="PlatformComment__Wrap"]';

export function runAutoHeal(self: SyhEventComments): void {
    if (!isExtensionContextValid()) {
        if (self.autoHealObserver) {
            self.autoHealObserver.disconnect();
        }
        return;
    }

    // Порядок важливий: cover-кнопки виставляють чекбокси, і лише потім
    // прохід «привиди» читає підсумковий стан DOM.
    processCoverButtons(self);

    // Прохід «привиди» асинхронний (чекає на storage). Тут його свідомо не
    // очікуємо — але й не лишаємо «плаваючим»: будь-яке відхилення гаситься
    // логом, щоб не було `unhandledrejection` у content script.
    void processGhostComments(self).catch(err =>
        console.warn('[SYH] Auto-Heal: прохід «привиди» завершився помилкою:', err)
    );
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
