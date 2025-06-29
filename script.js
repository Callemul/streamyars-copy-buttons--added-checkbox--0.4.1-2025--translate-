console.log("StreamYard Helper v0.5 [FINAL STABLE] Loaded!");

const SELECTORS = {
    // Коментарі
    commentBlock: '[class*="PlatformComment__Wrap"]',
    commentButtonContainer: '[class*="PlatformComment__TopRightButtonGroup"]',
    commentAuthor: '[class*="PlatformCommentShell__NameText"]',
    commentText: '[class*="PlatformCommentShell__ContentSpan"]',
    starButton: '[class*="PlatformComment__StarButton"]',
    
    // Банери
    bannerBlock: '[class*="Banner__LiWrap"]',
    bannerWrap: '[class*="Banner__Wrap"]',
    bannerText: '[class*="Banner__BannerText"]',
};

let itemStates = [];

function copyAndShowBanner(textToCopy, bannerMessage) {
    if (!textToCopy) { console.error("No text provided to copy."); return; }
    navigator.clipboard.writeText(textToCopy).then(() => {
        $('.copy-success-banner').remove();
        const banner = $('<div></div>').addClass('copy-success-banner').text(bannerMessage || `Скопійовано!`).appendTo('body');
        setTimeout(() => banner.addClass('visible'), 10);
        setTimeout(() => {
            banner.removeClass('visible');
            setTimeout(() => banner.remove(), 300);
        }, 2500);
    }).catch(err => console.error('Copy failed: ', err));
}

// --- ФУНКЦІЇ ДОДАВАННЯ КНОПОК ---

function addButtonsToComment(commentNode) {
    const $targetContainer = $(commentNode).find(SELECTORS.commentButtonContainer);
    if ($targetContainer.length > 0 && !$targetContainer.find('.syh-custom-buttons-comment').length) {
        const buttonsHTML = `
            <div class="syh-custom-buttons-comment">
                <button class="syh-button" data-type="comment" data-action="copy-comment" title="Копіювати тільки коментар">📄</button>
                <button class="syh-button" data-type="comment" data-action="copy-author-comment" title="Копіювати автора + коментар">📑</button>
                <button class="syh-button" data-type="comment" data-action="copy-prayer" title="Копіювати як молитовне прохання">🙏</button>
                <div class="syh-checkbox-container">
                    <input type="checkbox" class="syh-checkbox" data-type="comment" title="Відмітити як опрацьоване">
                </div>
            </div>`;
        $targetContainer.append(buttonsHTML); // Використовуємо .append()
        
        const commentText = $(commentNode).find(SELECTORS.commentText).text();
        const savedState = itemStates.find(item => item.text === commentText);
        if (savedState && savedState.isChecked) {
            $targetContainer.find('.syh-checkbox').prop('checked', true);
        }
    }
}

// Функція для банерів використовує абсолютне позиціонування
function addButtonsToBanner(bannerNode) {
    const $bannerWrap = $(bannerNode).find(SELECTORS.bannerWrap);
    if ($bannerWrap.length > 0 && !$bannerWrap.find('.syh-custom-buttons-banner').length) {
        const buttonsHTML = `
            <div class="syh-custom-buttons-banner">
                <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера">📋</button>
                <div class="syh-checkbox-container">
                    <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване">
                </div>
            </div>`;
        $bannerWrap.append(buttonsHTML);

        const bannerText = $(bannerNode).find(SELECTORS.bannerText).text();
        const savedState = itemStates.find(item => item.text === bannerText);
        if (savedState && savedState.isChecked) {
            $bannerWrap.find('.syh-checkbox').prop('checked', true);
        }
    }
}

// --- ОБРОБНИКИ ПОДІЙ ---
$(document).on('click', '.syh-button', function(e) {
    e.preventDefault(); e.stopPropagation();
    const $button = $(this);
    const action = $button.data('action');
    const type = $button.data('type');

    if (type === 'comment') {
        const $commentBlock = $button.closest(SELECTORS.commentBlock);
        if (!$commentBlock.length) return;
        const author = $commentBlock.find(SELECTORS.commentAuthor).text();
        const comment = $commentBlock.find(SELECTORS.commentText).text();
        let textToCopy, header;
        if (action === 'copy-comment') { header = "📄 Комент (без автора)"; textToCopy = comment; }
        else if (action === 'copy-author-comment') { header = "📑 Автор і його 📄 комент"; textToCopy = `${author}\n\n${comment}`; }
        else if (action === 'copy-prayer') { header = "📑 Автор і його 🙏 прохання"; textToCopy = `🙏🙏🙏 ${author}\n\n${comment}`; }
        
        if (textToCopy) {
            copyAndShowBanner(textToCopy, header);
            $commentBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
            if (action === 'copy-author-comment') {
                const $starButton = $commentBlock.find(SELECTORS.starButton);
                if ($starButton.length > 0 && $starButton.attr('aria-selected') === 'false') {
                    $starButton.trigger('click');
                }
            }
        }
    } else if (type === 'banner') {
        const $bannerBlock = $button.closest(SELECTORS.bannerBlock);
        if (!$bannerBlock.length) return;
        const bannerText = $bannerBlock.find(SELECTORS.bannerText).text();
        copyAndShowBanner(bannerText, "Текст з Банера 🗞");
    }
});

$(document).on('change', '.syh-checkbox', function(e) {
    e.stopPropagation();
    const $checkbox = $(this);
    const type = $checkbox.data('type');
    let textKey = '';
    if (type === 'comment') { textKey = $checkbox.closest(SELECTORS.commentBlock).find(SELECTORS.commentText).text(); }
    else if (type === 'banner') { textKey = $checkbox.closest(SELECTORS.bannerBlock).find(SELECTORS.bannerText).text(); }
    if (!textKey) return;
    const isChecked = $checkbox.is(':checked');
    let element = itemStates.find(x => x.text === textKey);
    if (element) { element.isChecked = isChecked; }
    else { itemStates.push({ text: textKey, isChecked: isChecked }); }
});

const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            const $node = $(node);
            $node.find(SELECTORS.commentBlock).addBack($node.filter(SELECTORS.commentBlock)).each((i, el) => addButtonsToComment(el));
            $node.find(SELECTORS.bannerBlock).addBack($node.filter(SELECTORS.bannerBlock)).each((i, el) => addButtonsToBanner(el));
        }
    }
});

function init() {
    console.log("Initializing...");
    $(SELECTORS.commentBlock).each((i, el) => addButtonsToComment(el));
    $(SELECTORS.bannerBlock).each((i, el) => addButtonsToBanner(el));
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("Running.");
}

init();