import type { SyhConfig, SelectorValue } from '../../config';
import type { SyhState } from '../../core/state';
import type { SyhUtils } from '../../core/utils';
import type { SyhUi } from '../ui/ui';
import type { SyhBannerCreator } from '../../banners/banner_creator';

// `./category` та `./checkbox` імпортують ці типи саме звідси, тому барель
// зобов'язаний їх реекспортувати, а не лише споживати локально.
export type { SyhUtils } from '../../core/utils';
export type { SyhUi } from '../ui/ui';

export interface SyhEventBanners {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    BANNER_CREATOR: SyhBannerCreator | null;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi, bannerCreator?: SyhBannerCreator): void;
    bindEvents(): void;
    bindBannersFilterControls(): void;
    destroy(): void;
}

export interface BannerDeleteCounts {
    all: number;
    stream: number;
    audience: number;
    prayer: number;
}