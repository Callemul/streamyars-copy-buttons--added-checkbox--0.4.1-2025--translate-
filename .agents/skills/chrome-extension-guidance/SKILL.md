---
name: chrome-extension-guidance
description: Core architectural rules, Manifest V3 compliance, and implementation instructions for building Chrome Extensions. Use this skill WHENEVER modifying extension code, editing manifest.json, handling service workers, injecting content scripts, creating DevTools panels, or configuring build pipelines. Trigger on keywords extension, background, content script, manifest, chrome API, DevTools, Vite, CRXJS.
---

# Chrome Extension Development Protocol

This skill dictates the mandatory architecture, APIs, and toolchain configurations for Chrome Extension projects. The agent MUST adhere to these guidelines to ensure Manifest V3 compliance, maintain secure execution contexts, and avoid extension rejection.

## 1. Toolchain & Build System (Vite + TypeScript)

- **Frameworks:** React, TypeScript, Vanilla CSS, Vite.
- **Plugin Ecosystem:** Rely on `@crxjs/vite-plugin` for Hot Module Replacement (HMR) and automatic manifest parsing.
- **Code Splitting & Bundling:** CRXJS handles chunking for background scripts and content scripts automatically. Do not attempt manual Rollup chunking that contradicts the CRXJS pipeline.
- **TypeScript Constraints:** Strict type-checking is enforced. Use `chrome-types` for full Chrome API typings. Avoid arbitrary `any` types when interacting with `chrome.*` APIs.

## 2. Manifest V3 Architecture & Compliance

- **Service Workers:** Manifest V3 replaces persistent background pages with ephemeral Background Service Workers.
  - Service workers will be terminated by the browser when idle.
  - DO NOT rely on global variables for persistent state in background scripts. Use `chrome.storage.local` or `chrome.storage.session` to persist and rehydrate state.
  - DOM APIs (`window`, `document`) are physically unavailable in service workers.
- **Permissions Engineering:** Request access to the narrowest permissions necessary.
  - Use `activeTab` permission whenever possible instead of broad host permissions.
  - Use `optional_permissions` for non-core features, requesting them via `chrome.permissions.request()` upon a direct user gesture.
- **Network Interception:** The blocking `webRequest` API is forbidden for network modification. Use `chrome.declarativeNetRequest` API for request blocking, redirection, and header manipulation.

## 3. Execution Contexts & Security Boundaries

- **Content Scripts:**
  - Content scripts run in an `ISOLATED` world by default. They share the DOM of the host page but have an isolated JavaScript environment.
  - Do NOT use `MAIN` world execution environment unless it is necessary to intercept native page functions.
  - Programmatic injection via `chrome.scripting.executeScript` combined with `activeTab` permission is the preferred pattern.
- **Offscreen Documents:** For tasks requiring DOM access in background context (e.g., canvas rendering, clipboard reading), use `chrome.offscreen` API.
- **Content Security Policy (CSP):** Avoid inline scripts. Ensure all resources comply with strict MV3 CSP rules. The use of `eval()` is strictly prohibited.

## 4. Messaging Architecture

- Implement a robust message hub using `chrome.runtime.sendMessage` and `chrome.runtime.onMessage.addListener`.
- Ensure all message payloads are strongly typed via TypeScript interfaces.
- Always return `true` from an `onMessage` listener if the response will be sent asynchronously.

## End State Validation

Before concluding any task in this workspace, the agent must verify:
1. TypeScript compilation passes without errors.
2. Build commands complete cleanly.
3. No deprecated Manifest V2 APIs are utilized.
