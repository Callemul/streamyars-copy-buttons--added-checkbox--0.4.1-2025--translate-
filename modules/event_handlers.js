// modules/event_handlers.js
window.SYH_EVENT_HANDLERS = {
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

        $(document).on('click', '.syh-button', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const action = $button.data('action');
            const type = $button.data('type');

            if (action === 'create-from-text') {
                const text = prompt("Вставте список питань для створення банерів:", "");
                if (text) self.BANNER_CREATOR.processAndCreateBanners(text);
                return;
            }
            
            if (action === 'delete-selected-banners') {
                const $checkedBanners = $('.syh-checkbox[data-type="banner"]:checked');
                if ($checkedBanners.length === 0) {
                    alert("Немає вибраних банерів для видалення.");
                    return;
                }
                if (confirm(`Ви впевнені, що хочете видалити ${$checkedBanners.length} банер(ів)?`)) {
                    $checkedBanners.each(function() {
                        const deleteButton = $(this).closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerDeleteButton)[0];
                        if (deleteButton) {
                            deleteButton.click();
                        } else {
                            console.error("Не вдалося знайти кнопку видалення для банера:", $(this).closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerText).text());
                        }
                    });
                }
                return;
            }

            if (type === 'comment') {
                const $commentBlock = $button.closest(self.SELECTORS.commentBlock);
                const author = $commentBlock.find(self.SELECTORS.commentAuthor).text();
                const comment = $commentBlock.find(self.SELECTORS.commentText).text();
                let textToCopy, header;
                if (action === 'copy-comment') { header = "📄 Комент (без автора)"; textToCopy = comment; }
                else if (action === 'copy-author-comment') { header = "📑 Автор і його 📄 комент"; textToCopy = `${author}\n\n${comment}`; }
                else if (action === 'copy-prayer') { header = "📑 Автор і його 🙏 прохання"; textToCopy = `\n\n\n🙏🙏🙏 ${author}\n\n${comment}`; }
                
                if (textToCopy) {
                    self.UTILS.copyAndShowBanner(textToCopy, header);
                    $commentBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
                    if (action === 'copy-author-comment') {
                        const $starButton = $commentBlock.find(self.SELECTORS.starButton);
                        if ($starButton.length > 0 && $starButton.attr('aria-selected') === 'false') $starButton.trigger('click');
                    }
                }
            } else if (type === 'banner') {
                const $bannerBlock = $button.closest(self.SELECTORS.bannerBlock);
                const bannerText = $bannerBlock.find(self.SELECTORS.bannerText).text();
                self.UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                $bannerBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
            }
        });

        $(document).on('click', '.syh-checkbox', function(e) {
            e.stopPropagation();
        });

        $(document).on('change', '.syh-checkbox', function(e) {
            const $checkbox = $(this);
            const type = $checkbox.data('type');
            let textKey = '';
            if (type === 'comment') textKey = $checkbox.closest(self.SELECTORS.commentBlock).find(self.SELECTORS.commentText).text();
            else if (type === 'banner') textKey = $checkbox.closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerText).text();
            
            self.STATE.updateState(textKey, $checkbox.is(':checked'));
            if (type === 'banner') self.UI.updateMasterCheckboxState();
        });

        $(document).on('change', '.syh-master-checkbox', function() {
            const isChecked = $(this).is(':checked');
            $(this).prop('indeterminate', false);
            $(self.SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]').prop('checked', isChecked).trigger('change');
        });
    }
};