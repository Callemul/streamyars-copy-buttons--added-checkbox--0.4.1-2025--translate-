import type { SyhState } from '../../state';
import type { PrayerItem } from '../../types';
import type { SelectorValue } from '../../config';

export interface SyhUiState {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    activeFilter: string;
    searchQuery: string;
    prayersCache: PrayerItem[];
    bannerActiveFilter: string;
    bannerSearchQuery: string;
    bannerCategoriesCache: Record<string, string>;
    _filterBannersTimeout?: ReturnType<typeof setTimeout> | number;
    _filterCommentsTimeout?: ReturnType<typeof setTimeout> | number;
}

// SyhUi interface combines state and UI methods
export interface SyhUi extends SyhUiState {
    // Comments UI methods
    addButtonsToComment(commentNode: Element): void;
    updateCommentVisuals(commentWrap: Element, type: string): void;
    applySavedLabels(commentNode: Element, text: string): void;
    addStarredTabControls(starredHeaderNode: Element): void;
    addStarredTabCopyButton(starredTabNode: Element): void;
    bindStarredControls(): void;
    filterStarredComments(): void;
    scrollToActiveComment(): void;

    // Banner UI methods
    addButtonsToBanner(bannerNode: Element): void;
    updateBannerVisuals(bannerBlock: Element, type: string): void;
    applySavedBannerLabels(bannerNode: Element, text: string): void;
    addBannerHeaderControls(headerNode: Element): void;
    updateMasterCheckboxState(): void;
    filterBanners(): void;
    scrollToActiveBanner(): void;
    
    // Init and validation
    init(config?: import('../../config').SyhConfig, state?: SyhState): void;
    validateSelectorsSyntax(): void;
    restoreDomCheckboxes(): void;
}

import { SYH_BUS } from '../../event_bus';

class SyhUiStateManager implements SyhUiState {
    public SELECTORS: Record<string, string | string[]> | null = null;
    public STATE: SyhState | null = null;
    
    private _activeFilter: string = 'all';
    private _searchQuery: string = '';
    private _bannerActiveFilter: string = 'all';
    private _bannerSearchQuery: string = '';

    public prayersCache: PrayerItem[] = [];
    public bannerCategoriesCache: Record<string, string> = {};
    public _filterBannersTimeout?: ReturnType<typeof setTimeout> | number = undefined;
    public _filterCommentsTimeout?: ReturnType<typeof setTimeout> | number = undefined;

    get activeFilter(): string {
        return this._activeFilter;
    }
    set activeFilter(val: string) {
        if (this._activeFilter !== val) {
            this._activeFilter = val;
            SYH_BUS.emit('FILTER_COMMENTS_REQUESTED', { filter: val, query: this._searchQuery });
        }
    }

    get searchQuery(): string {
        return this._searchQuery;
    }
    set searchQuery(val: string) {
        if (this._searchQuery !== val) {
            this._searchQuery = val;
            SYH_BUS.emit('FILTER_COMMENTS_REQUESTED', { filter: this._activeFilter, query: val });
        }
    }

    get bannerActiveFilter(): string {
        return this._bannerActiveFilter;
    }
    set bannerActiveFilter(val: string) {
        if (this._bannerActiveFilter !== val) {
            this._bannerActiveFilter = val;
            SYH_BUS.emit('FILTER_BANNERS_REQUESTED', { filter: val, query: this._bannerSearchQuery });
        }
    }

    get bannerSearchQuery(): string {
        return this._bannerSearchQuery;
    }
    set bannerSearchQuery(val: string) {
        if (this._bannerSearchQuery !== val) {
            this._bannerSearchQuery = val;
            SYH_BUS.emit('FILTER_BANNERS_REQUESTED', { filter: this._bannerActiveFilter, query: val });
        }
    }
}

export const SYH_UI_STATE: SyhUiState = new SyhUiStateManager();
