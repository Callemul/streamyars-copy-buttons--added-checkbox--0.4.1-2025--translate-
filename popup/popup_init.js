// popup_init.js
// Глобальна база даних налаштувань
window.db = {};

const SHEET_IDS = ['vp_ss', 'oparin', 'molchanov_ss', 'molchanov_preach'];

// Функція збереження налаштувань у локальне сховище Chrome
window.saveDataToStorage = function() {
    chrome.storage.local.set({ 'db': window.db });
};

$(document).ready(function() {
    // 1. Формування списку ключів для завантаження per-sheet
    const keysToLoad = [
        'db', 
        'syh_prayers',
        'tg_active_tab',
        'tg_active_subtab',
        'tg_textarea_sizes',
        'tg_translit_old',
        'tg_translit_new',
        'tg_scroll_positions',
        'syh_yt_collected'
    ];

    SHEET_IDS.forEach(sId => {
        keysToLoad.push(
            `tg_oldList__${sId}`,
            `tg_answered__${sId}`,
            `tg_newTelegram__${sId}`,
            `tg_finalResultHtml__${sId}`,
            `tg_statsHtml__${sId}`,
            `tg_statsVisible__${sId}`,
            `tg_deletedLogHtml__${sId}`,
            `tg_deletedLogCount__${sId}`,
            `tg_deletedLogDetailsVisible__${sId}`,
            `tg_deletedLogDetailsOpen__${sId}`,
            `tg_cleanedLogHtml__${sId}`,
            `tg_cleanedLogCount__${sId}`,
            `tg_cleanedLogDetailsVisible__${sId}`,
            `tg_cleanedLogDetailsOpen__${sId}`,
            `syh_popup_divider_pos__${sId}`,
            `syh_collected__${sId}`
        );
    });

    // 2. Первинне завантаження та відновлення налаштувань і стану полів
    chrome.storage.local.get(keysToLoad, function(result) {
        if (result.db) { 
            window.db = result.db; 
            if (window.db.newTitleSS) $("#sschoolName").val(window.db.newTitleSS); 
            if (window.db.newTitlePreach) $("#preachNameInput").val(window.db.newTitlePreach); 
        }

        if (result.syh_yt_collected) {
            window.syh_yt_collected = result.syh_yt_collected;
        }
        
        // Відновлення кожної з 4 вкладок-аркушів
        SHEET_IDS.forEach(sId => {
            const oldListVal = result[`tg_oldList__${sId}`];
            if (oldListVal) { 
                $(`#oldList__${sId}`).val(oldListVal); 
                if (typeof window.updateOldInputStats === 'function') {
                    window.updateOldInputStats(sId);
                }
            }

            const answeredVal = result[`tg_answered__${sId}`];
            if (answeredVal) {
                $(`#answeredIds__${sId}`).val(answeredVal);
            }

            const newTgVal = result[`tg_newTelegram__${sId}`];
            if (newTgVal) { 
                $(`#newTelegram__${sId}`).val(newTgVal); 
                if (typeof window.updateNewInputStats === 'function') {
                    window.updateNewInputStats(sId);
                }
            }

            const finalHtml = result[`tg_finalResultHtml__${sId}`];
            if (finalHtml) {
                $(`#finalResultDiv__${sId}`).html(finalHtml);
            }

            if (result[`tg_statsVisible__${sId}`]) {
                const statsHtml = result[`tg_statsHtml__${sId}`];
                if (statsHtml) $(`#statsBar__${sId}`).html(statsHtml);
                if (typeof window.ensureStatsBarRows === 'function') window.ensureStatsBarRows(sId);
                $(`#statsBar__${sId}`).show();
            }

            if (result[`tg_deletedLogDetailsVisible__${sId}`]) {
                const delHtml = result[`tg_deletedLogHtml__${sId}`];
                if (delHtml) $(`#deletedLog__${sId}`).html(delHtml);
                let delCount = result[`tg_deletedLogCount__${sId}`];
                if (delCount === undefined && delHtml) {
                    delCount = $(`#deletedLog__${sId}`).find('.del-row').length;
                }
                if (delCount) {
                    $(`#deletedLogCount__${sId}`).text(`(${delCount})`);
                }
                if (result[`tg_deletedLogDetailsOpen__${sId}`]) {
                    $(`#deletedLogDetails__${sId}`).attr('open', 'open');
                } else {
                    $(`#deletedLogDetails__${sId}`).removeAttr('open');
                }
                $(`#deletedLogDetails__${sId}`).show();
            } else {
                $(`#deletedLogCount__${sId}`).text('');
            }

            if (result[`tg_cleanedLogDetailsVisible__${sId}`]) {
                const cleanHtml = result[`tg_cleanedLogHtml__${sId}`];
                if (cleanHtml) $(`#cleanedLog__${sId}`).html(cleanHtml);
                let cleanCount = result[`tg_cleanedLogCount__${sId}`];
                if (cleanCount === undefined && cleanHtml) {
                    cleanCount = $(`#cleanedLog__${sId}`).find('.clean-table tr').length - 1;
                }
                if (cleanCount && cleanCount > 0) {
                    $(`#cleanedLogCount__${sId}`).text(`(${cleanCount})`);
                }
                if (result[`tg_cleanedLogDetailsOpen__${sId}`]) {
                    $(`#cleanedLogDetails__${sId}`).attr('open', 'open');
                } else {
                    $(`#cleanedLogDetails__${sId}`).removeAttr('open');
                }
                $(`#cleanedLogDetails__${sId}`).show();
            } else {
                $(`#cleanedLogCount__${sId}`).text('');
            }

            // Відновлення ресайзера per-sheet
            const divPos = result[`syh_popup_divider_pos__${sId}`];
            if (divPos) {
                $(`#step3Left__${sId}`).css('flex', divPos);
                $(`#step3Right__${sId}`).css('flex', 100 - divPos);
            }

            if (typeof window.loadYTCollected === 'function') {
                window.loadYTCollected(sId);
            }
        });

        // Відновлення головної вкладки
        if (result.tg_active_tab) {
            $('.tab-link').removeClass('active').attr('aria-selected', 'false');
            $('.tab-content').removeClass('active');
            $(`.tab-link[data-tab="${result.tg_active_tab}"]`).addClass('active').attr('aria-selected', 'true');
            $('#' + result.tg_active_tab).addClass('active');
        }

        // Відновлення під-вкладки (аркуша)
        if (result.tg_active_subtab && SHEET_IDS.includes(result.tg_active_subtab)) {
            $('.subtab-button').removeClass('active').attr('aria-selected', 'false');
            $('.sheet-content').removeClass('active');
            $(`.subtab-button[data-sheet="${result.tg_active_subtab}"]`).addClass('active').attr('aria-selected', 'true');
            $('#sheet-content-' + result.tg_active_subtab).addClass('active');
        }

        // Відновлення розмірів textarea
        if (result.tg_textarea_sizes) {
            const sizes = result.tg_textarea_sizes;
            for (const id in sizes) {
                const el = document.getElementById(id);
                if (el) {
                    if (sizes[id].width) el.style.width = sizes[id].width;
                    if (sizes[id].height) el.style.height = sizes[id].height;
                }
            }
        }

        // Відновлення полів трансліту
        if (result.tg_translit_old) {
            $('#textArea1_oldText').val(result.tg_translit_old);
        }
        if (result.tg_translit_new) {
            $('#textArea2_generatedRuText').val(result.tg_translit_new);
        }

        // Малюємо список молитов при старті
        if (typeof window.renderPrayers === 'function') {
            window.renderPrayers(result.syh_prayers || []);
        }

        // Відновлення позицій скролу
        if (result.tg_scroll_positions) {
            const scrolls = result.tg_scroll_positions;
            setTimeout(() => {
                if (scrolls.window !== undefined) window.scrollTo(0, scrolls.window);
                if (scrolls.prayersResultDiv !== undefined) $('#prayersResultDiv').scrollTop(scrolls.prayersResultDiv);
                if (scrolls.textArea1_oldText !== undefined) $('#textArea1_oldText').scrollTop(scrolls.textArea1_oldText);
                if (scrolls.textArea2_generatedRuText !== undefined) $('#textArea2_generatedRuText').scrollTop(scrolls.textArea2_generatedRuText);
                
                SHEET_IDS.forEach(sId => {
                    if (scrolls[`finalResultDiv__${sId}`] !== undefined) $(`#finalResultDiv__${sId}`).scrollTop(scrolls[`finalResultDiv__${sId}`]);
                    if (scrolls[`deletedLog__${sId}`] !== undefined) $(`#deletedLog__${sId}`).scrollTop(scrolls[`deletedLog__${sId}`]);
                    if (scrolls[`oldList__${sId}`] !== undefined) $(`#oldList__${sId}`).scrollTop(scrolls[`oldList__${sId}`]);
                    if (scrolls[`newTelegram__${sId}`] !== undefined) $(`#newTelegram__${sId}`).scrollTop(scrolls[`newTelegram__${sId}`]);
                });
            }, 100);
        }

        // Ініціалізація ResizeObserver після застосування розмірів
        setTimeout(initResizeObserver, 300);
        initStep3Resizers();
    });

    // 3. Логіка навігації між головними вкладками попапу
    $('.tab-link').click(function() {
        const tabId = $(this).data('tab'); 
        $('.tab-link').removeClass('active').attr('aria-selected', 'false'); 
        $('.tab-content').removeClass('active'); 
        $(this).addClass('active').attr('aria-selected', 'true'); 
        $('#' + tabId).addClass('active');
        chrome.storage.local.set({ 'tg_active_tab': tabId });
    });

    // 4. Логіка навігації між під-вкладками (4 аркуші)
    $('.subtab-button').click(function() {
        const sheetId = $(this).data('sheet');
        $('.subtab-button').removeClass('active').attr('aria-selected', 'false');
        $('.sheet-content').removeClass('active');
        $(this).addClass('active').attr('aria-selected', 'true');
        $('#sheet-content-' + sheetId).addClass('active');
        chrome.storage.local.set({ 'tg_active_subtab': sheetId });
    });

    // 5. Слухачі введення даних у поля для синхронізації зі сховищем per-sheet
    SHEET_IDS.forEach(sId => {
        $(`#oldList__${sId}`).on('input', function() { 
            chrome.storage.local.set({ [`tg_oldList__${sId}`]: $(this).val() }); 
            if (typeof window.updateOldInputStats === 'function') {
                window.updateOldInputStats(sId);
            }
        });
        
        $(`#newTelegram__${sId}`).on('input', function() { 
            chrome.storage.local.set({ [`tg_newTelegram__${sId}`]: $(this).val() }); 
            if (typeof window.updateNewInputStats === 'function') {
                window.updateNewInputStats(sId);
            }
        });
        
        $(`#answeredIds__${sId}`).on('input', function() { 
            chrome.storage.local.set({ [`tg_answered__${sId}`]: $(this).val() }); 
        });

        $(`#finalResultDiv__${sId}`).on('input blur', function() {
            chrome.storage.local.set({ [`tg_finalResultHtml__${sId}`]: $(this).html() });
        });

        $(`#deletedLogDetails__${sId}`).on('toggle', function() {
            chrome.storage.local.set({ [`tg_deletedLogDetailsOpen__${sId}`]: this.open });
        });

        $(`#cleanedLogDetails__${sId}`).on('toggle', function() {
            chrome.storage.local.set({ [`tg_cleanedLogDetailsOpen__${sId}`]: this.open });
        });

        $(`#clearStateBtn__${sId}`).click(function() {
            if (confirm("Очистити всі поля введення в цьому аркуші?")) {
                $(`#oldList__${sId}, #answeredIds__${sId}, #newTelegram__${sId}`).val(''); 
                $(`#finalResultDiv__${sId}`).empty(); 
                $(`#statsBar__${sId}`).hide(); 
                $(`#deletedLog__${sId}`).empty();
                $(`#deletedLogCount__${sId}`).text('');
                $(`#deletedLogDetails__${sId}`).hide(); 
                $(`#cleanedLog__${sId}`).empty();
                $(`#cleanedLogCount__${sId}`).text('');
                $(`#cleanedLogDetails__${sId}`).hide(); 
                $(`#oldTotalCount__${sId}`).text(''); 
                $(`#tgTotalCountAll__${sId}`).text(''); 
                chrome.storage.local.remove([
                    `tg_oldList__${sId}`, 
                    `tg_answered__${sId}`, 
                    `tg_newTelegram__${sId}`,
                    `tg_finalResultHtml__${sId}`,
                    `tg_statsHtml__${sId}`,
                    `tg_statsVisible__${sId}`,
                    `tg_deletedLogHtml__${sId}`,
                    `tg_deletedLogCount__${sId}`,
                    `tg_deletedLogDetailsVisible__${sId}`,
                    `tg_deletedLogDetailsOpen__${sId}`,
                    `tg_cleanedLogHtml__${sId}`,
                    `tg_cleanedLogCount__${sId}`,
                    `tg_cleanedLogDetailsVisible__${sId}`,
                    `tg_cleanedLogDetailsOpen__${sId}`
                ]);
            }
        });

        $(`#clearYTCollected__${sId}`).click(function() {
            if (typeof window.clearAllYTCollected === 'function') {
                window.clearAllYTCollected(sId);
            }
        });
    });

    // Збереження полів трансліту
    $('#textArea1_oldText').on('input', function() {
        chrome.storage.local.set({ 'tg_translit_old': $(this).val() });
    });
    $('#textArea2_generatedRuText').on('input', function() {
        chrome.storage.local.set({ 'tg_translit_new': $(this).val() });
    });

    // 6. Кнопки збереження конфігурації назв СШ та проповідей
    $("#sschoolNameBtn").click(function() { 
        window.db.newTitleSS = $("#sschoolName").val(); 
        window.saveDataToStorage(); 
        alert("Збережено!"); 
    });
    
    $("#preachNameBtn").click(function() { 
        window.db.newTitlePreach = $("#preachNameInput").val(); 
        window.saveDataToStorage(); 
        alert("Збережено!"); 
    });

    // 7. Відкриття повноцінної Options Page
    $("#openOptionsPageBtn").click(function() {
        if (chrome.runtime && chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });

    // 8. Допоміжні функції ResizeObserver та збереження скролу
    function initResizeObserver() {
        const textareas = ['textArea1_oldText', 'textArea2_generatedRuText'];
        SHEET_IDS.forEach(sId => {
            textareas.push(`oldList__${sId}`, `newTelegram__${sId}`);
        });

        const resizeObserver = new ResizeObserver(entries => {
            chrome.storage.local.get(['tg_textarea_sizes'], function(res) {
                const sizes = res.tg_textarea_sizes || {};
                let updated = false;
                for (const entry of entries) {
                    const id = entry.target.id;
                    const width = entry.target.style.width;
                    const height = entry.target.style.height;
                    if (width || height) {
                        sizes[id] = { width, height };
                        updated = true;
                    }
                }
                if (updated) {
                    chrome.storage.local.set({ 'tg_textarea_sizes': sizes });
                }
            });
        });
        textareas.forEach(id => {
            const el = document.getElementById(id);
            if (el) resizeObserver.observe(el);
        });
    }

    let scrollTimeout;
    function saveScrollPositions() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolls = {
                window: window.scrollY || document.documentElement.scrollTop,
                prayersResultDiv: $('#prayersResultDiv').scrollTop() || 0,
                textArea1_oldText: $('#textArea1_oldText').scrollTop() || 0,
                textArea2_generatedRuText: $('#textArea2_generatedRuText').scrollTop() || 0
            };
            SHEET_IDS.forEach(sId => {
                scrolls[`finalResultDiv__${sId}`] = $(`#finalResultDiv__${sId}`).scrollTop() || 0;
                scrolls[`deletedLog__${sId}`] = $(`#deletedLog__${sId}`).scrollTop() || 0;
                scrolls[`oldList__${sId}`] = $(`#oldList__${sId}`).scrollTop() || 0;
                scrolls[`newTelegram__${sId}`] = $(`#newTelegram__${sId}`).scrollTop() || 0;
            });
            chrome.storage.local.set({ 'tg_scroll_positions': scrolls });
        }, 150);
    }
    $(window).on('scroll', saveScrollPositions);
    $('#prayersResultDiv, #textArea1_oldText, #textArea2_generatedRuText').on('scroll', saveScrollPositions);
    SHEET_IDS.forEach(sId => {
        $(`#finalResultDiv__${sId}, #deletedLog__${sId}, #oldList__${sId}, #newTelegram__${sId}`).on('scroll', saveScrollPositions);
    });

    // 9. Логіка ресайзера кроку 3 per sheetId
    function initStep3Resizers() {
        SHEET_IDS.forEach(sId => {
            const $divider = $(`#step3Divider__${sId}`);
            const $container = $(`#step3Columns__${sId}`);
            const $left = $(`#step3Left__${sId}`);
            const $right = $(`#step3Right__${sId}`);

            if (!$divider.length || !$container.length) return;

            let isDragging = false;

            $divider.on('mousedown', function(e) {
                e.preventDefault();
                isDragging = true;
                $divider.addClass('is-dragging');
                $('body').css('user-select', 'none');
            });

            $(document).on('mousemove', function(e) {
                if (!isDragging) return;
                const containerOffset = $container.offset();
                const containerWidth = $container.width();
                if (!containerOffset || containerWidth <= 0) return;

                const leftWidth = e.pageX - containerOffset.left;
                let percent = (leftWidth / containerWidth) * 100;
                if (percent < 15) percent = 15;
                if (percent > 85) percent = 85;

                $left.css('flex', percent);
                $right.css('flex', 100 - percent);
            });

            $(document).on('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    $divider.removeClass('is-dragging');
                    $('body').css('user-select', '');

                    const flexLeft = parseFloat($left.css('flex-grow')) || 1;
                    const flexRight = parseFloat($right.css('flex-grow')) || 1;
                    const total = flexLeft + flexRight;
                    const posPercent = (flexLeft / total) * 100;

                    chrome.storage.local.set({ [`syh_popup_divider_pos__${sId}`]: posPercent });
                }
            });
        });
    }
});
