import { SYH_UI } from "/modules/ui_core.js.js";
import { SYH_UTILS } from "/modules/utils.js.js";

// Розширення об'єкта SYH_UI логікою фільтрації, підрахунку та фокусування банерів
Object.assign(SYH_UI, {
    
    // Оновлення стану головного чекбоксу виділення банерів
    updateMasterCheckboxState: function() {
        const $masterCheckbox = $('.syh-master-checkbox');
        if (!$masterCheckbox.length) return;
        const $allBannerCheckboxes = $(this.SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]');
        const total = $allBannerCheckboxes.length;
        if (total === 0) {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
            return;
        }
        const checkedCount = $allBannerCheckboxes.filter(':checked').length;
        if (checkedCount === 0) {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
        } else if (checkedCount === total) {
            $masterCheckbox.prop({ 'checked': true, 'indeterminate': false });
        } else {
            $masterCheckbox.prop({ 'checked': false, 'indeterminate': true });
        }
    },

    // Метод фільтрації списку банерів та динамічного підрахунку кількості у вкладках (Tab Counters)
    filterBanners: function() {
        const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
        const $bannerList = $(bannerListSelector);
        if (!$bannerList.length) return;

        const activeFilter = this.bannerActiveFilter || 'all';
        const searchQuery = this.bannerSearchQuery || '';
        const self = this;

        // Безпечне оновлення DOM (Захист від зависання)
        const safeTextUpdate = (selector, newText) => {
            const el = $(selector);
            if (el.length && el.text() !== newText) el.text(newText);
        };
        const safeHtmlUpdate = (jqEl, newHtml) => {
            if (jqEl.length && jqEl.html() !== newHtml) jqEl.html(newHtml);
        };

        let visibleCount = 0;
        // РОЗДІЛЯЄМО ЛІЧИЛЬНИКИ ДЛЯ БАНЕРІВ: Абсолютні (для вкладок) та Пошукові (для підказок крос-пошуку)
        let countAbsolute = { all: 0, stream: 0, audience: 0, prayer: 0 };
        let countSearch = { all: 0, stream: 0, audience: 0, prayer: 0 };

        $bannerList.find('> li, > div[class*="Banner__LiWrap"]').each(function() {
            const $li = $(this);
            const $bannerWrap = $li.find(self.SELECTORS.bannerWrap);
            if (!$bannerWrap.length) return;

            const originalText = $bannerWrap.find(self.SELECTORS.bannerText).text();
            const commentType = self.bannerCategoriesCache[originalText] || 'none';
            
            self.updateBannerVisuals($bannerWrap, commentType);
            
            // Нарощення абсолютних лічильників
            countAbsolute.all++;
            if (commentType === 'stream') countAbsolute.stream++;
            else if (commentType === 'audience') countAbsolute.audience++;
            else if (commentType === 'prayer') countAbsolute.prayer++;

            // Використання нового глобального Розумного Пошуку (Smart Search)
            let matchesSearch = true;
            if (searchQuery) {
                matchesSearch = window.SYH_UTILS && typeof window.SYH_UTILS.smartSearch === 'function' 
                    ? window.SYH_UTILS.smartSearch(searchQuery, originalText)
                    : originalText.toLowerCase().includes(searchQuery.toLowerCase());
            }

            // Нарощення пошукових лічильників
            if (matchesSearch) {
                countSearch.all++;
                if (commentType === 'stream') countSearch.stream++;
                else if (commentType === 'audience') countSearch.audience++;
                else if (commentType === 'prayer') countSearch.prayer++;
            }

            let isVisible = matchesSearch;

            if (activeFilter === 'stream' && commentType !== 'stream') isVisible = false;
            if (activeFilter === 'audience' && commentType !== 'audience') isVisible = false;
            if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;

            if (isVisible) {
                if ($li.css('display') === 'none') $li.show();
                visibleCount++;
            } else {
                if ($li.css('display') !== 'none') $li.hide();
            }
        });

        // Безпечне оновлення лічильників вкладок
        safeTextUpdate('#syh-banner-filter-all .tab-count', ` (${countAbsolute.all})`);
        safeTextUpdate('#syh-banner-filter-stream .tab-count', ` (${countAbsolute.stream})`);
        safeTextUpdate('#syh-banner-filter-audience .tab-count', ` (${countAbsolute.audience})`);
        safeTextUpdate('#syh-banner-filter-prayer .tab-count', ` (${countAbsolute.prayer})`);

        const $emptyState = $('#syh-banner-empty-state-msg');
        const $emptyQuery = $('#syh-banner-empty-query');
        
        let $emptySuggestion = $('#syh-banner-empty-suggestion');
        if (!$emptySuggestion.length) {
            $emptyState.append(`<div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>`);
            $emptySuggestion = $('#syh-banner-empty-suggestion');
        }

        if (visibleCount === 0) {
            let messageHTML;
            if (searchQuery) {
                messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${searchQuery}"</b><br><br>
                <a href="#" id="syh-banner-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;
                
                let suggestions = [];
                // Використовуємо countSearch для точних рекомендацій
                if (activeFilter !== 'all' && countSearch.all > 0) {
                    if (countSearch.stream > 0 && activeFilter !== 'stream') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="stream" style="color: #f39c12; text-decoration: underline;">🎙️ Ефір (${countSearch.stream})</a>`);
                    if (countSearch.audience > 0 && activeFilter !== 'audience') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="audience" style="color: #f39c12; text-decoration: underline;">❓ Глядачі (${countSearch.audience})</a>`);
                    if (countSearch.prayer > 0 && activeFilter !== 'prayer') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="prayer" style="color: #f39c12; text-decoration: underline;">🙏 Молитви (${countSearch.prayer})</a>`);
                }

                if (suggestions.length > 0) {
                    safeHtmlUpdate($emptySuggestion, `Знайдено в інших категоріях: ` + suggestions.join(', '));
                    if ($emptySuggestion.css('display') === 'none') $emptySuggestion.show();
                    
                    $('.syh-switch-banner-tab').off('click').on('click', function(e) {
                        e.preventDefault();
                        const filter = $(this).data('filter');
                        $(`.syh-banner-filter-btn[data-filter="${filter}"]`).click();
                    });
                } else {
                    if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
                }
            } else {
                if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
                const filterNames = { 
                    'all': 'списку банерів', 
                    'stream': 'категорії "🎙️ Питання ефіру"', 
                    'audience': 'категорії "❓ Питання глядачів"', 
                    'prayer': 'категорії "🙏 Молитовні"' 
                };
                messageHTML = `<span style="color: #777;">Тут ще немає банерів для ${filterNames[activeFilter]}</span>`;
            }

            safeHtmlUpdate($emptyQuery, messageHTML);
            if ($emptyState.css('display') === 'none') $emptyState.show();
        } else {
            if ($emptyState.css('display') !== 'none') $emptyState.hide();
            if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
        }
    },

    // Ручний скрол до активного банера на екрані при натисканні 🎯
    scrollToActiveBanner: function() {
        const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
        const $bannerList = $(bannerListSelector);
        if ($bannerList.length) {
            // Активний банер містить іконку eye-off / minus або text "Hide"
            const $activeLi = $bannerList.find('> li:has(.lucide-circle-minus), > div[class*="Banner__LiWrap"]:has(.lucide-circle-minus)');
            if ($activeLi.length) {
                const el = $activeLi[0];
                const rect = el.getBoundingClientRect();
                const scrollParent = el.closest('div[class*="Scroll"]');
                if (scrollParent) {
                    const parentRect = scrollParent.getBoundingClientRect();
                    const isVisible = (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom);
                    if (!isVisible) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }
});

if (typeof window !== 'undefined') {
    window.SYH_UI = SYH_UI;
}

export { SYH_UI };