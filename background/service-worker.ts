/**
 * StreamYard Helper - Background Service Worker
 * Обробка фонових задач, подій встановлення/оновлення та комунікації між компонентами.
 */

// Подія встановлення або оновлення розширення
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    console.log(`[Service Worker] StreamYard Helper installed/updated: ${details.reason}`);
    
    if (details.reason === 'install') {
      // Ініціалізація дефолтних налаштувань у сховищі при першому встановленні
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          syh_installed_at: new Date().toISOString(),
          syh_version: chrome.runtime.getManifest().version
        });
      }
    }
  });
}

// Обробник повідомлень від content scripts та popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!message || typeof message !== 'object') return false;

    switch (message.type) {
      case 'PING':
        sendResponse({ status: 'ok', response: 'PONG', timestamp: Date.now() });
        return false;

      case 'GET_VERSION':
        const manifest = chrome.runtime.getManifest();
        sendResponse({ version: manifest.version, name: manifest.name });
        return false;

      case 'BACKGROUND_LOG':
        console.log(`[Content/Popup Log]:`, message.data);
        sendResponse({ status: 'logged' });
        return false;

      default:
        // Якщо тип повідомлення не розпізнано фоновим скриптом
        return false;
    }
  });
}
