import { renderSheetTemplates } from './popup_state_restorer';
import { initPopupTelegramListeners } from './popup_telegram';
import { initPopupPrayersListeners, renderPrayers } from './popup_prayers';
import { buildPopupKeysToLoad, restoreDbState, restoreSingleSheetState, restoreActiveTabUI, restoreActiveSubtabUI, restoreTextareaSizesUI, restoreTranslitStateUI, restoreScrollPositionsUI } from './popup_state_restorer';
import { setupPopupTabListeners, setupSheetInputListeners, setupTranslitListeners, setupTitleAndOptionsListeners } from './popup_listeners';
import { setupResizeObserver, initStep3Resizers, setupStep3ResizerEvents } from './popup_resizers';
import { setupScrollListeners } from './popup_scroll';
import { STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { SYH_STORAGE } from '../modules/storage';

const SHEET_IDS = getAllSheetIds();

function initPopup() {
    renderSheetTemplates();
    initPopupTelegramListeners();
    initPopupPrayersListeners();

    const keysToLoad = buildPopupKeysToLoad(SHEET_IDS);
    let storageLoaded = false;

    SYH_STORAGE.get(keysToLoad, function (result: Record<string, any>) {
        restoreDbState(result);
        SHEET_IDS.forEach(sId => restoreSingleSheetState(sId, result));
        restoreActiveTabUI(result);
        restoreActiveSubtabUI(result);
        restoreTextareaSizesUI(result);
        restoreTranslitStateUI(result);
        renderPrayers(result[STORAGE_KEYS.PRAYERS] || []);
        restoreScrollPositionsUI(result);

        storageLoaded = true;
        setTimeout(() => setupResizeObserver(() => storageLoaded), 300);
        initStep3Resizers();
    });

    setupPopupTabListeners();
    setupSheetInputListeners();
    setupTranslitListeners();
    setupTitleAndOptionsListeners();
    setupScrollListeners();
    setupStep3ResizerEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
} else {
    initPopup();
}