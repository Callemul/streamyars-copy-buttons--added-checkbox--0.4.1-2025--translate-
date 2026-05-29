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
        // event_handlers.js
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
            // ФІКС: Рядок автоматичного скролу scrollToActiveComment() тут повністю стерто.
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
            // 1. Коментарі: Перехоплення кліку на кнопках показу
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
                return;
            }

            // 2. Банери: Перехоплення кліку на блоці банера для перемикання чекбоксу (ПКМ)
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

                    // ФІКС ГАЛОЧКИ: Примусове нативне проставлення checked та генерація події для реакції React
                    const checkboxNode = $commentBlock.find('.syh-checkbox[data-type="comment"]')[0];
                    if (checkboxNode) {
                        checkboxNode.checked = true;
                        checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
                        if (self.STATE) {
                            self.STATE.updateState(commentText, true);
                        }
                    }

                    $commentBlock.find('.syh-checkbox').prop('checked', true);
                    
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

    // event_handlers.js
    saveToDatabase: function(author, text, type, icon) {
        const self = this;
        // Резервний механізм (Fallback) на випадок відсутності chrome.storage.local
        const storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) 
            ? chrome.storage.local 
            : {
                get: function(keys, cb) {
                    const res = {};
                    keys.forEach(k => {
                        try {
                            const val = localStorage.getItem(k);
                            res[k] = val ? JSON.parse(val) : null;
                        } catch(e) { res[k] = null; }
                    });
                    cb(res);
                },
                set: function(items, cb) {
                    for (const k in items) {
                        try {
                            localStorage.setItem(k, JSON.stringify(items[k]));
                        } catch(e) {}
                    }
                    if (cb) cb();
                }
            };

        storage.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            list = list.filter(item => item.text !== text);
            list.push({ author: author, text: text, type: type, icon: icon });
            storage.set({ 'syh_prayers': list });
        });
    },

    removeFromDatabase: function(text) {
        const self = this;
        if (this.UI && this.UI.prayersCache) {
            this.UI.prayersCache = this.UI.prayersCache.filter(item => item.text !== text);
        }

        // Резервний механізм (Fallback) на випадок відсутності chrome.storage.local
        const storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) 
            ? chrome.storage.local 
            : {
                get: function(keys, cb) {
                    const res = {};
                    keys.forEach(k => {
                        try {
                            const val = localStorage.getItem(k);
                            res[k] = val ? JSON.parse(val) : null;
                        } catch(e) { res[k] = null; }
                    });
                    cb(res);
                },
                set: function(items, cb) {
                    for (const k in items) {
                        try {
                            localStorage.setItem(k, JSON.stringify(items[k]));
                        } catch(e) {}
                    }
                    if (cb) cb();
                }
            };

        storage.get(['syh_prayers'], function(result) {
            let list = result.syh_prayers || [];
            list = list.filter(item => item.text !== text);
            storage.set({ 'syh_prayers': list });
        });
    }
};