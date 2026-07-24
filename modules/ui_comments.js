import { SYH_UI } from './ui_core.js';
import { SYH_UTILS } from './utils.js';

// Розширення єдиного об'єкта SYH_UI логікою рендерингу та фільтрації коментарів
Object.assign(SYH_UI, {
    
    // Додавання кастомних кнопок копіювання/маркування під коментар
    addButtonsToComment: function(commentNode) {
        const $targetContainer = $(commentNode).find(this.SELECTORS.commentButtonContainer);
        if ($targetContainer.length > 0 && !$targetContainer.find('.syh-custom-buttons-comment').length) {
            const buttonsHTML = `
                <div class="syh-custom-buttons-comment">
                    <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар" aria-label="Копіювати тільки коментар">📄</button>
                    <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Відмітити як Питання" aria-label="Відмітити як Питання">❓</button>
                    <button class="syh-button" data-type="comment" data-action="copy-prayer" title="ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️" aria-label="Відмітити як Молитву">🙏</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване" aria-label="Відмітити коментар як опрацьований">
                    </div>
                </div>`;
            $targetContainer.append(buttonsHTML);
            
            const commentText = $(commentNode).find(this.SELECTORS.commentText).text();
            
            if (this.STATE && typeof this.STATE.getState === 'function' && this.STATE.getState(commentText)) {
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
            // Оновлено: повертаємо класичний знак питання ❓ для вкладки коментарів
            const controlsHTML = `
                <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <div class="syh-search-wrapper">
                        <input type="text" id="syh-starred-search" value="${this.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." aria-label="Пошук по імені або тексту" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                        <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${this.searchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук коментарів">✕</button>
                        <button id="syh-scroll-to-active-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до коментаря на екрані" aria-label="Повернутися до коментаря на екрані">🎯</button>
                    </div>
                    
                    <div role="tablist" aria-label="Фільтри коментарів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                        <button role="tab" aria-selected="${this.activeFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі коментарі" class="syh-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-comment-filter-all">
                            <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                        </button>
                        <button role="tab" aria-selected="${this.activeFilter === 'question' ? 'true' : 'false'}" aria-label="Показати питання" class="syh-filter-btn ${this.activeFilter === 'question' ? 'active' : ''}" data-filter="question" id="syh-comment-filter-question">
                            <span>❓</span><span class="tab-text">Питання</span><span class="tab-count"></span>
                        </button>
                        <button role="tab" aria-selected="${this.activeFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитви" class="syh-filter-btn ${this.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-comment-filter-prayer">
                            <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                        </button>
                        <button role="tab" aria-selected="${this.activeFilter === 'other' ? 'true' : 'false'}" aria-label="Показати інші коментарі" class="syh-filter-btn ${this.activeFilter === 'other' ? 'active' : ''}" data-filter="other" id="syh-comment-filter-other" style="display: none;">
                            <span>📝</span><span class="tab-text">Інші</span><span class="tab-count"></span>
                        </button>
                    </div>
                </div>
            `;
            
            $headerWrap.empty().append(controlsHTML);

            if (!$('#syh-empty-state-msg').length) {
                $(this.SELECTORS.starredList).after(`
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

        $searchInput.off('input').on('input', function() { 
            self.searchQuery = $(this).val().toLowerCase();
            $clearBtn.css('display', self.searchQuery ? 'flex' : 'none');
            self.filterStarredComments(); 
        });

        $clearBtn.off('click').on('click', function() {
            $searchInput.val('');
            self.searchQuery = '';
            $(this).hide();
            self.filterStarredComments();
        });

        $('#syh-scroll-to-active-btn').off('click').on('click', function(e) {
            e.preventDefault();
            self.scrollToActiveComment();
        });

        $(document).off('click', '#syh-empty-clear-link').on('click', '#syh-empty-clear-link', function(e) {
            e.preventDefault();
            $searchInput.val('');
            self.searchQuery = '';
            $clearBtn.hide();
            // ФІКС 2: При скиданні пошуку більше не скидаємо вкладку у "Всі". Залишаємось на поточній!
            self.filterStarredComments();
        });

        $('.syh-filter-btn').off('click').on('click', function() {
            $('.syh-filter-btn')
                .css({'background': 'transparent', 'font-weight': 'normal', 'box-shadow': 'none', 'color': '#666'})
                .removeClass('active')
                .attr('aria-selected', 'false');
            $(this)
                .css({'background': '#fff', 'font-weight': 'bold', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)', 'color': '#000'})
                .addClass('active')
                .attr('aria-selected', 'true');
            
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
        const $commentList = $(this.SELECTORS.starredList);
        if (!$commentList.length) return;

        const activeFilter = this.activeFilter;
        const searchQuery = this.searchQuery;
        const self = this;

        const safeHtmlUpdate = (jqEl, newHtml) => {
            if (jqEl.length && jqEl.html() !== newHtml) jqEl.html(newHtml);
        };
        const safeTextUpdate = (selector, newText) => {
            const el = $(selector);
            if (el.length && el.text() !== newText) el.text(newText);
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
        let countAbsolute = { all: 0, question: 0, prayer: 0, other: 0 };
        let countSearch = { all: 0, question: 0, prayer: 0, other: 0 };

        $commentList.find('> li').each(function() {
            const $li = $(this);
            
            // ІГНОРУВАННЯ МЕРТВИХ ВУЗЛІВ: Пропускаємо коментарі, з яких щойно зняли зірку
            if ($li.attr('data-syh-deleted') === 'true') return;

            const $commentWrap = $li.find(self.SELECTORS.commentBlock);
            if (!$commentWrap.length) return;

            const originalText = $commentWrap.find(self.SELECTORS.commentText).text();
            const authorText = $commentWrap.find(self.SELECTORS.commentAuthor).text();
            
            const foundInCache = self.prayersCache.find(item => item.text === originalText);
            const commentType = foundInCache ? foundInCache.type : 'none';
            
            self.updateCommentVisuals($commentWrap, commentType);
            
            countAbsolute.all++;
            if (commentType === 'question') countAbsolute.question++;
            else if (commentType === 'prayer') countAbsolute.prayer++;
            else countAbsolute.other++;
            
            let matchesSearch = true;
            if (searchQuery) {
                const combinedTarget = originalText + " " + authorText;
                matchesSearch = window.SYH_UTILS && typeof window.SYH_UTILS.smartSearch === 'function'
                    ? window.SYH_UTILS.smartSearch(searchQuery, combinedTarget)
                    : combinedTarget.toLowerCase().includes(searchQuery.toLowerCase());
            }

            if (matchesSearch) {
                countSearch.all++;
                if (commentType === 'question') countSearch.question++;
                else if (commentType === 'prayer') countSearch.prayer++;
                else countSearch.other++;
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

        const $otherTabBtn = $('#syh-comment-filter-other');
        if (countAbsolute.other === 0) {
            if ($otherTabBtn.css('display') !== 'none') $otherTabBtn.hide();
            
            if (this.activeFilter === 'other') {
                this.activeFilter = 'all';
                $('.syh-filter-btn').removeClass('active');
                $('#syh-comment-filter-all').addClass('active');
                return this.filterStarredComments(); 
            }
        } else {
            if ($otherTabBtn.css('display') === 'none') $otherTabBtn.css('display', 'inline-flex');
        }

        safeTextUpdate('#syh-comment-filter-all .tab-count', ` (${countAbsolute.all})`);
        safeTextUpdate('#syh-comment-filter-question .tab-count', ` (${countAbsolute.question})`);
        safeTextUpdate('#syh-comment-filter-prayer .tab-count', ` (${countAbsolute.prayer})`);
        safeTextUpdate('#syh-comment-filter-other .tab-count', ` (${countAbsolute.other})`);

        const $emptyState = $('#syh-empty-state-msg');
        const $emptyQuery = $('#syh-empty-query');
        const $emptySuggestion = $('#syh-empty-suggestion');

        if (visibleCount === 0) {
            let messageHTML;
            
            if (searchQuery) {
                messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${searchQuery}"</b><br><br>
                <a href="#" id="syh-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;
                
                let suggestions = [];
                if (activeFilter !== 'all' && countSearch.all > 0) {
                    if (countSearch.question > 0 && activeFilter !== 'question') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="question" style="color: #f39c12; text-decoration: underline;">❓ Питання (${countSearch.question})</a>`);
                    if (countSearch.prayer > 0 && activeFilter !== 'prayer') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="prayer" style="color: #f39c12; text-decoration: underline;">🙏 Молитви (${countSearch.prayer})</a>`);
                    if (countSearch.other > 0 && activeFilter !== 'other') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="other" style="color: #f39c12; text-decoration: underline;">📝 Інші (${countSearch.other})</a>`);
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
                    'question': 'категорії "❓ Питання"', 
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
        const $commentList = $(this.SELECTORS.starredList);
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

if (typeof window !== 'undefined') {
    window.SYH_UI = SYH_UI;
}

export { SYH_UI };