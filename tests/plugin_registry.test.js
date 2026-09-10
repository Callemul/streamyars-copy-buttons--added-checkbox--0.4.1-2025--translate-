import test from 'node:test';
import assert from 'node:assert/strict';
import { PluginRegistry } from '../modules/core/plugin_registry.ts';

test('PluginRegistry registers and initializes supported plugins', async () => {
    const registry = new PluginRegistry();
    let initCalled = false;

    const dummyPlugin = {
        id: 'test_plugin',
        name: 'Test Plugin',
        enabled: true,
        isSupported: (url) => url.includes('streamyard.com'),
        init: () => {
            initCalled = true;
        }
    };

    registry.register(dummyPlugin);
    assert.equal(registry.getAll().length, 1);

    await registry.initSupportedPlugins('https://streamyard.com/studio/123');
    assert.equal(initCalled, true);
});

test('PluginRegistry skips unsupported plugins', async () => {
    const registry = new PluginRegistry();
    let initCalled = false;

    const dummyPlugin = {
        id: 'test_plugin',
        name: 'Test Plugin',
        enabled: true,
        isSupported: (url) => url.includes('youtube.com'),
        init: () => {
            initCalled = true;
        }
    };

    registry.register(dummyPlugin);
    await registry.initSupportedPlugins('https://streamyard.com/studio/123');
    assert.equal(initCalled, false);
});