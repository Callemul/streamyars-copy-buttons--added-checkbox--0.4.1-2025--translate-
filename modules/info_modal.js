// info_modal.js
window.SYH_INFO_MODAL = {
    // Головний метод виклику модального вікна
    showModal: function() {
        if (document.getElementById('syh-info-modal')) return;

        const modalHtml = `
            <div id="syh-info-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="background: #1B1F29; border-radius: 12px; width: 650px; max-width: 95vw; height: 500px; max-height: 85vh; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white; display: flex; flex-direction: column; position: relative;">
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #2A303C; padding-bottom: 12px; flex-shrink: 0;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: #fff;">
                            <span style="background: #005DF7; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white;">ⓘ</span>
                            Довідка та оновлення
                        </h2>
                        <button id="syh-close-info" style="background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; padding: 0 5px; line-height: 1; transition: color 0.2s;">&times;</button>
                    </div>

                    <!-- Tabs Nav -->
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; border-bottom: 1px solid #2A303C; padding-bottom: 10px; flex-shrink: 0;">
                        <button class="syh-info-tab-btn active" data-tab="release-notes" style="background: #005DF7; border: none; color: #fff; padding: 6px 16px; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 6px; position: relative; transition: all 0.2s;">
                            Оновлення
                        </button>
                        <button class="syh-info-tab-btn" data-tab="daily-tips" style="background: none; border: none; color: #94a3b8; padding: 6px 16px; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 6px; position: relative; transition: all 0.2s;">
                            Корисні поради
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div id="syh-info-content" style="flex-grow: 1; overflow-y: auto; padding-right: 8px; margin-bottom: 10px; font-size: 14px;">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                            Завантаження...
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Обробник закриття модалки
        const closeModal = () => {
            const el = document.getElementById('syh-info-modal');
            if (el) el.remove();
        };

        document.getElementById('syh-close-info').onclick = closeModal;

        // Закриття при кліку на фон
        document.getElementById('syh-info-modal').onclick = (e) => {
            if (e.target.id === 'syh-info-modal') {
                closeModal();
            }
        };

        // Логіка перемикання вкладок
        const tabBtns = document.querySelectorAll('.syh-info-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = (e) => {
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'none';
                    b.style.color = '#94a3b8';
                });
                
                const activeBtn = e.currentTarget;
                activeBtn.classList.add('active');
                activeBtn.style.background = '#005DF7';
                activeBtn.style.color = '#fff';

                const tabName = activeBtn.getAttribute('data-tab');
                this.loadTabContent(tabName);
            };
        });

        // Завантажуємо першу вкладку при відкритті
        this.loadTabContent('release-notes');
    },

    loadTabContent: function(tabName) {
        const contentDiv = document.getElementById('syh-info-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                <div style="border: 3px solid #2A303C; border-top: 3px solid #005DF7; border-radius: 50%; width: 24px; height: 24px; animation: syhSpin 1s linear infinite; margin-right: 10px;"></div>
                Завантаження вмісту...
            </div>
        `;

        const filename = tabName === 'release-notes' ? 'Release_notes.md' : 'Daily_tips.md';
        let url;
        try {
            url = chrome.runtime.getURL(filename);
        } catch (e) {
            console.error("[SYH] Помилка отримання URL ресурсу розширення:", e);
            contentDiv.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 20px;">Не вдалося отримати URL файлу розширення.</div>`;
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
                    <div style="color: #ef4444; padding: 20px; text-align: center;">
                        <p><strong>Не вдалося завантажити вміст вкладки.</strong></p>
                        <p style="font-size: 12px; color: #94a3b8;">${err.message}</p>
                    </div>
                `;
            });
    },

    // Легкий парсер Markdown в HTML
    parseMarkdown: function(md) {
        if (!md) return '';
        
        // 1. Спочатку екрануємо теги HTML для безпеки
        let html = md.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;");

        // 2. Витягуємо блоки коду, щоб вони не оброблялися покроково
        const codeBlocks = [];
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            
            // Підсвічуємо спеціальні анотації (піде в "...") в блоках коду у вигляді стильних бейджів
            let highlighted = code.trim();
            highlighted = highlighted.replace(/\((піде в "Глядачі")\)/g, '<span style="color: #38BDF8; font-weight: bold; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.25); font-size: 11px; margin-left: 8px; display: inline-block; white-space: nowrap;">$1</span>');
            highlighted = highlighted.replace(/\((піде в "Молитви")\)/g, '<span style="color: #34D399; font-weight: bold; background: rgba(52, 211, 153, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(52, 211, 153, 0.25); font-size: 11px; margin-left: 8px; display: inline-block; white-space: nowrap;">$1</span>');
            highlighted = highlighted.replace(/\((піде в "Ефір")\)/g, '<span style="color: #FB923C; font-weight: bold; background: rgba(251, 146, 60, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(251, 146, 60, 0.25); font-size: 11px; margin-left: 8px; display: inline-block; white-space: nowrap;">$1</span>');

            codeBlocks.push({
                code: highlighted,
                marginLeft: '0px'
            });
            return placeholder;
        });

        // 3. Заголовки (H1, H2, H3)
        html = html.replace(/^# (.*$)/gim, '<h1 style="margin-top: 10px; margin-bottom: 15px; color: #fff; font-size: 20px; font-weight: bold; border-bottom: 2px solid #005DF7; padding-bottom: 8px;">$1</h1>');
        html = html.replace(/^## (.*$)/gim, '<h2 style="margin-top: 20px; margin-bottom: 10px; color: #005DF7; font-size: 16px; font-weight: 600; border-bottom: 1px solid #2A303C; padding-bottom: 5px;">$1</h2>');
        html = html.replace(/^### (.*$)/gim, '<h3 style="margin-top: 15px; margin-bottom: 8px; color: #ffcc00; font-size: 14px; font-weight: 600;">$1</h3>');
        
        // Жирний шрифт: **текст**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: bold;">$1</strong>');
        // Курсив: *текст*
        html = html.replace(/\*(.*?)\*/g, '<em style="color: #ddd;">$1</em>');
        
        // 4. Списки та параграфи
        const lines = html.split('\n');
        const processedLines = [];
        let listStack = []; // Стек для відстеження рівнів вкладеності списків
        
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
                    const listStyle = listStack.length === 0 ? 'disc' : 'circle';
                    processedLines.push(`<ul style="margin-left: 20px; margin-bottom: 15px; padding-left: 0; list-style-type: ${listStyle};">`);
                    listStack.push(indent);
                }
                
                processedLines.push(`<li style="margin-bottom: 8px; line-height: 1.5; color: #cbd5e1; font-size: 13px;">${content}</li>`);
            } else {
                const isCodeBlockPlaceholder = trimmed.startsWith('__CODE_BLOCK_');
                
                // Закриваємо всі списки для інших елементів (заголовки, параграфи тощо)
                while (listStack.length > 0) {
                    processedLines.push('</ul>');
                    listStack.pop();
                }
                
                if (trimmed === '') {
                    processedLines.push('<div style="height: 8px;"></div>');
                } else if (isCodeBlockPlaceholder) {
                    // Визначаємо відступ для коду на основі оригінальних пробілів у md
                    const indentMatch = line.match(/^(\s*)/);
                    const spaces = indentMatch ? indentMatch[1].length : 0;
                    
                    const idx = parseInt(trimmed.match(/\d+/)[0]);
                    // Розраховуємо margin-left на основі кількості пробілів відступу
                    const marginLeft = spaces > 0 ? `${spaces * 8}px` : '0px';
                    
                    codeBlocks[idx].marginLeft = marginLeft;
                    processedLines.push(trimmed);
                } else if (!trimmed.startsWith('<h') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<li') && !trimmed.startsWith('</ul') && !trimmed.startsWith('<div')) {
                    processedLines.push(`<p style="margin-bottom: 12px; line-height: 1.5; color: #cbd5e1; font-size: 13px;">${line}</p>`);
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
            const blockHtml = `<pre style="margin: 10px 0; margin-left: ${ml}; padding: 12px; background: #0F172A; border: 1px solid #334155; border-radius: 8px; color: #cbd5e1; font-family: monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">${blockObj.code}</pre>`;
            resultHtml = resultHtml.replace(`__CODE_BLOCK_${idx}__`, blockHtml);
        });

        return resultHtml;
    }
};
