// youtube/studio/studio_storage_handler.ts
import { SYH_STORAGE } from '../../modules/storage';
import { STORAGE_KEYS } from '../../modules/storage_keys';
import { VIDEO_MAP_STORAGE_KEY } from './studio_video_map';
import { STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key';
import { getAllSheetIds as getSheetIds } from '../../modules/sheets';
import { getSheetCollectedStorageKey } from '../../modules/storage';
import type { SheetHeaderStats } from './studio_header_counters';
import { buildCollectedAggregation } from './studio_aggregator';
import { type StudioModuleCaches } from './studio_init';

const STUDIO_ENABLED_KEY = STORAGE_KEYS.STUDIO_ENABLED;

type ChangeHandler = (controller: StudioStorageController, newValue: any) => void;

export class StudioStorageController {
    public enabled: boolean = true;
    public caches: StudioModuleCaches = {
        videoSheetMap: {},
        buttonStates: {},
        checkboxStates: {},
        collectedItems: []
    };
    public sheetStatsMap: Record<string, SheetHeaderStats> = {};
    public channelInfo: { key: string; label: string } | null = null;
    public scheduleProcessComments: (forceUpdate: boolean) => void = () => {};
    public updateHeaderCounters: () => void = () => {};

    private changeHandlers: Record<string, ChangeHandler> = {
        [STUDIO_ENABLED_KEY]: (ctrl, newValue) => {
            ctrl.enabled = newValue ?? true;
            console.log('[SYH Studio] Studio enabled state changed to:', ctrl.enabled);
            ctrl.handleStateChange();
        },
        [VIDEO_MAP_STORAGE_KEY]: (ctrl, newValue) => {
            ctrl.caches.videoSheetMap = newValue || {};
            ctrl.scheduleProcessComments(true);
        },
        [STUDIO_BUTTON_STATE_KEY]: (ctrl, newValue) => {
            ctrl.caches.buttonStates = newValue || {};
            ctrl.scheduleProcessComments(true);
        },
        [STUDIO_CHECKBOX_STATE_KEY]: (ctrl, newValue) => {
            ctrl.caches.checkboxStates = newValue || {};
            ctrl.scheduleProcessComments(true);
        }
    };

    private collectedKeySet: Set<string> = new Set();

    constructor() {
        this.setupCollectedKeysHandlers();
    }

    private setupCollectedKeysHandlers(): void {
        const sheetIds = getSheetIds();
        sheetIds.forEach((sId) => {
            const key = getSheetCollectedStorageKey(sId);
            this.collectedKeySet.add(key);
            this.changeHandlers[key] = (ctrl, _newValue) => {
                ctrl.loadStorageData().then(() => {
                    ctrl.updateHeaderCounters();
                    ctrl.scheduleProcessComments(true);
                }).catch(err => console.error('[SYH Studio] Storage sync failed:', err));
            };
        });
    }

    public async loadStorageData(): Promise<void> {
        const sheetIds = getSheetIds();
        const collectedKeys = sheetIds.map((sId) => getSheetCollectedStorageKey(sId));
        const keysToFetch = [
            STUDIO_ENABLED_KEY,
            VIDEO_MAP_STORAGE_KEY,
            STUDIO_BUTTON_STATE_KEY,
            STUDIO_CHECKBOX_STATE_KEY,
            ...collectedKeys
        ];

        const res = await SYH_STORAGE.getAsync<Record<string, any>>(keysToFetch);
        this.enabled = res[STUDIO_ENABLED_KEY] ?? true;
        this.caches.videoSheetMap = res[VIDEO_MAP_STORAGE_KEY] || {};
        this.caches.buttonStates = res[STUDIO_BUTTON_STATE_KEY] || {};
        this.caches.checkboxStates = res[STUDIO_CHECKBOX_STATE_KEY] || {};

        const { collectedItems, sheetStatsMap } = buildCollectedAggregation(res, sheetIds);
        this.caches.collectedItems = collectedItems;
        for (const k of Object.keys(this.sheetStatsMap)) {
            delete this.sheetStatsMap[k];
        }
        Object.assign(this.sheetStatsMap, sheetStatsMap);
    }

    public handleStorageChange(changes: Record<string, any>): void {
        let hasCollectedChange = false;
        for (const [key, handler] of Object.entries(this.changeHandlers)) {
            if (changes[key]) {
                if (this.collectedKeySet.has(key)) {
                    hasCollectedChange = true;
                } else {
                    handler(this, changes[key].newValue);
                }
            }
        }
        if (hasCollectedChange) {
            this.loadStorageData().then(() => {
                this.updateHeaderCounters();
                this.scheduleProcessComments(true);
            }).catch(err => console.error('[SYH Studio] Storage sync failed:', err));
        }
    }

    public handleStateChange(): void {
        // This will be implemented by the main controller
    }
}

export function createStorageChangeHandler(controller: StudioStorageController): (changes: Record<string, any>) => void {
    return (changes: Record<string, any>) => controller.handleStorageChange(changes);
}