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
        
        if (!document.getElementById('syh-global-styles')) {
            const style = document.createElement('style');
            style.id = 'syh-global-styles';
            style.innerHTML = `
                /* Звичайний стан: напівпрозорий градієнт */
                div[class*="PlatformComment__Wrap"][data-syh-type="prayer"] > div[class*="PlatformCommentShell__Wrap"] {
                    border-left: 12px solid #005DF7 !important;
                    background: linear-gradient(90deg, rgba(0,93,247,0.15) 0%, rgba(255,255,255,0) 100%) !important;
                }
                div[class*="PlatformComment__Wrap"][data-syh-type="question"] > div[class*="PlatformCommentShell__Wrap"] {
                    border-left: 12px solid #f39c12 !important;
                    background: linear-gradient(90deg, rgba(243,156,18,0.15) 0%, rgba(255,255,255,0) 100%) !important;
                }

                /* АКТИВНИЙ СТАН (виведено на екран): суцільна заливка для контрасту з білими буквами */
                div[class*="PlatformComment__Wrap"][data-syh-type="prayer"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                    background: #005DF7 !important; 
                }
                div[class*="PlatformComment__Wrap"][data-syh-type="question"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                    background: #f39c12 !important;
                }
            `;
            document.head.appendChild(style);
        }

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
            
            if (this.STATE && typeof this.STATE.getCheckedState === 'function' && this.STATE.getCheckedState(commentText)) {
                $targetContainer.find('.syh-checkbox').prop('checked', true);
            }
            this.applySavedLabels(commentNode, commentText);
        }
    },

    updateCommentVisuals: function($commentWrap, type) {
        // Завдяки глобальному CSS нам потрібно лише керувати атрибутом
        if (type === 'prayer') {
            $commentWrap.attr('data-syh-type', 'prayer');
        } else if (type === 'question') {
            $commentWrap.attr('data-syh-type', 'question');
        } else {
            $commentWrap.removeAttr('data-syh-type');
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
            
            // Ін'єкція CSS для анімації пульсації, хрестика та пустого стану
            if (!document.getElementById('syh-starred-styles')) {
                const style = document.createElement('style');
                style.id = 'syh-starred-styles';
                style.innerHTML = `
                    @keyframes syhPulse {
                        0% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(243, 156, 18, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0); }
                    }
                    .syh-search-pulse {
                        animation: syhPulse 0.5s ease-out;
                        border-color: #f39c12 !important;
                    }
                    .syh-search-wrapper { position: relative; width: 100%; }
                    .syh-clear-search {
                        position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                        background: #ccc; color: white; border: none; border-radius: 50%;
                        width: 16px; height: 16px; font-size: 10px; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        padding: 0; transition: 0.2s;
                    }
                    .syh-clear-search:hover { background: #e74c3c; }
                    .syh-empty-state {
                        text-align: center; padding: 20px; color: #666; font-size: 14px;
                        background: #f9f9f9; border-radius: 8px; border: 1px dashed #ccc;
                        margin-top: 15px; display: none;
                    }
                `;
                document.head.appendChild(style);
            }

            const controlsHTML = `
                <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <div class="syh-search-wrapper">
                        <input type="text" id="syh-starred-search" value="${this.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." style="width: 100%; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                        <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${this.searchQuery ? 'flex' : 'none'};" title="Очистити пошук">✕</button>
                    </div>
                    
                    <div style="display: flex; gap: 5px; background: #eee; padding: 3px; border-radius: 6px;">
                        <button class="syh-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'all' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'all' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'all' ? '#000' : '#666'};">Всі ⭐</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'question' ? 'active' : ''}" data-filter="question" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'question' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'question' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'question' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'question' ? '#000' : '#666'};">❓ Питання</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" style="flex: 1; padding: 4px; border: none; border-radius: 4px; background: ${this.activeFilter === 'prayer' ? '#fff' : 'transparent'}; cursor: pointer; font-weight: ${this.activeFilter === 'prayer' ? 'bold' : 'normal'}; box-shadow: ${this.activeFilter === 'prayer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color: ${this.activeFilter === 'prayer' ? '#000' : '#666'};">🙏 Молитовні</button>
                    </div>
                </div>
            `;
            
            $headerWrap.empty().append(controlsHTML);

            // Додаємо плашку про пустий стан, якщо її ще немає
            if (!$('#syh-empty-state-msg').length) {
                $('.StarredCommentList__List-sc-1qtlqu2-1').after(`
                    <div id="syh-empty-state-msg" class="syh-empty-state">
                        Нічого не знайдено по запиту <b id="syh-empty-query"></b><br><br>
                        <a href="#" id="syh-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук</a>
                    </div>
                `);
            }

            this.bindStarredControls();
            setTimeout(() => this.filterStarredComments(), 10);
        }
    },

    bindStarredControls: function() {
        const self = this;
        const $searchInput = $('#syh-starred-search');
        const $clearBtn = $('#syh-clear-search-btn');

        $searchInput.on('input', function() { 
            self.searchQuery = $(this).val().toLowerCase();
            $clearBtn.css('display', self.searchQuery ? 'flex' : 'none');
            self.filterStarredComments(); 
        });

        // Кнопка очищення
        $clearBtn.on('click', function() {
            $searchInput.val('');
            self.searchQuery = '';
            $(this).hide();
            self.filterStarredComments();
        });

        // Кнопка очищення з пустої плашки
        $(document).off('click', '#syh-empty-clear-link').on('click', '#syh-empty-clear-link', function(e) {
            e.preventDefault();
            $clearBtn.click();
        });

        $('.syh-filter-btn').on('click', function() {
            $('.syh-filter-btn').css({'background': 'transparent', 'font-weight': 'normal', 'box-shadow': 'none', 'color': '#666'}).removeClass('active');
            $(this).css({'background': '#fff', 'font-weight': 'bold', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)', 'color': '#000'}).addClass('active');
            
            self.activeFilter = $(this).data('filter');
            self.filterStarredComments();

            // Якщо є текст у пошуку - блимаємо полем вводу для привернення уваги
            if (self.searchQuery) {
                $searchInput.removeClass('syh-search-pulse');
                void $searchInput[0].offsetWidth; // Скидаємо анімацію (trick)
                $searchInput.addClass('syh-search-pulse');
            }
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

        let visibleCount = 0; // Рахуємо скільки відфільтровано

        $commentList.find('> li').each(function() {
            const $li = $(this);
            const $commentWrap = $li.find(self.SELECTORS.commentBlock);
            if (!$commentWrap.length) return;

            const originalText = $commentWrap.find(self.SELECTORS.commentText).text();
            const text = originalText.toLowerCase();
            const author = $commentWrap.find(self.SELECTORS.commentAuthor).text().toLowerCase();
            
            const foundInCache = self.prayersCache.find(item => item.text === originalText);
            const commentType = foundInCache ? foundInCache.type : 'none';
            
            self.updateCommentVisuals($commentWrap, commentType);
            
            let isVisible = true;

            if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;
            if (activeFilter === 'question' && commentType !== 'question') isVisible = false;
            if (searchQuery && !text.includes(searchQuery) && !author.includes(searchQuery)) isVisible = false;

            if (isVisible) {
                $li.show();
                const exactOrder = sortedTexts.indexOf(originalText);
                $li.css('order', exactOrder !== -1 ? exactOrder : 9999);
                visibleCount++; // Збільшуємо лічильник
            } else {
                $li.hide();
                $li.css('order', 9999); 
            }
        });

        // Логіка показу плашки "Нічого не знайдено"
        const $emptyState = $('#syh-empty-state-msg');
        if (visibleCount === 0 && searchQuery) {
            $('#syh-empty-query').text(searchQuery);
            $emptyState.show();
        } else {
            $emptyState.hide();
        }
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