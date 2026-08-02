import { SYH_UI, PrayerItem } from './ui_core';
import { SYH_CONFIG } from './config';
import { SYH_UTILS } from './utils';
import { SYH_STATE } from './state';

export function addButtonsToComment(commentNode: Element): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const targetContainer = commentNode.querySelector(selectors.commentButtonContainer);
    if (targetContainer && !targetContainer.querySelector('.syh-custom-buttons-comment')) {
        const buttonsHTML = `
            <div class="syh-custom-buttons-comment">
                <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар" aria-label="Копіювати тільки коментар">📄</button>
                <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Відмітити як Питання" aria-label="Відмітити як Питання">❓</button>
                <button class="syh-button" data-type="comment" data-action="copy-prayer" title="ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️" aria-label="Відмітити як Молитву">🙏</button>
                <div class="syh-checkbox-container">
                    <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване" aria-label="Відмітити коментар як опрацьований">
                </div>
            </div>`;
        targetContainer.insertAdjacentHTML('beforeend', buttonsHTML);
        
        const commentText = commentNode.querySelector(selectors.commentText)?.textContent || '';
        const state = SYH_UI.STATE || SYH_STATE;
        
        if (state && typeof state.getState === 'function' && state.getState(commentText)) {
            const checkbox = targetContainer.querySelector<HTMLInputElement>('.syh-checkbox');
            if (checkbox) checkbox.checked = true;
        }
        applySavedLabels(commentNode, commentText);
    }
}

export function updateCommentVisuals(commentWrap: Element, type: string): void {
    if (type === 'prayer') {
        commentWrap.setAttribute('data-syh-type', 'prayer');
    } else if (type === 'question') {
        commentWrap.setAttribute('data-syh-type', 'question');
    } else {
        commentWrap.removeAttribute('data-syh-type');
    }
}

export function applySavedLabels(commentNode: Element, text: string): void {
    if (!text || !text.trim()) return; 
    
    const found = SYH_UI.prayersCache.find((item: PrayerItem) => item.text === text);
    const type = found ? found.type : 'none';
    updateCommentVisuals(commentNode, type);
}

export function addStarredTabControls(starredHeaderNode: Element): void {
    if (starredHeaderNode && !starredHeaderNode.querySelector('.syh-starred-controls')) {
        const controlsHTML = `
            <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                <div class="syh-search-wrapper">
                    <input type="text" id="syh-starred-search" value="${SYH_UI.searchQuery}" placeholder="🔍 Пошук по імені або тексту..." aria-label="Пошук по імені або тексту" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                    <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${SYH_UI.searchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук коментарів">✕</button>
                    <button id="syh-scroll-to-active-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до коментаря на екрані" aria-label="Повернутися до коментаря на екрані">🎯</button>
                </div>
                
                <div role="tablist" aria-label="Фільтри коментарів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                    <button role="tab" aria-selected="${SYH_UI.activeFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі коментарі" class="syh-filter-btn ${SYH_UI.activeFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-comment-filter-all">
                        <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.activeFilter === 'question' ? 'true' : 'false'}" aria-label="Показати питання" class="syh-filter-btn ${SYH_UI.activeFilter === 'question' ? 'active' : ''}" data-filter="question" id="syh-comment-filter-question">
                        <span>❓</span><span class="tab-text">Питання</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.activeFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитви" class="syh-filter-btn ${SYH_UI.activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-comment-filter-prayer">
                        <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.activeFilter === 'other' ? 'true' : 'false'}" aria-label="Показати інші коментарі" class="syh-filter-btn ${SYH_UI.activeFilter === 'other' ? 'active' : ''}" data-filter="other" id="syh-comment-filter-other" style="display: none;">
                        <span>📝</span><span class="tab-text">Інші</span><span class="tab-count"></span>
                    </button>
                </div>
            </div>
        `;
        
        starredHeaderNode.innerHTML = controlsHTML;

        const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;

        if (!document.querySelector('#syh-empty-state-msg')) {
            const starredList = document.querySelector(selectors.starredList);
            if (starredList) {
                starredList.insertAdjacentHTML('afterend', `
                    <div id="syh-empty-state-msg" class="syh-empty-state">
                        <div id="syh-empty-query"></div>
                        <div id="syh-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                    </div>
                `);
            }
        }

        bindStarredControls();
        setTimeout(() => filterStarredComments(), 10);
    }
}

