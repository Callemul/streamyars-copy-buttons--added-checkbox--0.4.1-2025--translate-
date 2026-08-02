// modules/sheets.ts

export const SHEET_IDS = {
    VP_SS: 'vp_ss',                 // "Время перемен СШ"
    OPARIN: 'oparin',               // "Опарин проповеди"
    MOLCHANOV_SS: 'molchanov_ss',   // "Молчанов СШ"
    MOLCHANOV_PREACH: 'molchanov_preach', // "Молчанов проповеди"
} as const;

export type SheetId = typeof SHEET_IDS[keyof typeof SHEET_IDS];

export const SHEET_LABELS: Record<SheetId, string> = {
    [SHEET_IDS.VP_SS]: 'Время перемен СШ',
    [SHEET_IDS.OPARIN]: 'Опарин проповеди',
    [SHEET_IDS.MOLCHANOV_SS]: 'Молчанов СШ',
    [SHEET_IDS.MOLCHANOV_PREACH]: 'Молчанов проповеди',
};

export function getAllSheetIds(): SheetId[] {
    return Object.values(SHEET_IDS);
}

export function isValidSheetId(id: string): id is SheetId {
    return getAllSheetIds().includes(id as SheetId);
}

if (typeof window !== 'undefined') {
    (window as any).SHEET_IDS = SHEET_IDS;
    (window as any).SHEET_LABELS = SHEET_LABELS;
    (window as any).getAllSheetIds = getAllSheetIds;
}
