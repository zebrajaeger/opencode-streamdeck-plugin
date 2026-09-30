## 1. Bridge contract and OpenCode integration

- [x] 1.1 Verify the installed OpenCode plugin loader accepts the configured repository entry and inspect the available session and permission event payloads; document the confirmed module entry and payload mapping in implementation notes.
- [x] 1.2 Define shared versioned WebSocket message schemas for handshake, full state snapshot, session state, permission state, and reserved commands; verify invalid or unknown frames are handled safely.
- [x] 1.3 Implement the OpenCode bridge module with a generated instance identity, loopback WebSocket connection, reconnect backoff, startup snapshot, and incremental session/permission reporting; verify OpenCode continues operating while the Stream Deck endpoint is unavailable.

## 2. Stream Deck status service

- [x] 2.1 Add a loopback-only WebSocket server on port 20666 to the Stream Deck plugin and verify that a local client connects while a non-loopback binding is not exposed.
- [x] 2.2 Track bridge instances, their session states, and unanswered permission requests; verify a disconnect removes all state belonging to that instance.
- [x] 2.3 Implement global state aggregation with the priority `ATTENTION > ERROR > BUSY > READY > OFFLINE`; verify the specified priority combinations with automated tests or a deterministic test harness.
- [x] 2.4 Accept and apply a full snapshot after every bridge connection so that an active OpenCode instance restores its contribution after the Stream Deck plugin restarts; verify with a simulated reconnect.

## 3. Stream Deck action and presentation

- [x] 3.1 Replace the counter action registration and manifest metadata with the OpenCode status action; verify the action is available in Stream Deck.
- [x] 3.2 Render distinct `OFFLINE`, `READY`, `BUSY`, `ATTENTION`, and `ERROR` states for every visible action instance; verify each state changes title and/or imagery as designed.
- [x] 3.3 Keep version-1 key presses display-only, including during `ATTENTION`; verify a key press sends no OpenCode control or permission-response message.

## 4. Integration verification and documentation

- [x] 4.1 Build and type-check the Stream Deck plugin and verify the packaged plugin starts without runtime errors.
- [x] 4.2 Verify end-to-end state transitions with one and multiple OpenCode instances: disconnected, connected-idle, working, permission requested, permission resolved, error, and disconnect.
- [x] 4.3 Document configuration of the global OpenCode bridge path, local port 20666, and current read-only limitation; verify the documented configuration can be used from a clean OpenCode start.
