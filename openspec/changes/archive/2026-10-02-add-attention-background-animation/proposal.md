## Why

ATTENTION currently uses a static image that is easier to overlook than the animated BUSY state. A distinct attention background should make pending user input noticeable, while a shared animation abstraction avoids duplicating scheduling, cleanup, and race protection for each effect.

## What Changes

- Show a smoothly pulsing orange halo for every visible global and project status key while its effective status is ATTENTION, until that status ends.
- Keep status text readable throughout the pulse; do not introduce hard blinking, sound, or additional interaction.
- Preserve the existing BUSY particle-network appearance and timing, and static READY, ERROR, and OFFLINE images.
- Separate background effects from the shared per-key animation lifecycle and status renderer, allowing particles and the attention halo to share scheduling, write ordering, and disposal.
- Switch directly between BUSY and ATTENTION effects without stale frames; unchanged reports and explicit refreshes retain the current effect's phase.
- Update the existing particle specification that currently requires a static image after BUSY escalates to ATTENTION.
- Add no user settings, runtime dependencies, protocol changes, or status aggregation changes.

## Capabilities

### New Capabilities

- `status-background-animation`: Status-selected animated backgrounds, the continuous attention halo, independent per-key lifecycle, and safe effect transitions for both global and project keys.

### Modified Capabilities

- `particle-wait-animation`: Stop the BUSY effect on exit while allowing the attention animation rather than requiring a static ATTENTION image.
- `opencode-status-indicator`: Display the attention halo for unanswered permission requests and agent questions without changing their lifecycle.
- `project-status-indicator`: Apply the attention halo to the configured project's status and extend stable presentation guarantees to ATTENTION.

## Impact

- `streamdeck-plugin/src/actions/particle-wait-animation.ts`: Currently contains both particle rendering and `StatusActionRenderer`; separate effect generation from shared animation control and status presentation.
- `streamdeck-plugin/src/actions/opencode-status.ts` and `opencode-project-status.ts`: Consume the neutral renderer entry point without changing action settings or subscriptions.
- Renderer/animation tests, global/project integration tests, and `docs/opencode-status-bridge.md`.
- Existing tests assume ATTENTION is static; update those assertions while preserving asynchronous-write, reappearance, failure recovery, and BUSY regressions.
- The separate `configure-project-status-layout` change also touches image composition, with concurrent implementation changes appearing during this planning session. Preserve its name/status overlays through the shared composition seam; do not implement or modify that change here.
- No changes to the OpenCode integration, bridge transport, status precedence, or Stream Deck action UUIDs.
