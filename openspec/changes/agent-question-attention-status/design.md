## Context

See `proposal.md` for motivation. The OpenCode plugin currently maintains per-session state and outstanding permissions, forwards them through a versioned local WebSocket protocol, and sends that state as a snapshot after reconnecting. `StatusRegistry` gives an instance `ATTENTION` priority whenever it has at least one outstanding permission.

OpenCode v2.0.18 emits ephemeral `question.asked`, `question.replied`, and `question.rejected` events. The event data provides a question ID and session ID. The installed plugin API exposes a permission-request list for startup recovery but exposes no corresponding question-list operation, so pending questions can only be tracked once observed by the plugin event stream.

## Goals / Non-Goals

**Goals:**
- Make a live unanswered agent question take precedence over `BUSY`, just as an unanswered permission request does.
- Preserve observed question state across local bridge reconnects and remove it once OpenCode reports a reply or rejection.
- Keep the bridge protocol local and the Stream Deck action read-only.

**Non-Goals:**
- Answer, reject, display, or otherwise interact with the question from Stream Deck.
- Recover a question that was already pending before the OpenCode plugin began observing events, because the available API has no question snapshot endpoint.
- Alter session status semantics, status rendering, or the existing permission behavior.

## Decisions

### Represent questions as another attention-request collection

The protocol snapshot and incremental messages will carry outstanding questions separately from permissions, each identified by question ID and associated session ID. The registry will retain per-instance questions and return `ATTENTION` if either collection is non-empty.

This preserves diagnostic distinction between OpenCode’s two user-input mechanisms while sharing the existing priority calculation. A single untyped attention collection was considered, but separate collections make protocol validation and event-to-state handling explicit without changing the external global status vocabulary.

### Forward all question terminal outcomes

The OpenCode plugin will add a question on `question.asked` and remove it on both `question.replied` and `question.rejected`. It will publish matching incremental frames and include its observed question map in reconnect snapshots.

Treating only replies as terminal was rejected because an explicitly rejected question no longer requires attention. Waiting for a session-status transition was rejected because status can remain busy while OpenCode waits for an answer.

### Evolve the existing local protocol additively

The shared protocol validator will accept question-specific frames and a questions array in snapshots, and the server will apply them only after its existing socket-to-instance identity check. All changes remain within protocol version 1 because they are additive between the coordinated in-repository plugin and Stream Deck components.

An independent protocol version bump was considered but rejected: no external third-party client compatibility is part of this local, bundled integration, and the validator already drops unsupported frames safely.

### Verify at each state boundary

Tests will cover protocol validation, registry precedence and terminal transitions, server integration from a client frame through subscription status, and plugin event mapping where the existing test setup permits it. Existing permission and busy tests remain regression coverage.

## Risks / Trade-offs

- [OpenCode question events are ephemeral and no startup list API is available] → Track all events received during the plugin lifetime, resubmit them on bridge reconnect, and document the known startup-recovery limitation.
- [A malformed or spoofed question frame could create a false attention state] → Reuse strict shared-frame validation and the server’s established connection identity enforcement.
- [Protocol additions leave one side outdated during manual deployment] → Preserve safe failure behavior: unsupported frames are ignored, while coordinated plugin and Stream Deck releases provide the full feature.

## Migration Plan

1. Release the protocol, OpenCode-plugin, and Stream Deck-plugin updates together.
2. Run the existing package test suites plus new question-state cases before packaging the Stream Deck plugin.
3. Manually validate that an agent question switches the action from `BUSY` to `ATTENTION`, and that answering or rejecting it restores the applicable lower-priority state.
4. Roll back by deploying the prior paired plugin artifacts; no persisted data or configuration migration is required.
