import type { SyhEventComments } from './types';
import { closestBySelectorValue, queryBySelectorValue, resolveSelectorString } from '../config';
import { SYH_DOM_OBSERVER } from '../dom_observer';
import { CommentService } from '../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../comment_assistant/index';

export function bindAutoHealScanner(self: SyhEventComments): void {
    const runAutoHeal = (): void => {
        if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
            if (self.autoHealObserver) {
                self.autoHealObserver.disconnect();
            }
            return;
        }

        // 1. Відмітка "Опрацьовано" для коментарів на екрані
        const coverButtons = document.querySelectorAll('[data-testid="show-comment-button"]');
        coverButtons.forEach((btn: Element) => {
            if (btn.textContent?.includes('Hide') || btn.querySelector('.lucide-circle-minus')) {
                const commentBlock = closestBySelectorValue(btn, self.SELECTORS?.commentBlock);
                if (commentBlock) {
                    const checkbox = commentBlock.querySelector<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
                        if (textKey) {
                            CommentService.setStreamYardCheckboxState(textKey, true);
                        }
                        SYH_COMMENT_ASSISTANT.processComment(commentBlock);
                    }
                }
            }
        });

        // 2. ФІКС "ПРИВИДІВ" (Auto-Heal): Синхронізація локальної бази зі StreamYard
        const syhComments = document.querySelectorAll('[data-syh-type="prayer"], [data-syh-type="question"]');
        syhComments.forEach((commentBlock: Element) => {
            const starBtn = queryBySelectorValue(self.SELECTORS?.starButton, commentBlock);
            // Якщо коментар є в базі (підсвічений), але на сервері втратив зірочку
            if (starBtn && starBtn.getAttribute('aria-selected') === 'false') {
                // Перевіряємо, чи це не новий коментар, який ще не встиг отримати зірочку від React
                if (commentBlock.getAttribute('data-syh-just-added') !== 'true') {
                    const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
                    if (text) {
                        console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
                        self.removeFromDatabase(text);
                        const ui = self.UI;
                        if (ui) {
                            ui.updateCommentVisuals(commentBlock, 'none');
                            if (typeof ui.filterStarredComments === 'function') {
                                setTimeout(() => ui.filterStarredComments(), 100);
                            }
                        }
                    }
                }
            }
        });
    };

    if (self.unregisterAutoHeal) {
        self.unregisterAutoHeal();
        self.unregisterAutoHeal = null;
    }

    const commentSelector = resolveSelectorString(self.SELECTORS?.commentBlock)
        || '[class*="PlatformComment__Wrap"]';

    let rafScheduled = false;
    const triggerAutoHeal = () => {
        if (document.hidden) return;
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(() => {
                rafScheduled = false;
                runAutoHeal();
            });
        }
    };

    self.unregisterAutoHeal = SYH_DOM_OBSERVER.register(
        commentSelector,
        () => triggerAutoHeal(),
        () => triggerAutoHeal()
    );

    // Первинна перевірка при ініціалізації
    runAutoHeal();
}