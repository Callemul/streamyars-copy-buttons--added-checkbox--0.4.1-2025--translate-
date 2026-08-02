import type { SyhState } from './state';
import type { PrayerItem } from './types';

export interface SyhUiState {
    SELECTORS: Record<string, string | string[]> | null;
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

import { SYH_BUS } from './event_bus';

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
