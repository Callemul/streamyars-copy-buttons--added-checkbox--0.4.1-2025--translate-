import { SYH_STORAGE, STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { getAllSheetIds, SHEET_LABELS } from '../modules/sheets';
import { updateOldInputStats, updateNewInputStats, loadYTCollected, ensureStatsBarRows, clearAllYTCollected } from './popup_telegram';
import { renderPrayers } from './popup_prayers';

export const db: Record<string, unknown> = {};

/**
 * Динамічна інсталяція HTML-блоків аркушів із шаблону <template> (Vanilla DOM)
 */
export function renderSheetTemplates(): void {
    const template = document.getElementById('sheet-content-template') as HTMLTemplateElement | null;
    const container = document.getElementById('sheet-contents-container');
    if (!template || !container) return;

    const sheetIds = getAllSheetIds();
    sheetIds.forEach((sId, idx) => {
        const clone = template.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!clone) return;

        clone.id = `sheet-content-${sId}`;
        clone.setAttribute('aria-label', SHEET_LABELS[sId] || sId);
        if (idx === 0) clone.classList.add('active');

        const setAttrId = (selector: string, newId: string) => {
            const el = clone.querySelector(selector);
            if (el) el.id = newId;
        };

        setAttrId('.js-old-total-count', `oldTotalCount__${sId}`);
        setAttrId('.js-old-list', `oldList__${sId}`);
        setAttrId('.js-answered-ids', `answeredIds__${sId}`);
        setAttrId('.js-tg-total-count-all', `tgTotalCountAll__${sId}`);
        setAttrId('.js-step3-columns', `step3Columns__${sId}`);
        setAttrId('.js-step3-left', `step3Left__${sId}`);
        setAttrId('.js-tg-total-count-left', `tgTotalCountLeft__${sId}`);
        setAttrId('.js-new-telegram', `newTelegram__${sId}`);
        setAttrId('.js-step3-divider', `step3Divider__${sId}`);
        setAttrId('.js-step3-right', `step3Right__${sId}`);
        setAttrId('.js-tg-total-count-right', `tgTotalCountRight__${sId}`);
        setAttrId('.js-clear-yt-collected', `clearYTCollected__${sId}`);
        setAttrId('.js-yt-collected-list', `ytCollectedList__${sId}`);
        setAttrId('.js-process-btn', `processTelegramBtn__${sId}`);
        setAttrId('.js-clear-state-btn', `clearStateBtn__${sId}`);
        setAttrId('.js-stats-bar', `statsBar__${sId}`);
        setAttrId('.js-count-old', `countOld__${sId}`);
        setAttrId('.js-count-del', `countDel__${sId}`);
        setAttrId('.js-count-new-left', `countNewLeft__${sId}`);
        setAttrId('.js-count-new-yt', `countNewYT__${sId}`);
        setAttrId('.js-count-total', `countTotal__${sId}`);
        setAttrId('.js-copy-result-btn', `copyResultBtn__${sId}`);
        setAttrId('.js-final-result-div', `finalResultDiv__${sId}`);
        setAttrId('.js-deleted-log-details', `deletedLogDetails__${sId}`);
        setAttrId('.js-deleted-log-count', `deletedLogCount__${sId}`);
        setAttrId('.js-deleted-log', `deletedLog__${sId}`);
        setAttrId('.js-cleaned-log-details', `cleanedLogDetails__${sId}`);
        setAttrId('.js-cleaned-log-count', `cleanedLogCount__${sId}`);
        setAttrId('.js-cleaned-log', `cleanedLog__${sId}`);

        container.appendChild(clone);
    });
}

export function saveDataToStorage(): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.DB]: db });
}

export async function loadData(key: string): Promise<unknown> {
    const res = await SYH_STORAGE.getAsync<Record<string, unknown>>([key]);
    return res[key];
}

export async function saveData(key: string, value: unknown): Promise<void> {
    await SYH_STORAGE.setAsync({ [key]: value });
}

const SHEET_IDS = getAllSheetIds();

