// options/defaults.ts
import { SYH_CONFIG } from '../modules/config';

export interface OptionsState {
    newTitleSS: string;
    newTitlePreach: string;
    ui_locale: string;
    anti_afk_enabled: boolean;
    anti_afk_interval_sec: number;
    auto_heal_enabled: boolean;
    text_truncation_length: number;
    show_copy_buttons: boolean;
    youtube_enabled: boolean;
    studio_enabled: boolean;
    compact_secondary_tabs_default: boolean;
}

export const DEFAULT_OPTIONS: OptionsState = {
    newTitleSS: 'СШ Урок',
    newTitlePreach: 'Проповідь',
    ui_locale: 'auto',
    anti_afk_enabled: true,
    anti_afk_interval_sec: SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL / 1000,
    auto_heal_enabled: true,
    text_truncation_length: SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH,
    show_copy_buttons: true,
    youtube_enabled: true,
    studio_enabled: true,
    compact_secondary_tabs_default: true
};