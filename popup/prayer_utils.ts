export function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

export function setStyle(el: HTMLElement, styles: Record<string, string>): void {
    Object.assign(el.style, styles);
}

/**
 * Очищує ім'я автора молитовного прохання, видаляючи лише технічний префікс '@'.
 *
 * ВАЖЛИВО (🏷️ Збереження локацій авторів у молитвах):
 * На відміну від `cleanAuthorName` у `modules/parsers/author.ts` (яка відсікає
 * суфікси міст/локацій через ` • ` та дефіси), ця функція НАВМИСНО зберігає
 * назви міст чи локацій (наприклад, `Марія • Львів`), оскільки вони є критично
 * важливими для розрізнення людей у молитовному списку.
 */
export function cleanPrayerAuthorName(author: string): string {
    return author.replace(/^@+/, '');
}

/** @deprecated Використовуйте `cleanPrayerAuthorName` */
export const cleanAuthorName = cleanPrayerAuthorName;

export function generatePrayerId(timestamp?: number, idx?: number): string {
    return 'p_' + (timestamp || Date.now()) + '_' + (idx || 0) + '_' + Math.random().toString(36).substring(2, 7);
}

export function getAuthorIcon(items: { text: string; icon: string; id: string }[]): string {
    let hasPrayer = false;
    let hasThanks = false;

    items.forEach(item => {
        if (item.icon === '🙏🙏🙏') hasPrayer = true;
        if (item.icon === '❤️❤️❤️') hasThanks = true;
        if (item.icon === '🙏❤️🙏') { hasPrayer = true; hasThanks = true; }
    });

    if (hasPrayer && hasThanks) return '🙏❤️🙏';
    if (!hasPrayer && hasThanks) return '❤️❤️❤️';
    return '🙏🙏🙏';
}