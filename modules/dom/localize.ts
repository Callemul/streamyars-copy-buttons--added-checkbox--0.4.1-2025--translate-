import { SYH_I18N } from '../registry/i18n';

const TRANSLATABLE_ATTRIBUTES = ['title', 'placeholder', 'aria-label'] as const;

/** Localize extension-owned markup. Keep its fallback text when no translation exists. */
export function localize(root: ParentNode): void {
    const selector = '[data-i18n], [data-i18n-title], [data-i18n-placeholder], [data-i18n-aria-label]';
    const elements = Array.from(root.querySelectorAll(selector));
    if (root instanceof Element && root.matches(selector)) elements.unshift(root);

    for (const element of elements) {
        const textKey = element.getAttribute('data-i18n');
        // Labels containing icons or controls must mark a dedicated text span instead.
        if (textKey && element.children.length === 0) {
            element.textContent = SYH_I18N.getMessage(textKey, element.textContent ?? '');
        }
        for (const attribute of TRANSLATABLE_ATTRIBUTES) {
            const key = element.getAttribute(`data-i18n-${attribute}`);
            if (key) element.setAttribute(attribute, SYH_I18N.getMessage(key, element.getAttribute(attribute) ?? ''));
        }
    }
}
