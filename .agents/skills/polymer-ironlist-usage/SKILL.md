# Skill: Polymer <iron-list> Handling in YouTube Studio

---

## Overview
This skill provides a concise guide for working with YouTube Studio’s Polymer `<iron-list>` virtualization. It is intended for AI assistants that need to inject, modify, or observe DOM elements inside the virtualized list.

---

## Key Characteristics of `<iron-list>`
- **Node Recycling**: `<iron-list>` reuses a small pool of DOM nodes (≈20) while scrolling. New data items are rendered into existing nodes; no new nodes are added or removed.
- **No `childList` Mutations**: Because nodes are recycled, a `MutationObserver` on `childList` will **not** fire when the list “grows”.
- **Scroll‑Driven Rendering**: Rendering happens during the `scroll` event in the capture phase.
- **Item Height Stability**: All items must have a consistent height for the virtualizer to calculate scroll offsets correctly.

---

## Reliable Interaction Patterns
### 1. Capture‑Phase Scroll Listener
```js
window.addEventListener('scroll', (e) => {
  // Your logic that depends on visible items
}, { capture: true });
```
- Use `capture: true` to run before the list’s own listener, ensuring you see the newest rendered nodes.
- Debounce if heavy work is needed.

### 2. Accessing Rendered Items
```js
function getVisibleItems() {
  const list = document.querySelector('iron-list');
  if (!list) return [];
  // The list stores rendered nodes in its shadow DOM under a <slot>.
  const slot = list.shadowRoot.querySelector('slot');
  return Array.from(slot.assignedElements());
}
```
- Works regardless of recycling because the slot always contains the current pool of nodes.

### 3. Observing Item Content Changes
Because nodes are reused, attach observers **once per node** and reuse them:
```js
function attachObserver(node) {
  if (node.__hasObserver) return;
  const mo = new MutationObserver((mutList) => {
    // handle attribute/text changes, e.g., alt="👍" for emojis
  });
  mo.observe(node, { attributes: true, characterData: true, subtree: true });
  node.__hasObserver = true;
}

getVisibleItems().forEach(attachObserver);
```
- Guard with a flag to avoid duplicate observers after node recycling.

---

## Common Pitfalls & How to Avoid Them
| Pitfall | Why It Happens | Remedy |
|---|---|---|
| `MutationObserver` on `childList` never fires | Nodes are never added/removed, only recycled | Observe `attributes`/`characterData` on each node, or listen to `scroll` |
| Attempting to query newly‑scrolled items with `querySelectorAll('.item')` immediately after scroll | The list may not have rendered the next batch yet | Use a `requestAnimationFrame` or a short `setTimeout` (≈0) after the scroll event |
| Emojis appear as empty `textContent` | YouTube Studio uses `<img alt="…">` for emojis | Read the `alt` attribute of `<img>` elements inside the item |
| Native error `Error: rp at a.maybeShowTooltip` blocks your listener | The error is thrown by YouTube’s own script when hovering over the author heart | Register your listener in **capture phase** and call `e.stopImmediatePropagation()` to isolate your code |

---

## Recommended Boilerplate for Extension Content Scripts
```js
// 1️⃣ Register capture‑phase scroll listener
window.addEventListener('scroll', onScroll, { capture: true });

function onScroll() {
  // 2️⃣ Debounce heavy work
  if (window.__scrollTimeout) clearTimeout(window.__scrollTimeout);
  window.__scrollTimeout = setTimeout(() => {
    const items = getVisibleItems();
    items.forEach(processItem);
  }, 100);
}

function processItem(item) {
  // Example: add a copy button to each comment
  if (!item.querySelector('.my-copy-btn')) {
    const btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.className = 'my-copy-btn';
    btn.addEventListener('click', () => {
      const text = item.innerText || '';
      navigator.clipboard.writeText(text);
    });
    item.appendChild(btn);
  }
  // Attach observer for dynamic content (e.g., emoji image alt)
  attachObserver(item);
}
```
- This pattern works regardless of how many times the list recycles its nodes.

---

## Debugging Checklist (run in DevTools console)
1. Verify `<iron-list>` exists: `document.querySelector('iron-list')`.
2. Check node pool size: `document.querySelector('iron-list').shadowRoot.querySelectorAll('slot > *').length`.
3. Confirm your scroll listener fires: `window.addEventListener('scroll',()=>console.log('scroll'),{capture:true})`.
4. Ensure observer attached: inspect a node for `__hasObserver` flag.
5. Test emoji extraction: `node.querySelector('img')?.alt`.

---

## When to Use This Skill
- When an AI needs to **inject UI elements** (buttons, checkboxes) into YouTube Studio comment lists.
- When handling **dynamic content** (emoji images, live updates) inside recycled list items.
- When designing **robust content‑script listeners** that survive virtual scrolling.
- When providing **diagnostic scripts** for developers to paste into DevTools.

---

## References
- Google Polymer `<iron-list>` docs (legacy): https://www.polymer-project.org/2.0/docs/elements/iron-list
- Chrome Extension Manifest V3 guidelines (internal): see `.agents/skills/chrome-extension-guidance/SKILL.md`
- Existing project skill: `polymer-virtualization-handling` (for additional edge‑case handling).

---
