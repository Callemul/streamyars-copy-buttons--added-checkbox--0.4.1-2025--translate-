/** Central messaging service; helpers retain late-bound context checks. */

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
