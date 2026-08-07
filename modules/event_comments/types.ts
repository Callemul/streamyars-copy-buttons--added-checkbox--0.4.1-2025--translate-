export interface CopyPayload {
    header: string;
    textToCopy: string;
    actionType: 'question' | 'prayer' | 'copy' | null;
    prayerIcon?: string;
}

export interface SyhEventComments {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    TIMINGS: Record<string, number> | null;
    isBound: boolean;
    unregisterAutoHeal?: (() => void) | null;
    _clickHandler?: (e: MouseEvent) => void;
    _middleClickHandler?: (e: MouseEvent) => void;
    _contextHandler?: (e: MouseEvent) => void;
    _changeHandler?: (e: Event) => void;
    _syhButtonMouseDownHandler?: (e: MouseEvent) => void;
    _mouseupHandler?: (e: MouseEvent) => void;
    _copyPrayerContextHandler?: (e: MouseEvent) => void;
    autoHealObserver?: any;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void;
    bindEvents(): void;
    bindAutoHealScanner(): void;
    bindStarButtonClickHandler(): void;
    bindMiddleClickHandler(): void;
    bindContextMenuHandlers(): void;
    bindSyhButtonMouseHandlers(): void;
    bindCheckboxChangeHandler(): void;
    destroy(): void;
    saveToDatabase(author: string, text: string, type: string, icon: string): Promise<void>;
    removeFromDatabase(text: string): Promise<void>;
}

