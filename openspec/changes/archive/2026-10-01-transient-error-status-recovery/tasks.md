## 1. Ephemeral error aggregation

- [x] 1.1 Refactor `shared/status-registry.mjs` so `session.error` creates a 15-second, per-instance transient indication rather than storing `BridgeStatus.ERROR` in a session; clear it on a newer local `BUSY`, `READY`, or attention event, on snapshot replacement, and on disconnect; verify deterministic registry tests cover immediate error, expiry, each replacement event, multiple instances, and timer cleanup.
- [x] 1.2 Update the registry's aggregate calculation to derive durable state as `ATTENTION > BUSY > READY > OFFLINE`, while an unexpired error indication remains visible only until a higher/newer live state or expiry; verify the affected precedence and subscription-notification cases in `streamdeck-plugin/test/status-registry.test.mjs`.

## 2. Authoritative bridge state

- [x] 2.1 Update `shared/protocol.mjs` and snapshot handling so snapshots contain only observable live session statuses and cannot preserve or restore historical `ERROR`; verify frame validation accepts supported live states and rejects an error-valued snapshot session in `streamdeck-plugin/test/protocol.test.mjs`.
- [x] 2.2 Preserve `session.error` as an ephemeral protocol event and route it through `StatusBridgeServer` without weakening existing socket identity, directory replacement, or disconnect behavior; verify loopback integration tests cover error display, replacement by live state, expiry, and reconnect snapshot recovery in `streamdeck-plugin/test/status-bridge-server.test.mjs`.

## 3. Supported OpenCode snapshot reporting

- [x] 3.1 Replace the unsupported `context.session.list()` snapshot access in `opencode-plugin/index.mjs` with event-observed session state plus the supported permission-request snapshot; verify against installed `@opencode/plugin` 2.0.18 declarations and add or update plugin tests to prove initialization does not invoke unsupported session APIs.
- [x] 3.2 Ensure plugin reconnect snapshots omit historical failures and authoritatively send current observable sessions, permissions, and questions; verify a simulated failed event followed by reconnect does not reproduce `ERROR`, while a later live event is transmitted immediately.

## 4. Documentation and end-to-end verification

- [x] 4.1 Update `docs/opencode-status-bridge.md` to accurately describe supported OpenCode 2.0.18 snapshot APIs, event-observed session recovery limits, 15-second transient errors, and authoritative reconnect behavior; verify the document continues to state that the integration is read-only.
- [x] 4.2 Re-index GitNexus before implementation, run the Stream Deck test suite and configured build, and manually verify: failure shows `ERROR`, a later `BUSY`/`READY`/`ATTENTION` clears it immediately, an isolated failure expires after 15 seconds, and reconnect does not restore the old error.
