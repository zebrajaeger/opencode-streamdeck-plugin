## Why

A chat that fails because its input exceeds the model's context window, including a failed compaction, can leave Stream Deck displaying BUSY indefinitely. The bridge currently retains the failed session's busy contribution, and it does not handle the supported `session.compaction.failed` event.

## What Changes

- End the affected session's retained BUSY contribution on an admitted execution-failure or compaction-failure event without requiring a subsequent idle event.
- Keep the existing transient ERROR indication: at most 15 seconds, superseded by newer live-state events, followed by the highest applicable live state rather than stale BUSY.
- Apply the same recovery to global and project-scoped status, and preserve other sessions' activity, outstanding requests, project isolation, and reconnect behavior.
- Preserve active retries as BUSY; a later real activity event can make the failed session busy again.
- Exclude signal-less hangs, inactivity timeouts, model/context-window fixes, automatic compaction, and commands that control OpenCode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opencode-status-indicator`: Report execution and compaction failures without retaining the affected session's obsolete BUSY state, including after error expiry and reconnect.
- `project-status-indicator`: Require equivalent failure recovery within the verified project scope without changing other sessions or projects.

## Impact

- `opencode-plugin/index.mjs`: failure-event admission, event normalization, and retained session state.
- `shared/status-registry.mjs`: atomic live-state correction when applying the existing `session.error` frame.
- Regression coverage in `opencode-plugin/test/index.test.mjs`, `streamdeck-plugin/test/status-registry.test.mjs`, and bridge-to-registry integration tests; bridge documentation in `docs/opencode-status-bridge.md`.
- Keep protocol version 1 and existing payloads; no new dependencies or UI changes are planned. The existing receiver semantics for `session.error` become explicitly session-terminal for the last observed activity; newer activity remains authoritative.
- The screenshot establishes the reported symptom, not its actual event trace. The installed V2 client types confirm both failure events and `session.retry.scheduled`; verification must exercise the context-overflow/compaction-failure sequence.