export function bindStarredControls(): void {
    const searchInput = document.querySelector<HTMLInputElement>('#syh-starred-search');
    const clearBtn = document.querySelector<HTMLElement>('#syh-clear-search-btn');

    if (searchInput) {
        searchInput.oninput = function() {
            SYH_UI.searchQuery = searchInput.value.toLowerCase();
            if (clearBtn) clearBtn.style.display = SYH_UI.searchQuery ? 'flex' : 'none';
            filterStarredComments();
        };
    }

    if (clearBtn) {
        clearBtn.onclick = function() {
            if (searchInput) searchInput.value = '';
            SYH_UI.searchQuery = '';
            clearBtn.style.display = 'none';
            filterStarredComments();
        };
    }

    const scrollBtn = document.querySelector('#syh-scroll-to-active-btn');
    if (scrollBtn) {
        scrollBtn.onclick = function(e) {
            e.preventDefault();
            scrollToActiveComment();
        };
    }

    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest('#syh-empty-clear-link')) {
            e.preventDefault();
            if (searchInput) searchInput.value = '';
            SYH_UI.searchQuery = '';
            if (clearBtn) clearBtn.style.display = 'none';
            filterStarredComments();
            return;
        }

        const filterBtn = target?.closest('.syh-filter-btn') as HTMLElement | null;
        if (filterBtn) {
            document.querySelectorAll<HTMLElement>('.syh-filter-btn').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.fontWeight = 'normal';
                btn.style.boxShadow = 'none';
                btn.style.color = '#666';
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            filterBtn.style.background = '#fff';
            filterBtn.style.fontWeight = 'bold';
            filterBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            filterBtn.style.color = '#000';
            filterBtn.classList.add('active');
            filterBtn.setAttribute('aria-selected', 'true');
            
            SYH_UI.activeFilter = filterBtn.dataset.filter || 'all';
            filterStarredComments();

            if (SYH_UI.searchQuery && searchInput) {
                searchInput.classList.remove('syh-search-pulse');
                void searchInput.offsetWidth;
                searchInput.classList.add('syh-search-pulse');
            }
        }
    });
}

