## Context

See `proposal.md` for motivation and `specs/status-background-animation/spec.md` for the behavioral contract. Source inspection found `BackgroundEffect` exposing `frameIntervalMs`, `advance()`, and `background()`, with `BackgroundAnimation` owning timers, serialized delivery, refresh, and disposal. `StatusActionRenderer` composes a 144×144 SVG with existing glyph/text overlays. The physical target is 72×72, so a 24×24 grid requires 6×6 SVG units per cell, not 3×3 SVG units.

The current source still dispatches effects by status alone. The prerequisite plans a shared packaged `ready-background.mjs` plus `.d.mts`, normalized identities, and effect-aware switching; these interfaces are proposed, not implemented observations. Existing inspector save functions merge settings, with native `change` events globally and SDPI `valuechange` events for projects. Node tests inject randomness, timers, deferred writes, and inspect decoded SVG; Qt smoke tests already exercise SVG text rendering.

GitNexus repository `opencode-streamdeck-plugin` is indexed at HEAD `3dc8abcd` with no reported commit staleness. Its graph identifies both status action classes as consumers of `StatusActionRenderer`; working-tree font/layout changes are newer than the indexed source and were inspected directly. No production symbol is edited during this planning workflow. Implementation must refresh a stale index and perform method-level impact checks before changes.

Main specs still mandate READY Plasma, while the prerequisite's deltas generalize those contracts. Its selector requirement also says exactly three choices; this change explicitly extends that set rather than preserving the closed-list restriction. At application/spec synchronization, reconcile that sentence with the additive cellular requirement and any Matrix delta so the final main spec does not simultaneously demand exactly three choices and additional choices. Do not sync or rewrite the prerequisite or main specs during this planning workflow.

## Goals / Non-Goals

**Goals:**
- Keep rule evolution deterministic and independently testable, separate from SVG composition and frame delivery.
- Bound simulation work, seed recovery, and SVG size for simultaneous visible keys.
- Extend the existing identity/normalization seam without inventing another animation scheduler or settings model.

**Non-Goals:**
- A user-programmable automaton engine, new dependencies, smoothing through SVG filters, or separate animation assets.
- Guaranteed nonrepeating trajectories; small periodic patterns are acceptable if visibly moving.
- Changing controller backpressure, glyph geometry, typography, project aggregation, or elapsed-time catch-up behavior.

## Decisions

### 1. One small cellular engine with an explicit effect adapter

Add `cellular-automaton.ts` under `src/actions/` containing typed mode/state definitions, simultaneous evolution, and local recovery. Add `cellular-background-animation.ts` implementing `BackgroundEffect` for the three modes. Use two per-instance `Uint8Array(576)` buffers and an eight-neighbor wrapping lookup; read only the previous grid and swap after the next generation is complete. Export a narrow pure stepping seam accepting explicit cell state for exhaustive rule fixtures, without exposing grid editing in production settings. The effect owns its state and delegates geometry-only rendering; it owns no timers or image writes.

Alternative: duplicate simulation loops in three effects. Rejected because wraparound, recovery, and rendering would diverge. Alternative: a generic rule parser/framework. Rejected because three fixed typed modes need neither a parser nor a public extension system.

### 2. Simulation timing and reproducible randomness

Start with fixed generation intervals of 150 ms for Brian's Brain, 250 ms for Day & Night, and 150 ms for Generations + Trails. Every scheduled `advance()` performs exactly one simultaneous generation, followed by any recovery. `background()` is a pure snapshot and does not consume randomness, advance the simulation, or modify recovery counters. A refresh therefore cannot age a trail or reseed the grid. Use the renderer's injectable random function for initialization and recovery, with each effect owning its own buffers/counters.

Initialize Brian's Brain and Generations with approximately 15% active cells and no dying/trail cells; initialize Day & Night at approximately 45% active cells. If initialization yields an off grid or saturated Day & Night, seed locally before its first visible snapshot. A deterministic constant random source must still produce a valid bounded state and bounded recovery; never retry random positions indefinitely.

Alternative: elapsed-time catch-up. Rejected because cellular generations are discrete and large catch-up bursts would undermine bounded work. Alternative: use delivered-image count. Rejected because slow or failed writes must not own simulation state.

### 3. Exact rules with a bounded low-activity escape hatch

Use the normative rules from the delta unchanged. Compare old/new states to count changed cells before any intervention. A count of at most five increments a consecutive low-activity counter; more than five resets it. For Brian's Brain and Generations + Trails, independently count active cells (state 1 or 4) after each ordinary evolution and before intervention: at most eight increments a consecutive sparse-pattern counter; more than eight resets it. Recover when either counter reaches 100 generations or immediately upon extinction/full Day & Night saturation; reset both counters afterward. This catches small moving oscillators that change more than five cells forever while retaining the original low-change trigger. Ordinary oscillators with more than eight active cells and substantial visible change are allowed.

Choose one to three random patch centers, wrapping their 3×3 coordinates. Use finite, mode-specific templates containing adjacent active cells for sparks/trails. Day & Night templates include both active and off cells so a saturated grid can develop a boundary. Apply templates after ordinary evolution, changing only those at most 27 cell positions. Allow overlaps rather than retrying for uniqueness. Retain all outside cells and the current controller. Test recovery separately from pure rule stepping so interventions cannot obscure rule correctness.

