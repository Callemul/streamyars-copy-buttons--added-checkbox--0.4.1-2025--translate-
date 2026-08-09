/**
 * StreamYard Helper - Centralized Messaging Service
 * Безпечний адаптер зв'язку між Content Scripts, Popup та Background Worker.
 * Запобігає помилкам "Extension context invalidated" та незакритим обробникам Promise.
 *
 * Файл свідомо тонкий: це лише фасад. Реалізація живе в `messaging_context`
 * (живучість контексту), `messaging_senders` (вихідні канали) та
 * `messaging_listener` (вхідний канал).
 *
 * Гард передається в помічники як колбек `() => this.isExtensionValid()`, щоб
 * зберегти пізнє зв'язування: підміна `SYH_MESSAGING.isExtensionValid` у тестах
 * чи в рантаймі має впливати на всі три канали, як і в оригіналі.
 */

import type { SyhRuntimeMessage } from './types';
import { isExtensionContextValid } from './messaging_context';
import { sendRuntimeMessage, sendActiveTabMessage } from './messaging_senders';
import { registerMessageListener, type SyhMessageHandler } from './messaging_listener';

export interface SyhMessagingService {
    isExtensionValid(): boolean;
    sendToBackground<T = unknown>(message: SyhRuntimeMessage): Promise<T | null>;
    sendToActiveTab<T = unknown>(message: SyhRuntimeMessage): Promise<T | null>;
    onMessage(callback: SyhMessageHandler): () => void;
}

export const SYH_MESSAGING: SyhMessagingService = {
    isExtensionValid: isExtensionContextValid,

    sendToBackground: function<T = unknown>(message: SyhRuntimeMessage): Promise<T | null> {
        const self = this;
        return sendRuntimeMessage<T>(() => self.isExtensionValid(), message);
    },

    sendToActiveTab: function<T = unknown>(message: SyhRuntimeMessage): Promise<T | null> {
        const self = this;
        return sendActiveTabMessage<T>(() => self.isExtensionValid(), message);
    },

    onMessage: function(callback: SyhMessageHandler): () => void {
        const self = this;
        return registerMessageListener(() => self.isExtensionValid(), callback);
    }
};
