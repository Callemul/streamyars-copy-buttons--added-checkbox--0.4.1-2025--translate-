/**
 * StreamYard Helper - Centralized Messaging Service
 * Безпечний адаптер зв'язку між Content Scripts, Popup та Background Worker.
 * Запобігає помилкам "Extension context invalidated" та незакритим обробникам Promise.
 */

import type { SyhRuntimeMessage } from './types';

export interface SyhMessagingService {
    isExtensionValid(): boolean;
    sendToBackground<T = unknown>(message: SyhRuntimeMessage): Promise<T | null>;
    sendToActiveTab<T = unknown>(message: SyhRuntimeMessage): Promise<T | null>;
    onMessage(
        callback: (
            message: SyhRuntimeMessage,
            sender: chrome.runtime.MessageSender,
            sendResponse: (response?: unknown) => void
        ) => boolean | void
    ): () => void;
}

export const SYH_MESSAGING: SyhMessagingService = {
    isExtensionValid: function(): boolean {
        try {
            return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
        } catch {
            return false;
        }
    },

    sendToBackground: function<T = unknown>(message: SyhRuntimeMessage): Promise<T | null> {
        return new Promise((resolve) => {
            if (!this.isExtensionValid() || !chrome.runtime?.sendMessage) {
                resolve(null);
                return;
            }
            try {
                chrome.runtime.sendMessage(message, (response: T) => {
                    const err = chrome.runtime.lastError;
                    if (err) {
                        resolve(null);
                    } else {
                        resolve(response ?? null);
                    }
                });
            } catch (e) {
                console.warn('[SYH Messaging] sendToBackground error:', e);
                resolve(null);
            }
        });
    },

    sendToActiveTab: function<T = unknown>(message: SyhRuntimeMessage): Promise<T | null> {
        return new Promise((resolve) => {
            if (!this.isExtensionValid() || !chrome.tabs?.query) {
                resolve(null);
                return;
            }
            try {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs && tabs[0];
                    if (!activeTab || activeTab.id === undefined) {
                        resolve(null);
                        return;
                    }
                    chrome.tabs.sendMessage(activeTab.id, message, (response: T) => {
                        const err = chrome.runtime.lastError;
                        if (err) {
                            resolve(null);
                        } else {
                            resolve(response ?? null);
                        }
                    });
                });
            } catch {
                resolve(null);
            }
        });
    },

    onMessage: function(callback) {
        if (!this.isExtensionValid() || !chrome.runtime?.onMessage) {
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
            if (this.isExtensionValid() && chrome.runtime?.onMessage) {
                try {
                    chrome.runtime.onMessage.removeListener(listener);
                } catch {
                    // Ignore disconnect errors
                }
            }
        };
    }
};