$(document).ready(function () {
    renderSheetTemplates();

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
            POPUP_SHEET_KEYS.oldList(sId), `tg_oldList__${sId}`,
            POPUP_SHEET_KEYS.answered(sId), `tg_answered__${sId}`,
            POPUP_SHEET_KEYS.newTelegram(sId), `tg_newTelegram__${sId}`,
            POPUP_SHEET_KEYS.finalResultHtml(sId), `tg_finalResultHtml__${sId}`,
            POPUP_SHEET_KEYS.statsHtml(sId), `tg_statsHtml__${sId}`,
            POPUP_SHEET_KEYS.statsVisible(sId), `tg_statsVisible__${sId}`,
            POPUP_SHEET_KEYS.deletedLogHtml(sId), `tg_deletedLogHtml__${sId}`,
            POPUP_SHEET_KEYS.deletedLogCount(sId), `tg_deletedLogCount__${sId}`,
            POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId), `tg_deletedLogDetailsVisible__${sId}`,
            POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId), `tg_deletedLogDetailsOpen__${sId}`,
            POPUP_SHEET_KEYS.cleanedLogHtml(sId), `tg_cleanedLogHtml__${sId}`,
            POPUP_SHEET_KEYS.cleanedLogCount(sId), `tg_cleanedLogCount__${sId}`,
            POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId), `tg_cleanedLogDetailsVisible__${sId}`,
            POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId), `tg_cleanedLogDetailsOpen__${sId}`,
            POPUP_SHEET_KEYS.dividerPos(sId), `syh:popup:divider_pos:${sId}`,
            getSheetCollectedStorageKey(sId), `syh:popup:collected:${sId}`
        );
    });

    let storageLoaded = false;

    SYH_STORAGE.get(keysToLoad, function (result: Record<string, any>) {
        if (result[STORAGE_KEYS.DB]) {
            Object.assign(db, result[STORAGE_KEYS.DB]);
            if (db.newTitleSS) $("#sschoolName").val(db.newTitleSS as string);
            if (db.newTitlePreach) $("#preachNameInput").val(db.newTitlePreach as string);
        }

        SHEET_IDS.forEach(sId => {
            const oldListVal = result[POPUP_SHEET_KEYS.oldList(sId)] ?? result[`tg_oldList__${sId}`];
            if (oldListVal) {
                $(`#oldList__${sId}`).val(oldListVal);
                updateOldInputStats(sId);
            }

            const answeredVal = result[POPUP_SHEET_KEYS.answered(sId)] ?? result[`tg_answered__${sId}`];
            if (answeredVal) {
                $(`#answeredIds__${sId}`).val(answeredVal);
            }

            const newTgVal = result[POPUP_SHEET_KEYS.newTelegram(sId)] ?? result[`tg_newTelegram__${sId}`];
            if (newTgVal) {
                $(`#newTelegram__${sId}`).val(newTgVal);
                updateNewInputStats(sId);
            }

            const finalHtml = result[POPUP_SHEET_KEYS.finalResultHtml(sId)] ?? result[`tg_finalResultHtml__${sId}`];
            if (finalHtml) {
                $(`#finalResultDiv__${sId}`).html(finalHtml);
            }

            if (result[POPUP_SHEET_KEYS.statsVisible(sId)] ?? result[`tg_statsVisible__${sId}`]) {
                const statsHtml = result[POPUP_SHEET_KEYS.statsHtml(sId)] ?? result[`tg_statsHtml__${sId}`];
                if (statsHtml) $(`#statsBar__${sId}`).html(statsHtml);
                ensureStatsBarRows(sId);
                $(`#statsBar__${sId}`).show();
            }

            if (result[POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId)] ?? result[`tg_deletedLogDetailsVisible__${sId}`]) {
                const delHtml = result[POPUP_SHEET_KEYS.deletedLogHtml(sId)] ?? result[`tg_deletedLogHtml__${sId}`];
                if (delHtml) $(`#deletedLog__${sId}`).html(delHtml);
                let delCount = result[POPUP_SHEET_KEYS.deletedLogCount(sId)] ?? result[`tg_deletedLogCount__${sId}`];
                if (delCount === undefined && delHtml) {
                    delCount = $(`#deletedLog__${sId}`).find('.del-row').length;
                }
                if (delCount) {
                    $(`#deletedLogCount__${sId}`).text(`(${delCount})`);
                }
                if (result[POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)] ?? result[`tg_deletedLogDetailsOpen__${sId}`]) {
                    $(`#deletedLogDetails__${sId}`).attr('open', 'open');
                } else {
                    $(`#deletedLogDetails__${sId}`).removeAttr('open');
                }
                $(`#deletedLogDetails__${sId}`).show();
            } else {
                $(`#deletedLogCount__${sId}`).text('');
            }

            if (result[POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId)] ?? result[`tg_cleanedLogDetailsVisible__${sId}`]) {
                const cleanHtml = result[POPUP_SHEET_KEYS.cleanedLogHtml(sId)] ?? result[`tg_cleanedLogHtml__${sId}`];
                if (cleanHtml) $(`#cleanedLog__${sId}`).html(cleanHtml);
                let cleanCount = result[POPUP_SHEET_KEYS.cleanedLogCount(sId)] ?? result[`tg_cleanedLogCount__${sId}`];
                if (cleanCount === undefined && cleanHtml) {
                    cleanCount = $(`#cleanedLog__${sId}`).find('.clean-table tr').length - 1;
                }
                if (cleanCount && cleanCount > 0) {
                    $(`#cleanedLogCount__${sId}`).text(`(${cleanCount})`);
                }
                if (result[POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId)] ?? result[`tg_cleanedLogDetailsOpen__${sId}`]) {
                    $(`#cleanedLogDetails__${sId}`).attr('open', 'open');
                } else {
                    $(`#cleanedLogDetails__${sId}`).removeAttr('open');
                }
                $(`#cleanedLogDetails__${sId}`).show();
            } else {
                $(`#cleanedLogCount__${sId}`).text('');
            }

            const divPos = result[POPUP_SHEET_KEYS.dividerPos(sId)] ?? result[`syh:popup:divider_pos:${sId}`];
            if (divPos) {
                $(`#step3Left__${sId}`).css('flex', `${divPos}%`);
                $(`#step3Right__${sId}`).css('flex', `${100 - divPos}%`);
            }

            loadYTCollected(sId);
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

        renderPrayers(result[STORAGE_KEYS.PRAYERS] || []);

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

    $('.tab-link').click(function () {
        const tabId = $(this).data('tab');
        $('.tab-link').removeClass('active').attr('aria-selected', 'false');
        $('.tab-content').removeClass('active');
        $(this).addClass('active').attr('aria-selected', 'true');
        $('#' + tabId).addClass('active');
        SYH_STORAGE.set({ 'tg_active_tab': tabId });
    });

    $('.subtab-button').click(function () {
        const sheetId = $(this).data('sheet');
        $('.subtab-button').removeClass('active').attr('aria-selected', 'false');
        $('.sheet-content').removeClass('active');
        $(this).addClass('active').attr('aria-selected', 'true');
        $('#sheet-content-' + sheetId).addClass('active');
        SYH_STORAGE.set({ 'tg_active_subtab': sheetId });
    });

    let oldListTimer: ReturnType<typeof setTimeout> | null = null;
    let newTelegramTimer: ReturnType<typeof setTimeout> | null = null;
    let answeredIdsTimer: ReturnType<typeof setTimeout> | null = null;
    let finalResultTimer: ReturnType<typeof setTimeout> | null = null;
    let translitOldTimer: ReturnType<typeof setTimeout> | null = null;
    let translitNewTimer: ReturnType<typeof setTimeout> | null = null;

    SHEET_IDS.forEach(sId => {
        $(`#oldList__${sId}`).on('input', function () {
            const val = $(this).val();
            if (oldListTimer) clearTimeout(oldListTimer);
            oldListTimer = setTimeout(() => {
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.oldList(sId)]: val,
                    [`tg_oldList__${sId}`]: val
                });
                updateOldInputStats(sId);
            }, 300);
        });

        $(`#newTelegram__${sId}`).on('input', function () {
            const val = $(this).val();
            if (newTelegramTimer) clearTimeout(newTelegramTimer);
            newTelegramTimer = setTimeout(() => {
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.newTelegram(sId)]: val,
                    [`tg_newTelegram__${sId}`]: val
                });
                updateNewInputStats(sId);
            }, 300);
        });

        $(`#answeredIds__${sId}`).on('input', function () {
            const val = $(this).val();
            if (answeredIdsTimer) clearTimeout(answeredIdsTimer);
            answeredIdsTimer = setTimeout(() => {
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.answered(sId)]: val,
                    [`tg_answered__${sId}`]: val
                });
            }, 300);
        });

        $(`#finalResultDiv__${sId}`).on('input blur', function () {
            const html = $(this).html();
            if (finalResultTimer) clearTimeout(finalResultTimer);
            finalResultTimer = setTimeout(() => {
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.finalResultHtml(sId)]: html,
                    [`tg_finalResultHtml__${sId}`]: html
                });
            }, 300);
        });

        $(`#deletedLogDetails__${sId}`).on('toggle', function () {
            const isOpen = (this as HTMLDetailsElement).open;
            SYH_STORAGE.set({
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)]: isOpen,
                [`tg_deletedLogDetailsOpen__${sId}`]: isOpen
            });
        });

        $(`#cleanedLogDetails__${sId}`).on('toggle', function () {
            const isOpen = (this as HTMLDetailsElement).open;
            SYH_STORAGE.set({
                [POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId)]: isOpen,
                [`tg_cleanedLogDetailsOpen__${sId}`]: isOpen
            });
        });

        $(`#clearStateBtn__${sId}`).click(function () {
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
                    POPUP_SHEET_KEYS.oldList(sId), `tg_oldList__${sId}`,
                    POPUP_SHEET_KEYS.answered(sId), `tg_answered__${sId}`,
                    POPUP_SHEET_KEYS.newTelegram(sId), `tg_newTelegram__${sId}`,
                    POPUP_SHEET_KEYS.finalResultHtml(sId), `tg_finalResultHtml__${sId}`,
                    POPUP_SHEET_KEYS.statsHtml(sId), `tg_statsHtml__${sId}`,
                    POPUP_SHEET_KEYS.statsVisible(sId), `tg_statsVisible__${sId}`,
                    POPUP_SHEET_KEYS.deletedLogHtml(sId), `tg_deletedLogHtml__${sId}`,
                    POPUP_SHEET_KEYS.deletedLogCount(sId), `tg_deletedLogCount__${sId}`,
                    POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId), `tg_deletedLogDetailsVisible__${sId}`,
                    POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId), `tg_deletedLogDetailsOpen__${sId}`,
                    POPUP_SHEET_KEYS.cleanedLogHtml(sId), `tg_cleanedLogHtml__${sId}`,
                    POPUP_SHEET_KEYS.cleanedLogCount(sId), `tg_cleanedLogCount__${sId}`,
                    POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId), `tg_cleanedLogDetailsVisible__${sId}`,
                    POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId), `tg_cleanedLogDetailsOpen__${sId}`
                ]);
            }
        });

        $(`#clearYTCollected__${sId}`).click(function () {
            clearAllYTCollected(sId);
        });
    });

    $('#textArea1_oldText').on('input', function () {
        const val = $(this).val();
        if (translitOldTimer) clearTimeout(translitOldTimer);
        translitOldTimer = setTimeout(() => {
            SYH_STORAGE.set({ 'tg_translit_old': val });
        }, 300);
    });

    $('#textArea2_generatedRuText').on('input', function () {
        const val = $(this).val();
        if (translitNewTimer) clearTimeout(translitNewTimer);
        translitNewTimer = setTimeout(() => {
            SYH_STORAGE.set({ 'tg_translit_new': val });
        }, 300);
    });

    $("#sschoolNameBtn").click(function () {
        db.newTitleSS = $("#sschoolName").val();
        saveDataToStorage();
        alert("Збережено!");
    });

    $("#preachNameBtn").click(function () {
        db.newTitlePreach = $("#preachNameInput").val();
        saveDataToStorage();
        alert("Збережено!");
    });

    $("#openOptionsPageBtn").click(function () {
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
            SYH_STORAGE.get(['tg_textarea_sizes'], function (res: Record<string, any>) {
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

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    function saveScrollPositions() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolls: Record<string, any> = {
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

    $(document).on('mousemove', function (e) {
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

    $(document).on('mouseup', function () {
        if (activeResizer) {
            const { sId, divider, left, right } = activeResizer;
            divider.removeClass('is-dragging');
            $('body').css('user-select', '');

            const flexLeft = parseFloat(left.css('flex')) || parseFloat(left.css('flex-grow')) || 1;
            const flexRight = parseFloat(right.css('flex')) || parseFloat(right.css('flex-grow')) || 1;
            const total = flexLeft + flexRight;
            const posPercent = (flexLeft / total) * 100;

            SYH_STORAGE.set({
                [POPUP_SHEET_KEYS.dividerPos(sId)]: posPercent,
                [`syh:popup:divider_pos:${sId}`]: posPercent
            });
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

            $divider.on('mousedown', function (e) {
                e.preventDefault();
                activeResizer = { sId, divider: $divider, left: $left, right: $right };
                $divider.addClass('is-dragging');
                $('body').css('user-select', 'none');
            });
        });
    }
});
