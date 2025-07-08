// main.js
(function(window, $) {
    'use strict';

    console.log("StreamYard Helper v0.9.5 [Sub-item Parsing] Loaded!");

    // Ініціалізація модулів
    const { SELECTORS } = window.SYH_CONFIG;
    const STATE = window.SYH_STATE;
    const UTILS = window.SYH_UTILS;
    const UI = window.SYH_UI;
    UI.init(window.SYH_CONFIG, STATE);
    UTILS.init(window.SYH_CONFIG);

    // --- ЛОГІКА ПАРСИНГУ (ОНОВЛЕНА) ---

    /**
     * Парсер для формату з emoji-цифрами, що тепер підтримує підпункти '🔹'.
     * @param {string} rawText - Вхідний текст з коментарями.
     * @returns {string[]} - Масив готових для банерів рядків.
     */
    function parseEmojiNumberedQuestions(rawText) {
        console.log("Parsing as Emoji-numbered questions with sub-item support.");
        const MAX_LENGTH = 195;
        const ELLIPSIS = "...";

        // Допоміжна функція для обрізки тексту
        const truncate = (text) => {
            if (text.length > MAX_LENGTH) {
                return text.substring(0, MAX_LENGTH - ELLIPSIS.length) + ELLIPSIS;
            }
            return text;
        };

        // 1. Групуємо коментарі за основним номером
        const groupedQuestions = [];
        let currentQuestion = null;
        const lines = rawText.split('\n').map(l => l.trim());

        for (const line of lines) {
            if (/^([1-9]️⃣|🔟)+$/.test(line)) {
                if (currentQuestion) groupedQuestions.push(currentQuestion);
                currentQuestion = { number: line, author: '', textLines: [] };
            } else if (currentQuestion && !currentQuestion.author && line) {
                currentQuestion.author = line;
            } else if (currentQuestion && line) {
                currentQuestion.textLines.push(line);
            }
        }
        if (currentQuestion) groupedQuestions.push(currentQuestion);

        // 2. Оброробляємо кожну групу, розбиваючи на підпункти, якщо потрібно
        const finalBanners = [];
        for (const group of groupedQuestions) {
            const fullText = group.textLines.join('\n');

            // Розділяємо текст на підпункти за символом '🔹'.
            // Використовуємо lookahead `(?=🔹)`, щоб символ залишався в наступному рядку.
            const subQuestions = fullText.split(/\n?(?=🔹)/);

            if (subQuestions.length <= 1) {
                // Немає підпунктів, обробляємо як один банер
                const bannerText = `${group.number}\n${group.author}: \n${fullText}`;
                finalBanners.push(truncate(bannerText));
            } else {
                // Є підпункти, обробляємо кожен окремо
                // Перший підпункт (до першого '🔹')
                if (subQuestions[0].trim()) {
                    const firstBannerText = `${group.number}\n${group.author}: \n${subQuestions[0]}`;
                    finalBanners.push(truncate(firstBannerText));
                }

                // Наступні підпункти (кожен починається з '🔹')
                for (let i = 1; i < subQuestions.length; i++) {
                    const subText = subQuestions[i].trim();
                    if (!subText) continue;

                    const subLines = subText.split('\n');
                    const newHeader = subLines.shift(); // Рядок з '🔹' стає заголовком
                    const newBody = subLines.join('\n');
                    
                    const subsequentBannerText = `${newHeader}: \n${newBody}`;
                    finalBanners.push(truncate(subsequentBannerText));
                }
            }
        }
        return finalBanners;
    }

    /**
     * Парсер для старого формату: "1. Текст питання (Автор)"
     * @param {string} rawText - Вхідний текст з питаннями.
     * @returns {string[]} - Масив готових для банерів рядків.
     */
    function parseStandardNumberedQuestions(rawText) {
        console.log("Parsing as Standard-numbered questions.");
        return rawText.split('\n')
            .map(line => line.trim())
            .filter(line => /^\d/.test(line))
            .map(line => line.replace(/^\d+[\.\)]?\s*/, '').replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0 && line.length < 200);
    }


    // --- ОСНОВНА ФУНКЦІЯ СТВОРЕННЯ БАНЕРІВ (без змін) ---
    async function processAndCreateBanners(rawText) {
        let questions = [];

        if (/[1-9🔟]️⃣/.test(rawText)) {
            questions = parseEmojiNumberedQuestions(rawText);
        } else {
            questions = parseStandardNumberedQuestions(rawText);
        }

        if (questions.length === 0) {
            alert("Не знайдено пронумерованих питань у тексті. Перевірте формат.");
            return;
        }

        let createdCount = 0;
        for (const question of questions) {
            try {
                await createSingleBanner(question);
                createdCount++;
            } catch (error) {
                alert(`Не вдалося створити банер: "${question.substring(0, 50)}...".\nПричина: ${error.message}.\nПроцес перервано.`);
                break;
            }
        }
        alert(`Створення завершено! Створено ${createdCount} з ${questions.length} банер(ів).`);
    }

    function createSingleBanner(text) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!document.querySelector(SELECTORS.createBannerForm)) {
                    const createButton = await UTILS.waitForElement(SELECTORS.createBannerButton, 3000);
                    createButton.click();
                }
                
                const form = await UTILS.waitForElement(SELECTORS.createBannerForm, 3000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                if (!textarea || !addButton) return reject(new Error("Структура форми невірна."));
                
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 150));
                
                if (addButton.disabled) return reject(new Error("Кнопка 'Add banner' неактивна."));
                addButton.click();
                
                await UTILS.waitForNewBanner(text, 5000);
                
                const cancelButton = form.querySelector('button:not([type="submit"])');
                if (cancelButton) cancelButton.click();

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // --- ОБРОБНИКИ ПОДІЙ (без змін) ---
    $(document).on('click', '.syh-button', function(e) {
        e.preventDefault();
        e.stopPropagation();

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
                    const deleteButton = $(this).closest(SELECTORS.bannerBlock).find(SELECTORS.bannerDeleteButton)[0];
                    if (deleteButton) {
                        deleteButton.click();
                    } else {
                        console.error("Не вдалося знайти кнопку видалення для банера:", $(this).closest(SELECTORS.bannerBlock).find(SELECTORS.bannerText).text());
                    }
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

    $(document).on('click', '.syh-checkbox', function(e) {
        e.stopPropagation();
    });

    $(document).on('change', '.syh-checkbox', function(e) {
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