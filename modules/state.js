const SYH_STATE = {
    itemStates: {},
    lastDate: null,

    init: function(callback) {
        const self = this;
        const today = new Date().toISOString().split('T')[0];

        chrome.storage.local.get(['syh_checkbox_state'], function(result) {
            const stored = result.syh_checkbox_state || {};
            const savedDate = stored.date;
            
            console.log("SYH_STATE: Ініціалізація стану. Збережена дата в кеші:", savedDate, "Поточна дата:", today);

            // Очищення або завантаження стану залежно від поточної дати (Cache Invalidation)
            if (savedDate && savedDate !== today) {
                console.log("SYH_STATE: Виявлено новий день. Очищення стану збережених чекбоксів.");
                self.itemStates = {};
                self.lastDate = today;
                chrome.storage.local.remove('syh_checkbox_state', function() {
                    self.restoreDomCheckboxes();
                    if (callback) callback();
                });
            } else {
                self.itemStates = stored.data || {};
                self.lastDate = savedDate || today;
                console.log("SYH_STATE: Стан успішно завантажено з сховища:", self.itemStates);
                self.restoreDomCheckboxes();
                if (callback) callback();
            }
        });
    },

    restoreDomCheckboxes: function() {
        const self = this;
        const selectors = window.SYH_CONFIG ? window.SYH_CONFIG.SELECTORS : null;
        
        if (!selectors) {
            console.warn("SYH_STATE: Конфігурація SYH_CONFIG ще не завантажена. Чекбокси будуть відновлені при рендерингу в ui.js.");
            return;
        }

        console.log("SYH_STATE: Примусове відновлення стану чекбоксів у DOM для вирішення Race Condition.");
        
        $('.syh-checkbox').each(function() {
            const $checkbox = $(this);
            const type = $checkbox.data('type');
            let textKey = "";

            if (type === 'comment') {
                const $commentBlock = $checkbox.closest(selectors.commentBlock || '[class*="PlatformComment__Wrap"]');
                textKey = $commentBlock.find(selectors.commentText || '[class*="PlatformCommentShell__ContentSpan"]').text();
            } else if (type === 'banner') {
                const $bannerBlock = $checkbox.closest(selectors.bannerBlock || '[class*="Banner__LiWrap"]');
                textKey = $bannerBlock.find(selectors.bannerText || '[class*="Banner__BannerText"]').text();
            }

            if (textKey && self.itemStates[textKey]) {
                $checkbox.prop('checked', true);
            }
        });
    },

    updateState: function(key, isChecked) {
        this.itemStates[key] = isChecked;
        this.saveState();
    },

    getCheckedState: function(key) {
        return !!this.itemStates[key];
    },

    getState: function(key) {
        return !!this.itemStates[key];
    },

    saveState: function() {
        const today = new Date().toISOString().split('T')[0];
        const stateToSave = {
            date: today,
            data: this.itemStates
        };
        chrome.storage.local.set({ 'syh_checkbox_state': stateToSave }, function() {
            console.log("SYH_STATE: Оновлений стан чекбоксів успішно записано в chrome.storage.local.");
        });
    }
};

window.SYH_STATE = SYH_STATE;