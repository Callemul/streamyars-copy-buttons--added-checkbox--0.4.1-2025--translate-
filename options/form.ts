// options/form.ts
import type { OptionsState } from './defaults';

function setVal(id: string, val: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val;
}

function setCheck(id: string, val: boolean): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = val;
}

function getDefaultValue<T>(value: T | undefined, defaultValue: T): T {
    return value !== undefined ? value : defaultValue;
}

export function populateFormElements(
    db: any,
    opts: Partial<OptionsState>,
    defaults: OptionsState,
    studioEnabled?: boolean
): void {
    setVal('optSschoolName', db.newTitleSS || defaults.newTitleSS);
    setVal('optPreachName', db.newTitlePreach || defaults.newTitlePreach);
    setVal('optLanguage', opts.ui_locale || defaults.ui_locale);

    setCheck('optAntiAfkEnabled', getDefaultValue(opts.anti_afk_enabled, defaults.anti_afk_enabled));
    setVal('optAntiAfkInterval', String(getDefaultValue(opts.anti_afk_interval_sec, defaults.anti_afk_interval_sec)));

    setCheck('optAutoHealEnabled', getDefaultValue(opts.auto_heal_enabled, defaults.auto_heal_enabled));
    setVal('optTruncationLength', String(getDefaultValue(opts.text_truncation_length, defaults.text_truncation_length)));

    setCheck('optShowCopyButtons', getDefaultValue(opts.show_copy_buttons, defaults.show_copy_buttons));
    setCheck('optCompactSecondaryTabs', getDefaultValue(opts.compact_secondary_tabs_default, defaults.compact_secondary_tabs_default));
    setCheck('optYouTubeEnabled', getDefaultValue(opts.youtube_enabled, defaults.youtube_enabled));

    const isStudioEnabled = studioEnabled !== undefined
        ? studioEnabled
        : getDefaultValue(opts.studio_enabled, defaults.studio_enabled);
    setCheck('optStudioEnabled', isStudioEnabled);
}