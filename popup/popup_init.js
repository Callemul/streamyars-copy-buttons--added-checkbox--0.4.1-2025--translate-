// popup_init.js
// Глобальна база даних налаштувань
window.db = {};

// Функція збереження налаштувань у локальне сховище Chrome
window.saveDataToStorage = function() {
    chrome.storage.local.set({ 'db': window.db });
};

$(document).ready(function() {
    // 1. Первинне завантаження та відновлення налаштувань і стану полів
    chrome.storage.local.get(['tg_oldList', 'tg_answered', 'tg_newTelegram', 'db', 'syh_prayers'], function(result) {
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
        
        // Малюємо список молитов при старті, якщо домен Prayers вже завантажений
        if (typeof window.renderPrayers === 'function') {
            window.renderPrayers(result.syh_prayers || []);
        }
    });

    // 2. Логіка навігації між вкладками попапу
    $('.tab-link').click(function() {
        const tabId = $(this).data('tab'); 
        $('.tab-link').removeClass('active'); 
        $('.tab-content').removeClass('active'); 
        $(this).addClass('active'); 
        $('#' + tabId).addClass('active');
    });

    // 3. Динамічне додавання контейнерів статистики, якщо вони відсутні в HTML
    if ($('#tgTotalCount').length === 0) { 
        $('label:contains("3. Нові питання з Telegram")').append(' <span id="tgTotalCount" style="color: #2b7de9; font-weight: bold; font-size: 12px;"></span>'); 
    }
    if ($('.stat-item.total').length === 0) { 
        $('#statsBar').append('<span class="stat-item total" style="background:#e3f2fd; border:1px solid #2196f3; font-weight:bold;">Разом: <b id="countTotal">0</b></span>'); 
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

    // 5. Кнопка очищення загального стану текстових полів
    $('#clearStateBtn').click(function() {
        if (confirm("Очистити всі поля введення в цій вкладці?")) {
            $('#oldList, #answeredIds, #newTelegram').val(''); 
            $('#finalResultDiv').empty(); 
            $('#statsBar').hide(); 
            $('#deletedLogDetails').hide(); 
            $('#oldTotalCount').text(''); 
            $('#tgTotalCount').text(''); 
            chrome.storage.local.remove(['tg_oldList', 'tg_answered', 'tg_newTelegram']);
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
});