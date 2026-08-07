import { SYH_CONFIG, type SyhConfig } from '../config';
import { SYH_STATE, type SyhState } from '../state';
import { SYH_UTILS, type SyhUtils } from '../utils';
import { SYH_UI, type SyhUi } from '../ui';
import type { ISyhPlugin } from '../plugin_registry';

import type { SyhEventComments } from './types';
import { bindAutoHealScanner } from './auto_heal';
import { bindStarButtonClickHandler, bindMiddleClickHandler, bindContextMenuHandlers, bindSyhButtonMouseHandlers, bindCheckboxChangeHandler } from './handlers';
import { saveToDatabase, removeFromDatabase } from './database';
import { formatCopyPayload, getPrayerIcon, stripLeadingAt } from './formatters';
import { handleSyhButtonMouseUp } from './button_handlers';
import { applyCommentActionState } from './actions';

export { getPrayerIcon, stripLeadingAt, formatCopyPayload };
export { applyCommentActionState };
export { handleSyhButtonMouseUp };

export const SYH_EVENT_COMMENTS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_comments',
    name: 'StreamYard Comments Handler',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_EVENT_COMMENTS.init();
        SYH_EVENT_COMMENTS.bindEvents();
    }
};

export const SYH_EVENT_COMMENTS: SyhEventComments = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,
    TIMINGS: null,
    isBound: false,

    init: function(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.TIMINGS = config ? config.TIMINGS : (SYH_CONFIG ? SYH_CONFIG.TIMINGS : null);
        this.STATE = state || SYH_STATE;
        this.UTILS = utils || SYH_UTILS;
        this.UI = ui || SYH_UI;
    },

    destroy: function(): void {
        if (this.unregisterAutoHeal) {
            this.unregisterAutoHeal();
            this.unregisterAutoHeal = null;
        }
        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler, true);
            this._clickHandler = undefined;
        }
        if (this._middleClickHandler) {
            document.removeEventListener('mousedown', this._middleClickHandler, true);
            this._middleClickHandler = undefined;
        }
        if (this._contextHandler) {
            document.removeEventListener('contextmenu', this._contextHandler, true);
            this._contextHandler = undefined;
        }
        if (this._copyPrayerContextHandler) {
            document.removeEventListener('contextmenu', this._copyPrayerContextHandler);
            this._copyPrayerContextHandler = undefined;
        }
        if (this._syhButtonMouseDownHandler) {
            document.removeEventListener('mousedown', this._syhButtonMouseDownHandler);
            this._syhButtonMouseDownHandler = undefined;
        }
        if (this._mouseupHandler) {
            document.removeEventListener('mouseup', this._mouseupHandler);
            this._mouseupHandler = undefined;
        }
        if (this._changeHandler) {
            document.removeEventListener('change', this._changeHandler);
            this._changeHandler = undefined;
        }
        if (this.autoHealObserver) {
            this.autoHealObserver.disconnect();
            this.autoHealObserver = undefined;
        }
        this.isBound = false;
    },

    bindEvents: function(): void {
        if (this.isBound) {
            return;
        }
        this.isBound = true;

        bindAutoHealScanner(this);
        bindStarButtonClickHandler(this);
        bindMiddleClickHandler(this);
        bindContextMenuHandlers(this);
        bindSyhButtonMouseHandlers(this);
        bindCheckboxChangeHandler(this);
    },

    bindAutoHealScanner: bindAutoHealScanner,
    bindStarButtonClickHandler: bindStarButtonClickHandler,
    bindMiddleClickHandler: bindMiddleClickHandler,
    bindContextMenuHandlers: bindContextMenuHandlers,
    bindSyhButtonMouseHandlers: bindSyhButtonMouseHandlers,
    bindCheckboxChangeHandler: bindCheckboxChangeHandler,

    saveToDatabase: function(author: string, text: string, type: string, icon: string): Promise<void> {
        return saveToDatabase(this, author, text, type, icon);
    },

    removeFromDatabase: function(text: string): Promise<void> {
        return removeFromDatabase(this, text);
    }
};