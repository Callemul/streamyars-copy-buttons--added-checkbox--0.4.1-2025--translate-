// Shared Chrome extension API mock for tests.
//
// happy-dom provides window/document/localStorage/MutationObserver etc., but it
// knows nothing about the Chrome extension runtime. Tests import `installChromeMock`
// to seed a fresh, fully mutable `global.chrome`, then override only the methods
// their suite needs. Keeping a single source for the base shape avoids 18+ copies
// of hand-rolled chrome stubs across the suite.

import { mock } from 'node:test';

/**
 * @typedef {object} ChromeMockOptions
 * @property {boolean} [withStorage]      add chrome.storage.local (get/set/remove) + onChanged
 * @property {boolean} [withTabs]         add chrome.tabs.query
 * @property {boolean} [withRuntime]      add chrome.runtime.id + lastError + onMessage
 * @property {boolean} [withI18n]         add chrome.i18n.getMessage
 * @property {Partial<Record<string, any>>} [storageData]  seed data returned by chrome.storage.local.get
 * @property {{ get?: Function, set?: Function, remove?: Function }} [storageImpl]
 *           override chrome.storage.local methods with a custom in-memory backend
 *           (most test suites back storage with their own mockStorageStore).
 * @property {any} [runtimeImpl]  custom chrome.runtime object, or null/undefined to omit it.
 */

function noopCallback(cb) {
    if (typeof cb === 'function') cb();
}

/**
 * Build a fresh chrome mock. Each call returns independent objects so suites that
 * mutate chrome.storage.local or chrome.runtime.lastError never leak into others.
 *
 * @param {ChromeMockOptions} [options]
 */
export function createChromeMock(options = {}) {
    const {
        withStorage = true,
        withTabs = true,
        withRuntime = true,
        withI18n = true,
        storageData = {},
        storageImpl = null,
        runtimeImpl = undefined
    } = options;

    /** @type {any} */
    const chrome = {};

    if (withRuntime) {
        chrome.runtime = runtimeImpl !== undefined
            ? runtimeImpl
            : {
                  id: 'test-extension-id',
                  lastError: null,
                  onMessage: { addListener() {}, removeListener() {}, sendMessage() {} },
                  onInstalled: { addListener() {} },
                  getURL: (path) => `chrome-extension://test-extension-id/${path}`
              };
    }

    if (withStorage) {
        const store = { ...storageData };
        const local = storageImpl
            ? {
                  get: mock.fn(storageImpl.get || ((keys, cb) => cb && cb({}))),
                  set: mock.fn(storageImpl.set || ((items, cb) => cb && cb())),
                  remove: mock.fn(storageImpl.remove || ((keys, cb) => cb && cb()))
              }
            : {
                  get(keys, cb) {
                      if (typeof keys === 'function') {
                          keys(store);
                          return;
                      }
                      const list = Array.isArray(keys) ? keys : (keys == null ? Object.keys(store) : [keys]);
                      const out = {};
                      for (const k of list) {
                          if (k in store) out[k] = store[k];
                      }
                      if (cb) cb(out);
                  },
                  set(items, cb) {
                      Object.assign(store, items);
                      noopCallback(cb);
                  },
                  remove(keys, cb) {
                      const list = Array.isArray(keys) ? keys : [keys];
                      for (const k of list) delete store[k];
                      noopCallback(cb);
                  }
              };
        chrome.storage = {
            local,
            onChanged: { addListener() {}, removeListener() {} }
        };
    }

    if (withTabs) {
        chrome.tabs = {
            query(queryInfo, callback) {
                callback([]);
            },
            sendMessage() {}
        };
    }

    if (withI18n) {
        chrome.i18n = {
            getMessage: (messageName) => messageName
        };
    }

    return chrome;
}

/**
 * Seed global.chrome with a fresh mock. Returns the mock so a suite can override
 * specific methods (e.g. `const chrome = installChromeMock(); chrome.tabs.query = ...`).
 *
 * @param {ChromeMockOptions} [options]
 */
export function installChromeMock(options = {}) {
    const chrome = createChromeMock(options);
    globalThis.chrome = chrome;
    return chrome;
}
