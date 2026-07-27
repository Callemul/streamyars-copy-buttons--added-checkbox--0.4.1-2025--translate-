import { SYH_STORAGE } from "/modules/storage.ts.js";
import { SYH_UTILS } from "/modules/utils.js.js";

export const SYH_STATE = {
    itemStates: {},
    lastDate: null,
    onStateLoaded: null,

    init: function(callback) {
        const self = this;
        const today = (SYH_UTILS && typeof SYH_UTILS.getTodayDateString === 'function')
            ? SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');

        // Отримання централізованого адаптера сховища
        const storage = SYH_STORAGE || (window.SYH_STORAGE || (window.SYH_UTILS && window.SYH_UTILS.storage));

        if (!storage) {
            console.error("SYH_STATE: Не знайдено адаптер сховища!");
            if (callback) callback();
            return;
        }

        storage.get(['syh_checkbox_state'], function(result) {
            const stored = result.syh_checkbox_state || {};
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

    updateState: function(key, isChecked, delayMs = 150) {
        this.itemStates[key] = isChecked;
        this.saveState(delayMs);
    },

    getState: function(key) {
        return !!this.itemStates[key];
    },

    _saveTimer: null,

    saveState: function(delayMs = 150) {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }

        const self = this;
        const doSave = function() {
            self._saveTimer = null;
            self.saveStateImmediate();
        };

        if (delayMs <= 0) {
            doSave();
        } else {
            this._saveTimer = setTimeout(doSave, delayMs);
        }
    },

    saveStateImmediate: function() {
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
        const storage = SYH_STORAGE || (window.SYH_STORAGE || (window.SYH_UTILS && window.SYH_UTILS.storage));

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
    window.SYH_STATE = SYH_STATE;
}