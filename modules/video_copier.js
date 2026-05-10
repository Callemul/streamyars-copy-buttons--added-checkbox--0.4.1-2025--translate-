window.SYH_VIDEO_COPIER = {
    init: function() {
        this.startObserver();
    },

    startObserver: function() {
        const observer = new MutationObserver(() => {
            this.injectTitleButton(); // Для сторінки окремого відео
            this.injectModalButton(); // Для модалки "Share"
            this.injectListButtons(); // НОВЕ: Для загального списку відео
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    // --- КНОПКА 1: Біля заголовка H2 (на сторінці одного відео) ---
    injectTitleButton: function() {
        const titleWrappers = document.querySelectorAll('div[class*="TitleWrapper"]');
        
        titleWrappers.forEach(wrapper => {
            if (!wrapper.querySelector('.syh-title-btn')) {
                const h2 = wrapper.querySelector('h2');
                
                if (h2) {
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.gap = '15px';
                    
                    const btnTitle = document.createElement('button');
                    btnTitle.className = 'syh-title-btn';
                    btnTitle.innerText = '📋 Копіювати назву';
                    
                    btnTitle.style.cssText = `
                        padding: 8px 16px;
                        background-color: #28a745 !important; 
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        cursor: pointer !important;
                        height: 45px !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                        white-space: nowrap;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    `;

                    btnTitle.onmouseover = () => btnTitle.style.backgroundColor = '#218838';
                    btnTitle.onmouseout = () => btnTitle.style.backgroundColor = '#28a745';

                    btnTitle.onclick = (e) => {
                        e.preventDefault();
                        const titleText = h2.innerText.trim();
                        navigator.clipboard.writeText(titleText).then(() => {
                            btnTitle.innerText = '✅ Скопійовано!';
                            setTimeout(() => btnTitle.innerText = '📋 Копіювати назву', 2000);
                        });
                    };

                    wrapper.appendChild(btnTitle);
                }
            }
        });
    },

    // --- КНОПКА 2: В модальному вікні Share ---
    injectModalButton: function() {
        const modalContent = document.querySelector('div[aria-label="embed-modal-content-share"]');
        if (!modalContent) return;

        const inputWrapper = modalContent.querySelector('div[class*="CopyInputWrapper"]');
        
        if (inputWrapper && !document.getElementById('syh-url-btn')) {
            const container = document.createElement('div');
            container.style.cssText = 'margin-top: 15px; width: 100%;';
            
            const btnUrl = document.createElement('button');
            btnUrl.id = 'syh-url-btn';
            btnUrl.innerText = '🚀 Копіювати URL + Текст (Видео в хорошем качестве)';
            
            btnUrl.style.cssText = `
                width: 100% !important;
                height: 80px !important; 
                background-color: #28a745 !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                font-size: 16px !important;
                font-weight: bold !important;
                cursor: pointer !important;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
                transition: background-color 0.2s;
            `;

            btnUrl.onmouseover = () => btnUrl.style.backgroundColor = '#218838';
            btnUrl.onmouseout = () => btnUrl.style.backgroundColor = '#28a745';

            btnUrl.onclick = (e) => {
                e.preventDefault();
                const inputField = inputWrapper.querySelector('input[readonly]');
                
                if (inputField) {
                    const videoUrl = inputField.value;
                    const finalString = `Видео (в хорошем качестве)\n\n${videoUrl}`;
                    
                    navigator.clipboard.writeText(finalString).then(() => {
                        btnUrl.innerText = '✅ Успішно скопійовано!';
                        setTimeout(() => btnUrl.innerText = '🚀 Копіювати URL + Текст (Видео в хорошем качестве)', 2000);
                    });
                }
            };
            
            container.appendChild(btnUrl);
            inputWrapper.parentNode.insertBefore(container, inputWrapper.nextSibling);
        }
    },

    // --- НОВЕ: КНОПКИ В ЗАГАЛЬНОМУ СПИСКУ ВІДЕО ---
    injectListButtons: function() {
        // Знаходимо всі карточки відео
        const videoCards = document.querySelectorAll('a.media-item-card');
        const now = new Date();

        videoCards.forEach(card => {
            // Перевіряємо, чи ми вже не додали сюди кнопки
            if (card.querySelector('.syh-list-controls')) return;

            // Витягуємо дату створення відео
            const dateElement = card.querySelector('[data-testid="library-media-subtitle"]');
            if (!dateElement) return;

            // Формат дати: "May 9, 2026, 07:05 PM"
            // Відрізаємо час, залишаємо "May 9, 2026" і парсимо
            const dateString = dateElement.innerText.split(',').slice(0,2).join(',');
            const videoDate = new Date(dateString);
            
            // Якщо дату розпізнано
            if (!isNaN(videoDate)) {
                const diffTime = Math.abs(now - videoDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // Додаємо кнопки ТІЛЬКИ якщо відео свіже (не старіше 7 днів)
                if (diffDays <= 7) {
                    this.appendButtonsToCard(card);
                }
            }
        });
    },

    appendButtonsToCard: function(card) {
        // Знаходимо контейнер з кнопкою "три крапки", щоб вставити наші кнопки ПЕРЕД нею
        const menuContainer = card.querySelector('div[class*="MediaCardMenu"]');
        if (!menuContainer) return;

        // Створюємо нашу обгортку
        const controlsWrap = document.createElement('div');
        controlsWrap.className = 'syh-list-controls';
        controlsWrap.style.cssText = 'display: flex; gap: 8px; margin-right: 12px; z-index: 10; position: relative;';

        // Витягуємо заголовок (для першої кнопки)
        const titleElement = card.querySelector('span[class*="MediaTitle"]');
        const videoTitle = titleElement ? titleElement.innerText.trim() : 'Назву не знайдено';

        // Витягуємо ID відео з href, щоб сформувати повне посилання (для другої кнопки)
        // href виглядає як "/teams/P4ZVhrlIiAbRLoNRYER4F4JY/videos/swxz83ry8sgz"
        const href = card.getAttribute('href');
        const videoId = href ? href.split('/').pop() : '';
        const videoFullUrl = `https://streamyard.com/${videoId}`;

        // Кнопка 1: Копіювати Назву (Іконка Тексту/Документа)
        const btnCopyTitle = this.createSquareButton('📝', 'Копіювати назву', () => {
            navigator.clipboard.writeText(videoTitle).then(() => {
                this.tempIconChange(btnCopyTitle, '✅');
            });
        });

        // Кнопка 2: Копіювати URL + Текст (Іконка Лінки)
        const btnCopyUrl = this.createSquareButton('🔗', 'Копіювати посилання', () => {
            if (videoId) {
                const finalString = `Видео (в хорошем качестве)\n\n${videoFullUrl}`;
                navigator.clipboard.writeText(finalString).then(() => {
                    this.tempIconChange(btnCopyUrl, '✅');
                });
            } else {
                this.tempIconChange(btnCopyUrl, '❌');
            }
        });

        // Зупиняємо перехід по посиланню (клік на карточку), коли клацаємо на наші кнопки
        controlsWrap.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        controlsWrap.appendChild(btnCopyTitle);
        controlsWrap.appendChild(btnCopyUrl);

        // Вставляємо наш контейнер перед меню "три крапки"
        menuContainer.parentNode.insertBefore(controlsWrap, menuContainer);
    },

    createSquareButton: function(icon, tooltipText, onClickCallback) {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = tooltipText; // Вбудована підказка при наведенні
        
        // Стилізуємо під розмір їхньої кнопки "три крапки" (приблизно 32x32)
        btn.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background-color: #fff;
            color: #4F5461;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
        `;

        btn.onmouseover = () => {
            btn.style.backgroundColor = '#f4f4f9';
            btn.style.borderColor = '#ccc';
        };
        btn.onmouseout = () => {
            btn.style.backgroundColor = '#fff';
            btn.style.borderColor = '#ddd';
        };

        btn.onclick = onClickCallback;
        return btn;
    },

    tempIconChange: function(btn, tempIcon) {
        const originalIcon = btn.innerHTML;
        btn.innerHTML = tempIcon;
        setTimeout(() => {
            btn.innerHTML = originalIcon;
        }, 2000);
    }
};