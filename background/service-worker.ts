/**
 * StreamYard Helper - Background Service Worker
 * Обробка фонових задач, подій встановлення/оновлення та комунікації між компонентами.
 */

import { migrateStorageIfNeeded, STORAGE_KEYS } from '../modules/storage';
import { RetentionService } from '../modules/retention_service';

// Подія встановлення або оновлення розширення
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
    console.log(`[Service Worker] StreamYard Helper installed/updated: ${details.reason}`);
    
    if (details.reason === 'install' || details.reason === 'update') {
      await migrateStorageIfNeeded();
      await RetentionService.runGlobalCleanup();
    }

    if (details.reason === 'install') {
      // Ініціалізація дефолтних налаштувань у сховищі при першому встановленні
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          [STORAGE_KEYS.INSTALLED_AT]: new Date().toISOString(),
          [STORAGE_KEYS.VERSION]: chrome.runtime.getManifest().version
        });
      }
    }
  });
}

export type BackgroundMessageHandler = (
  message: any,
  sender: chrome.runtime.MessageSender
) => Promise<any> | any;

class ServiceWorkerMessageRouter {
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

export const SW_ROUTER = new ServiceWorkerMessageRouter();
SW_ROUTER.listen();
