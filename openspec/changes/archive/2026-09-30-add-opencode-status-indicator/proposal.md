## Why

The current Stream Deck plugin is only a counter and provides no indication of whether any local OpenCode instance is working or needs human input. A global, immediate status indicator lets the user see when OpenCode is busy, ready, offline, has failed, or is blocked on a permission request without switching to OpenCode.

## What Changes

- Replace the counter-focused Stream Deck capability with a global OpenCode status action.
- Add a local WebSocket server to the Stream Deck plugin on `127.0.0.1:20666`.
- Add an OpenCode plugin bridge that maintains a persistent WebSocket connection and reports session and permission events.
- Aggregate the state of every connected local OpenCode instance into one Stream Deck status.
- Display `OFFLINE`, `READY`, `BUSY`, `ATTENTION`, or `ERROR` on the Stream Deck action.
- Establish a bidirectional protocol that can support future Stream Deck controls, while version 1 only displays status.

## Capabilities

### New Capabilities
- `opencode-status-indicator`: Aggregate local OpenCode activity and permission state into a global Stream Deck status action over a persistent WebSocket bridge.

### Modified Capabilities

- None.

## Impact

- Affects the Stream Deck plugin entry point, action registration, manifest, visual assets, and package dependencies.
- Adds the currently empty `opencode-plugin` as a configurable OpenCode plugin module.
- Reserves local port `20666` on loopback only for the WebSocket server.
- Uses OpenCode session and permission events; no OpenCode command or permission-response action is performed in version 1.
