// ui_banners_filters.js
// Розширення об'єкта SYH_UI логікою фільтрації, підрахунку та фокусування банерів
Object.assign(window.SYH_UI, {
    
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

        // Лічильники категорій
        let totalCount = 0;
        let streamCount = 0;
        let audienceCount = 0;
        let prayerCount = 0;

        let visibleCount = 0;

        $bannerList.find('> li, > div[class*="Banner__LiWrap"]').each(function() {
            const $li = $(this);
            const $bannerWrap = $li.find(self.SELECTORS.bannerWrap);
            if (!$bannerWrap.length) return;

            const originalText = $bannerWrap.find(self.SELECTORS.bannerText).text();
            const text = originalText.toLowerCase();
            
            const commentType = self.bannerCategoriesCache[originalText] || 'none';
            
            self.updateBannerVisuals($bannerWrap, commentType);
            
            // Динамічний підрахунок кількості
            totalCount++;
            if (commentType === 'stream') streamCount++;
            if (commentType === 'audience') audienceCount++;
            if (commentType === 'prayer') prayerCount++;

            let isVisible = true;

            if (activeFilter === 'stream' && commentType !== 'stream') isVisible = false;
            if (activeFilter === 'audience' && commentType !== 'audience') isVisible = false;
            if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;
            if (searchQuery && !text.includes(searchQuery)) isVisible = false;

            if (isVisible) {
                $li.show();
                visibleCount++;
            } else {
                $li.hide();
            }
        });

        // ФІКС: Динамічне оновлення лічильників на кнопках фільтрів в реальному часі для всіх категорій
        $('#syh-banner-filter-all .tab-count').text(` (${totalCount})`);
        $('#syh-banner-filter-stream .tab-count').text(` (${streamCount})`);
        $('#syh-banner-filter-audience .tab-count').text(` (${audienceCount})`);
        $('#syh-banner-filter-prayer .tab-count').text(` (${prayerCount})`);

        // Показ інформативної плашки при порожньому стані
        const $emptyState = $('#syh-banner-empty-state-msg');
        if (visibleCount === 0) {
            let messageHTML = '';
            if (searchQuery) {
                messageHTML = `Нічого не знайдено по запиту: <b style="color: #e74c3c;">"${searchQuery}"</b>`;
            } else if (activeFilter !== 'all') {
                const filterNames = { 'stream': '📺 Питання ефіру', 'audience': '❓ Питання глядачів', 'prayer': '🙏 Молитовні' };
                messageHTML = `Порожньо в категорії: <b style="color: #005DF7;">"${filterNames[activeFilter]}"</b>`;
            }

            if (messageHTML) {
                $('#syh-banner-empty-query').html(messageHTML);
                $emptyState.show();
            } else {
                $emptyState.hide();
            }
        } else {
            $emptyState.hide();
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