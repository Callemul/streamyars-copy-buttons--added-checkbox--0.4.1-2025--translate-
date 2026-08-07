// modules/parsers/author.ts
export interface CleaningLogEntry {
    before: string;
    after: string;
    removed: string;
}

export function cleanAuthorName(rawName: string, cleaningLog?: CleaningLogEntry[]): string {
    if (!rawName) return '';
    const original = rawName.trim();
    let name = original;
    const removedParts: string[] = [];

    if (name.startsWith('@')) {
        removedParts.push('@');
        name = name.substring(1);
    }

    const bulletMatch = name.match(/\s*•.*$/);
    if (bulletMatch) {
        removedParts.push(bulletMatch[0].trim());
        name = name.replace(/\s*•.*$/, '');
    }

    const suffixMatch = name.match(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/);
    if (suffixMatch) {
        removedParts.push(suffixMatch[0]);
        name = name.replace(/-[a-zA-Z0-9а-яА-ЯіІїЇєЄ]+$/, '');
    }

    name = name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, '$1 $2').trim();

    if (cleaningLog && name !== original) {
        cleaningLog.push({
            before: original,
            after: name,
            removed: removedParts.length > 0 ? removedParts.join(' | ') : 'форматування'
        });
    }

    return name;
}