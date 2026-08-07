// popup/popup_state_restorer.ts
// Re-exports from split modules for backward compatibility

export {
    renderSheetTemplates,
    buildPopupKeysToLoad
} from './popup_sheet_renderer';

export {
    restoreSingleSheetState
} from './popup_sheet_state_restorer';

export {
    restoreDbState,
    restoreActiveTabUI,
    restoreActiveSubtabUI,
    restoreTextareaSizesUI,
    restoreTranslitStateUI,
    restoreScrollPositionsUI
} from './popup_ui_state_restorer';

export {
    db,
    saveDataToStorage,
    loadData,
    saveData
} from './popup_storage';