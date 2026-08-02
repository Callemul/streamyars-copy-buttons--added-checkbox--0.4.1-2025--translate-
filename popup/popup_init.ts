import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';

export const db: any = {};

export function saveDataToStorage(): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.DB]: db });
}

export async function loadData(key: string): Promise<unknown> {
    return new Promise(resolve => {
        SYH_STORAGE.get([key], (res) => resolve(res[key]));
    });
}

export async function saveData(key: string, value: unknown): Promise<void> {
    return new Promise(resolve => {
        SYH_STORAGE.set({ [key]: value }, resolve);
    });
}

const SHEET_IDS = ['vp_ss', 'oparin', 'molchanov_ss', 'molchanov_preach'];

$(document).ready(function() {
    const keysToLoad = [
        STORAGE_KEYS.DB, 
        STORAGE_KEYS.PRAYERS,
        'tg_active_tab',
        'tg_active_subtab',
        'tg_textarea_sizes',
        'tg_translit_old',
        'tg_translit_new',
        'tg_scroll_positions',
        STORAGE_KEYS.YT_COLLECTED
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
            `syh:popup:divider_pos:${sId}`,
            `syh:popup:collected:${sId}`
        );
    });

    let storageLoaded = false;

    SYH_STORAGE.get(keysToLoad, function(result) {
        if (result[STORAGE_KEYS.DB]) { 
            Object.assign(db, result[STORAGE_KEYS.DB]);
            if (db.newTitleSS) $("#sschoolName").val(db.newTitleSS); 
            if (db.newTitlePreach) $("#preachNameInput").val(db.newTitlePreach); 
        }

        if (result[STORAGE_KEYS.YT_COLLECTED]) {
            (window as any).syh_yt_collected = result[STORAGE_KEYS.YT_COLLECTED];
        }
        
        SHEET_IDS.forEach(sId => {
            const oldListVal = result[`tg_oldList__${sId}`];
            if (oldListVal) { 
                $(`#oldList__${sId}`).val(oldListVal); 
                const updateOld = (window as any).updateOldInputStats;
                if (typeof updateOld === 'function') updateOld(sId);
            }

            const answeredVal = result[`tg_answered__${sId}`];
            if (answeredVal) {
                $(`#answeredIds__${sId}`).val(answeredVal);
            }

            const newTgVal = result[`tg_newTelegram__${sId}`];
            if (newTgVal) { 
                $(`#newTelegram__${sId}`).val(newTgVal); 
                const updateNew = (window as any).updateNewInputStats;
                if (typeof updateNew === 'function') updateNew(sId);
            }

            const finalHtml = result[`tg_finalResultHtml__${sId}`];
            if (finalHtml) {
                $(`#finalResultDiv__${sId}`).html(finalHtml);
            }

            if (result[`tg_statsVisible__${sId}`]) {
                const statsHtml = result[`tg_statsHtml__${sId}`];
                if (statsHtml) $(`#statsBar__${sId}`).html(statsHtml);
                const ensureRows = (window as any).ensureStatsBarRows;
                if (typeof ensureRows === 'function') ensureRows(sId);
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

            const divPos = result[`syh:popup:divider_pos:${sId}`];
            if (divPos) {
                $(`#step3Left__${sId}`).css('flex', `${divPos}%`);
                $(`#step3Right__${sId}`).css('flex', `${100 - divPos}%`);
            }

            const loadYT = (window as any).loadYTCollected;
            if (typeof loadYT === 'function') {
                loadYT(sId);
            }
        });

        if (result.tg_active_tab) {
            $('.tab-link').removeClass('active').attr('aria-selected', 'false');
            $('.tab-content').removeClass('active');
            $(`.tab-link[data-tab="${result.tg_active_tab}"]`).addClass('active').attr('aria-selected', 'true');
            $('#' + result.tg_active_tab).addClass('active');
        }

        if (result.tg_active_subtab && SHEET_IDS.includes(result.tg_active_subtab)) {
            $('.subtab-button').removeClass('active').attr('aria-selected', 'false');
            $('.sheet-content').removeClass('active');
            $(`.subtab-button[data-sheet="${result.tg_active_subtab}"]`).addClass('active').attr('aria-selected', 'true');
            $('#sheet-content-' + result.tg_active_subtab).addClass('active');
        }

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

        if (result.tg_translit_old) {
            $('#textArea1_oldText').val(result.tg_translit_old);
        }
        if (result.tg_translit_new) {
            $('#textArea2_generatedRuText').val(result.tg_translit_new);
        }

        if (typeof (window as any).renderPrayers === 'function') {
            (window as any).renderPrayers(result[STORAGE_KEYS.PRAYERS] || []);
        }

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

        storageLoaded = true;
        setTimeout(initResizeObserver, 300);
        initStep3Resizers();
    });

    $('.tab-link').click(function() {
        const tabId = $(this).data('tab'); 
        $('.tab-link').removeClass('active').attr('aria-selected', 'false'); 
        $('.tab-content').removeClass('active'); 
        $(this).addClass('active').attr('aria-selected', 'true'); 
        $('#' + tabId).addClass('active');
        SYH_STORAGE.set({ 'tg_active_tab': tabId });
    });

    $('.subtab-button').click(function() {
        const sheetId = $(this).data('sheet');
        $('.subtab-button').removeClass('active').attr('aria-selected', 'false');
        $('.sheet-content').removeClass('active');
        $(this).addClass('active').attr('aria-selected', 'true');
        $('#sheet-content-' + sheetId).addClass('active');
        SYH_STORAGE.set({ 'tg_active_subtab': sheetId });
    });

    let oldListTimer: any = null;
    let newTelegramTimer: any = null;
    let answeredIdsTimer: any = null;
    let finalResultTimer: any = null;
    let translitOldTimer: any = null;
    let translitNewTimer: any = null;

    SHEET_IDS.forEach(sId => {
        $(`#oldList__${sId}`).on('input', function() { 
            const val = $(this).val();
            if (oldListTimer) clearTimeout(oldListTimer);
            oldListTimer = setTimeout(() => {
                SYH_STORAGE.set({ [`tg_oldList__${sId}`]: val }); 
                if (typeof (window as any).updateOldInputStats === 'function') {
                    (window as any).updateOldInputStats(sId);
                }
            }, 300);
        });
        
        $(`#newTelegram__${sId}`).on('input', function() { 
            const val = $(this).val();
            if (newTelegramTimer) clearTimeout(newTelegramTimer);
            newTelegramTimer = setTimeout(() => {
                SYH_STORAGE.set({ [`tg_newTelegram__${sId}`]: val }); 
                if (typeof (window as any).updateNewInputStats === 'function') {
                    (window as any).updateNewInputStats(sId);
                }
            }, 300);
        });
        
        $(`#answeredIds__${sId}`).on('input', function() { 
            const val = $(this).val();
            if (answeredIdsTimer) clearTimeout(answeredIdsTimer);
            answeredIdsTimer = setTimeout(() => {
                SYH_STORAGE.set({ [`tg_answered__${sId}`]: val }); 
            }, 300);
        });

        $(`#finalResultDiv__${sId}`).on('input blur', function() {
            const html = $(this).html();
            if (finalResultTimer) clearTimeout(finalResultTimer);
            finalResultTimer = setTimeout(() => {
                SYH_STORAGE.set({ [`tg_finalResultHtml__${sId}`]: html });
            }, 300);
        });

        $(`#deletedLogDetails__${sId}`).on('toggle', function() {
            SYH_STORAGE.set({ [`tg_deletedLogDetailsOpen__${sId}`]: (this as HTMLDetailsElement).open });
        });

        $(`#cleanedLogDetails__${sId}`).on('toggle', function() {
            SYH_STORAGE.set({ [`tg_cleanedLogDetailsOpen__${sId}`]: (this as HTMLDetailsElement).open });
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
                SYH_STORAGE.remove([
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
            if (typeof (window as any).clearAllYTCollected === 'function') {
                (window as any).clearAllYTCollected(sId);
            }
        });
    });

    $('#textArea1_oldText').on('input', function() {
        const val = $(this).val();
        if (translitOldTimer) clearTimeout(translitOldTimer);
        translitOldTimer = setTimeout(() => {
            SYH_STORAGE.set({ 'tg_translit_old': val });
        }, 300);
    });
    
    $('#textArea2_generatedRuText').on('input', function() {
        const val = $(this).val();
        if (translitNewTimer) clearTimeout(translitNewTimer);
        translitNewTimer = setTimeout(() => {
            SYH_STORAGE.set({ 'tg_translit_new': val });
        }, 300);
    });

    $("#sschoolNameBtn").click(function() { 
        db.newTitleSS = $("#sschoolName").val(); 
        saveDataToStorage(); 
        alert("Збережено!"); 
    });
    
    $("#preachNameBtn").click(function() { 
        db.newTitlePreach = $("#preachNameInput").val(); 
        saveDataToStorage(); 
        alert("Збережено!"); 
    });

    $("#openOptionsPageBtn").click(function() {
        if (chrome.runtime && chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });

    function initResizeObserver() {
        const textareas = ['textArea1_oldText', 'textArea2_generatedRuText'];
        SHEET_IDS.forEach(sId => {
            textareas.push(`oldList__${sId}`, `newTelegram__${sId}`);
        });

        const resizeObserver = new ResizeObserver(entries => {
            if (!storageLoaded) return;
            SYH_STORAGE.get(['tg_textarea_sizes'], function(res) {
                const sizes = res.tg_textarea_sizes || {};
                let updated = false;
                for (const entry of entries) {
                    const id = entry.target.id;
                    const width = (entry.target as HTMLElement).style.width;
                    const height = (entry.target as HTMLElement).style.height;
                    if (width || height) {
                        sizes[id] = { width, height };
                        updated = true;
                    }
                }
                if (updated) {
                    SYH_STORAGE.set({ 'tg_textarea_sizes': sizes });
                }
            });
        });
        textareas.forEach(id => {
            const el = document.getElementById(id);
            if (el) resizeObserver.observe(el);
        });
    }

    let scrollTimeout: any;
    function saveScrollPositions() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolls: any = {
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
            SYH_STORAGE.set({ 'tg_scroll_positions': scrolls });
        }, 150);
    }
    $(window).on('scroll', saveScrollPositions);
    $('#prayersResultDiv, #textArea1_oldText, #textArea2_generatedRuText').on('scroll', saveScrollPositions);
    SHEET_IDS.forEach(sId => {
        $(`#finalResultDiv__${sId}, #deletedLog__${sId}, #oldList__${sId}, #newTelegram__${sId}`).on('scroll', saveScrollPositions);
    });

    let activeResizer: { sId: string, divider: JQuery, left: JQuery, right: JQuery } | null = null;

    $(document).on('mousemove', function(e) {
        if (!activeResizer) return;
        const { sId, divider, left, right } = activeResizer;
        const container = divider.parent();
        const containerOffset = container.offset();
        const containerWidth = container.width();
        
        if (!containerOffset || !containerWidth || containerWidth <= 0) return;

        const leftWidth = e.pageX - containerOffset.left;
        let percent = (leftWidth / containerWidth) * 100;
        if (percent < 15) percent = 15;
        if (percent > 85) percent = 85;

        left.css('flex', `${percent}%`);
        right.css('flex', `${100 - percent}%`);
    });

    $(document).on('mouseup', function() {
        if (activeResizer) {
            const { sId, divider, left, right } = activeResizer;
            divider.removeClass('is-dragging');
            $('body').css('user-select', '');

            const flexLeft = parseFloat(left.css('flex')) || parseFloat(left.css('flex-grow')) || 1;
            const flexRight = parseFloat(right.css('flex')) || parseFloat(right.css('flex-grow')) || 1;
            const total = flexLeft + flexRight;
            const posPercent = (flexLeft / total) * 100;

            SYH_STORAGE.set({ [`syh:popup:divider_pos:${sId}`]: posPercent });
            activeResizer = null;
        }
    });

    function initStep3Resizers() {
        SHEET_IDS.forEach(sId => {
            const $divider = $(`#step3Divider__${sId}`);
            const $container = $(`#step3Columns__${sId}`);
            const $left = $(`#step3Left__${sId}`);
            const $right = $(`#step3Right__${sId}`);

            if (!$divider.length || !$container.length) return;

            $divider.on('mousedown', function(e) {
                e.preventDefault();
                activeResizer = { sId, divider: $divider, left: $left, right: $right };
                $divider.addClass('is-dragging');
                $('body').css('user-select', 'none');
            });
        });
    }
});
