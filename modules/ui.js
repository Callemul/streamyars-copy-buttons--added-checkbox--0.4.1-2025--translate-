// modules/ui.js
window.SYH_UI = {
    // Залежності, які будуть передані з main.js
    SELECTORS: null,
    STATE: null,

    init: function(config, state) {
        this.SELECTORS = config.SELECTORS;
        this.STATE = state;
    },

    addButtonsToComment: function(commentNode) {
        const $targetContainer = $(commentNode).find(this.SELECTORS.commentButtonContainer);
        if ($targetContainer.length > 0 && !$targetContainer.find('.syh-custom-buttons-comment').length) {
            const buttonsHTML = `
                <div class="syh-custom-buttons-comment">
                    <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар">📄</button>
                    <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Копіювати автора + коментар">📑</button>
                    <button class="syh-button" data-type="comment" data-action="copy-prayer" title="Копіювати як молитовне прохання">🙏</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване">
                    </div>
                </div>`;
            $targetContainer.append(buttonsHTML);
            const commentText = $(commentNode).find(this.SELECTORS.commentText).text();
            if (this.STATE.getCheckedState(commentText)) {
                $targetContainer.find('.syh-checkbox').prop('checked', true);
            }
        }
    },

    addButtonsToBanner: function(bannerNode) {
        const $bannerWrap = $(bannerNode).find(this.SELECTORS.bannerWrap);
        if ($bannerWrap.length > 0 && !$bannerWrap.find('.syh-custom-buttons-banner').length) {
            const buttonsHTML = `
                <div class="syh-custom-buttons-banner">
                    <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера">📋</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване">
                    </div>
                </div>`;
            $bannerWrap.append(buttonsHTML);
            const bannerText = $(bannerNode).find(this.SELECTORS.bannerText).text();
            if (this.STATE.getCheckedState(bannerText)) {
                $bannerWrap.find('.syh-checkbox').prop('checked', true);
            }
        }
    },

    addBannerHeaderControls: function(headerNode) {
        const $header = $(headerNode);
        if ($header.length > 0 && !$header.find('.syh-banner-header-controls').length) {
            const controlsHTML = `
                <div class="syh-banner-header-controls">
                    <button class="syh-button" data-action="create-from-text" title="Створити банери з тексту">📝</button>
                    <label class="syh-master-checkbox-label" title="Вибрати все / Зняти все">
                        <input type="checkbox" class="syh-master-checkbox">
                    </label>
                    <button class="syh-button syh-delete-selected-banners" data-action="delete-selected-banners" title="Видалити вибрані">🗑️</button>
                </div>
            `;
            $header.append(controlsHTML);
            this.updateMasterCheckboxState();
        }
    },

    updateMasterCheckboxState: function() {
        const $masterCheckbox = $('.syh-master-checkbox');
        if (!$masterCheckbox.length) return;
        const $allBannerCheckboxes = $(this.SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]');
        const total = $allBannerCheckboxes.length;
        if (total === 0) {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
            return;
        }
        const checkedCount = $allBannerCheckboxes.filter(':checked').length;
        if (checkedCount === 0) {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
        } else if (checkedCount === total) {
            $masterCheckbox.prop({ 'checked': true, 'indeterminate': false });
        } else {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': true });
        }
    }
};