/**
 * StreamYard Helper — вхідний канал повідомлень із безпечною відпискою.
 *
 * Винесено з `modules/messaging.ts` (ціль №3 у `fallow health --targets`).
 *
 * Три запобіжники, збережені 1-в-1 з оригіналом `SYH_MESSAGING.onMessage`:
 *   • виняток у колбеку користувача не доходить до `chrome` — повертається `false`;
 *   • збій `addListener` не валить виклик, відписка все одно повертається робочою;
 *   • відписка перевіряє живучість контексту повторно (у момент виклику, а не
 *     реєстрації) і глушить помилки роз'єднання.
 *
 * `isValid` приймається параметром, щоб зберегти пізнє зв'язування через `this`
 * на фасаді `SYH_MESSAGING`.
 */

import type { SyhRuntimeMessage } from './core/types';

export type SyhMessageHandler = (
    message: SyhRuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
) => boolean | void;

export function registerMessageListener(
    isValid: () => boolean,
    callback: SyhMessageHandler
): () => void {
    if (!isValid() || !chrome.runtime?.onMessage) {
        return () => {};
    }

    const listener = (
        msg: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
    ) => {
        try {
            return callback(msg as SyhRuntimeMessage, sender, sendResponse);
        } catch (e) {
            console.warn('[SYH Messaging] Error in message listener:', e);
            return false;
        }
    };

    try {
        chrome.runtime.onMessage.addListener(listener);
    } catch (e) {
        console.warn('[SYH Messaging] Failed to add listener:', e);
    }

    return () => {
        if (isValid() && chrome.runtime?.onMessage) {
            try {
                chrome.runtime.onMessage.removeListener(listener);
            } catch {
                // Ignore disconnect errors
            }
        }
    };
}
