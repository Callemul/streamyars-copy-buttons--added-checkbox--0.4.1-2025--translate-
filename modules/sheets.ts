// modules/sheets.ts

export const SHEET_IDS = {
    VP_SS: 'vp_ss',                 // "Время перемен СШ"
    OPARIN: 'oparin',               // "Опарин проповеди"
    MOLCHANOV_SS: 'molchanov_ss',   // "Молчанов СШ"
    MOLCHANOV_PREACH: 'molchanov_preach', // "Молчанов проповеди"
} as const;

export type SheetId = typeof SHEET_IDS[keyof typeof SHEET_IDS];

export interface SheetDefinition {
    id: SheetId;
    label: string;
    description: string;
    icon?: string;
}

export const SHEET_DEFINITIONS: Record<SheetId, SheetDefinition> = {
    [SHEET_IDS.VP_SS]: { id: SHEET_IDS.VP_SS, label: 'Время перемен СШ', description: 'Суботня школа Время Перемен', icon: '📖' },
    [SHEET_IDS.OPARIN]: { id: SHEET_IDS.OPARIN, label: 'Опарин проповеди', description: 'Проповіді Опаріна', icon: '🎙️' },
    [SHEET_IDS.MOLCHANOV_SS]: { id: SHEET_IDS.MOLCHANOV_SS, label: 'Молчанов СШ', description: 'Суботня школа Молчанова', icon: '📚' },
    [SHEET_IDS.MOLCHANOV_PREACH]: { id: SHEET_IDS.MOLCHANOV_PREACH, label: 'Молчанов проповеди', description: 'Проповіді Молчанова', icon: '💬' },
};

export const SHEET_LABELS: Record<SheetId, string> = Object.fromEntries(
    Object.values(SHEET_DEFINITIONS).map(s => [s.id, s.label])
) as Record<SheetId, string>;

export function getAllSheetIds(): SheetId[] {
    return Object.values(SHEET_IDS);
}

export function getAllSheetDefinitions(): SheetDefinition[] {
    return Object.values(SHEET_DEFINITIONS);
}

export function isValidSheetId(id: string): id is SheetId {
    return getAllSheetIds().includes(id as SheetId);
}

if (typeof window !== 'undefined') {
    (window as any).SHEET_IDS = SHEET_IDS;
    (window as any).SHEET_LABELS = SHEET_LABELS;
    (window as any).getAllSheetIds = getAllSheetIds;
}
