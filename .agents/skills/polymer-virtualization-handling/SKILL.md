---
name: polymer-virtualization-handling
description: Architectural rules and DOM handling protocol for YouTube Studio Polymer <iron-list> virtualization, DOM node recycling, transient title hashing, and Popup storage synchronization. Trigger WHENEVER working on content scripts, DOM injection, YouTube Studio, iron-list, comment recycling, or scroll performance.
---

# Polymer <iron-list> Virtualization & DOM Recycling Protocol

This skill provides mandatory architectural rules and implementation patterns for DOM content scripts injecting buttons, checkboxes, badges, or states into YouTube Studio (or any Web Component / Polymer framework using `<iron-list>` virtualization).

## 1. The Core Virtualization Gotcha (DOM Recycling)

- **Polymer `<iron-list>` does NOT add or remove DOM nodes during scrolling.**
  Polymer creates a fixed pool of ~15–25 `<ytcp-comment>` DOM nodes.
  As the user scrolls down or up, Polymer keeps the SAME `<ytcp-comment>` DOM instances in memory and merely updates their internal text content (`author`, `commentText`).

- **Standard `MutationObserver` (listening to `childList` additions/deletions) WILL NOT FIRE on scroll.**
  Because `<ytcp-comment>` nodes are reused, `addedNodes` and `removedNodes` arrays remain empty during scrolling.

- **Consequences of Ignored Recycling:**
  If an extension sets `dataset.syhStudioEventsBound = 'true'` or `dataset.syhCommentKey = 'old_key'`, when Polymer recycles the element:
  1. `dataset.syhCommentKey` retains the STALE key from the previous comment.
  2. Event listeners and button active states (`syh-btn-active`) stay bound to the OLD off-screen comment.
  3. Clicking a button on a scrolled comment targets the OLD comment key!
  4. Active marks (❓, 🙏, checkboxes) disappear ("злітають") or appear on wrong comments.

## 2. Mandatory Virtualization Architecture

WHENEVER injecting elements into Polymer `<iron-list>` containers:

### A. Capture-Phase Window Scroll Listener
Always attach a global `scroll` listener with `{ capture: true, passive: true }`:
```ts
window.addEventListener('scroll', () => this.scheduleProcessComments(false), { capture: true, passive: true });
```
*(Capture phase ensures scroll events are caught from nested shadow DOM and scrollable `#iron-list` containers.)*

### B. Immediate DOM Key Comparison & Stale Attribute Cleanup
Every time visible elements are processed (`processVisibleComments`), extract current author and text from the DOM, generate `currentCommentKey = ctx.id`, and compare it against `threadEl.dataset.syhCommentKey`:

```ts
const previousCommentKey = threadEl.dataset.syhCommentKey;
const isAlreadyBound = threadEl.dataset.syhStudioEventsBound === 'true';
const commentKeyChanged = isAlreadyBound && !!previousCommentKey && previousCommentKey !== commentKey;

if (commentKeyChanged) {
    // DOM Node was recycled by Polymer for a new comment! Clear stale bindings!
    delete threadEl.dataset.syhStudioEventsBound;
    delete threadEl.dataset.syhBound;
    delete (threadEl as any)._syhBound;
}

threadEl.dataset.syhCommentKey = commentKey;
```

### C. Multi-Level Fallback for Transient Title Loading
In YouTube Studio, video titles (`#video-title`) load asynchronously or are omitted on reply comments.
1. **Primary Key**: `generateCommentKey(videoTitle, authorName, commentText)`
2. **Fallback Key (No Title)**: `generateCommentKey('', authorName, commentText)`
3. **Popup Storage Synchronization**: Fallback to checking `syh:popup:collected:*` items by matching `author` and `text`. If an item exists in Popup, its active state (❓/🙏/checked) MUST be rendered in Studio UI regardless of local key status!

### D. Polymer Style Wiping Protection
Polymer re-renders can strip custom CSS classes (such as `.syh-studio-comment-checked`). `isCheckboxOutOfSync` and `isButtonOutOfSync` MUST verify:
- Button active class presence vs expected state.
- Checkbox `checked` property AND thread container CSS class presence vs expected checked state.

## 3. DevTools Diagnostic Pattern
When diagnosing flaky DOM behavior in YouTube Studio, supply a DevTools console script that logs `author`, `text`, `commentKey`, `eventsBound`, and `toolbarPresent` during scroll events to verify DOM recycling in real time.

## 4. Known YouTube Studio Native Bugs & Event Interception

- **`Error: rp at a.maybeShowTooltip` (Creator Heart Hover Bug)**:
  - **Symptom**: When the mouse hovers (`mouseover`/`pointerover`) over `#creator-heart` / `#creator-heart-button` (YouTube channel author heart), YouTube's native script `creatorstudio.cs...js` throws `Error: rp at a.maybeShowTooltip`.
  - **Root Cause**: YouTube Studio's internal Polymer tooltip script attempts to inspect tooltip bounds on disabled/customized `#creator-heart` elements and throws an unhandled internal exception.
  - **Handling Guidance**: Do NOT attempt to alter, suppress, or strip YouTube's native error. The extension's global capture-phase contextmenu listener (`window.addEventListener('contextmenu', ..., { capture: true })` with `e.stopImmediatePropagation()`) ensures extension features (RMB checkbox toggling) work 100% reliably regardless of native YouTube console errors.

