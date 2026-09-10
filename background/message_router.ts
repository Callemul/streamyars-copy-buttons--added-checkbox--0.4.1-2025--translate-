/**
 * Background message routing.
 *
 * Виділено з `service-worker.ts`. Реєстр обробників повідомлень від
 * контент-скриптів і попапа плюс єдина точка підписки на `chrome.runtime.onMessage`.
 *
 * Найважливіша деталь контракту — семантика повернення слухача:
 *   - `true`  → відповідь буде надіслана асинхронно, канал `sendResponse`
 *               треба тримати відкритим;
 *   - `false` → відповідь уже надіслана синхронно (або хендлера немає).
 * Помилка в обробнику ніколи не «випадає» назовні: вона перетворюється на
 * відповідь `{ error }`, щоб викликач не завис у очікуванні.
 */

import { STORAGE_KEYS } from '../modules/storage/storage';
import { updateExtensionBadge } from './badge_updater';

export type BackgroundMessageHandler = (
    message: any,
    sender: chrome.runtime.MessageSender
) => Promise<any> | any;

export class ServiceWorkerMessageRouter {
    private handlers: Map<string, BackgroundMessageHandler> = new Map();

    constructor() {
        this.registerDefaultHandlers();
    }

    public register(type: string, handler: BackgroundMessageHandler): void {
        this.handlers.set(type, handler);
    }

    private registerDefaultHandlers(): void {
        this.register('PING', () => ({
            status: 'ok',
            response: 'PONG',
            timestamp: Date.now()
        }));

        this.register('GET_VERSION', () => {
            const manifest = chrome.runtime.getManifest();
            return { version: manifest.version, name: manifest.name };
        });

        this.register('BACKGROUND_LOG', (message) => {
            console.log(`[Content/Popup Log]:`, message.data);
            return { status: 'logged' };
        });

        this.register('UPDATE_BADGE', async () => {
            await updateExtensionBadge();
            return { status: 'ok' };
        });

        this.register('OPEN_SHEET_POPUP', async (message) => {
            const sheetId = message.sheetId;
            if (sheetId && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({
                    [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'tab-telegram',
                    [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: sheetId
                });
                if (typeof chrome.action !== 'undefined' && typeof chrome.action.openPopup === 'function') {
                    try {
                        await chrome.action.openPopup();
                    } catch (e) {
                        console.log('[SW] chrome.action.openPopup not supported or requires gesture:', e);
                    }
                }
            }
            return { status: 'ok' };
        });
    }

    public listen(): void {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || typeof message !== 'object') return false;

            const type = message.type || message.action;
            const handler = this.handlers.get(type);

            if (handler) {
                try {
                    const result = handler(message, sender);
                    if (result && typeof result.then === 'function') {
                        result
                            .then((res: any) => sendResponse(res))
                            .catch((err: any) => sendResponse({ error: err?.message || String(err) }));
                        return true; // Тримає асинхронний канал відкритим
                    } else {
                        sendResponse(result);
                        return false;
                    }
                } catch (err: any) {
                    sendResponse({ error: err?.message || String(err) });
                    return false;
                }
            }

            return false;
        });
    }
}
