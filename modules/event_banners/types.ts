import type { SyhConfig, SelectorValue } from '../config';
import type { SyhState } from '../state';
import type { SyhUtils } from '../utils';
import type { SyhUi } from '../ui';
import type { SyhBannerCreator } from '../banner_creator';

// `./category` та `./checkbox` імпортують ці типи саме звідси, тому барель
// зобов'язаний їх реекспортувати, а не лише споживати локально.
export type { SyhUtils } from '../utils';
export type { SyhUi } from '../ui';

export interface SyhEventBanners {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    BANNER_CREATOR: SyhBannerCreator | null;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi, bannerCreator?: SyhBannerCreator): void;
    bindEvents(): void;
    bindBannersFilterControls(): void;
}

export interface BannerDeleteCounts {
    all: number;
    stream: number;
    audience: number;
    prayer: number;
}