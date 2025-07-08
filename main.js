// main.js
(function(window, $) {
    'use strict';

    console.log("StreamYard Helper v0.8 [Refactored] Loaded!");

    // Ініціалізація модулів
    const { SELECTORS } = window.SYH_CONFIG;
    const STATE = window.SYH_STATE;
    const UTILS = window.SYH_UTILS;
    const UI = window.SYH_UI;
    UI.init(window.SYH_CONFIG, STATE); // Передаємо залежності в UI модуль

    // --- ЛОГІКА СТВОРЕННЯ БАНЕРІВ ---
    async function processAndCreateBanners(rawText) {
        const questions = rawText.split('\n').map(line => line.trim()).filter(line => /^\d/.test(line))
            .map(line => line.replace(/^\d+[\.\)]?\s*/, '').trim().replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0 && line.length < 200);

        if (questions.length === 0) {
            alert("Не знайдено пронумерованих питань у тексті.");
            return;
        }

        let createdCount = 0;
        for (const question of questions) {
            try {
                await createSingleBanner(question);
                createdCount++;
            } catch (error) {
                console.error("Помилка при створенні банера:", error);
                alert(`Не вдалося створити банер: "${question}".\nПричина: ${error.message}.\nПроцес перервано.`);
                break;
            }
        }
        alert(`Створення завершено! Створено ${createdCount} з ${questions.length} банер(ів).`);
    }

    function createSingleBanner(text) {
        return new Promise(async (resolve, reject) => {
            const createButton = document.querySelector(SELECTORS.createBannerButton);
            if (!createButton) return reject(new Error("Кнопка 'Create a banner' не знайдена."));
            createButton.click();

            const form = await UTILS.waitForElement(SELECTORS.createBannerForm, 3000);
            const textarea = form.querySelector('textarea');
            const addButton = form.querySelector('button[type="submit"]');
            if (!textarea || !addButton) return reject(new Error("Структура форми створення невірна."));
            
            textarea.focus();
            textarea.value = text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
            
            if (addButton.disabled) return reject(new Error("Кнопка 'Add banner' неактивна."));
            addButton.click();

            await UTILS.waitForElementToDisappear(SELECTORS.createBannerForm, 3000);
            resolve();
        });
    }

    // --- ОБРОБНИКИ ПОДІЙ ---
    $(document).on('click', '.syh-button', function(e) {
        e.preventDefault(); e.stopPropagation();
        const $button = $(this);
        const action = $button.data('action');
        const type = $button.data('type');

        if (action === 'create-from-text') {
            const text = prompt("Вставте список питань для створення банерів:", "");
            if (text) processAndCreateBanners(text);
            return;
        }

        if (action === 'delete-selected-banners') {
            const $checkedBanners = $('.syh-checkbox[data-type="banner"]:checked');
            if ($checkedBanners.length === 0) {
                alert("Немає вибраних банерів для видалення.");
                return;
            }
            if (confirm(`Ви впевнені, що хочете видалити ${$checkedBanners.length} банер(ів)?`)) {
                $checkedBanners.each(function() {
                    const deleteButton = this.closest(SELECTORS.bannerBlock).querySelector(SELECTORS.bannerDeleteButton)?.closest('button');
                    if (deleteButton) deleteButton.click();
                });
            }
            return;
        }

        if (type === 'comment') {
            const $commentBlock = $button.closest(SELECTORS.commentBlock);
            const author = $commentBlock.find(SELECTORS.commentAuthor).text();
            const comment = $commentBlock.find(SELECTORS.commentText).text();
            let textToCopy, header;
            if (action === 'copy-comment') { header = "📄 Комент (без автора)"; textToCopy = comment; }
            else if (action === 'copy-author-comment') { header = "📑 Автор і його 📄 комент"; textToCopy = `${author}\n\n${comment}`; }
            else if (action === 'copy-prayer') { header = "📑 Автор і його 🙏 прохання"; textToCopy = `\n\n\n🙏🙏🙏 ${author}\n\n${comment}`; }
            
            if (textToCopy) {
                UTILS.copyAndShowBanner(textToCopy, header);
                $commentBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
                if (action === 'copy-author-comment') {
                    const $starButton = $commentBlock.find(SELECTORS.starButton);
                    if ($starButton.length > 0 && $starButton.attr('aria-selected') === 'false') $starButton.trigger('click');
                }
            }
        } else if (type === 'banner') {
            const $bannerBlock = $button.closest(SELECTORS.bannerBlock);
            const bannerText = $bannerBlock.find(SELECTORS.bannerText).text();
            UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
            $bannerBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
        }
    });

    $(document).on('change', '.syh-checkbox', function(e) {
        e.stopPropagation();
        const $checkbox = $(this);
        const type = $checkbox.data('type');
        let textKey = '';
        if (type === 'comment') textKey = $checkbox.closest(SELECTORS.commentBlock).find(SELECTORS.commentText).text();
        else if (type === 'banner') textKey = $checkbox.closest(SELECTORS.bannerBlock).find(SELECTORS.bannerText).text();
        
        STATE.updateState(textKey, $checkbox.is(':checked'));
        if (type === 'banner') UI.updateMasterCheckboxState();
    });

    $(document).on('change', '.syh-master-checkbox', function() {
        const isChecked = $(this).is(':checked');
        $(this).prop('indeterminate', false);
        $(SELECTORS.bannerBlock).find('.syh-checkbox[data-type="banner"]').prop('checked', isChecked).trigger('change');
    });

    // --- OBSERVER ---
    const observer = new MutationObserver((mutationsList) => {
        let bannerStateChanged = false;
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const $node = $(node);
                $node.find(SELECTORS.commentBlock).addBack($node.filter(SELECTORS.commentBlock)).each((i, el) => UI.addButtonsToComment(el));
                $node.find(SELECTORS.bannerBlock).addBack($node.filter(SELECTORS.bannerBlock)).each((i, el) => { UI.addButtonsToBanner(el); bannerStateChanged = true; });
                $node.find(SELECTORS.bannerHeader).addBack($node.filter(SELECTORS.bannerHeader)).each((i, el) => UI.addBannerHeaderControls(el));
            }
            if (mutation.removedNodes.length > 0) bannerStateChanged = true;
        }
        if (bannerStateChanged) UI.updateMasterCheckboxState();
    });

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init() {
        console.log("Initializing SYH modules...");
        $(SELECTORS.commentBlock).each((i, el) => UI.addButtonsToComment(el));
        $(SELECTORS.bannerBlock).each((i, el) => UI.addButtonsToBanner(el));
        $(SELECTORS.bannerHeader).each((i, el) => UI.addBannerHeaderControls(el));
        observer.observe(document.body, { childList: true, subtree: true });
        console.log("SYH is running.");
    }

    init();

})(window, jQuery);