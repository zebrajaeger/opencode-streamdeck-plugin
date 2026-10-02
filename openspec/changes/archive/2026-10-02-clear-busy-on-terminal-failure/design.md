## Context

See `proposal.md` for motivation and the delta specs for the acceptance contract.

Observed implementation:
- `OpenCodeBridge.applyEvent` verifies ownership and serializes event handling through `handleEvent`/`enqueue`. Execution starts set its retained session state to BUSY; success, interruption, and idle set READY. Execution failure sends `session.error` but leaves the session map unchanged. Compaction failure is not handled.
- `StatusRegistry.apply` treats `session.error` as an instance-scoped transient error only; it leaves the receiver's session map unchanged. After the 15-second timer expires, previously retained BUSY therefore resurfaces.
- `publishSnapshot` sends retained READY/BUSY session state after ownership verification. A producer-only outgoing idle frame would not fix receiver behavior atomically, and a receiver-only fix would allow reconnect to restore producer-side stale BUSY.
- Installed `@opencode/client` types expose `session.execution.failed` and `session.compaction.failed` with `data.sessionID` and structured errors; compaction additionally has `reason: auto | manual`. `session.retry.scheduled` is a distinct event with a session ID. No session enumeration or active-state snapshot is available in the supported plugin context.
- Existing tests use fake sockets, deferred metadata reads, and injected registry clocks. `streamdeck-plugin/test/project-event-isolation.test.mjs` already connects two producers to a real bridge server for scope verification.
- GitNexus was refreshed for repository `opencode-streamdeck-plugin` during planning. Its `applyEvent` context identifies `handleEvent` as the caller and the consume-events flows as entry paths. Planning does not edit these symbols; implementation must run fresh impact checks before changing them.

## Goals / Non-Goals

**Goals:** Correct both producer and receiver retained state at the failure boundary, preserving serialized event order, project verification, existing error precedence/expiry, and snapshot compatibility.

**Non-Goals:** Do not inspect prompt contents or parse English error messages to detect context overflow. Do not poll unsupported APIs, infer inactivity from elapsed time, clear outstanding requests without resolution events, or invoke session control APIs. Do not change animation, project configuration, or instance deduplication.

## Decisions

### 1. Normalize explicit failure events through the existing ownership gate

Admit `session.compaction.failed` using the same authoritative session-project lookup as execution failures. Handle both failure events consistently: update only the affected producer session to READY, then emit one existing `session.error` frame. Apply to both automatic and manual compaction failures; the failed operation invalidates the last observed working contribution, while subsequent actual activity can restore it. Do not send a separate `session.idle` frame or snapshot during ordinary failure handling.

This avoids a visible READY interlude and avoids clearing the new ERROR indication with an idle frame sent after it. Alternatives rejected: error-text matching is fragile; execution-failure-only handling misses compaction-only failures; a watchdog cannot distinguish legitimate long work from a hung chat.

### 2. Apply `session.error` atomically on the receiver

In the existing `session.error` branch of `StatusRegistry.apply`, set only `frame.sessionID` to READY before starting/resetting the existing error indication and notifying listeners once. Preserve other session entries, permissions, questions, instance identity, and timer semantics. Error remains instance-scoped and transient, not a persistent ERROR session value.

Retain protocol version 1 and its existing frame shape. The new producer remains understood by existing receivers, but those receivers do not provide the complete recovery guarantee until updated. Deploy both sides together. A receiver-only implementation was rejected because reconnect snapshots would resurrect BUSY; a producer-only idle/error pair was rejected because it introduces redundant frames and intermediate status transitions.

### 3. Later live activity wins; retries are not failures

Keep the existing mapping of busy/retry `session.status` to BUSY and execution starts to BUSY. Also admit and normalize the supported `session.retry.scheduled` event to BUSY through the same ownership gate, so V2 retry activity after a failure can explicitly restore work and replace the transient error. A retry event alone must not generate ERROR or end activity.

Keep serialized arrival order rather than inventing run IDs or timestamp-based suppression: failure invalidates prior BUSY, then a later live activity event is authoritative. There is no permanent failed-session latch. Success, interruption, and idle keep their current newer-live-event semantics, including replacing ERROR before 15 seconds.

### 4. Preserve existing snapshot and attention contracts

Producer retained READY ensures that reconnect reports current observed non-working state without replaying errors. Continue using the existing bounded ownership checks and request-resolution lifecycle. Do not clear permissions or questions merely because a failure arrived; such requests remain higher-priority ATTENTION until explicitly resolved. Preserve the existing rule that newer live state or authoritative snapshots replace a transient error.

This extends, rather than reverses, the transient-error main spec: error still is not persistent state, but it now invalidates the affected session's prior working state. No changes to main specs or the unrelated active layout change are needed during planning.

## Risks / Trade-offs

- [A compaction failure can be followed by resumed work] → Treat it as invalidating previously observed work, not as a permanent terminal latch; verify failure followed by start, busy, and scheduled-retry sequences.
- [The screenshot does not reveal the exact emitted event sequence] → Test both failure types independently with no following idle event, then perform one controlled context-overflow/compaction-failure reproduction on the supported runtime. Do not claim the live case verified solely from the screenshot.
- [A later idle/status event can replace ERROR immediately] → Preserve this existing requirement; the 15-second expectation applies only when no newer live event arrives.
- [Ownership lookup failure prevents admitting a failure] → Preserve fail-closed project isolation. Test foreign/unresolved events; recovery without an admitted signal is outside the approved scope.
- [Receiver semantics change under the same protocol version] → No payload migration is required, but deploy the updated producer and receiver together; regression-test other-session activity and outstanding requests.
- [Loaded plugin edits can interrupt the working chat] → Stage implementation under ignored `tmp/`, verify there, and replace live source files only after implementation is complete, as required by `AGENTS.md`.

## Migration Plan

1. Run impact analysis before implementation edits and baseline tests in both packages. Stage affected code/tests under `tmp/` without changing the live plugin during development.
2. Add regression tests and implement both sides. Verify expiry deterministically with fake clocks, reconnect state with fake sockets, and scope isolation through the existing integration harness.
3. Run `npm test` in both `opencode-plugin` and `streamdeck-plugin`, and `npm run build` in `streamdeck-plugin`. Update bridge documentation to describe compaction failure and live-state recovery.
4. Replace verified live files as an atomic-as-practical final action. Deploy/restart both integrations when ready and reproduce the reported context-overflow case; confirm that neither project nor global display remains BUSY solely because of the failed session.
5. Before any commit, perform GitNexus graph change analysis without partial/truncated results. Roll back only files changed by this implementation using saved pre-change copies; do not reset unrelated work. No stored-data migration is needed.
