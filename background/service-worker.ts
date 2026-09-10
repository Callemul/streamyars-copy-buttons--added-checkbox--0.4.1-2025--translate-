/**
 * StreamYard Helper - Background Service Worker (точка входу)
 *
 * Після рефакторингу цей файл лише *монтує* воркер: підписує слухачів життєвого
 * циклу та делегує роботу спеціалізованим модулям.
 *   - `badge_counter.ts`  — чисті правила підрахунку бейджа;
 *   - `badge_updater.ts`  — рендер бейджа через `chrome.action`;
 *   - `message_router.ts` — реєстр обробників `chrome.runtime.onMessage`.
 *
 * Реекспорти нижче зберігають історичний публічний контракт модуля
 * (`background/service-worker.ts`), на який спираються тести.
 */

import { migrateStorageIfNeeded, STORAGE_KEYS } from '../modules/storage';
import { RetentionService } from '../modules/sheets/retention_service';
import { isBadgeRelevantKey } from './badge_counter';
import { updateExtensionBadge } from './badge_updater';
import { ServiceWorkerMessageRouter } from './message_router';

export { countCheckedItems, calculateBadgeCounts } from './badge_counter';
export { applyBadgeTextAndColor, updateExtensionBadge } from './badge_updater';
export type { BackgroundMessageHandler } from './message_router';

// Відстеження змін у сховищі chrome.storage.onChanged
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (Object.keys(changes).some(isBadgeRelevantKey)) {
        updateExtensionBadge();
      }
    }
  });
}

// Подія встановлення або оновлення розширення
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
    console.log(`[Service Worker] StreamYard Helper installed/updated: ${details.reason}`);

    try {
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
    } catch (err) {
      console.error('[Service Worker] onInstalled error:', err);
    }
  });
}

export const SW_ROUTER = new ServiceWorkerMessageRouter();
SW_ROUTER.listen();

// Ініціалізаційне оновлення бейджа при запуску SW
updateExtensionBadge();
