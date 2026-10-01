## Context

See [proposal.md](proposal.md) for motivation and `project-status-indicator` for the behavior contract. The global status action currently subscribes to a registry that stores session and permission state only per bridge instance. The OpenCode integration already includes `context.location.project.id` in its `hello` frame, but the protocol validator and Stream Deck bridge server do not retain it. Directory-based source replacement is intentionally separate from project identity.

## Goals / Non-Goals

**Goals:**
- Retain an optional project ID at connection registration and expose status snapshots scoped to that ID.
- Add a separately registered Stream Deck action with persistent per-key project-ID settings.
- Reuse the global action's visual status vocabulary and status-priority rules while keeping the global aggregation unchanged.
- Maintain bridge compatibility for connections that omit `projectID`; they remain visible globally but are excluded from project-specific status.

**Non-Goals:**
- Discovering project IDs automatically, presenting a project picker, or deriving labels from directory paths.
- Sending commands to OpenCode, changing authentication/local-only restrictions, or altering directory-based duplicate-source handling.
- Altering status state, precedence, or rendering for the current global action.

## Decisions

### Treat the OpenCode project ID in `hello` as the project key

The bridge already sends `context.location.project.id` when opening a connection. The protocol will validate this optional string and the server will retain it with the connection source; the registry will associate each connected instance with its registered project ID.

This is preferred over using `directory`, because the user needs the OpenCode-defined identity and directory is currently used only to replace duplicate sources. It is preferred over session-based identification because session events contain no project identifier and a session's scope is inherited from its bridge connection. Missing IDs remain acceptable for the existing global aggregation but cannot match a project-specific view.

### Add project-scoped registry subscriptions rather than filtering in the action

The registry will offer a project-status lookup/subscription that computes the same precedence over only instances whose retained project ID exactly matches the configured setting. The project action subscribes to its selected project and re-subscribes when its settings change.

Centralizing scope and precedence in the registry prevents the UI layer from duplicating state aggregation, allows multiple Stream Deck keys for the same or different projects, and keeps bridge-server consumers independent of action internals. Filtering all source state in individual actions was considered but would expose registry internals and duplicate business rules.

### Use a new action UUID with a simple persisted text setting

The manifest will declare a separate project-status action and an inspector will store a `projectID` setting for each key instance. Until a non-empty value is configured, the action renders `OFFLINE`; the inspector makes the required OpenCode project ID explicit.

A dropdown was considered but rejected because the current one-way local protocol has no project-listing response path, and adding discovery would expand the protocol and UI scope. Reusing the global action's UUID was rejected because it would change existing keys' semantics and settings compatibility.

### Preserve source replacement and global aggregation behavior

An incoming `hello` continues to replace prior sources for the same instance or directory. Project IDs do not participate in that replacement logic. The unscoped registry subscription remains the source for the global action and includes every connected source, including legacy sources with no project ID.

## Risks / Trade-offs

- [A user needs to find an opaque OpenCode project ID] → Document the setting's meaning and use the exact ID supplied by OpenCode; automatic discovery is explicitly deferred.
- [A legacy or malformed connection omits project identity] → Keep it valid for the global action, exclude it from project-scoped aggregation, and cover the behavior with protocol and registry tests.
- [A Stream Deck setting changes while the action is visible] → Dispose the previous project subscription and immediately render the new project's current state.
- [Future OpenCode versions change project-ID availability] → Keep the protocol field optional and contain handling at the handshake boundary; no session-event format depends on it.

## Migration Plan

1. Release the plugin with the additional action while leaving the existing action UUID and behavior intact.
2. Users add a project-status action and enter the project ID emitted by their OpenCode connection; existing global keys require no migration.
3. If rollback is required, remove the new action registration and manifest entry; global bridge behavior remains compatible because `projectID` is optional in the version-1 handshake.
