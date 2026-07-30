// youtube/yt_selectors.ts

export interface YtSelectorsInterface {
    commentsContainer: string;
    commentBlock: string;
    commentText: string;
    commentAuthor: string;
    headerAuthor: string;
    toolbar: string;
    commentLink: string;
    commentBody: string;
    mainContent: string;
}

export const YT_SELECTORS: YtSelectorsInterface = {
    commentsContainer: 'ytd-item-section-renderer #contents',
    commentBlock: 'ytd-comment-thread-renderer',
    commentText: '#content-text',
    commentAuthor: '#author-text span',
    headerAuthor: '#header-author',        // куди вставляти кнопки "Додати до..."
    toolbar: 'ytd-comment-engagement-bar #toolbar',
    commentLink: '#published-time-text a',
    commentBody: '#body',
    mainContent: 'ytd-comments',
};

if (typeof window !== 'undefined') {
    (window as any).YT_SELECTORS = YT_SELECTORS;
}
