import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { $ } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();

export function setupScrollListeners(): void {
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    function saveScrollPosition() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolls: Record<string, any> = {
                window: window.scrollY || document.documentElement.scrollTop,
                prayersResultDiv: ($(`prayersResultDiv`) as HTMLElement | null)?.scrollTop || 0,
                textArea1_oldText: ($(`textArea1_oldText`) as HTMLElement | null)?.scrollTop || 0,
                textArea2_generatedRuText: ($(`textArea2_generatedRuText`) as HTMLElement | null)?.scrollTop || 0
            };
            SHEET_IDS.forEach(sId => {
                scrolls[`finalResultDiv__${sId}`] = ($(`finalResultDiv__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`deletedLog__${sId}`] = ($(`deletedLog__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`oldList__${sId}`] = ($(`oldList__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`newTelegram__${sId}`] = ($(`newTelegram__${sId}`) as HTMLElement | null)?.scrollTop || 0;
            });
            SYH_STORAGE.set({
                [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: scrolls,
                'tg_scroll_positions': scrolls
            });
        }, 150);
    }
    window.addEventListener('scroll', saveScrollPosition);
    const scrollTargets: HTMLElement[] = [];
    ['prayersResultDiv', 'textArea1_oldText', 'textArea2_generatedRuText'].forEach(id => {
        const el = $(id);
        if (el && el instanceof HTMLElement) scrollTargets.push(el);
    });
    SHEET_IDS.forEach(sId => {
        ['finalResultDiv__' + sId, 'deletedLog__' + sId, 'oldList__' + sId, 'newTelegram__' + sId].forEach(id => {
            const el = $(id);
            if (el && el instanceof HTMLElement) scrollTargets.push(el);
        });
    });
    scrollTargets.forEach(el => el.addEventListener('scroll', saveScrollPosition));
}