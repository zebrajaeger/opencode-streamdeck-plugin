## Context

The Stream Deck plugin currently registers only a counter action. The configured repository path for the OpenCode plugin is present but empty. See `proposal.md` for the motivation and `specs/opencode-status-indicator/spec.md` for observable requirements.

OpenCode exposes session status, session idle/error, and permission events through local plugin hooks. A normal OpenCode TUI may use a dynamic server port, so having Stream Deck discover and subscribe to every instance is not dependable.

## Goals / Non-Goals

**Goals:**
- Maintain a persistent bidirectional WebSocket bridge from each OpenCode instance to the Stream Deck plugin.
- Aggregate every connected instance into one status action.
- Preserve sufficient identity and event context for future navigation/control features.
- Keep the initial bridge local-only and read-only from Stream Deck to OpenCode.

**Non-Goals:**
- Focusing the OpenCode window or selecting a session.
- Displaying a permission's command or approval controls on Stream Deck.
- Replacing the OpenCode UI or providing remote OpenCode control.
- Persisting state across a Stream Deck plugin restart.

## Decisions

### Stream Deck hosts the WebSocket server

The Stream Deck plugin SHALL listen at `ws://127.0.0.1:20666`. Each OpenCode plugin instance connects outward and reconnects with backoff after a disconnection.

This gives the server a stable, user-configurable endpoint and allows OpenCode processes to start and stop independently. It avoids attempting to discover a TUI-local OpenCode server on a dynamic port.

Alternative considered: Stream Deck subscribes to OpenCode's HTTP/SSE server. Rejected because it cannot reliably find every transient or concurrently running instance.

### Model state per bridge instance and session

An OpenCode bridge generates an `instanceID` at plugin startup and reports a snapshot after each connection. Session state is keyed by the tuple `(instanceID, sessionID)`; unanswered permission IDs are also scoped to the instance.

This ensures reconnecting instances can replace their prior state and prevents one disconnected instance from leaving stale `BUSY` or `ATTENTION` status behind.

### Use snapshots plus incremental events

After the handshake, each OpenCode bridge sends a complete snapshot of its known session and unanswered-permission state, then sends incremental session and permission events. On socket close, the Stream Deck plugin removes the entire instance state.

The snapshot is necessary because the Stream Deck plugin can restart while OpenCode remains active. Incremental events alone cannot reconstruct already-active sessions or pending requests.

### Aggregate by precedence

The Stream Deck plugin derives one state by evaluating all connected data in the following order:

```text
ATTENTION > ERROR > BUSY > READY > OFFLINE
```

`ATTENTION` represents any unanswered OpenCode permission and outranks work because it needs a human decision. `READY` represents a live connection with no active or exceptional state; `OFFLINE` means there are no bridge connections.

### Establish a versioned bidirectional envelope

Every bridge frame uses a small JSON envelope with a protocol version, a message type, and instance identity. Version 1 accepts OpenCode-to-Stream-Deck reporting only; unknown inbound command frames are rejected or ignored safely.

Example message families:

```text
OpenCode -> Stream Deck: hello, snapshot, session.status,
                         session.idle, session.error,
                         permission.asked, permission.replied

Reserved Stream Deck -> OpenCode: focus-session, permission.respond,
                                  session.abort, tui.append-prompt
```

The reserved command direction avoids a protocol redesign when interaction becomes in scope, while the version-1 capability remains explicitly read-only.

### Restrict the listener to loopback

The WebSocket listener binds only to `127.0.0.1`; it never accepts LAN-facing connections. A shared bridge secret should be added before any future command that can affect OpenCode state, especially permission responses.

Alternative considered: expose the port on all interfaces to support another device. Rejected as unnecessary for a local Stream Deck plugin and unsafe for future controls.

## Risks / Trade-offs

- [The configured OpenCode plugin path points to a directory and the precise module-loading behavior may vary by OpenCode release] -> Validate the supported local module entry during implementation; document the required path or package entry.
- [The OpenCode plugin may not be able to enumerate all in-progress state at startup] -> Use supported status APIs where available and treat the first release's snapshot as best effort; reconnection prevents permanent stale states.
- [A bridge disconnect can briefly show `OFFLINE` while OpenCode reconnects] -> Use reconnect backoff and optionally introduce a short server-side grace period only if testing shows visible flicker.
- [A global status hides which session needs attention] -> Preserve instance, project, session, and permission identifiers in the protocol for later navigation and detail actions.
- [Future commands could approve security-sensitive work] -> Keep release 1 display-only, bind loopback-only, and require authentication before enabling mutating commands.

## Migration Plan

1. Replace the development counter action with the status action and its assets.
2. Add the WebSocket server and status aggregation to the Stream Deck plugin.
3. Add an OpenCode bridge module at the configured repository location and confirm its configured entry point is loaded.
4. Test with zero, one, and multiple OpenCode instances, including permission and reconnection transitions.
5. Roll back by restoring the counter plugin build and removing the OpenCode bridge from the OpenCode configuration.

## Open Questions

- The exact OpenCode event payload shape and supported way to obtain an initial session-status snapshot need verification against the installed OpenCode version during implementation.
- The precise visual language (icons, colors, and animation) for the five states can be selected during UI implementation without changing the protocol or behavior contract.
