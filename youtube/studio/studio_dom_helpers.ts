// youtube/studio/studio_dom_helpers.ts
import { getVideoTitleText, getVideoLinkHref } from './studio_selectors';

interface ActiveDropdownInfo {
    dropdown: HTMLElement;
    metaContainer: HTMLElement;
}

let activeStudioDropdownInfo: ActiveDropdownInfo | null = null;

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (activeStudioDropdownInfo && !activeStudioDropdownInfo.metaContainer.contains(e.target as Node)) {
            activeStudioDropdownInfo.dropdown.style.display = 'none';
            activeStudioDropdownInfo = null;
        }
    });
}

export function resolveReplyVideoMetadata(threadEl: HTMLElement): { videoTitle: string; videoHref: string | null } {
    let videoTitle = getVideoTitleText(threadEl);
    let videoHref = getVideoLinkHref(threadEl);

    if (threadEl.hasAttribute('is-reply') && !videoTitle) {
        const parentThread = threadEl.closest('ytcp-comment-thread');
        const parentComment = parentThread?.querySelector<HTMLElement>('ytcp-comment:not([is-reply])');
        if (parentComment) {
            if (!videoTitle) videoTitle = getVideoTitleText(parentComment);
            if (!videoHref) videoHref = getVideoLinkHref(parentComment);
        }
    }

    return { videoTitle, videoHref };
}

export function toggleDropdown(dropdownEl: HTMLElement, visible: boolean, metaContainer: HTMLElement): void {
    if (visible) {
        document.querySelectorAll('.syh-studio-dropdown').forEach(d => {
            (d as HTMLElement).style.display = 'none';
            toggleZIndexStack(d as HTMLElement, false);
        });
        dropdownEl.style.display = 'block';
        toggleZIndexStack(dropdownEl, true);
        activeStudioDropdownInfo = { dropdown: dropdownEl, metaContainer };
    } else {
        dropdownEl.style.display = 'none';
        toggleZIndexStack(dropdownEl, false);
        if (activeStudioDropdownInfo) {
            activeStudioDropdownInfo = null;
        }
    }
}

export function toggleZIndexStack(startEl: HTMLElement, active: boolean): void {
    let curr: HTMLElement | null = startEl;
    while (curr && curr.id !== 'items' && curr.tagName !== 'BODY') {
        if (curr.classList && (curr.classList.contains('ytcp-comment-thread') || curr.tagName.toLowerCase() === 'ytcp-comment')) {
            if (active) {
                curr.classList.add('syh-dropdown-active');
            } else {
                curr.classList.remove('syh-dropdown-active');
            }
        }
        curr = (curr.parentElement || (curr.getRootNode && (curr.getRootNode() as any).host) || null) as HTMLElement | null;
    }
}

export function getActiveDropdownInfo(): ActiveDropdownInfo | null {
    return activeStudioDropdownInfo;
}

export function clearActiveDropdownInfo(): void {
    activeStudioDropdownInfo = null;
}