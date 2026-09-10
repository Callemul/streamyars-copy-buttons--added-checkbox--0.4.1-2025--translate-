import { SYH_CONFIG, type SyhConfig } from '../../config';
import { SYH_STATE, type SyhState } from '../../state';
import { SYH_UTILS, type SyhUtils } from '../../utils';
import { SYH_UI, type SyhUi } from '../ui/ui';
import { SYH_BANNER_CREATOR, type SyhBannerCreator } from '../../banner_creator';
import type { ISyhPlugin } from '../../plugin_registry';

import type { SyhEventBanners } from './types';
import { handleCreateBannersAction, handleCopyBannerAction, handleMarkBannerCategoryAction } from './category';
import { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction } from './mouse_handlers';
import { handleBannerChange } from './checkbox';
import { handleBannerMouseUp } from './mouseup_handler';
import { bindBannersFilterControls } from '../ui/ui_banners';
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
let _contextHandler: ((e: MouseEvent) => void) | null = null;
let _mousedownHandler: ((e: MouseEvent) => void) | null = null;
let _mouseupHandler: ((e: MouseEvent) => void) | null = null;
let _changeHandler: ((e: Event) => void) | null = null;

export const SYH_EVENT_BANNERS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_banners',
    name: 'StreamYard Banners Handler',
    enabled: true,
    isSupported: (url = currentBrowserUrl()) => isStreamYardUrl(url),
    init: () => {
        SYH_EVENT_BANNERS.init();
        SYH_EVENT_BANNERS.bindEvents();
    },
    destroy: () => {
        SYH_EVENT_BANNERS.destroy();
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

        _contextHandler = (e: MouseEvent) => handleBannerContextMenu(e, self.SELECTORS);
        _mousedownHandler = handleBannerMouseDown;
        _mouseupHandler = (e: MouseEvent) => handleBannerMouseUp(e, self);
        _changeHandler = (e: Event) => handleBannerChange(e, self.SELECTORS, self.UI);

        document.addEventListener('contextmenu', _contextHandler, true);
        document.addEventListener('mousedown', _mousedownHandler);
        document.addEventListener('mouseup', _mouseupHandler);
        document.addEventListener('change', _changeHandler);
    },

    bindBannersFilterControls: function(): void {
        bindBannersFilterControls();
    },

    destroy: function(): void {
        if (!eventsBound) return;
        if (_contextHandler) document.removeEventListener('contextmenu', _contextHandler, true);
        if (_mousedownHandler) document.removeEventListener('mousedown', _mousedownHandler);
        if (_mouseupHandler) document.removeEventListener('mouseup', _mouseupHandler);
        if (_changeHandler) document.removeEventListener('change', _changeHandler);
        _contextHandler = _mousedownHandler = _mouseupHandler = _changeHandler = null;
        eventsBound = false;
    }
};