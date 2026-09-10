/**
 * StreamYard Helper - Конкретна реалізація Messaging Service.
 *
 * Цей модуль тримає `SyhMessagingService` інтерфейс та єдиний експорт
 * `SYH_MESSAGING`. Фасад `./messaging` лише перевидпускає його, щоб не
 * зламати історичних споживачів (bootstrap_app та тести).
 *
 * Гард передається в помічники як колбек `() => this.isExtensionValid()`, щоб
 * зберегти пізнє зв'язування: підміна `SYH_MESSAGING.isExtensionValid` у тестах
 * чи в рантаймі має впливати на всі три канали, як і в оригіналі.
 */

import type { SyhRuntimeMessage } from '../core/types';
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
