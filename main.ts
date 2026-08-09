import { claimInitLock, getExtensionVersion, initSyhApp } from './modules/bootstrap_app';

(() => {
    'use strict';

    if (!claimInitLock()) {
        console.warn('[SYH] Розширення вже запущене на цій сторінці. Повторну ініціалізацію примусово зупинено.');
        return;
    }

    console.log(`StreamYard Helper v${getExtensionVersion()} [Anti-AFK & Modular Architecture] Loaded!`);

    initSyhApp();
})();