Alternative: periodic whole-grid reseeding. Rejected because it visibly resets the scene. Alternative: inject isolated single cells. Rejected because they often die without generating movement. Alternative: full cycle detection. Rejected because moving periodic structures are acceptable and history adds complexity without a user benefit.

### 4. Low-cost coarse SVG rendering beneath unchanged overlays

Keep the 144×144 viewBox, dark `#101216` base, rounded key framing, and existing overlay composition. Draw cells at multiples of six SVG units; do not change the outer SVG scale to 72. Use cyan/light-blue sparks for Brian's Brain, subdued green/teal organic Day & Night, and cyan/blue-violet trails for Generations. Active cells have bounded background opacity (initial target 0.28); dying Brian cells use about 35% of active intensity, and Generations states 3/2/1 use about 60%/30%/12%. These are fixed internal visual defaults, not settings. Keep the green READY glyph and existing configured font colors independent from palettes.

Batch cells into SVG paths per state rather than emitting 576 verbose elements or per-cell gradients. Clip the cell field to the existing rounded background if needed. Target an unencoded background fragment below 40 KB in the dense worst case, finite coordinates within the 144×144 bounds, no filters/animation tags/external resources, and no growing history across generations. Verify the composed frames using Qt and a browser scaled to 72×72; review actual motion, not only enlarged static SVGs.

Alternative: simulate 72×72 one-pixel cells. Rejected for visual noise and unnecessary work. Alternative: blurred filters or WebGL/canvas. Rejected for compatibility and deployment complexity.

### 5. Additive selection and lifecycle integration

Append stable identities `brians-brain`, `day-night`, and `generations-trails` to the prerequisite's shared choice list and declarations, retaining all existing entries and Plasma fallback. Both inspectors consume that list; adjust markup only if the prerequisite does not generate options centrally. Do not add separate inspector fields or change save/restore event conventions. Route these identities to the cellular adapter only for READY, passing injected randomness.

Use the prerequisite's status-plus-effect identity, presentation-version guards, controller identity checks, and per-action-ID write queue unchanged. Same-selection refresh retains the effect instance and grid; selecting a different effect creates fresh simulation state only for that key. Appearance/reappearance creates an independent simulation. Non-READY settings updates only save the next READY choice. Do not share grids or periodically reset all keys together.

Alternative: shoehorn automata into BUSY particles or ATTENTION halo. Rejected because this would change non-READY behavior and obscure effect identity. Alternative: add a second settings/lifecycle manager. Rejected because the prerequisite already supplies the correct seam.

### 6. Verification at existing seams

Add `cellular-automaton.test.mjs` for exhaustive birth/survival/decay and wrapped-edge fixtures, simultaneous update, all-zero/all-active boards, exact low-activity and sparse-pattern thresholds (including a moving small oscillator with more than five changed cells), independent counter resets, outside-patch preservation, and bounded constant-random recovery. Add `cellular-background-animation.test.mjs` for deterministic initialization, read-only snapshots, palettes/trail intensity, fixed intervals, finite/bounded SVG, and long-running bounded storage.

Extend the prerequisite's normalization/choice tests and both inspector tests for all three values, restoration without write feedback, and preservation of Matrix if present and font/layout/project settings. Extend `status-action-renderer.test.mjs` with mixed global/project cellular keys, repeated READY, same-selection updates, typography/layout refresh, non-READY selection changes, rapid switches against deferred/rejected writes, disappearance, and reused action IDs. Run the entire Stream Deck suite and Rollup build. Record native-size visual evidence for all modes and settings combinations, using real inspector events in the browser and Qt-compatible rasterization for key frames.

## Risks / Trade-offs

- [The prerequisite is not implemented] → Application is gated on its verified infrastructure; do not silently implement it as part of this change.
- [Selector specs overlap the prerequisite and Matrix] → Reconcile the closed-list wording explicitly and merge supported choices additively during later sync.
- [Sparse moving patterns dominate the key] → Detect at most eight active cells for 100 generations in the spark/trail modes independently of changed-cell count, then seed locally. Larger moving oscillators remain allowed.
- [Bright cells compete with labels on 72×72] → Low opacity, stable overlays, native-size motion review, and fixed-palette tuning within the specified appearance.
- [Shared renderer changes affect both actions] → Preserve its delivery guards and run mixed-key race tests and the full suite.
- [Working-tree font/layout work overlaps integration] → Make narrow additive changes and preserve existing settings and tests.

## Migration Plan

First finish and verify `configure-ready-background-renderer` through a separately authorized apply workflow. Then implement this change additively against the actual resulting interfaces, keeping Matrix if already applied. Build/reload only the Stream Deck plugin; no OpenCode bridge deployment or stored-settings migration is required. Existing keys still default to Plasma. Rolling back this addition makes its three values unsupported and therefore Plasma through the prerequisite's fallback, without losing unrelated stored fields. Planning creates only this change's artifacts and does not build, deploy, sync, archive, or commit production changes.
