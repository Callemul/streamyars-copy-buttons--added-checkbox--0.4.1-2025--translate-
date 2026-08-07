import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import type { PrayerItem } from '../modules/types';

export function bindPrayerFocusListeners(): void {
    document.addEventListener('focusin', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-prayer') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed #2b7de9';
    });

    document.addEventListener('focusout', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-prayer') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed transparent';

        const id = el.getAttribute('data-id');
        const newText = el.textContent?.trim() || '';

        SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
            const targetItem = list.find(item => item.id === id);
            if (targetItem && targetItem.text !== newText) {
                targetItem.text = newText;
                SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
            }
        });
    });

    document.addEventListener('focusin', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-author') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed #2b7de9';
        el.setAttribute('data-old-val', el.textContent?.trim() || '');
    });

    document.addEventListener('focusout', function(e) {
        const target = e.target as Element | null;
        const el = target?.closest('.editable-author') as HTMLElement | null;
        if (!el) return;
        el.style.borderBottom = '1px dashed transparent';

        const oldAuthor = el.getAttribute('data-old-val');
        const newAuthor = el.textContent?.trim() || '';

        if (oldAuthor && newAuthor && oldAuthor !== newAuthor) {
            SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
                const list: PrayerItem[] = result[STORAGE_KEYS.PRAYERS] || [];
                let updated = false;
                list.forEach(item => {
                    if (item.author === oldAuthor) {
                        item.author = newAuthor;
                        updated = true;
                    }
                });
                if (updated) {
                    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
                }
            });
        }
    });
}