export function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

export function setStyle(el: HTMLElement, styles: Record<string, string>): void {
    Object.assign(el.style, styles);
}

export function cleanAuthorName(author: string): string {
    return author.replace(/^@+/, '');
}

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