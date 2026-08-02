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

export const SYH_UI_STATE: SyhUiState = {
    SELECTORS: null,
    STATE: null,
    activeFilter: 'all',
    searchQuery: '',
    prayersCache: [],
    bannerActiveFilter: 'all',
    bannerSearchQuery: '',
    bannerCategoriesCache: {},
    _filterBannersTimeout: undefined,
    _filterCommentsTimeout: undefined
};