// popup_init.js
// Глобальна база даних налаштувань
window.db = {};

// Функція збереження налаштувань у локальне сховище Chrome
window.saveDataToStorage = function() {
    chrome.storage.local.set({ 'db': window.db });
};

$(document).ready(function() {
    // 1. Первинне завантаження та відновлення налаштувань і стану полів
    chrome.storage.local.get([
        'tg_oldList', 
        'tg_answered', 
        'tg_newTelegram', 
        'db', 
        'syh_prayers',
        'tg_active_tab',
        'tg_textarea_sizes',
        'tg_translit_old',
        'tg_translit_new',
        'tg_finalResultHtml',
        'tg_statsHtml',
        'tg_statsVisible',
        'tg_deletedLogHtml',
        'tg_deletedLogDetailsVisible',
        'tg_deletedLogDetailsOpen',
        'tg_scroll_positions',
        'syh_popup_divider_pos',
        'syh_yt_collected'
    ], function(result) {
        if (result.tg_oldList) { 
            $('#oldList').val(result.tg_oldList); 
            if (typeof window.updateOldInputStats === 'function') {
                window.updateOldInputStats();
            }
        }
        if (result.tg_answered) {
            $('#answeredIds').val(result.tg_answered);
        }
        if (result.tg_newTelegram) { 
            $('#newTelegram').val(result.tg_newTelegram); 
            if (typeof window.updateNewInputStats === 'function') {
                window.updateNewInputStats();
            }
        }
        if (result.db) { 
            window.db = result.db; 
            if (window.db.newTitleSS) $("#sschoolName").val(window.db.newTitleSS); 
            if (window.db.newTitlePreach) $("#preachNameInput").val(window.db.newTitlePreach); 
        }
        
        // Відновлення вкладки
        if (result.tg_active_tab) {
            $('.tab-link').removeClass('active').attr('aria-selected', 'false');
            $('.tab-content').removeClass('active');
            $(`.tab-link[data-tab="${result.tg_active_tab}"]`).addClass('active').attr('aria-selected', 'true');
            $('#' + result.tg_active_tab).addClass('active');
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

        // Відновлення результатів Telegram
        if (result.tg_finalResultHtml) {
            $('#finalResultDiv').html(result.tg_finalResultHtml);
        }
        if (result.tg_statsVisible) {
            if (result.tg_statsHtml) $('#statsBar').html(result.tg_statsHtml);
            $('#statsBar').show();
        }
        if (result.tg_deletedLogDetailsVisible) {
            if (result.tg_deletedLogHtml) $('#deletedLog').html(result.tg_deletedLogHtml);
            if (result.tg_deletedLogDetailsOpen) {
                $('#deletedLogDetails').attr('open', 'open');
            } else {
                $('#deletedLogDetails').removeAttr('open');
            }
            $('#deletedLogDetails').show();
        }

        // Малюємо список молитов при старті, якщо домен Prayers вже завантажений
        if (typeof window.renderPrayers === 'function') {
            window.renderPrayers(result.syh_prayers || []);
        }

        // Відновлення позицій скролу
        if (result.tg_scroll_positions) {
            const scrolls = result.tg_scroll_positions;
            setTimeout(() => {
                if (scrolls.window !== undefined) window.scrollTo(0, scrolls.window);
                if (scrolls.prayersResultDiv !== undefined) $('#prayersResultDiv').scrollTop(scrolls.prayersResultDiv);
                if (scrolls.finalResultDiv !== undefined) $('#finalResultDiv').scrollTop(scrolls.finalResultDiv);
                if (scrolls.deletedLog !== undefined) $('#deletedLog').scrollTop(scrolls.deletedLog);
                if (scrolls.oldList !== undefined) $('#oldList').scrollTop(scrolls.oldList);
                if (scrolls.newTelegram !== undefined) $('#newTelegram').scrollTop(scrolls.newTelegram);
                if (scrolls.textArea1_oldText !== undefined) $('#textArea1_oldText').scrollTop(scrolls.textArea1_oldText);
                if (scrolls.textArea2_generatedRuText !== undefined) $('#textArea2_generatedRuText').scrollTop(scrolls.textArea2_generatedRuText);
            }, 100);
        }

        // Ініціалізація ResizeObserver після застосування розмірів
        setTimeout(initResizeObserver, 300);
        // Відновлення позиції ресайзера кроку 3 та зібраних коментарів YouTube
        if (result.syh_popup_divider_pos) {
            const pos = result.syh_popup_divider_pos;
            $('#step3Left').css('flex', pos);
            $('#step3Right').css('flex', 100 - pos);
        }
        if (result.syh_yt_collected) {
            window.syh_yt_collected = result.syh_yt_collected;
        }
        if (typeof window.loadYTCollected === 'function') {
            window.loadYTCollected();
        }
        initStep3Resizer();
    });

    // 2. Логіка навігації між вкладками попапу
    $('.tab-link').click(function() {
        const tabId = $(this).data('tab'); 
        $('.tab-link').removeClass('active').attr('aria-selected', 'false'); 
        $('.tab-content').removeClass('active'); 
        $(this).addClass('active').attr('aria-selected', 'true'); 
        $('#' + tabId).addClass('active');
        chrome.storage.local.set({ 'tg_active_tab': tabId });
    });

    // 3. Динамічне додавання контейнерів статистики, якщо вони відсутні в HTML
    if ($('#tgTotalCount').length === 0) { 
        $('label:contains("3. Нові питання з Telegram")').append(' <span id="tgTotalCount" style="color: #2b7de9; font-weight: bold; font-size: 12px;"></span>'); 
    }
    if ($('#countNewYT').length === 0 && $('#statsBar').length > 0) {
        if ($('.stats-row.new-row').length > 0) {
            $('.stats-row.new-row').append('<span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT">0</b></span>');
        } else {
            $('<div class="stats-row new-row"><span class="stat-item new">Нові з лівої: <b id="countNewLeft">0</b></span><span class="stat-item new-yt">Нові з YouTube: <b id="countNewYT">0</b></span></div>').insertBefore('#statsBar .total-row');
        }
    }
    if ($('.stat-item.total').length === 0 && $('#statsBar').length > 0) { 
        $('#statsBar').append('<span class="stat-item total">Разом: <b id="countTotal">0</b></span>'); 
    }

    // 4. Слухачі введення даних у поля для синхронізації зі сховищем
    $('#oldList').on('input', function() { 
        chrome.storage.local.set({ 'tg_oldList': $(this).val() }); 
        if (typeof window.updateOldInputStats === 'function') {
            window.updateOldInputStats();
        }
    });
    
    $('#newTelegram').on('input', function() { 
        chrome.storage.local.set({ 'tg_newTelegram': $(this).val() }); 
        if (typeof window.updateNewInputStats === 'function') {
            window.updateNewInputStats();
        }
    });
    
    $('#answeredIds').on('input', function() { 
        chrome.storage.local.set({ 'tg_answered': $(this).val() }); 
    });

    // Збереження HTML результату Telegram при зміні вмісту або втраті фокусу
    $('#finalResultDiv').on('input blur', function() {
        chrome.storage.local.set({ 'tg_finalResultHtml': $(this).html() });
    });

    // Збереження стану деталей логу видаленого
    $('#deletedLogDetails').on('toggle', function() {
        chrome.storage.local.set({ 'tg_deletedLogDetailsOpen': this.open });
    });

    // Збереження полів трансліту
    $('#textArea1_oldText').on('input', function() {
        chrome.storage.local.set({ 'tg_translit_old': $(this).val() });
    });
    $('#textArea2_generatedRuText').on('input', function() {
        chrome.storage.local.set({ 'tg_translit_new': $(this).val() });
    });

    // 5. Кнопка очищення загального стану текстових полів
    $('#clearStateBtn').click(function() {
        if (confirm("Очистити всі поля введення в цій вкладці?")) {
            $('#oldList, #answeredIds, #newTelegram').val(''); 
            $('#finalResultDiv').empty(); 
            $('#statsBar').hide(); 
            $('#deletedLogDetails').hide(); 
            $('#oldTotalCount').text(''); 
            $('#tgTotalCount').text(''); 
            chrome.storage.local.remove([
                'tg_oldList', 
                'tg_answered', 
                'tg_newTelegram',
                'tg_finalResultHtml',
                'tg_statsHtml',
                'tg_statsVisible',
                'tg_deletedLogHtml',
                'tg_deletedLogDetailsVisible',
                'tg_deletedLogDetailsOpen'
            ]);
        }
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
        const textareas = ['oldList', 'newTelegram', 'textArea1_oldText', 'textArea2_generatedRuText'];
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
                finalResultDiv: $('#finalResultDiv').scrollTop() || 0,
                deletedLog: $('#deletedLog').scrollTop() || 0,
                oldList: $('#oldList').scrollTop() || 0,
                newTelegram: $('#newTelegram').scrollTop() || 0,
                textArea1_oldText: $('#textArea1_oldText').scrollTop() || 0,
                textArea2_generatedRuText: $('#textArea2_generatedRuText').scrollTop() || 0
            };
            chrome.storage.local.set({ 'tg_scroll_positions': scrolls });
        }, 150);
    }
    $(window).on('scroll', saveScrollPositions);
    $('#prayersResultDiv, #finalResultDiv, #deletedLog, #oldList, #newTelegram, #textArea1_oldText, #textArea2_generatedRuText').on('scroll', saveScrollPositions);

    // 9. Логіка ресайзера кроку 3 (дві колонки Telegram / YouTube)
    function initStep3Resizer() {
        const $divider = $('#step3Divider');
        const $container = $('#step3Columns');
        const $left = $('#step3Left');
        const $right = $('#step3Right');

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

                chrome.storage.local.set({ 'syh_popup_divider_pos': posPercent });
            }
        });
    }

    initStep3Resizer();

    // 10. Обробник очищення зібраних коментарів YouTube
    $('#clearYTCollected').click(function() {
        if (typeof window.clearAllYTCollected === 'function') {
            window.clearAllYTCollected();
        }
    });
});
