export interface SyhVideoCopier {
    init(): void;
    startObserver(): void;
    injectTitleButton(): void;
    injectModalButton(): void;
    injectListButtons(): void;
    appendButtonsToCard(card: Element): void;
    createSquareButton(icon: string, tooltipText: string, onClickCallback: (e: MouseEvent) => void): HTMLButtonElement;
    tempIconChange(btn: HTMLElement, tempIcon: string): void;
    injectMasterDownloadButton(): void;
    downloadAllFreshVideos(): Promise<void>;
}

import type { ISyhPlugin } from './plugin_registry';
import { UiFactory } from './ui_factory';

export const SYH_VIDEO_COPIER_PLUGIN: ISyhPlugin = {
    id: 'syh_video_copier',
    name: 'StreamYard Video Copier & Downloader',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_VIDEO_COPIER.init();
    }
};

export const SYH_VIDEO_COPIER: SyhVideoCopier = {
    init: function(): void {
        this.startObserver();
    },

    startObserver: function(): void {
        // Замість створення власних MutationObserver, реєструємося у централізованому SYH_DOM_OBSERVER
        SYH_DOM_OBSERVER.register('div[class*="TitleWrapper"]', () => this.injectTitleButton());
        SYH_DOM_OBSERVER.register('div[aria-label="embed-modal-content-share"]', () => this.injectModalButton());
        SYH_DOM_OBSERVER.register('a.media-item-card', () => this.injectListButtons());
        SYH_DOM_OBSERVER.register('div[class*="ListWrap"]', () => this.injectMasterDownloadButton());
    },

    // --- КНОПКА 1: Біля заголовка H2 (на сторінці одного відео) ---
    injectTitleButton: function(): void {
        const titleWrappers = document.querySelectorAll('div[class*="TitleWrapper"]');
        
        titleWrappers.forEach(wrapper => {
            const wrapEl = wrapper as HTMLElement;
            if (!wrapEl.querySelector('.syh-title-btn')) {
                const h2 = wrapEl.querySelector('h2');
                
                if (h2) {
                    wrapEl.style.display = 'flex';
                    wrapEl.style.alignItems = 'center';
                    wrapEl.style.gap = '15px';
                    
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

                    btnTitle.onclick = (e: MouseEvent) => {
                        e.preventDefault();
                        const titleText = (h2 as HTMLElement).innerText.trim();
                        navigator.clipboard.writeText(titleText).then(() => {
                            btnTitle.innerText = '✅ Скопійовано!';
                            setTimeout(() => btnTitle.innerText = '📋 Копіювати назву', 2000);
                        });
                    };

                    wrapEl.appendChild(btnTitle);
                }
            }
        });
    },

    // --- КНОПКА 2: В модальному вікні Share ---
    injectModalButton: function(): void {
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

            btnUrl.onclick = (e: MouseEvent) => {
                e.preventDefault();
                const inputField = inputWrapper.querySelector('input[readonly]') as HTMLInputElement | null;
                
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
            if (inputWrapper.parentNode) {
                inputWrapper.parentNode.insertBefore(container, inputWrapper.nextSibling);
            }
        }
    },

    // --- КНОПКИ В ЗАГАЛЬНОМУ СПИСКУ ВІДЕО ---
    injectListButtons: function(): void {
        const videoCards = document.querySelectorAll('a.media-item-card');
        const now = new Date();
        now.setHours(0, 0, 0, 0); 
        let foundSS = false; 

        videoCards.forEach(card => {
            // ОПТИМІЗАЦІЯ: Якщо картку вже аналізували раніше — миттєво пропускаємо її
            if (card.classList.contains('syh-processed')) return;

            const dateElement = card.querySelector('[data-testid="library-media-subtitle"]') as HTMLElement | null;
            const titleElement = card.querySelector('span[class*="MediaTitle"]') as HTMLElement | null;
            
            if (!dateElement || !titleElement) return;

            const videoTitle = titleElement.innerText.toUpperCase();
            const dateString = dateElement.innerText.split(',').slice(0,2).join(',');
            const videoDate = new Date(dateString);
            
            if (!isNaN(videoDate.getTime())) {
                videoDate.setHours(0, 0, 0, 0);
                const diffDays = Math.round(Math.abs(now.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24)); 
                let isFresh = (diffDays <= 5);

                if (isFresh && videoTitle.includes('СУББОТНЯЯ ШКОЛА')) {
                    if (foundSS) {
                        isFresh = false; 
                    } else {
                        foundSS = true; 
                    }
                }

                if (isFresh) {
                    if (!card.querySelector('.syh-list-controls')) {
                        this.appendButtonsToCard(card);
                    }
                }
                
                // Маркуємо картку як оброблену, щоб більше ніколи не зчитувати її властивості повторно
                card.classList.add('syh-processed');
            }
        });
    },

    appendButtonsToCard: function(card: Element): void {
        const menuContainer = card.querySelector('div[class*="MediaCardMenu"]');
        if (!menuContainer) return;

        const controlsWrap = document.createElement('div');
        controlsWrap.className = 'syh-list-controls';
        controlsWrap.style.cssText = 'display: flex; gap: 8px; margin-right: 12px; z-index: 10; position: relative;';

        const titleElement = card.querySelector('span[class*="MediaTitle"]') as HTMLElement | null;
        const videoTitle = titleElement ? titleElement.innerText.trim() : 'Назву не знайдено';

        const href = card.getAttribute('href');
        const videoId = href ? href.split('/').pop() : '';
        const videoFullUrl = `https://streamyard.com/${videoId}`;

        const btnCopyTitle = this.createSquareButton('📝', 'Копіювати назву', () => {
            navigator.clipboard.writeText(videoTitle).then(() => {
                this.tempIconChange(btnCopyTitle, '✅');
            });
        });

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

        controlsWrap.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
        });

        controlsWrap.appendChild(btnCopyTitle);
        controlsWrap.appendChild(btnCopyUrl);
        if (menuContainer.parentNode) {
            menuContainer.parentNode.insertBefore(controlsWrap, menuContainer);
        }
    },

    createSquareButton: function(icon: string, tooltipText: string, onClickCallback: (e: MouseEvent) => void): HTMLButtonElement {
        const btn = UiFactory.createButton({
            action: 'copier-action',
            icon: icon,
            title: tooltipText,
            className: 'syh-square-btn',
            onClick: onClickCallback
        });

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

        return btn;
    },

    tempIconChange: function(btn: HTMLElement, tempIcon: string): void {
        const originalIcon = btn.innerHTML;
        btn.innerHTML = tempIcon;
        setTimeout(() => {
            btn.innerHTML = originalIcon;
        }, 2000);
    },

    // --- ГОЛОВНА КНОПКА МАСОВОГО СКАЧУВАННЯ ---
    injectMasterDownloadButton: function(): void {
        const listContainer = document.querySelector('div[class*="ListWrap"]');
        
        if (listContainer && !document.getElementById('syh-master-download-btn')) {
            const btn = document.createElement('button');
            btn.id = 'syh-master-download-btn';
            btn.innerText = '📥 Завантажити всі свіжі відео (Video Only)';
            btn.style.cssText = `
                display: block; width: 100%; padding: 15px; margin-bottom: 20px;
                background-color: #005DF7; color: white; font-size: 16px; font-weight: bold;
                border: none; border-radius: 8px; cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;
            `;
            
            btn.onmouseover = () => btn.style.backgroundColor = '#0047cc';
            btn.onmouseout = () => btn.style.backgroundColor = '#005DF7';

            btn.onclick = async (e: MouseEvent) => {
                e.preventDefault();
                btn.innerText = '⏳ Запускаю завантаження... Не чіпайте мишку!';
                btn.style.backgroundColor = '#f39c12';
                btn.disabled = true;

                await this.downloadAllFreshVideos();

                btn.innerText = '✅ Всі завантаження ініційовано!';
                btn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    btn.innerText = '📥 Завантажити всі свіжі відео (Video Only)';
                    btn.style.backgroundColor = '#005DF7';
                    btn.disabled = false;
                }, 5000);
            };

            if (listContainer.parentNode) {
                listContainer.parentNode.insertBefore(btn, listContainer);
            }
        }
    },

    downloadAllFreshVideos: async function(): Promise<void> {
        const videoCards = document.querySelectorAll('a.media-item-card');
        const now = new Date();
        now.setHours(0, 0, 0, 0); 
        const freshCards: Element[] = [];
        let foundSS = false;

        videoCards.forEach(card => {
            const dateElement = card.querySelector('[data-testid="library-media-subtitle"]') as HTMLElement | null;
            const titleElement = card.querySelector('span[class*="MediaTitle"]') as HTMLElement | null;
            
            if (dateElement && titleElement) {
                const videoTitle = titleElement.innerText.toUpperCase();
                const dateString = dateElement.innerText.split(',').slice(0,2).join(',');
                const videoDate = new Date(dateString);
                
                if (!isNaN(videoDate.getTime())) {
                    videoDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round(Math.abs(now.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24));
                    let isFresh = (diffDays <= 5);

                    if (isFresh && videoTitle.includes('СУББОТНЯЯ ШКОЛА')) {
                        if (foundSS) {
                            isFresh = false;
                        } else {
                            foundSS = true;
                        }
                    }

                    if (isFresh) {
                        freshCards.push(card);
                    }
                }
            }
        });

        if (freshCards.length === 0) {
            alert("Немає свіжих відео для завантаження.");
            return;
        }

        console.log(`[SYH] Знайдено ${freshCards.length} свіжих відео для скачування.`);

        for (let i = 0; i < freshCards.length; i++) {
            const card = freshCards[i];
            try {
                const moreBtn = card.querySelector('button[aria-label="More options"]') as HTMLElement | null;
                if (moreBtn) moreBtn.click();
                await new Promise(r => setTimeout(r, 600));

                const menuItems = Array.from(document.querySelectorAll('span.ListItemText__StyledText-sc-1i1a88x-0')) as HTMLElement[];
                let downloadText = 'Download';
                if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
                    try {
                        downloadText = chrome.i18n.getMessage('download') || 'Download';
                    } catch {
                        // ignore
                    }
                }
                const downloadSpan = menuItems.find(el => el.innerText.includes(downloadText) || el.innerText.includes('Download'));
                if (downloadSpan) {
                    const btn = downloadSpan.closest('button');
                    if (btn) btn.click();
                }
                
                await new Promise(r => setTimeout(r, 1200));

                const videoDownloadBtn = document.querySelector('[data-testid="download-row-download-button-video"]') as HTMLElement | null;
                if (videoDownloadBtn) {
                    videoDownloadBtn.click();
                    console.log(`[SYH] Завантаження ${i+1} розпочато.`);
                    await new Promise(r => setTimeout(r, 1500));
                }

                const closeBtn = document.querySelector('button[aria-label="Close modal"]') as HTMLElement | null;
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                }

                await new Promise(r => setTimeout(r, 1000));

            } catch (err) {
                console.error(`[SYH] Помилка на відео ${i+1}: `, err);
            }
        }
    }
};


