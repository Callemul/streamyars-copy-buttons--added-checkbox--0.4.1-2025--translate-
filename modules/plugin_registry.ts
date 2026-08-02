/**
 * StreamYard Helper - Plugin Architecture & Module Registry
 * Забезпечує легку розширюваність, ізольовану ініціалізацію та життєвий цикл (lifecycle) модулів.
 */

export interface SyhPluginContext {
    config?: unknown;
    storage?: unknown;
    bus?: unknown;
}

export type PluginStatus = 'uninitialized' | 'active' | 'failed' | 'disabled';

export interface ISyhPlugin {
    id: string;
    name: string;
    version?: string;
    description?: string;
    enabled: boolean;
    isSupported(url?: string): boolean;
    init(context?: SyhPluginContext): Promise<void> | void;
    destroy?(): Promise<void> | void;
    enable?(): Promise<void> | void;
    disable?(): Promise<void> | void;
}

export class PluginRegistry {
    private plugins: Map<string, ISyhPlugin> = new Map();
    private pluginStatuses: Map<string, PluginStatus> = new Map();

    public register(plugin: ISyhPlugin): void {
        if (this.plugins.has(plugin.id)) {
            console.warn(`[SYH PluginRegistry] Plugin with id "${plugin.id}" is already registered.`);
            return;
        }
        this.plugins.set(plugin.id, plugin);
        this.pluginStatuses.set(plugin.id, plugin.enabled ? 'uninitialized' : 'disabled');
    }

    public unregister(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            if (this.pluginStatuses.get(pluginId) === 'active' && plugin.destroy) {
                try {
                    plugin.destroy();
                } catch (e) {
                    console.error(`[SYH PluginRegistry] Error destroying plugin "${pluginId}":`, e);
                }
            }
            this.pluginStatuses.delete(pluginId);
            this.plugins.delete(pluginId);
        }
    }

    public get(pluginId: string): ISyhPlugin | undefined {
        return this.plugins.get(pluginId);
    }

    public getStatus(pluginId: string): PluginStatus {
        return this.pluginStatuses.get(pluginId) || 'uninitialized';
    }

    public getAll(): ISyhPlugin[] {
        return Array.from(this.plugins.values());
    }

    public async enablePlugin(pluginId: string, context?: SyhPluginContext): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return;

        plugin.enabled = true;
        if (plugin.enable) {
            await plugin.enable();
        }
        
        const url = typeof window !== 'undefined' ? window.location.href : '';
        if (plugin.isSupported(url) && this.pluginStatuses.get(pluginId) !== 'active') {
            try {
                await plugin.init(context);
                this.pluginStatuses.set(pluginId, 'active');
            } catch (e) {
                this.pluginStatuses.set(pluginId, 'failed');
                console.error(`[SYH PluginRegistry] Error enabling plugin "${pluginId}":`, e);
            }
        }
    }

    public async disablePlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return;

        plugin.enabled = false;
        if (this.pluginStatuses.get(pluginId) === 'active') {
            if (plugin.destroy) {
                try {
                    await plugin.destroy();
                } catch (e) {
                    console.error(`[SYH PluginRegistry] Error destroying plugin "${pluginId}":`, e);
                }
            }
            if (plugin.disable) {
                await plugin.disable();
            }
        }
        this.pluginStatuses.set(pluginId, 'disabled');
    }

    public async initSupportedPlugins(
        url: string = typeof window !== 'undefined' ? window.location.href : '',
        context?: SyhPluginContext
    ): Promise<void> {
        for (const plugin of this.plugins.values()) {
            const currentStatus = this.pluginStatuses.get(plugin.id);
            if (plugin.enabled && plugin.isSupported(url) && currentStatus !== 'active') {
                try {
                    console.log(`[SYH PluginRegistry] Initializing plugin: ${plugin.name} (${plugin.id})`);
                    await plugin.init(context);
                    this.pluginStatuses.set(plugin.id, 'active');
                } catch (e) {
                    this.pluginStatuses.set(plugin.id, 'failed');
                    console.error(`[SYH PluginRegistry] Failed to initialize plugin "${plugin.id}":`, e);
                }
            }
        }
    }

    public async destroyAll(): Promise<void> {
        for (const [pluginId, status] of this.pluginStatuses.entries()) {
            if (status === 'active') {
                const plugin = this.plugins.get(pluginId);
                if (plugin && plugin.destroy) {
                    try {
                        await plugin.destroy();
                    } catch (e) {
                        console.error(`[SYH PluginRegistry] Error destroying plugin "${pluginId}":`, e);
                    }
                }
            }
        }
        this.pluginStatuses.clear();
    }
}

export const SYH_PLUGINS = new PluginRegistry();
