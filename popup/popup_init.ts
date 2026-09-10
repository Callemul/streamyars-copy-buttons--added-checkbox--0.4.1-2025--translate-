import { renderSheetTemplates } from './popup_state_restorer';
import { initPopupTelegramListeners } from './popup_telegram';
import { initPopupPrayersListeners, renderPrayers } from './prayer_api';
import { buildPopupKeysToLoad, restoreDbState, restoreSingleSheetState, restoreActiveTabUI, restoreActiveSubtabUI, restoreTextareaSizesUI, restoreTranslitStateUI, restoreScrollPositionsUI } from './popup_state_restorer';
import { setupPopupTabListeners, setupSheetInputListeners, setupTranslitListeners, setupTitleAndOptionsListeners } from './popup_listeners';
import { setupResizeObserver, initStep3Resizers, setupStep3ResizerEvents } from './popup_resizers';
import { setupScrollListeners } from './popup_scroll';
import { STORAGE_KEYS } from '../modules/storage/storage';
import { getAllSheetIds } from '../modules/registry/sheets';
import { SYH_STORAGE, type StorageReadResult } from '../modules/storage/storage';

const SHEET_IDS = getAllSheetIds();

function initPopup() {
    try {
        renderSheetTemplates();
    } catch (e) {
        console.error('[SYH Popup] Sheets templates render failed:', e);
    }

    try {
        initPopupTelegramListeners();
    } catch (e) {
        console.error('[SYH Popup] Telegram listeners init failed:', e);
    }

    try {
        initPopupPrayersListeners();
    } catch (e) {
        console.error('[SYH Popup] Prayers listeners init failed:', e);
    }

    let keysToLoad: string[] = [];
    try {
        keysToLoad = buildPopupKeysToLoad(SHEET_IDS);
    } catch (e) {
        console.error('[SYH Popup] Build keys failed:', e);
    }

    let storageLoaded = false;

    try {
        SYH_STORAGE.get(keysToLoad, function (result: StorageReadResult) {
            try {
                restoreDbState(result);
            } catch (e) {
                console.error('[SYH Popup] Restore DB state failed:', e);
            }

            try {
                SHEET_IDS.forEach(sId => restoreSingleSheetState(sId, result));
            } catch (e) {
                console.error('[SYH Popup] Restore sheets state failed:', e);
            }

            try {
                restoreActiveTabUI(result);
            } catch (e) {
                console.error('[SYH Popup] Restore active tab UI failed:', e);
            }

            try {
                restoreActiveSubtabUI(result);
            } catch (e) {
                console.error('[SYH Popup] Restore active subtab UI failed:', e);
            }

            try {
                restoreTextareaSizesUI(result);
            } catch (e) {
                console.error('[SYH Popup] Restore textarea sizes failed:', e);
            }

            try {
                restoreTranslitStateUI(result);
            } catch (e) {
                console.error('[SYH Popup] Restore translit state failed:', e);
            }

            try {
                renderPrayers(result[STORAGE_KEYS.PRAYERS] || []);
            } catch (e) {
                console.error('[SYH Popup] Render prayers failed:', e);
            }

            try {
                restoreScrollPositionsUI(result);
            } catch (e) {
                console.error('[SYH Popup] Restore scroll positions failed:', e);
            }

            storageLoaded = true;

            try {
                setTimeout(() => setupResizeObserver(() => storageLoaded), 300);
            } catch (e) {
                console.error('[SYH Popup] Setup resize observer failed:', e);
            }

            try {
                initStep3Resizers();
            } catch (e) {
                console.error('[SYH Popup] Step3 resizers init failed:', e);
            }
        });
    } catch (e) {
        console.error('[SYH Popup] Storage get failed:', e);
    }

    try {
        setupPopupTabListeners();
    } catch (e) {
        console.error('[SYH Popup] Tabs init failed:', e);
    }

    try {
        setupSheetInputListeners();
    } catch (e) {
        console.error('[SYH Popup] Sheet inputs init failed:', e);
    }

    try {
        setupTranslitListeners();
    } catch (e) {
        console.error('[SYH Popup] Translit init failed:', e);
    }

    try {
        setupTitleAndOptionsListeners();
    } catch (e) {
        console.error('[SYH Popup] Title and options init failed:', e);
    }

    try {
        setupScrollListeners();
    } catch (e) {
        console.error('[SYH Popup] Scroll listeners init failed:', e);
    }

    try {
        setupStep3ResizerEvents();
    } catch (e) {
        console.error('[SYH Popup] Resizers init failed:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
} else {
    initPopup();
}