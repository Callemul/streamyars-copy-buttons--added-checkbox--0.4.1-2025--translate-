# Skill: StreamYard Technical Overview

---

## Purpose
Provide AI agents with a complete technical picture of the StreamYard web UI, its DOM hierarchy, key interactive elements, event flow, and integration points for Chrome‑extension features such as copy‑buttons.

---

## 1. Main UI Zones
| Zone | Description | Typical Selector |
|------|-------------|-------------------|
| **Broadcast Canvas** | Video preview of the host and guests, rendered inside an `<iframe>` from `https://streamyard.com`. | `iframe#broadcast_iframe` |
| **Chat Panel** | Real‑time chat column on the right side (or bottom on mobile). | `.chat-panel, .chat-messages` |
| **Studio Toolbar** | Top bar containing **Go Live**, **Invite**, **Share**, **Settings**, and **Leave** buttons. | `.studio-toolbar button` |
| **Participants List** | Panel showing avatars of connected guests. | `.participants-list .participant` |
| **Control Bar (bottom)** | Buttons for **Mic**, **Camera**, **Screen Share**, **Layout**, **Record**. | `.control-bar button` |
| **Link Box** | Popup that shows the stream URL and copy‑link button. | `.link-box, .copy-link-btn` |

---

## 2. Key DOM Elements & Attributes
- **Buttons** – all controls are `<button>` elements with a `data-action` attribute (e.g., `data-action="start"`).
- **Status Indicators** – `<span>` with classes like `.status-live`, `.status-offline`.
- **Video Elements** – `<video>` tags inside the broadcast iframe, each with `id="local-video"` or `class="remote-video"`.
- **Copy Buttons** – existing copy‑link UI uses `<button class="copy-btn" aria-label="Copy link">`.
- **Dynamic IDs** – StreamYard generates random IDs for participants (e.g., `id="participant-7f3a"`). Rely on stable classes or `data-` attributes instead of IDs.

---

## 3. Event Flow (User Interactions)
1. **Start / Stop Stream** – click on `.studio-toolbar button[data-action="go-live"]` toggles stream state. Fires a `click` event, then a custom `StreamYard:LiveStateChanged` on `document`.
2. **Invite Guests** – opens a modal (`.modal-invite`). The modal emits `StreamYard:InviteOpened`.
3. **Copy Stream URL** – the copy button triggers `navigator.clipboard.writeText(url)` and dispatches a `StreamYard:LinkCopied` custom event.
4. **Chat Message Sent** – form submission inside `.chat-panel form` dispatches `StreamYard:ChatMessageSent`.
5. **Participant Join/Leave** – mutation of `.participants-list` triggers a `MutationObserver` (attributes only, because list items are recycled).

---

## 4. Reliable Injection Points
| Target | Reason |
|--------|--------|
| **Toolbar** – append new button after the existing **Share** button. Use `querySelector('.studio-toolbar button[data-action="share"]')` and `insertAdjacentElement('afterend', myBtn)`. |
| **Link Box** – clone existing copy‑btn, replace action. Use `.link-box .copy-btn` as a template. |
| **Chat Panel** – add a small “Copy message” icon to each `.chat-message`. Observe the `.chat-messages` container with a `MutationObserver` (childList) – chat messages are not virtualized, so this works reliably. |

---

## 5. Debugging Checklist (run in DevTools console)
```js
// Verify main zones exist
document.querySelector('iframe#broadcast_iframe');
document.querySelector('.chat-panel');

// List all toolbar actions
document.querySelectorAll('.studio-toolbar button').forEach(b=>console.log(b.dataset.action, b.textContent));

// Check if custom events are emitted
window.addEventListener('StreamYard:LiveStateChanged', e=>console.log('Live state changed', e.detail));
```

---

## 6. Integration Tips for Copy‑Buttons Extension
1. **Permission Scope** – `host_permissions` must include `https://app.streamyard.com/*` and `https://*.streamyard.com/*`.
2. **Content Script Timing** – inject after `document_idle` to ensure the toolbar is rendered.
3. **Avoid ID Collisions** – generate your own IDs with a unique prefix, e.g., `myExt-copyBtn-<random>`.
4. **Idempotent UI Updates** – before adding a button, check `document.querySelector('#myExt-copyBtn')`.
5. **Capture‑Phase Listeners** – for scroll‑related UI (e.g., participant list), register listeners with `{ capture: true }` to run before StreamYard’s own handlers.

---

## 7. Common Pitfalls & Remedies
| Issue | Why it Happens | Fix |
|-------|----------------|-----|
| Buttons disappear after a layout change | StreamYard re‑renders toolbar on state changes, wiping custom nodes. | Re‑inject in a `MutationObserver` watching `.studio-toolbar`. |
| `navigator.clipboard` blocked | Clipboard API requires a user‑initiated event. | Call `writeText` inside a click handler of your own button. |
| Duplicate copy‑buttons after navigation | Content script runs on each navigation without cleanup. | Remove existing nodes (`if (old) old.remove()`) before inserting. |
| Random participant IDs break selectors | IDs are generated per session. | Use stable class selectors (`.participant[data-role="guest"]`). |

---

## 8. References
- StreamYard public UI inspection (open DevTools on `https://streamyard.com/` and explore). 
- Chrome Extension Manifest V3 guidelines – see `.agents/skills/chrome-extension-guidance/SKILL.md`.
- Existing project skill: `polymer-virtualization-handling` for virtual list patterns.

---

*End of Skill*
