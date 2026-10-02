## Context

See `proposal.md` for motivation. Read-only inspection found three `BackgroundEffect` implementations: `ReadyPlasmaAnimation`, `AttentionHaloAnimation`, and `ParticleWaitAnimation`. `StatusActionRenderer` currently chooses them solely from effective status and stores only status plus controller in `ActiveAnimation`. Same-status settings refreshes preserve the existing controller, so they cannot currently change READY's renderer.

The renderer already protects delivery with per-key presentation versions, controller identity checks, and an action-ID write queue. `BackgroundAnimation` owns cancellation and serialized frame delivery. These mechanisms must also protect renderer-only switches. The two actions configure presentation on appearance and settings reception and dispose by action ID on disappearance.

The current working tree includes the global font inspector and `configureGlobal` integration from the active `configure-combined-status-font` change. These are observed working-tree additions, not yet the committed baseline. Build on their current interfaces without overwriting user work. GitNexus is indexed at current HEAD; source inspection supplements its older working-tree view. The class-level upstream impact reports LOW risk, four direct class/import references in the global and project actions, indirect plugin registration, and no indexed affected processes. This is planning evidence, not a substitute for method-level impact checks before implementation.

Existing main specs explicitly mandate READY plasma in four capabilities. The deltas deliberately generalize those references while retaining the plasma-specific visual contract when Plasma is selected. The global display requirement also overlaps `configure-combined-status-font`; merge its font contract with this READY-selection contract rather than overwriting either when syncing later.

## Goals / Non-Goals

**Goals:**
- Separate effect identity from effective status, with identical normalization in both inspectors and runtime.
- Reuse geometry, palettes, timing, scheduling, and delivery infrastructure.
- Keep renderer changes isolated to one key and preserve phase for same-effect presentation updates.

**Non-Goals:**
- New effects, static/disabled options, palette customization, animation-speed settings, or selecting backgrounds for non-READY states.
- Changing status aggregation, subscriptions, bridge messages, project matching, click behavior, or fonts/layout.
- A generic plugin system or automatic renderer discovery; the three current effects form a small explicit list.

## Decisions

### 1. Shared normalized action setting

Introduce `readyBackground` with stable values `plasma`, `attention`, and `particle`, defaulting to `plasma`. Add a small shared `ready-background.mjs` module (plus `.d.mts` types) in the packaged property-inspector directory for the choice list and normalization, importable by both inspectors and TypeScript runtime. Keep this separate from `ProjectPresentation` text normalization; store normalized selections in a per-action-ID renderer map populated by `configureGlobal` and `configureProject`. Extend both action settings types with the optional field and clear the map on dispose. Unsupported inputs resolve safely without rewriting all legacy settings.

Alternative: put the field into project text presentation or duplicate validation in three consumers. Rejected because a background choice is not typography and duplicated defaults can diverge.

### 2. Explicit effect identity in the renderer

Resolve effective effect identity from `(status, readyBackground)`: BUSY is always `particle`, ATTENTION always `attention`, READY uses the normalized selection, and ERROR/OFFLINE have no effect. Construct the existing effects without changing their colors or frame intervals. Store identity alongside status and controller in `ActiveAnimation`.

A controller is reusable only if both effective status and effect identity match. Same-status/effect reports and font/layout/project refreshes retain phase. A renderer change while READY invalidates prior work, disposes the old controller, and starts a fresh selected effect after already-issued writes settle. Status changes replace the presentation even when effect identity is the same (for example BUSY particles to READY particles); phase continuity across different statuses is not promised. Non-READY selection changes keep the current effect and phase.

Ensure unchanged-status suppression does not hide a changed effective effect identity: derive the selection before short-circuiting, and compare desired and active effect identities. Keep version, current-controller, and action-ID queue guards throughout switching. Rapid async replacements must recheck current presentation before starting an effect; a superseded call cannot create a stray controller.

Alternative: force every settings refresh to restart animation. Rejected because fonts, project selection, and repeated normalized selections must retain phase. Alternative: change only factory dispatch while retaining status-only reuse. Rejected because a live READY switch would never replace the controller.

### 3. Keep status overlays independent from background style

Continue passing the effective status, not the chosen renderer name, to title and text composition. Reuse the background's original geometry/palette but keep the existing glyph selected by effective status (green READY glyph, orange ATTENTION glyph). A READY halo is orange behind the READY label/green glyph; READY particles remain blue/light-blue behind that same READY presentation. Existing font settings and project positions continue to apply to every frame. This avoids changing an actual READY state to ATTENTION/BUSY merely to access its renderer.

Alternative: make glyph and text inherit the renderer's status. Rejected because the user requested background selection, not false status labels. Configured font colors remain user-controlled; do not override them to match the background.

### 4. Two small inspector integrations

Add a labeled `READY background` dropdown in each Display section and explanatory text that only READY changes and original colors are retained. Use the shared choices/defaults; retain each inspector's current event conventions (project SDPI `valuechange`, global native select `change`). Render from initial settings and every `didReceiveSettings`; programmatic restoration must not send settings writes. Merge only `readyBackground` through existing save functions so all font, project, position, and section fields survive. Existing font changes and section toggles must likewise preserve the saved selection.

Alternative: one global preference. Rejected by the user's explicit per-key choice. No mandatory runtime preview or new dialog is needed.

### 5. Verification at the existing seams

Extend `status-action-renderer.test.mjs` using its injected clock/random/timers, decoded SVG checks, fake keys, and deferred image writes. Cover all three READY identities, original colors and timing, labels, unchanged reports, presentation refresh, mixed keys, non-READY settings changes, live switches, rapid switches, rejection recovery, disappearance, and reused IDs. Add settings-normalization tests and expand `status-inspector.test.mjs`, `project-status-inspector.test.mjs`/`project-layout-inspector.test.mjs` for save/restore and preservation. Verify appearance/settings forwarding in both action handlers using the existing action-test approach. Browser checks cover real dropdown events, restoration without feedback writes, and font/layout coexistence; fake-key tests cover Stream Deck frame behavior, which an ordinary browser cannot prove.

## Risks / Trade-offs

- [READY can now look like attention or work] → Explicit selector help, original colors as requested, and unchanged readable READY text; color alone is no longer a status guarantee for customized keys.
- [Same status previously implied same controller] → Track both status and normalized identity; test rapid settings changes against slow and rejected writes.
- [Stale callbacks could leak controllers] → Recheck presentation version before starting; retain controller identity guards, cancellation, and disposal tests.
- [Shared renderer affects both actions] → Run mixed global/project tests and the entire Stream Deck suite, not only new selection tests.
- [Concurrent font change overlaps source and global spec] → Preserve the working tree, retain font contracts when applying/syncing, and avoid broad rewrites.

## Migration Plan

No stored-settings migration or bridge deployment is needed. Existing keys implicitly resolve to Plasma. Implement and verify against the current working tree, then build the Stream Deck bundle and inspect both action types. Rollback restores unconditional READY plasma; persisted `readyBackground` values remain harmless unused fields. Do not modify or redeploy `opencode-plugin` for this change.
