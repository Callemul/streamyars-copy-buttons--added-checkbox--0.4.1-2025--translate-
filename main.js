// main.js
(function(window, $) {
    'use strict';

    console.log("StreamYard Helper v0.8.4 [Final Banner Logic] Loaded!");

    // Ініціалізація модулів
    const { SELECTORS } = window.SYH_CONFIG;
    const STATE = window.SYH_STATE;
    const UTILS = window.SYH_UTILS;
    const UI = window.SYH_UI;
    UI.init(window.SYH_CONFIG, STATE);
    UTILS.init(window.SYH_CONFIG);

    // --- ЛОГІКА СТВОРЕННЯ БАНЕРІВ ---

    async function processAndCreateBanners(rawText) {
        console.log("[SYH DEBUG] Starting banner creation process...");
        const questions = rawText.split('\n').map(line => line.trim()).filter(line => /^\d/.test(line))
            .map(line => line.replace(/^\d+[\.\)]?\s*/, '').replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0 && line.length < 200);

        if (questions.length === 0) {
            alert("Не знайдено пронумерованих питань у тексті.");
            console.log("[SYH DEBUG] No valid questions found in text.");
            return;
        }
        console.log(`[SYH DEBUG] Found ${questions.length} questions to process.`);

        let createdCount = 0;
        for (const question of questions) {
            console.log(`[SYH DEBUG] [${createdCount + 1}/${questions.length}] Processing: "${question}"`);
            try {
                await createSingleBanner(question);
                createdCount++;
            } catch (error) {
                console.error("[SYH DEBUG] CRITICAL ERROR in banner creation loop:", error);
                alert(`Не вдалося створити банер: "${question}".\nПричина: ${error.message}.\nПроцес перервано. Дивіться консоль (F12) для деталей.`);
                break;
            }
        }
        console.log(`[SYH DEBUG] Process finished. Created ${createdCount} of ${questions.length} banners.`);
        alert(`Створення завершено! Створено ${createdCount} з ${questions.length} банер(ів).`);
    }

    // =========================================================================
    // ПОВНІСТЮ ПЕРЕПИСАНА ФУНКЦІЯ ДЛЯ МАКСИМАЛЬНОЇ НАДІЙНОСТІ
    // =========================================================================
    function createSingleBanner(text) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`[SYH DEBUG] Starting creation for: "${text}"`);

                // Крок 1: Відкриваємо форму.
                // Навіть якщо вона відкрита, повторний клік не зашкодить, але гарантує, що ми починаємо з відомого стану.
                const createButton = await UTILS.waitForElement(SELECTORS.createBannerButton, 3000);
                console.log("[SYH DEBUG] Clicking 'Create a banner' to ensure form is open and fresh.");
                createButton.click();
                
                // Крок 2: Чекаємо на форму.
                const form = await UTILS.waitForElement(SELECTORS.createBannerForm, 3000);
                console.log("[SYH DEBUG] Form is ready.");

                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                if (!textarea || !addButton) return reject(new Error("Структура форми невірна."));

                // Крок 3: Вводимо текст.
                console.log("[SYH DEBUG] Filling textarea.");
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 150)); // Трохи збільшимо паузу для надійності

                // Крок 4: Натискаємо "Add banner".
                if (addButton.disabled) return reject(new Error("Кнопка 'Add banner' неактивна."));
                console.log("[SYH DEBUG] Clicking 'Add banner'.");
                addButton.click();

                // Крок 5: Чекаємо, поки форма закриється. Це надійний індикатор успіху.
                console.log("[SYH DEBUG] Waiting for form to close...");
                await UTILS.waitForElementToDisappear(SELECTORS.createBannerForm, 5000);
                console.log("[SYH DEBUG] Form closed. Banner created successfully.");
                
                resolve();
            } catch (error) {
                console.error("[SYH DEBUG] FAILED during createSingleBanner:", error);
                reject(error);
            }
        });
    }

    // --- ОБРОБНИКИ ПОДІЙ (без змін) ---
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

    // --- OBSERVER (без змін) ---
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

    // --- ІНІЦІАЛІЗАЦІЯ (без змін) ---
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