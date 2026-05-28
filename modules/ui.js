// ui.js
window.SYH_UI = {
    SELECTORS: null,
    STATE: null,
    activeFilter: 'all', 
    searchQuery: '',     
    prayersCache: [],    

    init: function(config, state) {
        this.SELECTORS = config.SELECTORS;
        this.STATE = state;
        
        const self = this;
        
        chrome.storage.local.get(['syh_prayers'], function(result) {
            self.prayersCache = result.syh_prayers || [];
        });

        chrome.storage.onChanged.addListener(function(changes) {
            if (changes.syh_prayers) {
                self.prayersCache = changes.syh_prayers.newValue || [];
                self.filterStarredComments(); 
            }
        });
    },

    addButtonsToComment: function(commentNode) {
        const $targetContainer = $(commentNode).find(this.SELECTORS.commentButtonContainer);
        if ($targetContainer.length > 0 && !$targetContainer.find('.syh-custom-buttons-comment').length) {
            const buttonsHTML = `
                <div class="syh-custom-buttons-comment">
                    <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар">📄</button>
                    <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Відмітити як Питання">❓</button>
                    <button class="syh-button" data-type="comment" data-action="copy-prayer" title="ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️">🙏</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване">
                    </div>
                </div>`;
            $targetContainer.append(buttonsHTML);
            
            const commentText = $(commentNode).find(this.SELECTORS.commentText).text();
            
            // Відновлення стану збереженого чекбокса
            if (this.STATE && typeof this.STATE.getCheckedState === 'function' && this.STATE.getCheckedState(commentText)) {
                $targetContainer.find('.syh-checkbox').prop('checked', true);
            }
            this.applySavedLabels(commentNode, commentText);
        }
    },

    // --- НОВА ЄДИНА ФУНКЦІЯ ПЕРЕФАРБОВУВАННЯ ---
    updateCommentVisuals: function($commentWrap, type) {
        // Примусово зчищаємо старі тонкі рамки (4px), якщо вони десь зависли
        $commentWrap.css('border-left', 'none');

        const $shell = $commentWrap.find('.PlatformCommentShell__Wrap-sc-reu44y-0');
        
        if (type === 'prayer') {
            $commentWrap.attr('data-syh-type', 'prayer');
            $shell.css({
                'border-left': '12px solid #005DF7',
                'background': 'linear-gradient(90deg, rgba(0,93,247,0.15) 0%, rgba(255,255,255,0) 100%)'
            });
        } else if (type === 'question') {
            $commentWrap.attr('data-syh-type', 'question');
            $shell.css({
                'border-left': '12px solid #f39c12',
                'background': 'linear-gradient(90deg, rgba(243,156,18,0.15) 0%, rgba(255,255,255,0) 100%)'
            });
        } else {
            $commentWrap.removeAttr('data-syh-type');
            $shell.css({
                'border-left': 'none',
                'background': 'none'
            });
        }
    },

    applySavedLabels: function(commentNode, text) {
        const found = this.prayersCache.find(item => item.text === text);
        const type = found ? found.type : 'none';
        this.updateCommentVisuals($(commentNode), type);
    },

    addStarredTabControls: function(starredHeaderNode) {
        const $headerWrap = $(starredHeaderNode);
        if ($headerWrap.length > 0 && !$headerWrap.find('.syh-starred-controls').length) {
            const controlsHTML = `
                <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="syh-starred-search" value="${this.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." style="width: 100%; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
                    
                    <div style="display: flex; gap: 5px; background: #eee; padding: 3px; border-radius: 6px;">
                        <button class="syh-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'all' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'all' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'all' ? '#000' : '#666'};">Всі ⭐</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'question' ? 'active' : ''}" data-filter="question" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'question' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'question' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'question' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'question' ? '#000' : '#666'};">❓ Питання</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'prayer' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'prayer' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'prayer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'prayer' ? '#000' : '#666'};">🙏 Молитовні</button>
                    </div>
                </div>
            `;
            
            $headerWrap.empty().append(controlsHTML);
            this.bindStarredControls();
            setTimeout(() => this.filterStarredComments(), 10);
        }
    },

    bindStarredControls: function() {
        const self = this;
        $('#syh-starred-search').on('input', function() { 
            self.searchQuery = $(this).val().toLowerCase();
            self.filterStarredComments(); 
        });

        $('.syh-filter-btn').on('click', function() {
            $('.syh-filter-btn').css({'background': 'transparent', 'font-weight': 'normal', 'box-shadow': 'none', 'color': '#666'}).removeClass('active');
            $(this).css({'background': '#fff', 'font-weight': 'bold', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)', 'color': '#000'}).addClass('active');
            
            self.activeFilter = $(this).data('filter');
            self.filterStarredComments();
        });
    },

    filterStarredComments: function() {
        const $commentList = $('.StarredCommentList__List-sc-1qtlqu2-1');
        if (!$commentList.length) return;

        const activeFilter = this.activeFilter;
        const searchQuery = this.searchQuery;
        const self = this;

        let sortedTexts = [];
        let grouped = {};
        
        self.prayersCache.forEach(p => {
            if (activeFilter === 'prayer' && p.type !== 'prayer') return;
            if (activeFilter === 'question' && p.type !== 'question') return;
            
            const cleanAuthor = p.author.replace(/^@+/, '');
            if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
            grouped[cleanAuthor].push(p.text);
        });

        for (let author in grouped) {
            sortedTexts = sortedTexts.concat(grouped[author]);
        }

        $commentList.css({ 'display': 'flex', 'flex-direction': 'column' });

        $commentList.find('> li').each(function() {
            const $li = $(this);
            const $commentWrap = $li.find(self.SELECTORS.commentBlock);
            if (!$commentWrap.length) return;

            const originalText = $commentWrap.find(self.SELECTORS.commentText).text();
            const text = originalText.toLowerCase();
            const author = $commentWrap.find(self.SELECTORS.commentAuthor).text().toLowerCase();
            
            const foundInCache = self.prayersCache.find(item => item.text === originalText);
            const commentType = foundInCache ? foundInCache.type : 'none';
            
            // Всі візуальні апдейти тепер йдуть через одну функцію
            self.updateCommentVisuals($commentWrap, commentType);
            
            let isVisible = true;

            if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;
            if (activeFilter === 'question' && commentType !== 'question') isVisible = false;
            if (searchQuery && !text.includes(searchQuery) && !author.includes(searchQuery)) isVisible = false;

            if (isVisible) {
                $li.show();
                const exactOrder = sortedTexts.indexOf(originalText);
                $li.css('order', exactOrder !== -1 ? exactOrder : 9999);
            } else {
                $li.hide();
                $li.css('order', 9999); 
            }
        });
    },

    addButtonsToBanner: function(bannerNode) {
        const $bannerWrap = $(bannerNode).find(this.SELECTORS.bannerWrap);
        if ($bannerWrap.length > 0 && !$bannerWrap.find('.syh-banner-controls').length) {
            const buttonsHTML = `
                <div class="syh-banner-controls">
                    <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера">📋</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване">
                    </div>
                </div>`;
            $bannerWrap.append(buttonsHTML);
            const bannerText = $(bannerNode).find(this.SELECTORS.bannerText).text();
            
            // Відновлення стану збереженого чекбокса на банерах
            if (this.STATE && typeof this.STATE.getCheckedState === 'function' && this.STATE.getCheckedState(bannerText)) {
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