// youtube/yt_selectors.ts

export type SelectorList = string | string[];

export interface YtSelectorsInterface {
    commentsContainer: SelectorList;
    commentBlock: SelectorList;
    commentText: SelectorList;
    commentAuthor: SelectorList;
    headerAuthor: SelectorList;
    toolbar: SelectorList;
    commentLink: SelectorList;
    commentBody: SelectorList;
    mainContent: SelectorList;
}

export const YT_SELECTORS: YtSelectorsInterface = {
    commentsContainer: ['ytd-item-section-renderer #contents', '#contents.ytd-item-section-renderer'],
    commentBlock: ['ytd-comment-thread-renderer', 'ytd-comment-view-model'],
    commentText: ['#content-text', '.ytd-comment-view-model #content-text', 'yt-attributed-string#content-text'],
    commentAuthor: ['#author-text span', 'a#author-text', '#header-author #author-text'],
    headerAuthor: ['#header-author', '#author-reputation', '#main #header'],
    toolbar: ['ytd-comment-engagement-bar #toolbar', '#engagement-toolbar', '#toolbar'],
    commentLink: ['#published-time-text a', 'a.yt-simple-endpoint[href*="lc="]'],
    commentBody: ['#body', '#main', '.ytd-comment-engagement-bar'],
    mainContent: ['ytd-comments', '#comments'],
};
