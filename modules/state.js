import { SYH_STORAGE } from './storage.ts';
import { SYH_UTILS } from './utils.js';

export const SYH_STATE = {
    itemStates: {},
    lastDate: null,

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
                    if (window.SYH_UI && typeof window.SYH_UI.restoreDomCheckboxes === 'function') {
                        window.SYH_UI.restoreDomCheckboxes();
                    }
                    if (callback) callback();
                });
            } else {
                self.itemStates = stored.data || {};
                self.lastDate = savedDate || today;
                console.log("SYH_STATE: Стан успішно завантажено з сховища:", self.itemStates);
                if (window.SYH_UI && typeof window.SYH_UI.restoreDomCheckboxes === 'function') {
                    window.SYH_UI.restoreDomCheckboxes();
                }
                if (callback) callback();
            }
        });
    },

    updateState: function(key, isChecked) {
        this.itemStates[key] = isChecked;
        this.saveState();
    },

    getState: function(key) {
        return !!this.itemStates[key];
    },

    saveState: function() {
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