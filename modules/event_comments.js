// event_comments.js
window.SYH_EVENT_COMMENTS = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,

    init: function(config, state, utils, ui) {
        this.SELECTORS = config.SELECTORS;
        this.STATE = state;
        this.UTILS = utils;
        this.UI = ui;
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

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ ПКМ ДЛЯ КОМЕНТАРІВ ---
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

        // Запобігаємо стандартній дії при натисканні коліщатка миші на кастомні кнопки коментарів
        $(document).on('mousedown', '.syh-button[data-type="comment"]', function(e) {
            if (e.button === 1) e.preventDefault(); 
        });

        // Обробник копіювання коментарів та маркування
        $(document).on('mouseup', '.syh-button[data-type="comment"]', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const action = $button.data('action');

            if (e.button !== 0 && action !== 'copy-prayer') return;

            const $commentBlock = $button.closest(self.SELECTORS.commentBlock);
            let author = $commentBlock.find(self.SELECTORS.commentAuthor).text().trim();
            while (author.startsWith('@')) author = author.substring(1);

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

                if (window.SYH_STATS_TRACKER && typeof window.SYH_STATS_TRACKER.registerPrayerMarker === 'function') {
                    window.SYH_STATS_TRACKER.registerPrayerMarker();
                }
            }
            
            if (textToCopy) {
                self.UTILS.copyAndShowBanner(textToCopy, header);

                // Нативна генерація події change для синхронізації з React
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
        });

        // Слухач подій перемикання стану чекбоксів коментарів
        $(document).on('change', '.syh-checkbox[data-type="comment"]', function(e) {
            const $checkbox = $(this);
            const textKey = $checkbox.closest(self.SELECTORS.commentBlock).find(self.SELECTORS.commentText).text();
            
            if (self.STATE) {
                self.STATE.updateState(textKey, $checkbox.is(':checked'));
            }
        });
    },

    // Безпечне збереження в БД
    saveToDatabase: function(author, text, type, icon) {
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

    // Безпечне видалення з БД
    removeFromDatabase: function(text) {
        if (this.UI && this.UI.prayersCache) {
            this.UI.prayersCache = this.UI.prayersCache.filter(item => item.text !== text);
        }

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