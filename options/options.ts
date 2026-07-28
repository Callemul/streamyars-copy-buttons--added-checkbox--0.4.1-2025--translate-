import { SYH_STORAGE } from '../modules/storage';
import { SYH_CONFIG } from '../modules/config';

interface OptionsState {
    newTitleSS: string;
    newTitlePreach: string;
    ui_locale: string;
    anti_afk_enabled: boolean;
    anti_afk_interval_sec: number;
    auto_heal_enabled: boolean;
    text_truncation_length: number;
    show_copy_buttons: boolean;
}

const DEFAULT_OPTIONS: OptionsState = {
    newTitleSS: 'СШ Урок',
    newTitlePreach: 'Проповідь',
    ui_locale: 'auto',
    anti_afk_enabled: true,
    anti_afk_interval_sec: SYH_CONFIG.TIMINGS.ANTI_AFK_INTERVAL / 1000,
    auto_heal_enabled: true,
    text_truncation_length: SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH,
    show_copy_buttons: true
};

class OptionsController {
    private toastTimer: any = null;

    constructor() {
        this.initNavigation();
        this.initEvents();
        this.loadSettings();
    }

    private initNavigation(): void {
        const navItems = document.querySelectorAll<HTMLButtonElement>('.nav-item');
        const sections = document.querySelectorAll<HTMLElement>('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');
                navItems.forEach(n => n.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));

