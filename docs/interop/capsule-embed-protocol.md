# Capsule Embed Protocol (CEP) — v1

**Status**: design consensus 2026-11-09; normative for Plan B of dsh-stock-kanban and the matching release of @iasiv5/dsh-quota-watch. This document is the single source of truth; referenced by `dsh-stock-kanban/docs/adr/0002-quota-embed-host-side-capsule-group.md` (host side) and `dsh-quota-watch/docs/adr/0008-capsule-embed-protocol.md` (guest side).

**Parties**

- **Host**: the `dsh-stock-kanban` float shell (body-level open shadow root, `div[data-dsh-stock-kanban-float]`, containing a vertical `.skc-stack`).
- **Guest**: the `@iasiv5/dsh-quota-watch` float shell (`div[data-dsh-quota-watch-float]`, capsule + panel in one open shadow root).
- **Capsule group**: the host's stack holding both pills; one drag unit, one position memory (`dsh-stock-kanban:float-position`), one z-index tier (2147483000).

## 1. Transport

Window-level `CustomEvent`s, namespace `dsh-quota-watch:*`, `{ composed: true, bubbles: true }`, `detail` is a plain JSON object. No localStorage channel, no manifest-level dependency in either direction (no plugin→plugin `peerDependencies`, no `dsh.client.external` edge), no DOM text scraping.

## 2. Detection (host obligation)

1. Primary: `document.querySelector('[data-dsh-quota-watch-float]')` — presence means a live guest capsule. A `MutationObserver` on `document.body` watches the host element appear/disappear (plugin toggle, HMR remount).
2. Auxiliary: `window.__DSH_BOOT__` manifest rows (id = package name) as an enablement hint only.
3. Forbidden: injecting `remote.pluginInventory` for this purpose (parks the host plugin if the namespace is absent).

## 3. Handshake

| Step | Direction | Event | `detail` | Notes |
|---|---|---|---|---|
| probe | Host → window | `dsh-quota-watch:embed-probe` | `{ v: 1, host: "dsh-stock-kanban" }` | Host dispatches after DOM detection; re-probes on MutationObserver transitions |
| reply | Guest → window | `dsh-quota-watch:embed-capabilities` | `{ v: 1, capabilities: ["hide-pill", "anchored-panel", "poll-pause"], guestVersion: "<semver>" }` | Only a protocol-capable guest replies. **No reply within 500 ms = legacy/absent → coexist, never hide** |

The host merges only if `capabilities ⊇ {hide-pill, anchored-panel}` AND the user setting "merge quota display" is on (default on; the setting appears only when capabilities are present).

## 4. Lifecycle while merged

| Event | Direction | `detail` | Semantics |
|---|---|---|---|
| `dsh-quota-watch:embed-engage` | Host → window | `{ v: 1 }` | Guest hides its capsule pill **only** (float host and panel stay fully functional) and pauses its own client polling chain |
| `dsh-quota-watch:embed-heartbeat` | Host → window | `{ v: 1 }` | Host sends every 5 s while merged. Guest self-restores (unhide pill + resume polling) after 3 consecutive missed beats (15 s) — orphan protection against a host that vanished without disengage (disabled, crashed, HMR) |
| `dsh-quota-watch:embed-disengage` | Host → window | `{ v: 1 }` | Guest restores pill + polling immediately (user toggled merge off, host tears down) |
| `dsh-quota-watch:open-panel` | Host → window | `{ v: 1, anchor: { left, top, width, height } }` | Dispatched on quota-pill click; guest opens its panel anchored per its own `placePanel` semantics near the supplied viewport rect; its native toggle semantics are preserved (panel open → the same click path closes it) |

## 5. Data channel

The host polls `GET api/dsh-quota-watch/overview` (document-relative, same-origin) at **30 s** cadence — matching the guest's own `CLIENT_POLL_INTERVAL_MS` — which also feeds the guest's idle watcher (quota-watch ADR 0006: requests to its routes keep probing alive). 404/absent route → hide the quota pill segment, retry on a slow timer (60 s). No other guest data is consumed; the guest's shadow DOM text is never read.

## 6. Degradation matrix

| Guest state | Host behaviour |
|---|---|
| Absent (no float host element) | No quota pill; no events dispatched |
| Legacy (element present, no probe reply) | Coexist — both capsules visible, overlap accepted, nothing hidden |
| Capable, user merge off | Never engage (or disengage); coexist |
| Capable, merged | Group active; heartbeat running |
| Host vanishes while merged | Guest heartbeat timeout (15 s) → self-restore pill + polling |

## 7. Versioning

Every `detail` carries integer `v`. v1 = this document. Additive capability names are minor changes within v1 (unknown capabilities ignored). Breaking changes → `v: 2` with both versions answering probes during migration; negotiation takes the highest shared major.

## 8. Security & scope

Events carry no credentials and no quota data — only rects, flags, and versions. All data flows through the guest's own same-origin routes with its own access fence. The guest learns nothing about the host beyond its plugin id. Out of scope: the guest's sidebar card (independent surface) and any embedding of guest panel content inside the host panel.

## 9. Visual contract (host obligation)

The quota pill inside `.skc-stack` follows the shared capsule anatomy (26 px pill, `blur(10px) saturate(1.2)`, `color-mix … 86%`, radius 999, `::before` −9 px hit area, tabular numerals) and renders guest data with the guest's threshold semantics (warn >80 ≤95, danger >95, pulse >95 under `prefers-reduced-motion` guard).
