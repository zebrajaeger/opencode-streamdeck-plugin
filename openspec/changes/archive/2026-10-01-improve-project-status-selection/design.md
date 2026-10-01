## Context

See [proposal.md](proposal.md) for the motivation. The OpenCode bridge's `hello` frame already carries both `projectID` and `directory`. The status registry aggregates by `projectID`; the bridge server separately retains a directory only to replace duplicate sources. The property inspector currently contains one free-text project-ID field and has no source of project choices. Stream Deck supports global plugin settings and plugin-to-property-inspector messages.

## Goals / Non-Goals

**Goals:**

- Preserve the existing project-ID-based aggregation and isolation contract.
- Make normal selection possible without discovering an opaque OpenCode ID.
- Retain usable labels for offline, previously selected projects after a plugin restart.
- Keep an explicit manual-ID route for a project that has not yet connected.

**Non-Goals:**

- Changing the OpenCode-to-Stream-Deck protocol version or how sessions are aggregated.
- Treating a directory as a status identity or separating status by worktree.
- Discovering projects from the filesystem or from OpenCode outside an active bridge handshake.
- Persisting status, sessions, permissions, or questions across a restart.

## Decisions

### Project IDs remain the only stored selection and aggregation key

The action's `projectID` setting remains unchanged. A selector entry is a presentation wrapper around that value; choosing it writes the ID and subscriptions continue to use only that ID.

This preserves one logical project's aggregation across multiple active checkouts. Using `directory` as the key would be more immediately readable but would silently change that aggregation behaviour, especially for worktrees.

### Use the concrete OpenCode location directory as display metadata

On a valid handshake with both values, capture `projectID -> directory`. The primary label is the final directory component; the full path is supplemental and becomes part of the selector label when primary labels collide. The metadata follows `location.directory`, not `project.canonical`, because it identifies the actual checkout in which the current OpenCode instance is running.

`project.canonical` would be more stable across worktrees but would conceal the location a user is trying to recognize. A separate user-defined project name is not selected because OpenCode does not supply one in the current bridge contract.

### Persist presentation metadata in Stream Deck global plugin settings

Persist a versioned, ID-keyed collection of last-known directories in the plugin's global settings. Load it at startup, merge each qualifying handshake, and write only the changed metadata. The persistence service owns validation, normalization, merging, and list ordering so actions and UI do not need to understand storage format.

Per-action settings cannot provide a complete selector for a new key and would duplicate the same metadata. Persisting source connection state is excluded because it would give a false impression that an offline project remains live.

### Send selector data only while the property inspector is open

When a project-status inspector appears, the action sends the current known-project list plus its selected project ID to that inspector. It sends refreshed data after new known-project metadata is observed, provided an inspector for the action remains visible. The inspector uses these messages to render the dropdown and keeps the advanced manual-ID entry separate.

The inspector must still use normal action settings events to restore the saved project ID. It must tolerate no selector data arriving, which keeps compatibility with startup races and unavailable bridge connections.

## Risks / Trade-offs

- [Directory values can expose user or machine-specific path segments] -> Keep the data inside Stream Deck's local plugin settings and show the full path only as supporting UI detail; do not include it in bridge-frame logging.
- [A project can reconnect from another directory] -> Treat the newest qualifying handshake as authoritative display metadata without changing the ID-bound status subscription.
- [Multiple live directories map to one project ID] -> One last-observed directory label is retained; aggregation remains correct but the label identifies the most recently observed checkout.
- [A user needs a never-connected project] -> Retain advanced manual ID entry and show `OFFLINE` until it connects.
- [Global-settings I/O is asynchronous] -> Ensure selector publication has a defined loaded state and serialize metadata updates so a late load cannot overwrite a newer handshake.

## Migration Plan

1. Release the selector while retaining the existing `projectID` setting name and its subscription behaviour.
2. Existing keys continue to work unchanged; they acquire a human-readable label after their project next completes a qualifying handshake.
3. Newly selected projects save the same setting shape used by the existing action.
4. Rollback consists of reverting the UI and metadata use; old keys remain valid because their IDs were never migrated or replaced.
