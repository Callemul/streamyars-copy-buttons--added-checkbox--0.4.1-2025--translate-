// event_banners.js
window.SYH_EVENT_BANNERS = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,
    BANNER_CREATOR: null,

    init: function(config, state, utils, ui, bannerCreator) {
        this.SELECTORS = config.SELECTORS;
        this.STATE = state;
        this.UTILS = utils;
        this.UI = ui;
        this.BANNER_CREATOR = bannerCreator;
    },

    bindEvents: function() {
        const self = this;

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ ПКМ ДЛЯ БАНЕРІВ (ПКМ ЧЕКБОКС) ---
        document.addEventListener('contextmenu', function(e) {
            const bannerBlock = e.target.closest(self.SELECTORS.bannerBlock);
            if (bannerBlock) {
                // Запобігаємо перехопленню, якщо клікнули на текстове поле, чекбокс або кастомні кнопки керування всередині банера
                if (e.target.closest('input, textarea, button, .syh-button')) return;

                e.preventDefault();
                e.stopPropagation();
                const checkbox = bannerBlock.querySelector('.syh-checkbox[data-type="banner"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const textKey = bannerBlock.querySelector(self.SELECTORS.bannerText)?.textContent;
                    if (self.STATE && textKey) {
                        self.STATE.updateState(textKey, checkbox.checked);
                        if (self.UI) {
                            self.UI.updateMasterCheckboxState();
                        }
                    }
                }
            }
        }, true);

        // Блокуємо стандартні дії для коліщатка миші на кнопках банерів
        $(document).on('mousedown', '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]', function(e) {
            if (e.button === 1) e.preventDefault(); 
        });

        // Обробка натискання ЛКМ на кнопки керування банерами
        $(document).on('mouseup', '.syh-button', function(e) {
            const $button = $(this);
            const action = $button.data('action');
            const type = $button.data('type');

            // Якщо подія не пов'язана з банерами, негайно завершуємо
            if (type !== 'banner' && action !== 'create-from-text' && action !== 'delete-selected-banners') return;

            e.preventDefault();
            e.stopPropagation();

            if (e.button !== 0) return;

            // Створення банерів з введеного тексту
            if (action === 'create-from-text') {
                const text = prompt("Вставте список питань для створення банерів:", "");
                if (text) self.BANNER_CREATOR.processAndCreateBanners(text);
                return;
            }
            
            // Масове видалення відмічених банерів
            if (action === 'delete-selected-banners') {
                const $checkedBanners = $('.syh-checkbox[data-type="banner"]:checked');
                if ($checkedBanners.length === 0) return;
                
                if (confirm(`Ви впевнені, що хочете видалити ${$checkedBanners.length} банер(ів)?`)) {
                    $checkedBanners.each(function() {
                        const deleteButton = $(this).closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerDeleteButton)[0];
                        if (deleteButton) deleteButton.click();
                    });
                }
                return;
            }

            // Копіювання тексту конкретного банера в буфер
            if (type === 'banner' && action === 'copy-banner') {
                const $bannerBlock = $button.closest(self.SELECTORS.bannerBlock);
                const bannerText = $bannerBlock.find(self.SELECTORS.bannerText).text();
                self.UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                $bannerBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
            }
        });

        // Слухач зміни стану чекбоксу окремого банера
        $(document).on('change', '.syh-checkbox[data-type="banner"]', function(e) {
            const $checkbox = $(this);
            const textKey = $checkbox.closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerText).text();
            
            if (self.STATE) {
                self.STATE.updateState(textKey, $checkbox.is(':checked'));
            }
            if (self.UI) self.UI.updateMasterCheckboxState();
        });

        // Клік по головному (майстер) чекбоксу у списку банерів
        $(document).on('change', '.syh-master-checkbox', function() {
            const isChecked = $(this).is(':checked');
            $(this).prop('indeterminate', false);
            $(self.SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]').prop('checked', isChecked).trigger('change');
        });
    }
};