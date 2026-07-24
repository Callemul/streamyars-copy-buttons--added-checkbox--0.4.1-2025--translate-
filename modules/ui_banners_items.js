import { SYH_UI } from './ui_core.js';

// Розширення об'єкта SYH_UI логікою ін'єкції та стилізації індивідуальних банерів
Object.assign(SYH_UI, {
    
    // Додавання кастомних кнопок маркування (📋, 📺, ❓, 🙏) та чекбоксу під банер
    addButtonsToBanner: function(bannerNode) {
        const $bannerWrap = $(bannerNode).find(this.SELECTORS.bannerWrap);
        if ($bannerWrap.length > 0 && !$bannerWrap.find('.syh-banner-controls').length) {
            // Під банером рендериться 3 кнопки маркування: 📺 (Ефір), ❓ (Глядачі), 🙏 (Молитви)
            const buttonsHTML = `
                <div class="syh-banner-controls">
                    <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера" aria-label="Копіювати текст банера">📋</button>
                    <button class="syh-button" data-type="banner" data-action="mark-stream" title="Відмітити як Питання ефіру" aria-label="Відмітити як Питання ефіру">📺</button>
                    <button class="syh-button" data-type="banner" data-action="mark-audience" title="Відмітити як Питання глядачів" aria-label="Відмітити як Питання глядачів">❓</button>
                    <button class="syh-button" data-type="banner" data-action="mark-prayer" title="Відмітити як Молитовне" aria-label="Відмітити як Молитовне">🙏</button>
                    <div class="syh-checkbox-container">
                        <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване" aria-label="Відмітити банер як опрацьований">
                    </div>
                </div>`;
            $bannerWrap.append(buttonsHTML);
            const bannerText = $(bannerNode).find(this.SELECTORS.bannerText).text();
            
            if (this.STATE && typeof this.STATE.getState === 'function' && this.STATE.getState(bannerText)) {
                $bannerWrap.find('.syh-checkbox').prop('checked', true);
            }

            // Застосовуємо збережене кольорове маркування банера при ін'єкції безпосередньо на плашку
            this.applySavedBannerLabels($bannerWrap[0], bannerText);
        }
    },

    // Оновлення атрибутів кольорового дизайну плашки банера
    updateBannerVisuals: function($bannerBlock, type) {
        if (type === 'stream' || type === 'audience' || type === 'prayer') {
            $bannerBlock.attr('data-syh-banner-type', type);
        } else {
            $bannerBlock.removeAttr('data-syh-banner-type');
        }
    },

    // Перевірка збереженого маркування та накладання кольорів при першому рендерингу
    applySavedBannerLabels: function(bannerNode, text) {
        if (!text || !text.trim()) return;
        const type = this.bannerCategoriesCache[text] || 'none';
        this.updateBannerVisuals($(bannerNode), type);
    }
});

if (typeof window !== 'undefined') {
    window.SYH_UI = SYH_UI;
}

export { SYH_UI };