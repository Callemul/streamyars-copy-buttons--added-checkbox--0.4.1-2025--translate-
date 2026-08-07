// youtube/studio/studio_context_menu.ts
export function createContextMenuHandler(
    enabledRef: { current: boolean },
    isCommentsPage: () => boolean
): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
        if (!enabledRef.current || !isCommentsPage()) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const threadEl = target.closest('ytcp-comment, ytcp-comment-thread');
        if (!threadEl) return;

        if (target.closest('button, a, input, select, textarea, .syh-studio-dropdown, .syh-studio-btn, .syh-yt-btn')) {
            return;
        }

        const checkbox = threadEl.querySelector<HTMLInputElement>('.syh-studio-checkbox');
        if (!checkbox) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    };
}