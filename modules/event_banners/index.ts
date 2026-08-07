import { SYH_CONFIG, type SyhConfig } from '../config';
import { SYH_STATE, type SyhState } from '../state';
import { SYH_UTILS, type SyhUtils } from '../utils';
import { SYH_UI, type SyhUi } from '../ui';
import { SYH_BANNER_CREATOR, type SyhBannerCreator } from '../banner_creator';
import type { ISyhPlugin } from '../plugin_registry';

import type { SyhEventBanners } from './types';
import { handleDeleteSelectedBannersAction } from './deletion';
import { handleCreateBannersAction, handleCopyBannerAction, handleMarkBannerCategoryAction } from './category';
import { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction } from './mouse_handlers';
import { handleBannerChange } from './checkbox';

export { handleCreateBannersAction, handleCopyBannerAction, handleMarkBannerCategoryAction };
export { handleDeleteSelectedBannersAction, calculateBannerDeletionCounts, buildBannerDeleteConfirmMessage, executeBannerDeletion } from './deletion';
export { handleBannerContextMenu, handleBannerMouseDown, isAllowedBannerAction };
export { handleSingleBannerCheckboxChange, handleMasterCheckboxChange, handleBannerChange } from './checkbox';

let eventsBound = false;

export const SYH_EVENT_BANNERS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_banners',
    name: 'StreamYard Banners Handler',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
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
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.STATE = state || SYH_STATE;
        this.UTILS = utils || SYH_UTILS;
        this.UI = ui || SYH_UI;
        this.BANNER_CREATOR = bannerCreator || SYH_BANNER_CREATOR;
    },

    bindEvents: function(): void {
        if (eventsBound) return;
        eventsBound = true;

        const self = this;

        document.addEventListener('contextmenu', (e: MouseEvent) => handleBannerContextMenu(e, self.SELECTORS), true);
        document.addEventListener('mousedown', handleBannerMouseDown);
        document.addEventListener('mouseup', (e: MouseEvent) => {
            const target = e.target as Element | null;
            const button = target?.closest('.syh-button') as HTMLElement | null;
            if (!button) return;

            const action = button.dataset.action;
            const type = button.dataset.type;
            const buttonNum = e.button;

            if (!isAllowedBannerAction(action, type) || buttonNum !== 0) return;

            e.preventDefault();
            e.stopPropagation();

            if (action === 'create-from-text') {
                handleCreateBannersAction(self.BANNER_CREATOR);
                return;
            }

            if (action === 'delete-selected-banners') {
                handleDeleteSelectedBannersAction(self.SELECTORS, self.UI);
                return;
            }

            if (type === 'banner' && action === 'copy-banner') {
                handleCopyBannerAction(button, self.SELECTORS, self.UTILS);
                return;
            }

            if (action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer') {
                handleMarkBannerCategoryAction(button, action, self.SELECTORS, self.UI, self.UTILS);
            }
        });
        document.addEventListener('change', (e: Event) => handleBannerChange(e, self.SELECTORS, self.UI));
    },

    bindBannersFilterControls: async function(): Promise<void> {
        const { bindBannersFilterControls } = await import('../ui_banners');
        bindBannersFilterControls();
    }
};