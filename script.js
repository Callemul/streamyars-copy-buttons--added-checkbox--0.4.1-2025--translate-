// StreamYard Helper v0.5 [Auto-Star Logic] (Refactored)

console.log("StreamYard Helper v0.5 [Auto-Star Logic] Refactored Loaded!");

const SELECTORS = {
    commentBlock: '[class*="PlatformComment__Wrap"]',
    commentButtonContainer: '[class*="PlatformComment__TopRightButtonGroup"]',
    commentAuthor: '[class*="PlatformCommentShell__NameText"]',
    commentText: '[class*="PlatformCommentShell__ContentSpan"]',
    bannerBlock: '[class*="Banner__LiWrap"]',
    bannerWrap: '[class*="Banner__Wrap"]',
    bannerButtonContainer: '[class*="Banner__DesktopTopIconRow"]',
    bannerText: '[class*="Banner__BannerText"]',
    starButton: '[class*="PlatformComment__StarButton"]',
};

let itemStates = [];

// Utility: Show banner after copy
function showCopyBanner(message) {
    $('.copy-success-banner').remove();
    const banner = $('<div></div>')
        .addClass('copy-success-banner')
        .text(message || 'Скопійовано!')
        .appendTo('body');
    setTimeout(() => banner.addClass('visible'), 10);
    setTimeout(() => {
        banner.removeClass('visible');
        setTimeout(() => banner.remove(), 300);
    }, 2500);
}

// Utility: Copy text and show banner
function copyTextWithBanner(text, bannerMessage) {
    if (!text) {
        console.error("No text provided to copy.");
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => showCopyBanner(bannerMessage))
        .catch(err => console.error('Copy failed: ', err));
}

// Add custom buttons to comment
function addButtonsToComment(commentNode) {
    const $container = $(commentNode).find(SELECTORS.commentButtonContainer);
    if ($container.length === 0 || $container.find('.syh-custom-buttons-comment').length) return;

    const buttonsHTML = `
        <div class="syh-custom-buttons-comment">
            <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар">📄</button>
            <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Копіювати автора + коментар">📑</button>
            <button class="syh-button" data-type="comment" data-action="copy-prayer" title="Копіювати як молитовне прохання">🙏</button>
            <div class="syh-checkbox-container">
                <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване">
            </div>
        </div>`;
    $container.prepend(buttonsHTML);

    const commentText = $(commentNode).find(SELECTORS.commentText).text();
    const savedState = itemStates.find(item => item.text === commentText);
    if (savedState?.isChecked) {
        $container.find('.syh-checkbox').prop('checked', true);
    }
}

// Add custom buttons to banner
function addButtonsToBanner(bannerNode) {
    const $wrap = $(bannerNode).find(SELECTORS.bannerWrap);
    if ($wrap.length === 0 || $wrap.find('.syh-custom-buttons-banner').length) return;

    const buttonsHTML = `
        <div class="syh-custom-buttons-banner">
            <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера">📋</button>
            <div class="syh-checkbox-container">
                <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване">
            </div>
        </div>`;
    $wrap.append(buttonsHTML);

    const bannerText = $(bannerNode).find(SELECTORS.bannerText).text();
    const savedState = itemStates.find(item => item.text === bannerText);
    if (savedState?.isChecked) {
        $wrap.find('.syh-checkbox').prop('checked', true);
    }
}

// Handle button clicks
$(document).on('click', '.syh-button', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $btn = $(this);
    const action = $btn.data('action');
    const type = $btn.data('type');

    if (type === 'comment') {
        const $block = $btn.closest(SELECTORS.commentBlock);
        if (!$block.length) return;

        const author = $block.find(SELECTORS.commentAuthor).text();
        const comment = $block.find(SELECTORS.commentText).text();
        let textToCopy = '';
        let header = '';

        switch (action) {
            case 'copy-comment':
                header = "📄 Комент (без автора)";
                textToCopy = comment;
                break;
            case 'copy-author-comment':
                header = "📑 Автор і його 📄 комент";
                textToCopy = `${author}\n\n${comment}`;
                break;
            case 'copy-prayer':
                header = "📑 Автор і його 🙏 прохання";
                textToCopy = `🙏🙏🙏 ${author}\n\n${comment}`;
                break;
        }

        if (textToCopy) {
            copyTextWithBanner(textToCopy, header);
            $block.find('.syh-checkbox').prop('checked', true).trigger('change');

            // Auto-star logic for "copy-author-comment"
            if (action === 'copy-author-comment') {
                const $star = $block.find(SELECTORS.starButton);
                if ($star.length && $star.attr('aria-selected') === 'false') {
                    $star.trigger('click');
                }
            }
        }
    } else if (type === 'banner') {
        const $block = $btn.closest(SELECTORS.bannerBlock);
        if (!$block.length) return;
        const bannerText = $block.find(SELECTORS.bannerText).text();
        copyTextWithBanner(bannerText, "Текст з Банера 🗞");
        // Чекбокс банера не чіпаємо
    }
});

// Handle checkbox state
$(document).on('change', '.syh-checkbox', function (e) {
    e.stopPropagation();
    const $checkbox = $(this);
    const type = $checkbox.data('type');
    let textKey = '';

    if (type === 'comment') {
        textKey = $checkbox.closest(SELECTORS.commentBlock).find(SELECTORS.commentText).text();
    } else if (type === 'banner') {
        textKey = $checkbox.closest(SELECTORS.bannerBlock).find(SELECTORS.bannerText).text();
    }
    if (!textKey) return;

    const isChecked = $checkbox.is(':checked');
    let element = itemStates.find(x => x.text === textKey);
    if (element) {
        element.isChecked = isChecked;
    } else {
        itemStates.push({ text: textKey, isChecked });
    }
});

// Mutation observer for dynamic content
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            const $node = $(node);
            $node.find(SELECTORS.commentBlock).addBack($node.filter(SELECTORS.commentBlock)).each((_, el) => addButtonsToComment(el));
            $node.find(SELECTORS.bannerBlock).addBack($node.filter(SELECTORS.bannerBlock)).each((_, el) => addButtonsToBanner(el));
        }
    }
});

// Initialization
function init() {
    console.log("Initializing...");
    $(SELECTORS.commentBlock).each((_, el) => addButtonsToComment(el));
    $(SELECTORS.bannerBlock).each((_, el) => addButtonsToBanner(el));
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("Running.");
}

init();