// modules/ui_banners_inject.ts
//
// Додавання кнопок до банера та візуальний стан міток/категорій.
// Виділено з `modules/ui_banners.ts` у рамках декомпозиції.
//
// Поведінка збережена 1-в-1 (див. tests/ui_banners.test.js).

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, resolveSelector } from '../../registry/config';
import { UiFactory } from '../../dom/ui_factory';
import { restoreCheckboxFromCache } from './ui_shared_utils';

export function addButtonsToBanner(bannerNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerWrap = resolveSelector(selectors.bannerWrap, bannerNode);
    if (bannerWrap && !bannerWrap.querySelector('.syh-banner-controls')) {
        const container = document.createElement('div');
        container.className = 'syh-banner-controls';

        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'copy-banner', icon: '📋', title: 'Копіювати текст банера'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-stream', icon: '📺', title: 'Відмітити як Питання ефіру'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-audience', icon: '❓', title: 'Відмітити як Питання глядачів'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-prayer', icon: '🙏', title: 'Відмітити як Молитовне'
        }));

        const { wrapper: cbWrap } = UiFactory.createCheckbox(
            'banner',
            'Відмітити банер як опрацьований'
        );
        container.appendChild(cbWrap);

        bannerWrap.appendChild(container);
        const bannerText = resolveSelector(selectors.bannerText, bannerNode)?.textContent || '';

        restoreCheckboxFromCache(bannerWrap, bannerText);

        applySavedBannerLabels(bannerWrap, bannerText);
    }
}

export function updateBannerVisuals(bannerBlock: Element, type: string): void {
    if (type === 'stream' || type === 'audience' || type === 'prayer') {
        bannerBlock.setAttribute('data-syh-banner-type', type);
    } else {
        bannerBlock.removeAttribute('data-syh-banner-type');
    }
}

export function applySavedBannerLabels(bannerNode: Element, text: string): void {
    if (!text || !text.trim()) return;
    const type = SYH_UI_STATE.bannerCategoriesCache[text] || 'none';
    updateBannerVisuals(bannerNode, type);
}
