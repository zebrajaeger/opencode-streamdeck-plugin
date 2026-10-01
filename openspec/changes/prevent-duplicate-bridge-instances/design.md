## Context

See [proposal.md](proposal.md) for the motivation and the delta specifications
for the required behavior. The OpenCode integration creates a new random UUID
for every `OpenCodeBridge` and sends `projectID` plus `directory` only in its
`hello` frame. The Stream Deck server currently indexes sources solely by UUID,
so repeated plugin setup calls (observed ten times within milliseconds) become
independent status contributors. The installed configuration has one plugin
entry, making the repeated lifecycle a runtime condition the bridge must
tolerate.

## Goals / Non-Goals

**Goals:**
- Make the project directory the stable ownership key for status contributions.
- Retain the current UUID/socket validation so only the connection that claimed
  an instance ID can send its subsequent state frames.
- Cleanly remove replaced state before a replacement snapshot becomes active.
- Produce concise lifecycle diagnostics suitable for correlating duplicate
  plugin loads.

**Non-Goals:**
- Diagnose or modify OpenCode's plugin-loader lifecycle.
- Restrict users to one OpenCode process globally, or merge different project
  directories.
- Add OpenCode command handling, remote access, or persistence of status.
- Retrospectively identify legacy connections that omit a usable directory.

## Decisions

### Deduplicate at the Stream Deck server using the hello directory

`hello.directory` is the only currently supplied identity that distinguishes
the user's desired scope: one source per project directory. The server will
maintain a directory-to-active-source mapping beside its existing UUID-to-socket
mapping. When a directory-bearing hello arrives, it atomically retires the
previous source ownership, drops that source's registry data, and closes the
previous socket. The newly connected source begins with an empty contribution
until its ordered snapshot arrives.

This prevents all observed duplicate loads—even if OpenCode runs each plugin
evaluation in an isolated module realm where a module-global singleton would
not work—and makes the receiving side authoritative.

**Alternatives considered:**
- A module-global singleton in the OpenCode plugin: may reduce duplicate setup
  in a shared module realm, but cannot be trusted across isolated plugin loads
  and cannot clean up existing duplicate connections.
- Deduplicate only by UUID: ineffective because each setup intentionally
  generates a new UUID.
- Dedupe by `projectID`: less aligned with the requested project-folder scope
  and may be absent or unstable relative to the directory.

### Preserve legacy connections that lack a directory

Protocol validation will accept the existing optional identity fields for
compatibility. A missing or empty directory remains UUID-scoped and is never
collapsed with a directory-identified source. New plugin sends its directory as
it already does. This permits rolling updates between independently installed
components.

**Alternative considered:** require a directory and reject older sources.
That would force coordinated plugin/server upgrades and turn a reporting
integration into a potential availability break.

### Make source replacement observable without leaking event data

Add structured logs at plugin setup/disposal and server hello/replacement
handling. Fields include the instance ID and directory where available, plus
the action taken. Do not log session IDs, permission IDs, full frame contents,
or directory-derived details beyond the configured local project path.

**Alternative considered:** use only the existing verbose client logs. They
show many connections but do not establish which server source won or whether
stale status was removed.

## Risks / Trade-offs

- [The replacement socket may close after a newer source has taken ownership]
  → Socket-to-instance and instance-to-socket checks ensure an old close event
  cannot remove the current source or its registry data.
- [A short transition can show `OFFLINE` before the new snapshot arrives]
  → Keep replacement and registry updates synchronous, and send the snapshot
  immediately after hello as the client already does; test the final aggregated
  state rather than promise uninterrupted display rendering.
- [Directory aliases or case differences can describe the same Windows folder]
  → Use the exact directory supplied by OpenCode in this change; canonical path
  normalization is deferred because it changes source-identity semantics.
- [Logs contain locally sensitive paths]
  → Keep diagnostics at debug/info level in the existing local bridge log and
  avoid payload logging.

## Migration Plan

1. Extend the shared protocol validation/types and server ownership maps while
   continuing to accept connections without a directory.
2. Add server and protocol tests for same-directory replacement, stale-close
   safety, distinct-directory aggregation, and compatibility behavior.
3. Update plugin lifecycle diagnostics and documentation, then run the Stream
   Deck test suite.
4. Deploy by replacing the local plugin files. Existing connections naturally
   reconnect; rollback restores the prior files, with no stored migration data.
