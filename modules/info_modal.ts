export interface CodeBlockPlaceholder {
    code: string;
    marginLeft: string;
}

export interface SyhInfoModal {
    showModal(): void;
    loadTabContent(tabName: string): void;
    parseMarkdown(md: string): string;
}

export const SYH_INFO_MODAL: SyhInfoModal = {
    // Головний метод виклику модального вікна
    showModal: function(): void {
        if (document.getElementById('syh-info-modal')) return;

        const modalHtml = `
            <div id="syh-info-modal" class="syh-info-modal-overlay">
                <div class="syh-info-modal-container">
                    
                    <!-- Header -->
                    <div class="syh-info-modal-header">
                        <h2 class="syh-info-modal-title">
                            <span class="syh-info-modal-icon">ⓘ</span>
                            Довідка та оновлення
                        </h2>
                        <button id="syh-close-info" title="Закрити" aria-label="Закрити вікно довідки" class="syh-info-modal-close">&times;</button>
                    </div>

                    <!-- Tabs Nav -->
                    <div role="tablist" aria-label="Вкладки довідки" class="syh-info-tabs-nav">
                        <button role="tab" aria-selected="true" aria-label="Показати оновлення" class="syh-info-tab-btn active" data-tab="release-notes">
                            Оновлення
                        </button>
                        <button role="tab" aria-selected="false" aria-label="Показати корисні поради" class="syh-info-tab-btn" data-tab="daily-tips">
                            Корисні поради
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div id="syh-info-content" class="syh-info-content">
                        <div class="syh-info-loading-container">
                            Завантаження...
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Обробник закриття модалки
        const closeModal = (): void => {
            const el = document.getElementById('syh-info-modal');
            if (el) el.remove();
        };

        const closeBtn = document.getElementById('syh-close-info');
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        // Закриття при кліку на фон
        const modalContainer = document.getElementById('syh-info-modal');
        if (modalContainer) {
            modalContainer.onclick = (e: MouseEvent): void => {
                if ((e.target as HTMLElement).id === 'syh-info-modal') {
                    closeModal();
                }
            };
        }

        // Логіка перемикання вкладок
        const tabBtns = document.querySelectorAll('.syh-info-tab-btn');
        tabBtns.forEach(btn => {
            (btn as HTMLElement).onclick = (e: MouseEvent): void => {
                tabBtns.forEach(b => {
                    const el = b as HTMLElement;
                    el.classList.remove('active');
                    el.setAttribute('aria-selected', 'false');
                });
                
                const activeBtn = e.currentTarget as HTMLElement;
                activeBtn.classList.add('active');
                activeBtn.setAttribute('aria-selected', 'true');

                const tabName = activeBtn.getAttribute('data-tab') || 'release-notes';
                this.loadTabContent(tabName);
            };
        });

        // Завантажуємо першу вкладку при відкритті
        this.loadTabContent('release-notes');
    },

    loadTabContent: function(tabName: string): void {
        const contentDiv = document.getElementById('syh-info-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="syh-info-loading-container">
                <div class="syh-info-loading-spinner"></div>
                Завантаження вмісту...
            </div>
        `;

        const filename = tabName === 'release-notes' ? 'Release_notes.md' : 'Daily_tips.md';
        let url: string;
        try {
            url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) 
                ? chrome.runtime.getURL(filename)
                : filename;
        } catch (e) {
            console.error("[SYH] Помилка отримання URL ресурсу розширення:", e);
            contentDiv.innerHTML = `<div class="syh-info-error-container">Не вдалося отримати URL файлу розширення.</div>`;
            return;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error("Помилка завантаження файлу: " + response.statusText);
                return response.text();
            })
            .then(text => {
                contentDiv.innerHTML = this.parseMarkdown(text);
            })
            .catch(err => {
                console.error("[SYH] Помилка завантаження файлу довідки:", err);
                contentDiv.innerHTML = `
                    <div class="syh-info-error-container">
                        <p><strong>Не вдалося завантажити вміст вкладки.</strong></p>
                        <p class="syh-info-error-subtext">${err.message}</p>
                    </div>
                `;
            });
    },

    // Легкий парсер Markdown в HTML
    parseMarkdown: function(md: string): string {
        if (!md) return '';
        
        // 1. Спочатку екрануємо теги HTML для безпеки
        let html = md.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;");

        // 2. Витягуємо блоки коду, щоб вони не оброблялися покроково
        const codeBlocks: CodeBlockPlaceholder[] = [];
        html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            
            // Підсвічуємо спеціальні анотації (піде в "...") в блоках коду у вигляді стильних бейджів
            let highlighted = code.trim();
            highlighted = highlighted.replace(/\((піде в "Глядачі")\)/g, '<span class="syh-md-badge-viewers">$1</span>');
            highlighted = highlighted.replace(/\((піде в "Молитви")\)/g, '<span class="syh-md-badge-prayers">$1</span>');
            highlighted = highlighted.replace(/\((піде в "Ефір")\)/g, '<span class="syh-md-badge-stream">$1</span>');

            codeBlocks.push({
                code: highlighted,
                marginLeft: '0px'
            });
            return placeholder;
        });

        // 3. Заголовки (H1, H2, H3)
        html = html.replace(/^# (.*$)/gim, '<h1 class="syh-md-h1">$1</h1>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="syh-md-h2">$1</h2>');
        html = html.replace(/^### (.*$)/gim, '<h3 class="syh-md-h3">$1</h3>');
        
        // Жирний шрифт: **текст**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="syh-md-strong">$1</strong>');
        // Курсив: *текст*
        html = html.replace(/\*(.*?)\*/g, '<em class="syh-md-em">$1</em>');
        
        // 4. Списки та параграфи
        const lines = html.split('\n');
        const processedLines: string[] = [];
        let listStack: number[] = []; // Стек для відстеження рівнів вкладеності списків
        
        for (let line of lines) {
            let trimmed = line.trim();
            const listMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
            
            if (listMatch) {
                const indent = listMatch[1].length;
                const content = listMatch[3];
                
                // Закриваємо глибші списки, якщо відступ зменшився
                while (listStack.length > 0 && listStack[listStack.length - 1] > indent) {
                    processedLines.push('</ul>');
                    listStack.pop();
                }
                
                // Відкриваємо новий вкладений список, якщо відступ більший або це перший список
                if (listStack.length === 0 || listStack[listStack.length - 1] < indent) {
                    const listClass = listStack.length === 0 ? 'syh-md-ul-disc' : 'syh-md-ul-circle';
                    processedLines.push(`<ul class="syh-md-ul ${listClass}">`);
                    listStack.push(indent);
                }
                
                processedLines.push(`<li class="syh-md-li">${content}</li>`);
            } else {
                const isCodeBlockPlaceholder = trimmed.startsWith('__CODE_BLOCK_');
                
                // Закриваємо всі списки для інших елементів (заголовки, параграфи тощо)
                while (listStack.length > 0) {
                    processedLines.push('</ul>');
                    listStack.pop();
                }
                
                if (trimmed === '') {
                    processedLines.push('<div class="syh-md-spacer"></div>');
                } else if (isCodeBlockPlaceholder) {
                    // Визначаємо відступ для коду на основі оригінальних пробілів у md
                    const indentMatch = line.match(/^(\s*)/);
                    const spaces = indentMatch ? indentMatch[1].length : 0;
                    
                    const idxMatch = trimmed.match(/\d+/);
                    const idx = idxMatch ? parseInt(idxMatch[0], 10) : 0;
                    // Розраховуємо margin-left на основі кількості пробілів відступу
                    const marginLeft = spaces > 0 ? `${spaces * 8}px` : '0px';
                    
                    if (codeBlocks[idx]) {
                        codeBlocks[idx].marginLeft = marginLeft;
                    }
                    processedLines.push(trimmed);
                } else if (!trimmed.startsWith('<h') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<li') && !trimmed.startsWith('</ul') && !trimmed.startsWith('<div')) {
                    processedLines.push(`<p class="syh-md-p">${line}</p>`);
                } else {
                    processedLines.push(line);
                }
            }
        }
        
        while (listStack.length > 0) {
            processedLines.push('</ul>');
            listStack.pop();
        }
        
        let resultHtml = processedLines.join('\n');

        // 5. Повертаємо блоки коду назад з накладенням стилів рамки та відступів
        codeBlocks.forEach((blockObj, idx) => {
            const ml = blockObj.marginLeft || '0px';
            const blockHtml = `<pre class="syh-md-pre" style="margin-left: ${ml};">${blockObj.code}</pre>`;
            resultHtml = resultHtml.replace(`__CODE_BLOCK_${idx}__`, blockHtml);
        });

        return resultHtml;
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_INFO_MODAL = SYH_INFO_MODAL;
}
