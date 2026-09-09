import { SYH_STORAGE, STORAGE_KEYS } from './storage';

import { SYH_UTILS } from './utils';

function getTodayDateString(): string {
    return SYH_UTILS.getTodayDateString();
}

export interface SyhState {
    itemStates: Record<string, boolean>;
    lastDate: string | null;
    onStateLoaded: ((states: Record<string, boolean>) => void) | null;
    _saveTimer: ReturnType<typeof setTimeout> | null;

    init(callback?: () => void): void;
    updateState(key: string, isChecked: boolean, delayMs?: number): void;
    getState(key: string): boolean;
    saveState(delayMs?: number): void;
    saveStateImmediate(): void;
}

export const SYH_STATE: SyhState = {
    itemStates: {},
    lastDate: null,
    onStateLoaded: null,
    _saveTimer: null,

    init: function(callback?: () => void): void {
        const today = getTodayDateString();

        SYH_STORAGE.getAsync([STORAGE_KEYS.CHECKBOX_STATE]).then((result) => {
            const stored = result?.[STORAGE_KEYS.CHECKBOX_STATE] || {};
            const savedDate = stored.date;

            console.log("SYH_STATE: Ініціалізація стану. Кеш дата:", savedDate, "Сьогодні:", today);

            if (savedDate && savedDate !== today) {
                console.log("SYH_STATE: Виявлено новий день. Очищення стану чекбоксів.");
                this.itemStates = {};
                this.lastDate = today;
                SYH_STORAGE.removeAsync(STORAGE_KEYS.CHECKBOX_STATE).then(() => {
                    if (typeof this.onStateLoaded === 'function') {
                        this.onStateLoaded(this.itemStates);
                    }
                    if (callback) callback();
                });
            } else {
                this.itemStates = stored.data || {};
                this.lastDate = savedDate || today;
                console.log("SYH_STATE: Стан успішно завантажено:", this.itemStates);
                if (typeof this.onStateLoaded === 'function') {
                    this.onStateLoaded(this.itemStates);
                }
                if (callback) callback();
            }
        });
    },

    updateState: function(key: string, isChecked: boolean, delayMs: number = 150): void {
        this.itemStates[key] = isChecked;
        this.saveState(delayMs);
    },

    getState: function(key: string): boolean {
        return !!this.itemStates[key];
    },

    saveState: function(delayMs: number = 150): void {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }

        const self = this;
        const doSave = function(): void {
            self._saveTimer = null;
            self.saveStateImmediate();
        };

        if (delayMs <= 0) {
            doSave();
        } else {
            this._saveTimer = setTimeout(doSave, delayMs);
        }
    },

    saveStateImmediate: function(): void {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        const today = getTodayDateString();
        const stateToSave = {
            date: today,
            data: this.itemStates
        };

        SYH_STORAGE.setAsync({ [STORAGE_KEYS.CHECKBOX_STATE]: stateToSave }).then(() => {
            console.log("SYH_STATE: Оновлений стан чекбоксів успішно записано.");
        });
    }
};

// Pure ESM Export