                item.classList.add('active');
                if (targetId) {
                    const targetSec = document.getElementById(targetId);
                    if (targetSec) targetSec.classList.add('active');
                }
            });
        });
    }

    private initEvents(): void {
        const saveBtn = document.getElementById('saveTopBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());

        const exportBtn = document.getElementById('exportConfigBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportConfig());

        const importInput = document.getElementById('importConfigFile') as HTMLInputElement;
        if (importInput) importInput.addEventListener('change', (e) => this.importConfig(e));

        const resetBtn = document.getElementById('resetDefaultsBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetDefaults());
    }

    private loadSettings(): void {
        SYH_STORAGE.get(['db', 'syh_options'], (result) => {
            const db = result.db || {};
            const opts: Partial<OptionsState> = result.syh_options || {};

            const sschoolInput = document.getElementById('optSschoolName') as HTMLInputElement;
            if (sschoolInput) sschoolInput.value = db.newTitleSS || DEFAULT_OPTIONS.newTitleSS;

            const preachInput = document.getElementById('optPreachName') as HTMLInputElement;
            if (preachInput) preachInput.value = db.newTitlePreach || DEFAULT_OPTIONS.newTitlePreach;

            const langSelect = document.getElementById('optLanguage') as HTMLSelectElement;
            if (langSelect) langSelect.value = opts.ui_locale || DEFAULT_OPTIONS.ui_locale;

            const antiAfkToggle = document.getElementById('optAntiAfkEnabled') as HTMLInputElement;
            if (antiAfkToggle) antiAfkToggle.checked = opts.anti_afk_enabled !== undefined ? opts.anti_afk_enabled : DEFAULT_OPTIONS.anti_afk_enabled;

            const antiAfkInterval = document.getElementById('optAntiAfkInterval') as HTMLInputElement;
            if (antiAfkInterval) antiAfkInterval.value = String(opts.anti_afk_interval_sec || DEFAULT_OPTIONS.anti_afk_interval_sec);

            const autoHealToggle = document.getElementById('optAutoHealEnabled') as HTMLInputElement;
            if (autoHealToggle) autoHealToggle.checked = opts.auto_heal_enabled !== undefined ? opts.auto_heal_enabled : DEFAULT_OPTIONS.auto_heal_enabled;

            const truncLength = document.getElementById('optTruncationLength') as HTMLInputElement;
            if (truncLength) truncLength.value = String(opts.text_truncation_length || DEFAULT_OPTIONS.text_truncation_length);

            const showCopy = document.getElementById('optShowCopyButtons') as HTMLInputElement;
            if (showCopy) showCopy.checked = opts.show_copy_buttons !== undefined ? opts.show_copy_buttons : DEFAULT_OPTIONS.show_copy_buttons;
        });
    }

    private saveSettings(): void {
        const sschoolVal = (document.getElementById('optSschoolName') as HTMLInputElement)?.value.trim() || DEFAULT_OPTIONS.newTitleSS;
        const preachVal = (document.getElementById('optPreachName') as HTMLInputElement)?.value.trim() || DEFAULT_OPTIONS.newTitlePreach;
        const langVal = (document.getElementById('optLanguage') as HTMLSelectElement)?.value || DEFAULT_OPTIONS.ui_locale;
        const antiAfkVal = (document.getElementById('optAntiAfkEnabled') as HTMLInputElement)?.checked;
        const antiAfkIntervalVal = parseInt((document.getElementById('optAntiAfkInterval') as HTMLInputElement)?.value || '30', 10);
        const autoHealVal = (document.getElementById('optAutoHealEnabled') as HTMLInputElement)?.checked;
        const truncVal = parseInt((document.getElementById('optTruncationLength') as HTMLInputElement)?.value || '195', 10);
        const showCopyVal = (document.getElementById('optShowCopyButtons') as HTMLInputElement)?.checked;

        SYH_STORAGE.get(['db'], (result) => {
            const currentDb = result.db || {};
            currentDb.newTitleSS = sschoolVal;
            currentDb.newTitlePreach = preachVal;

            const newOptions: OptionsState = {
                newTitleSS: sschoolVal,
                newTitlePreach: preachVal,
                ui_locale: langVal,
                anti_afk_enabled: antiAfkVal,
                anti_afk_interval_sec: antiAfkIntervalVal,
                auto_heal_enabled: autoHealVal,
                text_truncation_length: truncVal,
                show_copy_buttons: showCopyVal
            };

            SYH_STORAGE.set({
                'db': currentDb,
                'syh_options': newOptions
            }, () => {
                this.showToast('✅ Налаштування успішно збережено!');
            });
        });
    }

    private exportConfig(): void {
        SYH_STORAGE.get(['db', 'syh_options'], (result) => {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                db: result.db || {},
                syh_options: result.syh_options || DEFAULT_OPTIONS
            };
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `streamyard_helper_config_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showToast('📥 Конфігурацію успішно експортовано');
        });
    }

    private validateImportedConfig(data: any): boolean {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return false;
        }
        const hasDb = 'db' in data;
        const hasOptions = 'syh_options' in data;
        if (!hasDb && !hasOptions) {
            return false;
        }
        if (hasDb && (typeof data.db !== 'object' || data.db === null || Array.isArray(data.db))) {
            return false;
        }
        if (hasOptions && (typeof data.syh_options !== 'object' || data.syh_options === null || Array.isArray(data.syh_options))) {
            return false;
        }
        return true;
    }

    private importConfig(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (this.validateImportedConfig(imported)) {
                    SYH_STORAGE.set({
                        'db': imported.db || {},
                        'syh_options': imported.syh_options || DEFAULT_OPTIONS
                    }, () => {
                        this.loadSettings();
                        this.showToast('📤 Конфігурацію успішно імпортовано!');
                    });
                } else {
                    alert('Некоректний формат файлу конфігурації.');
                }
            } catch (err) {
                alert('Помилка при зчитуванні JSON файлу.');
            }
        };
        reader.readAsText(file);
    }

    private resetDefaults(): void {
        if (confirm('Ви впевнені, що хочете скинути всі налаштування до стандартних?')) {
            SYH_STORAGE.set({
                'db': { newTitleSS: DEFAULT_OPTIONS.newTitleSS, newTitlePreach: DEFAULT_OPTIONS.newTitlePreach },
                'syh_options': DEFAULT_OPTIONS
            }, () => {
                this.loadSettings();
                this.showToast('⚠️ Налаштування скинуто до початкових!');
            });
        }
    }

    private showToast(msg: string): void {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
});
