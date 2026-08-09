import { SYH_CONFIG, type SyhConfig } from '../config';
import { SYH_STATE, type SyhState } from '../state';
import { SYH_UTILS, type SyhUtils } from '../utils';
import { SYH_UI, type SyhUi } from '../ui';
import { SYH_BANNER_CREATOR, type SyhBannerCreator } from '../banner_creator';
import type { ISyhPlugin } from '../plugin_registry';

import type { SyhEventBanners } from './types';
import { handleCreateBannersAction, handleCopyBannerAction, handleMarkBannerCategoryAction } from './category';
import { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction } from './mouse_handlers';
import { handleBannerChange } from './checkbox';
import { handleBannerMouseUp } from './mouseup_handler';
import { bindBannersFilterControls } from '../ui_banners';
import { currentBrowserUrl, isStreamYardUrl, resolveEventBannerDeps } from './deps';

export { handleCreateBannersAction, handleCopyBannerAction, handleMarkBannerCategoryAction };
export { handleDeleteSelectedBannersAction, calculateBannerDeletionCounts, buildBannerDeleteConfirmMessage, executeBannerDeletion } from './deletion';
export { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction };
export { handleSingleBannerCheckboxChange, handleMasterCheckboxChange, handleBannerChange } from './checkbox';
export {
    resolveBannerSelectors,
    resolveEventBannerDeps,
    preferOverride,
    currentBrowserUrl,
    isStreamYardUrl,
    STREAMYARD_URL_MARKER
} from './deps';

let eventsBound = false;

export const SYH_EVENT_BANNERS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_banners',
    name: 'StreamYard Banners Handler',
    enabled: true,
    isSupported: (url = currentBrowserUrl()) => isStreamYardUrl(url),
    init: () => {
        SYH_EVENT_BANNERS.init();
        SYH_EVENT_BANNERS.bindEvents();
    }
};

export const SYH_EVENT_BANNERS: SyhEventBanners = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,
    BANNER_CREATOR: null,

    init: function(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi, bannerCreator?: SyhBannerCreator): void {
        const deps = resolveEventBannerDeps(
            { config, state, utils, ui, bannerCreator },
            {
                config: SYH_CONFIG,
                state: SYH_STATE,
                utils: SYH_UTILS,
                ui: SYH_UI,
                bannerCreator: SYH_BANNER_CREATOR
            }
        );

        this.SELECTORS = deps.SELECTORS;
        this.STATE = deps.STATE;
        this.UTILS = deps.UTILS;
        this.UI = deps.UI;
        this.BANNER_CREATOR = deps.BANNER_CREATOR;
    },

    bindEvents: function(): void {
        if (eventsBound) return;
        eventsBound = true;

        const self = this;

        document.addEventListener('contextmenu', (e: MouseEvent) => handleBannerContextMenu(e, self.SELECTORS), true);
        document.addEventListener('mousedown', handleBannerMouseDown);
        document.addEventListener('mouseup', (e: MouseEvent) => handleBannerMouseUp(e, self));
        document.addEventListener('change', (e: Event) => handleBannerChange(e, self.SELECTORS, self.UI));
    },

    bindBannersFilterControls: function(): void {
        bindBannersFilterControls();
    }
};