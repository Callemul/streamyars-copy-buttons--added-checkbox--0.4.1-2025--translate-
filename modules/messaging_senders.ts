/**
 * StreamYard Helper — вихідні канали повідомлень (background та активна вкладка).
 *
 * Винесено з `modules/messaging.ts` (ціль №3 у `fallow health --targets`).
 *
 * Гард живучості приймається параметром `isValid`, а не імпортується напряму:
 * оригінальні методи викликали саме `this.isExtensionValid()`, тож підміна
 * методу на `SYH_MESSAGING` мусить впливати і на відправку. Колбек зберігає це
 * пізнє зв'язування 1-в-1.
 *
 * Спільний контракт обох функцій: вони НІКОЛИ не відхиляють проміс — будь-який
 * збій (мертвий контекст, `lastError`, синхронний виняток) дає `null`.
 */

import type { SyhRuntimeMessage } from './types';

/**
 * `chrome.*` повідомляє про помилку через `chrome.runtime.lastError`, а не через
 * throw, тому перевіряти його треба всередині кожного колбека.
 */
function settleFromCallback<T>(resolve: (value: T | null) => void, response: T): void {
    const err = chrome.runtime.lastError;
    if (err) {
        resolve(null);
    } else {
        resolve(response ?? null);
    }
}

export function sendRuntimeMessage<T = unknown>(
    isValid: () => boolean,
    message: SyhRuntimeMessage
): Promise<T | null> {
    return new Promise((resolve) => {
        if (!isValid() || !chrome.runtime?.sendMessage) {
            resolve(null);
            return;
        }
        try {
            chrome.runtime.sendMessage(message, (response: T) => {
                settleFromCallback(resolve, response);
            });
        } catch (e) {
            console.warn('[SYH Messaging] sendToBackground error:', e);
            resolve(null);
        }
    });
}

export function sendActiveTabMessage<T = unknown>(
    isValid: () => boolean,
    message: SyhRuntimeMessage
): Promise<T | null> {
    return new Promise((resolve) => {
        if (!isValid() || !chrome.tabs?.query) {
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
                    settleFromCallback(resolve, response);
                });
            });
        } catch {
            resolve(null);
        }
    });
}
