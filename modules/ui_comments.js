// ui_comments.js
// Розширення єдиного об'єкта SYH_UI логікою рендерингу та фільтрації коментарів
Object.assign(window.SYH_UI, {
    
    // Додавання кастомних кнопок копіювання/маркування під коментар
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

    // Оновлення кольорового маркування коментаря за атрибутом
    updateCommentVisuals: function($commentWrap, type) {
        if (type === 'prayer') {
            $commentWrap.attr('data-syh-type', 'prayer');
        } else if (type === 'question') {
            $commentWrap.attr('data-syh-type', 'question');
        } else {
            $commentWrap.removeAttr('data-syh-type');
        }
    },

    // Перевірка та автоматичне забарвлення коментаря при першому монтуванні
    applySavedLabels: function(commentNode, text) {
        if (!text || !text.trim()) return; 
        
        const found = this.prayersCache.find(item => item.text === text);
        const type = found ? found.type : 'none';
        this.updateCommentVisuals($(commentNode), type);
    },

    // Створення елементів пошуку та фільтрації у шапці вкладки Starred коментарів
    addStarredTabControls: function(starredHeaderNode) {
        const $headerWrap = $(starredHeaderNode);
        if ($headerWrap.length > 0 && !$headerWrap.find('.syh-starred-controls').length) {
            
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
                    .syh-search-wrapper { position: relative; width: 100%; display: flex; gap: 6px; align-items: center; }
                    .syh-clear-search {
                        position: absolute; right: 40px; top: 50%; transform: translateY(-50%);
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
                    .syh-filter-btn {
                        flex: 1; padding: 4px; border: none; border-radius: 4px;
                        background: transparent; cursor: pointer; font-size: 11px;
                        color: #666; font-weight: normal; transition: 0.2s;
                    }
                    .syh-filter-btn.active {
                        background: #fff !important; font-weight: bold !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important; color: #000 !important;
                    }
                `;
                document.head.appendChild(style);
            }

            const controlsHTML = `
                <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <div class="syh-search-wrapper">
                        <input type="text" id="syh-starred-search" value="${this.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                        <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${this.searchQuery ? 'flex' : 'none'};" title="Очистити пошук">✕</button>
                        <button id="syh-scroll-to-active-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до коментаря на екрані">🎯</button>
                    </div>
                    
                    <div style="display: flex; gap: 5px; background: #eee; padding: 3px; border-radius: 6px;">
                        <button class="syh-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">Всі ⭐</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'question' ? 'active' : ''}" data-filter="question">🎙️ Питання</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer">🙏 Молитви</button>
                        <button class="syh-filter-btn ${this.activeFilter === 'other' ? 'active' : ''}" data-filter="other">📝 Інші</button>
                    </div>
                </div>
            `;
            
            $headerWrap.empty().append(controlsHTML);

            if (!$('#syh-empty-state-msg').length) {
                $('.StarredCommentList__List-sc-1qtlqu2-1').after(`
                    <div id="syh-empty-state-msg" class="syh-empty-state">
                        <div id="syh-empty-query"></div>
                        <div id="syh-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                    </div>
                `);
            }

            this.bindStarredControls();
            setTimeout(() => this.filterStarredComments(), 10);
        }
    },

    // Зв'язування подій текстового пошуку та кнопок фільтра коментарів
    bindStarredControls: function() {
        const self = this;
        const $searchInput = $('#syh-starred-search');
        const $clearBtn = $('#syh-clear-search-btn');

        $searchInput.on('input', function() { 
            self.searchQuery = $(this).val().toLowerCase();
            $clearBtn.css('display', self.searchQuery ? 'flex' : 'none');
            self.filterStarredComments(); 
        });

        $clearBtn.on('click', function() {
            $searchInput.val('');
            self.searchQuery = '';
            $(this).hide();
            self.filterStarredComments();
        });

        $('#syh-scroll-to-active-btn').on('click', function(e) {
            e.preventDefault();
            self.scrollToActiveComment();
        });

        $(document).off('click', '#syh-empty-clear-link').on('click', '#syh-empty-clear-link', function(e) {
            e.preventDefault();
            $searchInput.val('');
            self.searchQuery = '';
            $clearBtn.hide();
            $('.syh-filter-btn[data-filter="all"]').click(); 
        });

        $('.syh-filter-btn').on('click', function() {
            $('.syh-filter-btn').css({'background': 'transparent', 'font-weight': 'normal', 'box-shadow': 'none', 'color': '#666'}).removeClass('active');
            $(this).css({'background': '#fff', 'font-weight': 'bold', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)', 'color': '#000'}).addClass('active');
            
            self.activeFilter = $(this).data('filter');
            self.filterStarredComments();

            if (self.searchQuery) {
                $searchInput.removeClass('syh-search-pulse');
                void $searchInput[0].offsetWidth; 
                $searchInput.addClass('syh-search-pulse');
            }
        });
    },

    // Головний метод фільтрації списку Starred коментарів
    filterStarredComments: function() {
        const $commentList = $('.StarredCommentList__List-sc-1qtlqu2-1');
        if (!$commentList.length) return;

        const activeFilter = this.activeFilter;
        const searchQuery = this.searchQuery;
        const self = this;

        const safeHtmlUpdate = (jqEl, newHtml) => {
            if (jqEl.length && jqEl.html() !== newHtml) jqEl.html(newHtml);
        };

        const normalizeText = (str) => {
            if (!str) return "";
            let normalized = str.toLowerCase().trim();
            const replacementMap = {
                'a': 'а', 'e': 'е', 'o': 'о', 'i': 'і', 'c': 'с', 'p': 'р', 'x': 'х', 'y': 'у', 't': 'т', 'h': 'н'
            };
            for (const char in replacementMap) {
                normalized = normalized.replaceAll(char, replacementMap[char]);
            }
            return normalized;
        };

        const queryWords = searchQuery ? searchQuery.toLowerCase().split(/\s+/).filter(Boolean).map(normalizeText) : [];
        const matchesQuery = (targetText) => {
            const normalizedTarget = normalizeText(targetText);
            return queryWords.every(word => normalizedTarget.includes(word));
        };

        let sortedTexts = [];
        let grouped = {};
        
        self.prayersCache.forEach(p => {
            if (activeFilter === 'prayer' && p.type !== 'prayer') return;
            if (activeFilter === 'question' && p.type !== 'question') return;
            if (activeFilter === 'other') return; 
            
            const cleanAuthor = p.author.replace(/^@+/, '');
            if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
            grouped[cleanAuthor].push(p.text);
        });

        for (let author in grouped) {
            sortedTexts = sortedTexts.concat(grouped[author]);
        }

        if ($commentList.css('display') !== 'flex') $commentList.css({ 'display': 'flex', 'flex-direction': 'column' });

        let visibleCount = 0;
        let countInTabs = { all: 0, question: 0, prayer: 0, other: 0 };

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
            
            let matchesSearch = true;
            if (searchQuery) matchesSearch = matchesQuery(text) || matchesQuery(author);

            if (matchesSearch) {
                countInTabs.all++;
                if (commentType === 'question') countInTabs.question++;
                else if (commentType === 'prayer') countInTabs.prayer++;
                else countInTabs.other++;
            }

            let isVisible = matchesSearch;

            if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;
            if (activeFilter === 'question' && commentType !== 'question') isVisible = false;
            if (activeFilter === 'other' && commentType !== 'none') isVisible = false;

            if (isVisible) {
                if ($li.css('display') === 'none') $li.show();
                const exactOrder = sortedTexts.indexOf(originalText);
                const targetOrder = exactOrder !== -1 ? exactOrder : 9999;
                if (parseInt($li.css('order')) !== targetOrder) $li.css('order', targetOrder);
                visibleCount++;
            } else {
                if ($li.css('display') !== 'none') $li.hide();
                if (parseInt($li.css('order')) !== 9999) $li.css('order', 9999); 
            }
        });

        const $emptyState = $('#syh-empty-state-msg');
        const $emptyQuery = $('#syh-empty-query');
        const $emptySuggestion = $('#syh-empty-suggestion');

        if (visibleCount === 0) {
            let messageHTML = '';
            
            if (searchQuery) {
                messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${searchQuery}"</b><br><br>
                <a href="#" id="syh-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук</a>`;
                
                let suggestions = [];
                if (activeFilter !== 'all' && countInTabs.all > 0) {
                    if (countInTabs.question > 0 && activeFilter !== 'question') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="question" style="color: #f39c12; text-decoration: underline;">🎙️ Питання (${countInTabs.question})</a>`);
                    if (countInTabs.prayer > 0 && activeFilter !== 'prayer') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="prayer" style="color: #f39c12; text-decoration: underline;">🙏 Молитви (${countInTabs.prayer})</a>`);
                    if (countInTabs.other > 0 && activeFilter !== 'other') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="other" style="color: #f39c12; text-decoration: underline;">📝 Інші (${countInTabs.other})</a>`);
                }
                
                if (suggestions.length > 0) {
                    safeHtmlUpdate($emptySuggestion, `Знайдено в інших категоріях: ` + suggestions.join(', '));
                    if ($emptySuggestion.css('display') === 'none') $emptySuggestion.show();
                    
                    $('.syh-switch-tab').off('click').on('click', function(e) {
                        e.preventDefault();
                        const filter = $(this).data('filter');
                        $(`.syh-filter-btn[data-filter="${filter}"]`).click();
                    });
                } else {
                    if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
                }
            } else {
                if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
                const filterNames = { 
                    'all': 'списку коментарів', 
                    'question': 'категорії "🎙️ Питання"', 
                    'prayer': 'категорії "🙏 Молитви"', 
                    'other': 'категорії "📝 Інші"' 
                };
                messageHTML = `<span style="color: #777;">Тут ще немає коментарів для ${filterNames[activeFilter]}</span>`;
            }

            safeHtmlUpdate($emptyQuery, messageHTML);
            if ($emptyState.css('display') === 'none') $emptyState.show();
        } else {
            if ($emptyState.css('display') !== 'none') $emptyState.hide();
            if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
        }
    },

    // Скрол до поточного виведеного на екран коментаря (ручний виклик)
    scrollToActiveComment: function() {
        const $commentList = $('.StarredCommentList__List-sc-1qtlqu2-1');
        if ($commentList.length) {
            const $activeLi = $commentList.find('> li:has(.lucide-circle-minus)');
            if ($activeLi.length) {
                const el = $activeLi[0];
                const rect = el.getBoundingClientRect();
                const scrollParent = el.closest('div[class*="Scroll"]');
                if (scrollParent) {
                    const parentRect = scrollParent.getBoundingClientRect();
                    const isVisible = (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom);
                    if (!isVisible) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }
});