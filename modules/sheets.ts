// modules/sheets.ts

export const SHEET_IDS = {
    VP_SS: 'vp_ss',
    OPARIN: 'oparin',
    MOLCHANOV_SS: 'molchanov_ss',
    MOLCHANOV_PREACH: 'molchanov_preach',
} as const;

export type SheetId = typeof SHEET_IDS[keyof typeof SHEET_IDS] | string;

export interface SheetDefinition {
    id: SheetId;
    label: string;
    description: string;
    icon?: string;
}

class DynamicSheetRegistry {
    private definitions: Map<string, SheetDefinition> = new Map([
        [SHEET_IDS.VP_SS, { id: SHEET_IDS.VP_SS, label: 'Время перемен СШ', description: 'Суботня школа Время Перемен', icon: '📖' }],
        [SHEET_IDS.OPARIN, { id: SHEET_IDS.OPARIN, label: 'Опарин проповеди', description: 'Проповіді Опаріна', icon: '🎙️' }],
        [SHEET_IDS.MOLCHANOV_SS, { id: SHEET_IDS.MOLCHANOV_SS, label: 'Молчанов СШ', description: 'Суботня школа Молчанова', icon: '📚' }],
        [SHEET_IDS.MOLCHANOV_PREACH, { id: SHEET_IDS.MOLCHANOV_PREACH, label: 'Молчанов проповеди', description: 'Проповіді Молчанова', icon: '💬' }]
    ]);

    public registerSheet(def: SheetDefinition): void {
        this.definitions.set(def.id, def);
    }

    public getDefinition(id: string): SheetDefinition | undefined {
        return this.definitions.get(id);
    }

    public getAllDefinitions(): SheetDefinition[] {
        return Array.from(this.definitions.values());
    }

    public getAllIds(): SheetId[] {
        return Array.from(this.definitions.keys());
    }

    public getLabels(): Record<string, string> {
        const labels: Record<string, string> = {};
        this.definitions.forEach((def, id) => {
            labels[id] = def.label;
        });
        return labels;
    }

    public createSheetRecordMap<T>(defaultValueFactory: () => T): Record<string, T> {
        const record: Record<string, T> = {};
        this.getAllIds().forEach(id => {
            record[id] = defaultValueFactory();
        });
        return record;
    }
}

export const SHEET_REGISTRY = new DynamicSheetRegistry();

export const SHEET_DEFINITIONS: Record<string, SheetDefinition> = new Proxy({}, {
    get: (_, prop: string) => SHEET_REGISTRY.getDefinition(prop),
    ownKeys: () => SHEET_REGISTRY.getAllIds(),
    getOwnPropertyDescriptor: (_, prop: string) => ({
        enumerable: true,
        configurable: true,
        value: SHEET_REGISTRY.getDefinition(prop)
    })
});

export const SHEET_LABELS: Record<string, string> = new Proxy({}, {
    get: (_, prop: string) => SHEET_REGISTRY.getDefinition(prop)?.label || prop,
    ownKeys: () => SHEET_REGISTRY.getAllIds(),
    getOwnPropertyDescriptor: (_, prop: string) => ({
        enumerable: true,
        configurable: true,
        value: SHEET_REGISTRY.getDefinition(prop)?.label || prop
    })
});

export function getAllSheetIds(): SheetId[] {
    return SHEET_REGISTRY.getAllIds();
}

export function getAllSheetDefinitions(): SheetDefinition[] {
    return SHEET_REGISTRY.getAllDefinitions();
}

export function isValidSheetId(id: string): boolean {
    return SHEET_REGISTRY.getAllIds().includes(id);
}
