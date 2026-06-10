// ui_banners_tabs.js
// Розширення об'єкта SYH_UI суто методами ін'єкції та створення інтерфейсу банерів
Object.assign(window.SYH_UI, {

    // Створення елементів пошуку, розсувних фільтрів та швидких дій перед списком банерів
    addBannerHeaderControls: function(headerNode) {
        const $header = $(headerNode);
        const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
        const $bannerList = $(bannerListSelector);

        // 1. Ін'єкція дій у шапку (📝, виділення, 🗑️) — без руйнування стилів та методу empty()
        if ($header.length > 0 && !$header.find('.syh-banner-header-controls').length) {
            const controlsHTML = `
                <div class="syh-banner-header-controls" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                    <button class="syh-button" data-action="create-from-text" title="Створити банери з тексту" style="font-size: 13px; height: 26px;">📝</button>
                    <label class="syh-master-checkbox-label" title="Вибрати все / Зняти все" style="display: inline-flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" class="syh-master-checkbox">
                    </label>
                    <button class="syh-button syh-delete-selected-banners" data-action="delete-selected-banners" title="Видалити вибрані" style="font-size: 13px; height: 26px;">🗑️</button>
                </div>
            `;
            $header.append(controlsHTML);
            this.updateMasterCheckboxState();
        }

        // 2. Ін'єкція пошуку та розсувних фільтрів у бічну панель безпосередньо ПЕРЕД списком банерів
        if ($bannerList.length > 0 && !document.getElementById('syh-banner-search-container')) {
            
            if (!document.getElementById('syh-banner-header-styles')) {
                const style = document.createElement('style');
                style.id = 'syh-banner-header-styles';
                style.innerHTML = `
                    .syh-banner-search-pulse {
                        animation: syhPulse 0.5s ease-out;
                        border-color: #f39c12 !important;
                    }
                    .syh-banner-search-wrapper { position: relative; width: 100%; display: flex; gap: 6px; align-items: center; }
                    .syh-banner-empty-state {
                        text-align: center; padding: 20px; color: #666; font-size: 14px;
                        background: #f9f9f9; border-radius: 8px; border: 1px dashed #ccc;
                        margin: 15px 0; display: none;
                    }

                    /* СУЧАСНІ ДИНАМІЧНІ ТАБИ */
                    .syh-banner-filter-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        padding: 4px 6px;
                        border: none;
                        border-radius: 4px;
                        background: transparent;
                        cursor: pointer;
                        font-size: 13px !important;
                        color: #666;
                        transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
                        white-space: nowrap;
                        overflow: hidden;
                        flex: 1;
                    }

                    .syh-banner-filter-btn.active {
                        background: #fff !important;
                        color: #000 !important;
                        font-weight: bold !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                        flex: 1.8;
                        padding: 4px 8px;
                    }

                    .syh-banner-filter-btn .tab-text {
                        display: none;
                        opacity: 0;
                        transition: opacity 0.15s;
                    }

                    .syh-banner-filter-btn.active .tab-text {
                        display: inline;
                        opacity: 1;
                    }

                    .syh-banner-filter-btn .tab-count {
                        font-size: 12px !important;
                        opacity: 0.8;
                    }

                    /* ІЗОЛЬОВАНИЙ ФІКС ВЕРСТКИ ТА ПОЗИЦІОНУВАННЯ КНОПОК БАНЕРА */
                    div[class*="Banner__Wrap"] {
                        position: relative !important;
                        padding-bottom: 26px !important; 
                    }
                    
                    /* Звичайний напівпрозорий стан банерів: суцільна заливка */
                    div[class*="Banner__Wrap"][data-syh-banner-type="stream"] {
                        border-left: 12px solid #8e44ad !important;
                        background: rgba(142, 68, 173, 0.12) !important;
                    }
                    div[class*="Banner__Wrap"][data-syh-banner-type="audience"] {
                        border-left: 12px solid #f39c12 !important;
                        background: rgba(243, 156, 18, 0.12) !important;
                    }
                    div[class*="Banner__Wrap"][data-syh-banner-type="prayer"] {
                        border-left: 12px solid #005DF7 !important;
                        background: rgba(0, 93, 247, 0.12) !important;
                    }

                    /* ФІКС: Активний стан банерів на екрані (суцільна повна заливка) - іконка eye-off */
                    div[class*="Banner__Wrap"][data-syh-banner-type="stream"]:has(svg.lucide-eye-off) {
                        background: #8e44ad !important;
                        color: white !important;
                    }
                    div[class*="Banner__Wrap"][data-syh-banner-type="audience"]:has(svg.lucide-eye-off) {
                        background: #f39c12 !important;
                        color: white !important;
                    }
                    div[class*="Banner__Wrap"][data-syh-banner-type="prayer"]:has(svg.lucide-eye-off) {
                        background: #005DF7 !important;
                        color: white !important;
                    }

                    /* ФІКС: Золотисто-жовта рамка пульсації навколо виведеного банера (eye-off) */
                    div[class*="Banner__Wrap"]:has(svg.lucide-eye-off) {
                        outline: 3px solid #ffcc00 !important;
                        outline-offset: -3px;
                        box-shadow: 0 0 15px rgba(255, 204, 0, 0.6) !important;
                        animation: syhActiveBannerPulse 2s infinite alternate !important;
                    }
                    @keyframes syhActiveBannerPulse {
                        0% { box-shadow: 0 0 10px rgba(255, 204, 0, 0.4); }
                        100% { box-shadow: 0 0 20px rgba(255, 204, 0, 0.8); }
                    }

                    .syh-banner-controls {
                        position: absolute !important;
                        top: auto !important;
                        bottom: 4px !important;
                        right: 36px !important;
                        height: 24px !important;
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 6px !important;
                        z-index: 10 !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .syh-banner-controls .syh-button {
                        padding: 2px 4px !important;
                        font-size: 13px !important;
                        height: 24px !important;
                        width: 24px !important;
                        line-height: 1 !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 4px !important;
                        margin: 0 !important;
                    }
                    .syh-banner-controls .syh-checkbox {
                        width: 24px !important;
                        height: 24px !important;
                        cursor: pointer !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .syh-banner-controls .syh-checkbox-container {
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 24px !important;
                        height: 24px !important;
                    }
                `;
                document.head.appendChild(style);
            }

            const searchContainerHTML = `
                <div id="syh-banner-search-container" style="padding: 10px 15px 5px 15px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #eee; background: #fff; width: 100%; box-sizing: border-box;">
                    <div class="syh-banner-search-wrapper">
                        <input type="text" id="syh-banner-search" value="${this.bannerSearchQuery || ''}" placeholder="🔍 Пошук банерів..." style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                        <button id="syh-clear-banner-search-btn" class="syh-clear-banner-search" style="display: ${this.bannerSearchQuery ? 'flex' : 'none'};" title="Очистити пошук">✕</button>
                        <button id="syh-scroll-to-active-banner-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до активного банера на екрані">🎯</button>
                    </div>
                    
                    <div style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                        <button class="syh-banner-filter-btn ${this.bannerActiveFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-banner-filter-all">
                            <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                        </button>
                        <button class="syh-banner-filter-btn ${this.bannerActiveFilter === 'stream' ? 'active' : ''}" data-filter="stream" id="syh-banner-filter-stream">
                            <span>🎙️</span><span class="tab-text">Ефір</span><span class="tab-count"></span>
                        </button>
                        <button class="syh-banner-filter-btn ${this.bannerActiveFilter === 'audience' ? 'active' : ''}" data-filter="audience" id="syh-banner-filter-audience">
                            <span>❓</span><span class="tab-text">Глядачі</span><span class="tab-count"></span>
                        </button>
                        <button class="syh-banner-filter-btn ${this.bannerActiveFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-banner-filter-prayer">
                            <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                        </button>
                    </div>
                </div>
            `;
            
            $bannerList.before(searchContainerHTML);

            if (!$('#syh-banner-empty-state-msg').length) {
                $bannerList.after(`
                    <div id="syh-banner-empty-state-msg" class="syh-banner-empty-state">
                        <div id="syh-banner-empty-query"></div>
                        <div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                    </div>
                `);
            }

            if (typeof window.SYH_EVENT_BANNERS !== 'undefined' && typeof window.SYH_EVENT_BANNERS.bindBannersFilterControls === 'function') {
                window.SYH_EVENT_BANNERS.bindBannersFilterControls();
            }
            setTimeout(() => this.filterBanners(), 10);
        }
    }
});