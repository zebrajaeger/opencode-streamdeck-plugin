## Why

READY should have a calm, recognizable living background rather than a static image, without suggesting active work or pending input. The shared animation lifecycle planned by `add-attention-background-animation` provides the prerequisite for adding this effect without duplicating scheduling and race protection.

## What Changes

- Display a slowly evolving green plasma background on every visible global and project status key for the entire effective `READY` state.
- Keep status labels and configured project labels steady and readable; use smooth spatial waves rather than particles, hard blinking, or the orange attention pulse.
- Preserve BUSY particles, the prerequisite's ATTENTION halo, and static ERROR/OFFLINE presentations.
- Reuse the prerequisite's shared animation controller, composition boundary, write ordering, per-key cleanup, and phase-preserving refresh behavior.
- Make implementation and verification of `add-attention-background-animation` a hard prerequisite. This change does not implement or alter that predecessor.
- Replace static-READY requirements, including BUSY/ATTENTION exit behavior and project unchanged-status assertions, with continuous animation that is not restarted by reports.
- Add no settings, dependencies, bridge messages, aggregation changes, or action interactions.

## Capabilities

### New Capabilities

- None. The plasma extends the shared background capability introduced by the prerequisite.

### Modified Capabilities

- `status-background-animation`: Extend the prerequisite capability with READY plasma selection, readable continuous green plasma, and animated transitions to/from READY. This capability is not yet in main specs; apply this delta only after the prerequisite introduces it, and sync/archive the predecessor first.
- `particle-wait-animation`: BUSY exit to READY starts plasma rather than restoring a static READY image.
- `opencode-status-indicator`: Global READY presentation uses plasma while preserving the existing aggregation rules.
- `project-status-indicator`: READY project keys animate without report-driven restarts; initial display, real work completion, refreshes, and project isolation retain their guarantees.

## Impact

- Proposed predecessor modules `streamdeck-plugin/src/actions/background-animation.ts` and `status-action-renderer.ts`, plus a new `ready-plasma-animation.ts` effect. Resolve final predecessor names at the apply prerequisite gate rather than recreating its refactor.
- Existing `particle-wait-animation.ts` currently still contains the BUSY-only renderer; it is not the implementation baseline for this dependent change.
- Project image composition currently exists in the uncommitted layout work through `project-status-image.mjs` and project presentation settings. Preserve those overlays on every plasma frame and do not modify the other change's artifacts.
- Effect/renderer tests, global/project integration and stability tests, layout lifecycle tests, and `docs/opencode-status-bridge.md`.
- No OpenCode integration, shared protocol, persisted-settings migration, or action UUID changes. Planning only; implementation requires a later explicit apply request.
