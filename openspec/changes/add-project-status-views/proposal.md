## Why

The existing Stream Deck action combines the state of every connected OpenCode project, so users cannot tell which specific project needs attention from a Stream Deck key. OpenCode already supplies a project identifier when the local bridge connects; exposing that state per project enables focused status keys alongside the existing global summary.

## What Changes

- Add a display-only Stream Deck action for the status of one configured OpenCode project.
- Let each project-status action instance be configured with the OpenCode project ID it monitors.
- Preserve project identity from the bridge handshake through the Stream Deck status registry and publish status updates to matching project-status action instances.
- Apply the existing status precedence (`ATTENTION`, `ERROR`, `BUSY`, `READY`, `OFFLINE`) independently within each project.
- Keep the existing global status action and the bridge's local-only, read-only behavior unchanged.

## Capabilities

### New Capabilities
- `project-status-indicator`: A configurable Stream Deck action that displays the aggregate status of a single identified OpenCode project.

### Modified Capabilities
- None.

## Impact

- `opencode-plugin/index.mjs` already obtains `context.location.project.id` and sends it in the `hello` bridge frame; its project identity will become a retained protocol input.
- `shared/protocol.mjs`, `shared/status-registry.mjs`, and `streamdeck-plugin/src/status-bridge-server.mjs` will carry, retain, and aggregate project-scoped state while preserving current connection replacement behavior.
- `streamdeck-plugin/src/actions/`, `src/plugin.ts`, and the Stream Deck manifest will gain and register a separately configurable project-status action.
- Protocol, registry, bridge-server, and action behavior need regression coverage; the global action must retain its present semantics.