export function filterStarredComments(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentList = document.querySelector<HTMLElement>(selectors.starredList);
    if (!commentList) return;

    const activeFilter = SYH_UI.activeFilter;
    const searchQuery = SYH_UI.searchQuery;

    const safeHtmlUpdate = (el: Element | null, newHtml: string) => {
        if (el && el.innerHTML !== newHtml) el.innerHTML = newHtml;
    };
    const safeTextUpdate = (selector: string, newText: string) => {
        const el = document.querySelector(selector);
        if (el && el.textContent !== newText) el.textContent = newText;
    };

    let sortedTexts: string[] = [];
    let grouped: Record<string, string[]> = {};
    
    SYH_UI.prayersCache.forEach((p: PrayerItem) => {
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

    if (commentList.style.display !== 'flex') {
        commentList.style.display = 'flex';
        commentList.style.flexDirection = 'column';
    }

    let visibleCount = 0;
    let countAbsolute = { all: 0, question: 0, prayer: 0, other: 0 };
    let countSearch = { all: 0, question: 0, prayer: 0, other: 0 };

    Array.from(commentList.children).forEach((liChild) => {
        const li = liChild as HTMLElement;
        if (li.getAttribute('data-syh-deleted') === 'true') return;

        const commentWrap = li.querySelector(selectors.commentBlock);
        if (!commentWrap) return;

        const originalText = commentWrap.querySelector(selectors.commentText)?.textContent || '';
        const authorText = commentWrap.querySelector(selectors.commentAuthor)?.textContent || '';
        
        const foundInCache = SYH_UI.prayersCache.find((item: PrayerItem) => item.text === originalText);
        const commentType = foundInCache ? foundInCache.type : 'none';
        
        updateCommentVisuals(commentWrap, commentType);
        
        countAbsolute.all++;
        if (commentType === 'question') countAbsolute.question++;
        else if (commentType === 'prayer') countAbsolute.prayer++;
        else countAbsolute.other++;
        
        let matchesSearch = true;
        if (searchQuery) {
            const combinedTarget = originalText + " " + authorText;
            matchesSearch = SYH_UTILS.smartSearch(searchQuery, combinedTarget);
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
            if (li.style.display === 'none') li.style.display = '';
            const exactOrder = sortedTexts.indexOf(originalText);
            const targetOrder = exactOrder !== -1 ? exactOrder : 9999;
            if (parseInt(li.style.order || '0') !== targetOrder) li.style.order = String(targetOrder);
            visibleCount++;
        } else {
            if (li.style.display !== 'none') li.style.display = 'none';
            if (parseInt(li.style.order || '0') !== 9999) li.style.order = '9999'; 
        }
    });

    const otherTabBtn = document.querySelector<HTMLElement>('#syh-comment-filter-other');
    if (countAbsolute.other === 0) {
        if (otherTabBtn && otherTabBtn.style.display !== 'none') otherTabBtn.style.display = 'none';
        
        if (SYH_UI.activeFilter === 'other') {
            SYH_UI.activeFilter = 'all';
            document.querySelectorAll('.syh-filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('#syh-comment-filter-all')?.classList.add('active');
            return filterStarredComments(); 
        }
    } else {
        if (otherTabBtn && otherTabBtn.style.display === 'none') otherTabBtn.style.display = 'inline-flex';
    }

    safeTextUpdate('#syh-comment-filter-all .tab-count', ` (${countAbsolute.all})`);
    safeTextUpdate('#syh-comment-filter-question .tab-count', ` (${countAbsolute.question})`);
    safeTextUpdate('#syh-comment-filter-prayer .tab-count', ` (${countAbsolute.prayer})`);
    safeTextUpdate('#syh-comment-filter-other .tab-count', ` (${countAbsolute.other})`);

    const emptyState = document.querySelector<HTMLElement>('#syh-empty-state-msg');
    const emptyQuery = document.querySelector('#syh-empty-query');
    const emptySuggestion = document.querySelector<HTMLElement>('#syh-empty-suggestion');

    if (visibleCount === 0) {
        let messageHTML: string;
        
        if (searchQuery) {
            messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${searchQuery}"</b><br><br>
            <a href="#" id="syh-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;
            
            let suggestions: string[] = [];
            if (activeFilter !== 'all' && countSearch.all > 0) {
                if (countSearch.question > 0 && activeFilter !== 'question') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="question" style="color: #f39c12; text-decoration: underline;">❓ Питання (${countSearch.question})</a>`);
                if (countSearch.prayer > 0 && activeFilter !== 'prayer') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="prayer" style="color: #f39c12; text-decoration: underline;">🙏 Молитви (${countSearch.prayer})</a>`);
                if (countSearch.other > 0 && activeFilter !== 'other') suggestions.push(`<a href="#" class="syh-switch-tab" data-filter="other" style="color: #f39c12; text-decoration: underline;">📝 Інші (${countSearch.other})</a>`);
            }
            
            if (suggestions.length > 0) {
                safeHtmlUpdate(emptySuggestion, `Знайдено в інших категоріях: ` + suggestions.join(', '));
                if (emptySuggestion && emptySuggestion.style.display === 'none') emptySuggestion.style.display = 'block';
                
                document.querySelectorAll('.syh-switch-tab').forEach(el => {
                    (el as HTMLElement).onclick = function(e) {
                        e.preventDefault();
                        const filter = (this as HTMLElement).dataset.filter;
                        const btn = document.querySelector<HTMLElement>(`.syh-filter-btn[data-filter="${filter}"]`);
                        if (btn) btn.click();
                    };
                });
            } else {
                if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            }
        } else {
            if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            const filterNames: Record<string, string> = { 
                'all': 'списку коментарів', 
                'question': 'категорії "❓ Питання"', 
                'prayer': 'категорії "🙏 Молитви"', 
                'other': 'категорії "📝 Інші"' 
            };
            messageHTML = `<span style="color: #777;">Тут ще немає коментарів для ${filterNames[activeFilter] || 'списку'}</span>`;
        }

        safeHtmlUpdate(emptyQuery, messageHTML);
        if (emptyState && emptyState.style.display === 'none') emptyState.style.display = 'block';
    } else {
        if (emptyState && emptyState.style.display !== 'none') emptyState.style.display = 'none';
        if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    }
}

export function scrollToActiveComment(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentList = document.querySelector(selectors.starredList);
    if (commentList) {
        const activeLi = Array.from(commentList.children).find(child => child.querySelector('.lucide-circle-minus')) as HTMLElement | undefined;
        if (activeLi) {
            const rect = activeLi.getBoundingClientRect();
            const scrollParent = activeLi.closest('div[class*="Scroll"]');
            if (scrollParent) {
                const parentRect = scrollParent.getBoundingClientRect();
                const isVisible = (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom);
                if (!isVisible) {
                    activeLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                activeLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}
