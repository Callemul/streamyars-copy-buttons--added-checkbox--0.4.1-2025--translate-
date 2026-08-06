/**
 * StreamYard Helper - Background Service Worker
 * Обробка фонових задач, подій встановлення/оновлення та комунікації між компонентами.
 */

import { migrateStorageIfNeeded, STORAGE_KEYS } from '../modules/storage';
import { RetentionService } from '../modules/retention_service';

/**
 * Підраховує кількість вибраних (checked) чекбоксів із об'єкта стану
 */
export function countCheckedItems(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  const target = (obj.data && typeof obj.data === 'object') ? obj.data : obj;
  let count = 0;
  for (const key of Object.keys(target)) {
    if (key === 'date') continue;
    const val = target[key];
    if (val === true || (val && typeof val === 'object' && val.checked === true)) {
      count++;
    }
  }
  return count;
}

/**
 * Обчислює та оновлює динамічний бейдж та колір фону іконки розширення
 */
export async function updateExtensionBadge(): Promise<void> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.action ||
    typeof chrome.action.setBadgeText !== 'function' ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    return;
  }

  try {
    const allData: Record<string, any> = await new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => resolve(result || {}));
    });

    let collectedCount = 0;
    let checkedCount = 0;

    for (const key of Object.keys(allData)) {
      if (
        key.startsWith('syh:popup:collected:') ||
        key === STORAGE_KEYS.YT_COLLECTED ||
        key === STORAGE_KEYS.PRAYERS
      ) {
        const val = allData[key];
        if (Array.isArray(val)) {
          collectedCount += val.length;
        }
      } else if (
        key === STORAGE_KEYS.CHECKBOX_STATE ||
        key === STORAGE_KEYS.YT_CHECKBOX_STATE ||
        key === STORAGE_KEYS.STUDIO_CHECKBOX_STATE
      ) {
        checkedCount += countCheckedItems(allData[key]);
      }
    }

    if (checkedCount > 0) {
      const text = checkedCount > 99 ? '99+' : String(checkedCount);
      await chrome.action.setBadgeText({ text });
      if (typeof chrome.action.setBadgeBackgroundColor === 'function') {
        await chrome.action.setBadgeBackgroundColor({ color: '#E67E22' });
      }
    } else if (collectedCount > 0) {
      const text = collectedCount > 99 ? '99+' : String(collectedCount);
      await chrome.action.setBadgeText({ text });
      if (typeof chrome.action.setBadgeBackgroundColor === 'function') {
        await chrome.action.setBadgeBackgroundColor({ color: '#27AE60' });
      }
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('[Service Worker] Error updating extension badge:', err);
  }
}

// Відстеження змін у сховищі chrome.storage.onChanged
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      const hasRelevantChange = Object.keys(changes).some(
        (key) =>
          key.startsWith('syh:popup:collected:') ||
          key === STORAGE_KEYS.YT_COLLECTED ||
          key === STORAGE_KEYS.PRAYERS ||
          key === STORAGE_KEYS.CHECKBOX_STATE ||
          key === STORAGE_KEYS.YT_CHECKBOX_STATE ||
          key === STORAGE_KEYS.STUDIO_CHECKBOX_STATE
      );
      if (hasRelevantChange) {
        updateExtensionBadge();
      }
    }
  });
}

// Подія встановлення або оновлення розширення
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
    console.log(`[Service Worker] StreamYard Helper installed/updated: ${details.reason}`);
    
    if (details.reason === 'install' || details.reason === 'update') {
      await migrateStorageIfNeeded();
      await RetentionService.runGlobalCleanup();
      await updateExtensionBadge();
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

export const SW_ROUTER = new ServiceWorkerMessageRouter();
SW_ROUTER.listen();

// Ініціалізаційне оновлення бейджа при запуску SW
updateExtensionBadge();

