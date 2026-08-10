// youtube/studio/studio_comment_text.ts
//
// ПРИЗНАЧЕННЯ: витягування «людського» тексту коментаря з `#content-text`.
//
// YouTube Studio рендерить емодзі як `<img alt="😀">`, тому простий `textContent`
// губить їх. Тут обхід дітей склеює текстові вузли та `alt` картинок.
//
// Винесено з `studio_selectors.ts` (функція `getCommentText`, ~30 рядків із
// потрійною вкладеністю) — поведінка збережена 1-в-1.

/** `Node.TEXT_NODE` — константа локально, щоб не залежати від глобального `Node`. */
const TEXT_NODE = 3;
/** `Node.ELEMENT_NODE`. */
const ELEMENT_NODE = 1;

/**
 * Текст одного елемента-дитини:
 * пряма картинка -> її `alt`; інакше вкладена `img[alt]` -> її `alt`;
 * інакше — власний `textContent`.
 */
function readElementNodeText(elem: HTMLElement): string {
    if (elem.tagName === 'IMG' && (elem as HTMLImageElement).alt) {
        return (elem as HTMLImageElement).alt;
    }
    // Захисна гілка для не-DOM-заглушок без `querySelector`.
    if (typeof elem.querySelector !== 'function') {
        return elem.textContent || '';
    }
    const img = elem.querySelector<HTMLImageElement>('img[alt]');
    return img && img.alt ? img.alt : (elem.textContent || '');
}

/** Текст одного вузла: текстові — як є, елементи — через `readElementNodeText`, решта — ігнор. */
function readChildNodeText(node: Node): string {
    if (node.nodeType === TEXT_NODE) return node.textContent || '';
    if (node.nodeType === ELEMENT_NODE) return readElementNodeText(node as HTMLElement);
    return '';
}

/**
 * Склеює текст контейнера коментаря.
 * Якщо обхід дітей дав порожній результат — фолбек на `textContent` контейнера.
 */
export function extractCommentText(el: HTMLElement): string {
    const children: Node[] = el.childNodes ? Array.from(el.childNodes) : [];
    const text = children.map(readChildNodeText).join('');
    return text.trim() || (el.textContent || '').trim();
}
