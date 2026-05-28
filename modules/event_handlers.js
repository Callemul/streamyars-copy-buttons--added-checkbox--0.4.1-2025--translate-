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

        // --- БРОНЕБІЙНИЙ СКАНЕР ЛКМ (ВІДМІТКА "ОПРАЦЬОВАНО") ---
        setInterval(() => {
            const coverButtons = document.querySelectorAll('[data-testid="show-comment-button"]');
            coverButtons.forEach(btn => {
                if (btn.textContent.includes('Hide') || btn.querySelector('.lucide-circle-minus')) {
                    const commentBlock = btn.closest(self.SELECTORS.commentBlock);
                    if (commentBlock) {
                        const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            const textKey = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
                            if (self.STATE && textKey) {
                                self.STATE.updateState(textKey, true);
                            }
                        }
                    }
                }
            });
        }, 500);

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ КЛІКІВ (ОБХІД REACT) ---
        document.addEventListener('click', function(e) {
            // Перехоплення зняття Зірочки
            const starBtn = e.target.closest(self.SELECTORS.starButton);
            if (starBtn) {
                // Фаза занурення: aria-selected ще має старе значення. Якщо 'true' - зірочку знімають.
                if (starBtn.getAttribute('aria-selected') === 'true') {
                    const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);
                    if (commentBlock) {
                        const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
                        if (text) {
                            self.removeFromDatabase(text);
                        }
                        if (self.UI) {
                            self.UI.updateCommentVisuals($(commentBlock), 'none');
                        }
                    }
                }
            }
        }, true);

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ ПКМ (ПЕРЕМИКАННЯ ТУДИ-СЮДИ) ---
        document.addEventListener('contextmenu', function(e) {
            const coverBtn = e.target.closest('[data-testid="show-comment-button"], [class*="PlatformComment__CoverButton"]');
            if (coverBtn) {
                e.preventDefault();
                e.stopPropagation();
                const commentBlock = coverBtn.closest(self.SELECTORS.commentBlock);
                if (commentBlock) {
                    const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        const textKey = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
                        if (self.STATE && textKey) {
                            self.STATE.updateState(textKey, checkbox.checked);
                        }
                    }
                }
            }
        }, true);

        // Вимикаємо стандартне меню при кліку правою кнопкою на кнопку 🙏
        $(document).on('contextmenu', '.syh-button[data-action="copy-prayer"]', function(e) {
            e.preventDefault();
        });

        $(document).on('mousedown', '.syh-button', function(e) {
            if (e.button === 1) e.preventDefault(); 
        });

        $(document).on('mouseup', '.syh-button', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const action = $button.data('action');
            const type = $button.data('type');

            if (e.button !== 0 && action !== 'copy-prayer') return;

            if (action === 'create-from-text') {
                const text = prompt("Вставте список питань для створення банерів:", "");
                if (text) self.BANNER_CREATOR.processAndCreateBanners(text);
                return;
            }
            
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

            if (type === 'comment') {
                const $commentBlock = $button.closest(self.SELECTORS.commentBlock);
                let author = $commentBlock.find(self.SELECTORS.commentAuthor).text().trim();
                while(author.startsWith('@')) author = author.substring(1);

                const commentText = $commentBlock.find(self.SELECTORS.commentText).text();
                let textToCopy, header;
                
                if (action === 'copy-comment') { 
                    header = "📄 Комент (без автора)"; 
                    textToCopy = commentText; 
                }
                else if (action === 'copy-author-comment') { 
                    header = "📑 Автор і його ❓ питання"; 
                    textToCopy = `@${author}\n\n${commentText}`; 
                    
                    self.saveToDatabase(author, commentText, "question", "❓");
                    if (self.UI) self.UI.updateCommentVisuals($commentBlock, 'question');
                }
                else if (action === 'copy-prayer') { 
                    let prayerIcon = "🙏🙏🙏";
                    if (e.button === 1) prayerIcon = "🙏❤️🙏"; 
                    if (e.button === 2) prayerIcon = "❤️❤️❤️"; 
                    
                    header = `📑 Автор і його ${prayerIcon}`; 
                    textToCopy = `\n\n\n${prayerIcon} @${author}\n\n${commentText}`; 
                    
                    self.saveToDatabase(author, commentText, "prayer", prayerIcon);
                    if (self.UI) self.UI.updateCommentVisuals($commentBlock, 'prayer');

                    // ФІКС: Безпечна перевірка наявності функції перед її викликом
                    if (window.SYH_STATS_TRACKER && typeof window.SYH_STATS_TRACKER.registerPrayerMarker === 'function') {
                        window.SYH_STATS_TRACKER.registerPrayerMarker();
                    }
                }
                
                if (textToCopy) {
                    self.UTILS.copyAndShowBanner(textToCopy, header);
                    $commentBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
                    
                    const starBtnNode = $commentBlock.find(self.SELECTORS.starButton)[0];
                    if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
                        starBtnNode.click();
                    }
                }
            } else if (type === 'banner') {
                const $bannerBlock = $button.closest(self.SELECTORS.bannerBlock);
                const bannerText = $bannerBlock.find(self.SELECTORS.bannerText).text();
                self.UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                $bannerBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
            }
        });

        $(document).on('click', '.syh-checkbox', function(e) { e.stopPropagation(); });
        $(document).on('change', '.syh-checkbox', function(e) {
            const $checkbox = $(this);
            const type = $checkbox.data('type');
            let textKey = type === 'comment' 
                ? $checkbox.closest(self.SELECTORS.commentBlock).find(self.SELECTORS.commentText).text()
                : $checkbox.closest(self.SELECTORS.bannerBlock).find(self.SELECTORS.bannerText).text();
            
            self.STATE.updateState(textKey, $checkbox.is(':checked'));
            if (type === 'banner') self.UI.updateMasterCheckboxState();
        });

        $(document).on('change', '.syh-master-checkbox', function() {
            const isChecked = $(this).is(':checked');
            $(this).prop('indeterminate', false);
            $(self.SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]').prop('checked', isChecked).trigger('change');
        });
    },

    saveToDatabase: function(author, text, type, icon) {
        chrome.storage.local.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            list = list.filter(item => item.text !== text);
            list.push({ author: author, text: text, type: type, icon: icon });
            chrome.storage.local.set({ 'syh_prayers': list });
        });
    },

    removeFromDatabase: function(text) {
        if (this.UI && this.UI.prayersCache) {
            this.UI.prayersCache = this.UI.prayersCache.filter(item => item.text !== text);
        }

        chrome.storage.local.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            list = list.filter(item => item.text !== text);
            chrome.storage.local.set({ 'syh_prayers': list });
        });
    }
};