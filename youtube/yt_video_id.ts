/** Returns the current YouTube video ID from the `v` query parameter. */
export function getVideoId(): string {
    if (typeof window === 'undefined') return '';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
    } catch {
        return '';
    }
}
