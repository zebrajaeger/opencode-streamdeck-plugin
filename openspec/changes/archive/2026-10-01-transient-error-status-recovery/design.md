## Context

See `proposal.md` for motivation and the delta specification for required behavior. `StatusRegistry` currently writes `BridgeStatus.ERROR` into a per-session map, so global precedence retains it until that same session later reports another state. The plugin's startup snapshot calls `context.session.list()`, but OpenCode plugin API 2.0.18 exposes `context.session.get()` rather than `list()` or `active()`; the call therefore fails and is logged while a partial snapshot is still sent.

The plugin does expose `permission.request.list()`. Session activity and question state must be maintained from observed OpenCode events. The generated raw OpenCode client has listing methods, but it is not exposed through the supported plugin context, so this change will not depend on private context access.

## Goals / Non-Goals

**Goals:**
- Surface a failure promptly without allowing it to become a durable aggregate state.
- Make any newer live event authoritative over an earlier failure.
- Ensure reconnect snapshots replace known observable state and cannot replay historical errors.
- Use only the installed supported plugin API plus state observed by the bridge.

**Non-Goals:**
- Reconstruct sessions whose activity occurred before this plugin began observing events.
- Persist status across plugin restarts or bridge-process restarts.
- Change the read-only nature, transport endpoint, or protocol version of the bridge.

## Decisions

### Model failure as a transient registry-level indication

`session.error` will create an expiration-bound error indication rather than write `ERROR` into an instance session map. Its lifetime is exactly 15 seconds. The registry will schedule a notification when the final applicable indication expires so the displayed status changes even when no later bridge frame arrives.

A per-session durable `ERROR` value was rejected because a failed execution is historical information, not evidence that the current OpenCode instance remains unusable. Removing `ERROR` entirely was rejected because the user needs immediate feedback that an execution failed.

### New live state immediately clears older error indications

Incoming session `BUSY`/`READY` frames and attention-request additions will clear failure indications older than that event for the relevant connected instance. This makes the newest observable state authoritative without waiting for the timeout. The timer remains the fallback when no follow-up arrives.

Requiring a status event for the exact failed session was rejected because unrelated or replacement session activity still establishes that the instance is alive and because the original problem is the absence of such an event.

### Make snapshots authoritative for observable state only

On every snapshot, the registry will replace the instance's sessions, permissions, and questions with the supplied collections and discard that instance's earlier error indication. Snapshots will never carry `ERROR` as a session status. The resulting durable priority is `ATTENTION > BUSY > READY > OFFLINE`.

Merging snapshots was rejected because omitted entries would keep stale state. Sending historic errors in snapshots was rejected because it would reproduce the sticky-error condition after reconnect.

### Capture only supported and observed startup state

The plugin will remove the unsupported `context.session.list()` call. It will retain its event-observed session map and hydrate only outstanding permissions through `context.permission.request.list()`, then send those observable collections in its snapshot. This makes startup and reconnect reporting safe under plugin API 2.0.18, while accepting that activity before event observation cannot be reconstructed.

Using the raw generated client was rejected because it is not part of the plugin context contract and would couple the integration to unsupported internals.

### Preserve additive wire compatibility

The bridge will keep protocol version 1. It may retain the existing `session.error` frame as an ephemeral event, but validators and snapshot construction will reject or avoid `ERROR` in snapshot session collections. The coordinated local components continue to tolerate unsupported frames safely.

## Risks / Trade-offs

- [A 15-second timer can expire while the user still wants to inspect a failure] → The duration is deliberate and documented; a live status is preferred over stale error state.
- [A later event can mask an earlier error before the user sees it] → Error is emitted immediately and is only displaced by evidence of current live activity.
- [Event-observed sessions omit activity from before plugin startup] → The bridge presents the known observable state and does not claim unavailable recovery; permission snapshot recovery remains supported.
- [Timers complicate tests and lifecycle cleanup] → Inject or control time in registry tests and clear scheduled expiration work on disconnect/disposal.

## Migration Plan

1. Deploy the OpenCode-plugin, shared-protocol, and Stream Deck-plugin changes together.
2. Verify error display, immediate recovery from later live events, expiry without follow-up, authoritative reconnect snapshots, and the absence of unsupported snapshot API errors.
3. Roll back by deploying the previous paired artifacts; state is in-memory and no data migration is required.
