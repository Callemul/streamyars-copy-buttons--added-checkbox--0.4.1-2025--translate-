/**
 * StreamYard Helper - Plugin Architecture & Module Registry
 * Забезпечує легку розширюваність, ізольовану ініціалізацію та життєвий цикл (lifecycle) модулів.
 */

export interface SyhPluginContext {
    config?: unknown;
    storage?: unknown;
    bus?: unknown;
}

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
    private initializedPlugins: Set<string> = new Set();

    public register(plugin: ISyhPlugin): void {
        if (this.plugins.has(plugin.id)) {
            console.warn(`[SYH PluginRegistry] Plugin with id "${plugin.id}" is already registered.`);
            return;
        }
        this.plugins.set(plugin.id, plugin);
    }

    public unregister(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            if (this.initializedPlugins.has(pluginId) && plugin.destroy) {
                try {
                    plugin.destroy();
                } catch (e) {
                    console.error(`[SYH PluginRegistry] Error destroying plugin "${pluginId}":`, e);
                }
            }
            this.initializedPlugins.delete(pluginId);
            this.plugins.delete(pluginId);
        }
    }

    public get(pluginId: string): ISyhPlugin | undefined {
        return this.plugins.get(pluginId);
    }

    public getAll(): ISyhPlugin[] {
        return Array.from(this.plugins.values());
    }

    public async initSupportedPlugins(
        url: string = typeof window !== 'undefined' ? window.location.href : '',
        context?: SyhPluginContext
    ): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.enabled && plugin.isSupported(url) && !this.initializedPlugins.has(plugin.id)) {
                try {
                    console.log(`[SYH PluginRegistry] Initializing plugin: ${plugin.name} (${plugin.id})`);
                    await plugin.init(context);
                    this.initializedPlugins.add(plugin.id);
                } catch (e) {
                    console.error(`[SYH PluginRegistry] Failed to initialize plugin "${plugin.id}":`, e);
                }
            }
        }
    }

    public async destroyAll(): Promise<void> {
        for (const pluginId of this.initializedPlugins) {
            const plugin = this.plugins.get(pluginId);
            if (plugin && plugin.destroy) {
                try {
                    await plugin.destroy();
                } catch (e) {
                    console.error(`[SYH PluginRegistry] Error destroying plugin "${pluginId}":`, e);
                }
            }
        }
        this.initializedPlugins.clear();
    }
}

export const SYH_PLUGINS = new PluginRegistry();