// modules/streamyard_comments/index.ts
//
// ЗАГАЛЬНОСТОРІНКОВІ ОБРОБНИКИ КОМЕНТАРІВ STREAMYARD.
//
// Після T7 дії над коментарем (копіювати / питання / молитва) тут не живуть:
// їх веде `modules/streamyard_adapter.ts` через `CommentInjector`, як на
// YouTube і Studio. У цьому плагіні лишилось те, що прив'язати до окремої
// картки неможливо або неправильно:
//
//   • Auto-Heal — періодичне вирівнювання нашого стану з тим, що показує
//     StreamYard (приховані коментарі, записи без зірки);
//   • зірка платформи — зняття зірки прибирає запис із бази;
//   • коліщатко по картці — знімає зірку;
//   • ПКМ по кнопках платформи — перемикає наш чекбокс;
//   • гасіння автоскролу середньої кнопки над нашими кнопками.

import { SYH_CONFIG, type SyhConfig } from '../../registry/config';
import { SYH_STATE, type SyhState } from '../../core/state';
import { SYH_UTILS, type SyhUtils } from '../../core/utils';
import { SYH_UI, type SyhUi } from '../ui/ui';
import type { ISyhPlugin } from '../../core/plugin_registry';

import type { SyhStreamYardComments } from './types';
import { bindAutoHealScanner } from './auto_heal';
import { bindStarButtonClickHandler, bindMiddleClickHandler, bindContextMenuHandlers, bindSyhButtonMouseHandlers } from './handlers';
import { saveToDatabase, removeFromDatabase } from './prayer_database';
import { formatCopyPayload, getPrayerIcon, stripLeadingAt } from './format';
import { applyCommentActionState } from './action_effects';

export { getPrayerIcon, stripLeadingAt, formatCopyPayload };
export { applyCommentActionState };

export const SYH_STREAMYARD_COMMENTS_PLUGIN: ISyhPlugin = {
    id: 'syh_streamyard_comments',
    name: 'StreamYard Comments Handler',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_STREAMYARD_COMMENTS.init();
        SYH_STREAMYARD_COMMENTS.bindEvents();
    }
};

export const SYH_STREAMYARD_COMMENTS: SyhStreamYardComments = {
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
    },

    bindAutoHealScanner: bindAutoHealScanner,
    bindStarButtonClickHandler: bindStarButtonClickHandler,
    bindMiddleClickHandler: bindMiddleClickHandler,
    bindContextMenuHandlers: bindContextMenuHandlers,
    bindSyhButtonMouseHandlers: bindSyhButtonMouseHandlers,

    saveToDatabase: function(author: string, text: string, type: string, icon: string): Promise<void> {
        return saveToDatabase(this, author, text, type, icon);
    },

    removeFromDatabase: function(text: string): Promise<void> {
        return removeFromDatabase(this, text);
    }
};