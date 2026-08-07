// popup/prayer_dom_builders.ts
//
// ПРИЗНАЧЕННЯ: Побудова DOM-вузлів для списку молитов у попапі
// (шапка автора та рядок окремого прохання).
//
// Виділено з popup/prayer_render_helpers.ts, щоб відокремити «важку» DOM-збірку
// від логіки попередження про чужу кімнату.

import { setStyle, getAuthorIcon } from './prayer_utils';

export interface PrayerRowItem {
    text: string;
    id: string;
}

export interface PrayerAuthorItem extends PrayerRowItem {
    icon: string;
}

function createStyledEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    styles: Record<string, string>
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    setStyle(el, styles);
    return el;
}

function createIconButton(className: string, title: string, label: string): HTMLButtonElement {
    const btn = createStyledEl('button', {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        padding: '0 4px'
    });
    btn.className = className;
    btn.setAttribute('title', title);
    btn.textContent = label;
    return btn;
}

function buildAuthorLabel(author: string, authorIcon: string): HTMLElement {
    const leftWrap = createStyledEl('div', {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center',
        flex: '1',
        minWidth: '0'
    });

    const iconSpan = createStyledEl('span', {
        color: '#0b5394',
        fontWeight: 'bold',
        marginRight: '2px',
        whiteSpace: 'nowrap',
        flexShrink: '0'
    });
    iconSpan.textContent = `${authorIcon} @`;

    const authorSpan = createStyledEl('span', {
        color: '#0b5394',
        fontWeight: 'bold',
        outline: 'none',
        borderBottom: '1px dashed transparent',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    });
    authorSpan.className = 'editable-author';
    authorSpan.setAttribute('contenteditable', 'true');
    authorSpan.textContent = author;

    leftWrap.append(iconSpan, authorSpan);
    return leftWrap;
}

function buildAuthorActions(author: string): HTMLElement {
    const rightWrap = createStyledEl('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: '0'
    });

    const editBtn = createIconButton('edit-prayer-btn', 'Редагувати автора', '✏️');
    const delBtn = createIconButton('del-author-btn', 'Видалити автора з усіма проханнями', '🗑️');
    delBtn.setAttribute('data-author', author);

    rightWrap.append(editBtn, delBtn);
    return rightWrap;
}

export function buildAuthorHeader(
    author: string,
    items: PrayerAuthorItem[]
): { header: HTMLElement; authorIcon: string } {
    const authorIcon = getAuthorIcon(items);

    const header = createStyledEl('div', {
        marginBottom: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        width: '100%'
    });

    header.append(buildAuthorLabel(author, authorIcon), buildAuthorActions(author));
    return { header, authorIcon };
}

function buildRowIndex(idx: number): HTMLElement {
    const indexSpan = createStyledEl('span', {
        color: '#666',
        fontWeight: 'bold',
        whiteSpace: 'nowrap'
    });
    indexSpan.textContent = `${idx + 1}) `;
    return indexSpan;
}

export function buildPrayerRow(item: PrayerRowItem, idx?: number): HTMLElement {
    const isNumbered = idx !== undefined;

    const textContainer = createStyledEl('div', {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '5px',
        ...(isNumbered ? { marginBottom: '4px' } : {})
    });

    if (isNumbered) textContainer.appendChild(buildRowIndex(idx as number));

    const textSpan = createStyledEl('span', {
        flex: '1',
        outline: 'none',
        borderBottom: '1px dashed transparent',
        padding: '2px'
    });
    textSpan.className = 'editable-prayer';
    textSpan.setAttribute('contenteditable', 'true');
    textSpan.setAttribute('data-id', item.id);
    textSpan.textContent = item.text;

    const delBtn = createStyledEl('button', {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 5px',
        fontSize: '12px'
    });
    delBtn.className = 'del-prayer-btn';
    delBtn.setAttribute('title', 'Видалити прохання');
    delBtn.setAttribute('data-id', item.id);
    delBtn.textContent = '❌';

    textContainer.append(textSpan, delBtn);
    return textContainer;
}
