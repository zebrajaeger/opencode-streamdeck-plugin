## Why

READY currently always uses green plasma, although the plugin already has three reusable animated backgrounds. Users should be able to choose the READY appearance independently for each global or project status key without changing its actual status.

## What Changes

- Add a per-key READY background selector to the Display section of both property inspectors, offering Plasma, Attention halo, and Particles.
- Preserve each renderer's existing palette and timing: green plasma, orange halo, and blue/light-blue particles. The displayed status remains READY.
- Default missing or invalid selections to Plasma, preserving existing installations.
- Apply a changed selection immediately when the key is READY; otherwise remember it for the next READY transition.
- Keep duplicate status reports and unrelated presentation updates from restarting the selected effect. Switch effects safely through the existing serialized image-write lifecycle.
- Generalize existing specs that mandate green plasma for every READY key to the configured READY background.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `status-background-animation`: Per-key READY renderer selection, defaulting, original palettes, and safe selection changes.
- `opencode-status-indicator`: Global READY keys use their independently configured background rather than mandatory plasma.
- `project-status-indicator`: Project READY keys use their configured background while retaining independent scope, labels, and stable refresh behavior.
- `particle-wait-animation`: Leaving BUSY selects the configured next-state background; READY particles are not incorrectly stopped or forced to plasma.

## Impact

- Stream Deck action settings and settings handlers in `streamdeck-plugin/src/actions/opencode-status.ts` and `opencode-project-status.ts`.
- Renderer selection and lifecycle in `streamdeck-plugin/src/actions/status-action-renderer.ts`; reuse the existing `BackgroundEffect` implementations and `BackgroundAnimation` delivery controller.
- Both HTML property inspectors and their settings modules under `streamdeck-plugin/de.lars-brandt.opencode.sdPlugin/property-inspector/`.
- Renderer, inspector, and action-wiring tests. No OpenCode bridge/protocol, aggregation, runtime dependency, or new effect changes.
- Existing uncommitted work and the active `configure-combined-status-font` change must be preserved; the new selector must merge settings rather than replace font or layout fields.
