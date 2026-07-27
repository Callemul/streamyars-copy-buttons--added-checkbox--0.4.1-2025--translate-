import { SYH_STORAGE } from './storage.ts';
import { SYH_UTILS } from './utils.ts';

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
        const self = this;
        const today = (SYH_UTILS && typeof SYH_UTILS.getTodayDateString === 'function')
            ? SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');

        // Отримання централізованого адаптера сховища
        const storage = SYH_STORAGE || ((window as any).SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage));

        if (!storage) {
            console.error("SYH_STATE: Не знайдено адаптер сховища!");
            if (callback) callback();
            return;
        }

        storage.get(['syh_checkbox_state'], function(result: any) {
            const stored = (result && result.syh_checkbox_state) ? result.syh_checkbox_state : {};
            const savedDate = stored.date;
            
            console.log("SYH_STATE: Ініціалізація стану. Збережена дата в кеші:", savedDate, "Поточна дата:", today);

            // Очищення або завантаження стану залежно від поточної дати (Cache Invalidation)
            if (savedDate && savedDate !== today) {
                console.log("SYH_STATE: Виявлено новий день. Очищення стану збережених чекбоксів.");
                self.itemStates = {};
                self.lastDate = today;
                storage.remove('syh_checkbox_state', function() {
                    if (typeof self.onStateLoaded === 'function') {
                        self.onStateLoaded(self.itemStates);
                    }
                    if (callback) callback();
                });
            } else {
                self.itemStates = stored.data || {};
                self.lastDate = savedDate || today;
                console.log("SYH_STATE: Стан успішно завантажено з сховища:", self.itemStates);
                if (typeof self.onStateLoaded === 'function') {
                    self.onStateLoaded(self.itemStates);
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
        const today = (SYH_UTILS && typeof SYH_UTILS.getTodayDateString === 'function')
            ? SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');
        const stateToSave = {
            date: today,
            data: this.itemStates
        };

        // Отримання централізованого адаптера сховища
        const storage = SYH_STORAGE || ((window as any).SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage));

        if (storage) {
            storage.set({ 'syh_checkbox_state': stateToSave }, function() {
                console.log("SYH_STATE: Оновлений стан чекбоксів успішно записано.");
            });
        } else {
            console.error("SYH_STATE: Не вдалося зберегти стан, адаптер сховища відсутній!");
        }
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_STATE = SYH_STATE;
}
