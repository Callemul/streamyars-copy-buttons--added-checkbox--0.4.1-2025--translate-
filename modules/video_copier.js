window.SYH_VIDEO_COPIER = {
    init: function() {
        this.startObserver();
    },

    startObserver: function() {
        const observer = new MutationObserver(() => {
            this.injectTitleButton();
            this.injectModalButton();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    // --- КНОПКА 1: Біля заголовка H2 ---
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
                    
                    // Змінено колір на зелений
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
    }
};