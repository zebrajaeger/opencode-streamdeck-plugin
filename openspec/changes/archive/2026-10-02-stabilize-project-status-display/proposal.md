## Why

The configured project key reportedly alternates between READY and active during work and twitches roughly twice per second while idle. Local logs show alternating bridge connections at 500 ms intervals; current notification and rendering paths also redraw unchanged status, so the display needs a stable single-instance lifecycle rather than visual masking.

## What Changes

- Target one OpenCode instance per project; support for concurrent instances of the same project is explicitly deferred to a separate change.
- Preserve the existing newer-source replacement rule for accidental duplicate bridge loads, but prevent an explicitly superseded bridge from automatically reconnecting and reclaiming ownership.
- Retain automatic recovery from genuine transport outages and cleanup on plugin unload.
- Notify each status subscriber only when its effective status changes, while still delivering an initial status and rendering newly visible keys.
- Avoid repeated identical title/static-image writes and BUSY animation restarts; preserve real status transitions and the ongoing BUSY animation.
- Verify stable READY during inactivity and continuous BUSY while the single source reports ongoing work, without adding debounce delays that hide real events.
- Keep project selection, status precedence, bridge payloads, and the independent layout change unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opencode-bridge-instance-deduplication`: Explicit source supersession stops automatic reconnection of the retired bridge lifecycle without disabling outage recovery.
- `project-status-indicator`: Stable single-instance project status presentation with no redundant static redraws or animation resets on unchanged state.

## Impact

- `opencode-plugin/index.mjs`: close-event classification, socket lifecycle guards, reconnect cancellation, and bounded lifecycle diagnostics.
- `streamdeck-plugin/src/status-bridge-server.mjs`: unambiguous supersession close signal, retaining ownership checks and replacement semantics.
- `shared/status-registry.mjs`: subscriber-local change detection for project and global scopes.
- `streamdeck-plugin/src/actions/particle-wait-animation.ts`: per-key render idempotence and lifecycle invalidation; shared global rendering must continue to work.
- Bridge, registry, renderer, and integration tests. No new runtime dependency or bridge frame/protocol-version change is planned.
- Existing specs contain multi-connection aggregation scenarios. This change does not expand, remove, or redesign that behavior; those scenarios are outside the single-instance acceptance setup, pending a separate change.
