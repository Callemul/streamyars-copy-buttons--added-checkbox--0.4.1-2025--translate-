// modules/sheets.ts

export const SHEET_IDS = {
    VP_SS: 'vp_ss',                 // "Время перемен СШ"
    OPARIN: 'oparin',               // "Опарин проповеди"
    MOLCHANOV_SS: 'molchanov_ss',   // "Молчанов СШ"
    MOLCHANOV_PREACH: 'molchanov_preach', // "Молчанов проповеди"
} as const;

export type SheetId = typeof SHEET_IDS[keyof typeof SHEET_IDS];

export const SHEET_LABELS: Record<SheetId, string> = {
    vp_ss: 'Время перемен СШ',
    oparin: 'Опарин проповеди',
    molchanov_ss: 'Молчанов СШ',
    molchanov_preach: 'Молчанов проповеди',
};

if (typeof window !== 'undefined') {
    (window as any).SHEET_IDS = SHEET_IDS;
    (window as any).SHEET_LABELS = SHEET_LABELS;
}
