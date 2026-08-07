export function getPrayerIcon(buttonNum: number): string {
    if (buttonNum === 1) return "🙏❤️🙏";
    if (buttonNum === 2) return "❤️❤️❤️";
    return "🙏🙏🙏";
}

export function stripLeadingAt(rawAuthor: string | null | undefined): string {
    let author = rawAuthor?.trim() || '';
    while (author.startsWith('@')) author = author.substring(1);
    return author;
}