## Why

Activity in this repository reportedly also makes an unrelated project's Stream Deck key BUSY. The OpenCode bridge currently consumes the connected server's public event stream without checking session ownership, so it can report another project's activity under its own handshake identity despite the registry's project-ID filtering.

## What Changes

- Verify session membership in the bridge's OpenCode project before mutating reported state or sending activity, idle, error, permission, question, or form updates.
- Use authoritative OpenCode project IDs, including supported session metadata lookup when events do not identify the project; never assume that receiving an event establishes local ownership.
- Ignore unresolved or foreign events without affecting OpenCode execution; permit later events to retry failed ownership resolution.
- Keep reconnect and available permission snapshots project-local, and remove retained session/request state when authoritative metadata moves a session to another project.
- Keep unrelated connected project keys READY, or in their actual independently reported state, while the active project's key and the global key show the applicable activity.
- Preserve one OpenCode instance per project as the acceptance setup. Concurrent same-project instances, redraw stability, and layout remain separate changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-status-indicator`: Strengthen project identity isolation to cover bridge-side admission of server-wide events and snapshots, unresolved ownership, request correlation, and session reassignment.

## Impact

- `opencode-plugin/index.mjs`: ownership resolution, ordered asynchronous event consumption, local maps, request correlation, snapshot admission, and disposal guards.
- `opencode-plugin/test/index.test.mjs`: realistic session metadata mocks and mixed-project event regressions. The existing mock rejects all session APIs, although the installed V2 plugin exposes session.get; the plan replaces that blanket restriction with checks against genuinely unsupported session enumeration/status APIs.
- Bridge/server/registry integration regression tests using two distinct project IDs on one shared event stream; existing registry project filtering and handshake identity remain unchanged.
- Use the installed V2 API and existing dependencies. No protocol version, frame schema, persisted key settings, status precedence, or project selector change.
- Independent of `stabilize-project-status-display` and `configure-project-status-layout`; preserve their artifacts and coordinate shared bridge-file edits during later implementation.
