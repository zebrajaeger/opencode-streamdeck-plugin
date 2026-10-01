## 1. Protocol and aggregate state

- [ ] 1.1 Extend `shared/protocol.mjs` to validate question-added, question-resolved, and snapshot-question payloads while retaining the version-1 permission frame behavior; verify valid question frames parse and malformed IDs, session IDs, or snapshot question entries are rejected in `streamdeck-plugin/test/protocol.test.mjs`.
- [ ] 1.2 Extend `StatusRegistry` to retain questions per connected instance and give any outstanding question the same `ATTENTION` priority as permissions; verify busy, error, mixed permission/question, reply, rejection, reconnect snapshot, and disconnect transitions in `streamdeck-plugin/test/status-registry.test.mjs`.

## 2. OpenCode event reporting

- [ ] 2.1 Update `opencode-plugin/index.mjs` to track observed `question.asked` events by ID and session, remove them for both `question.replied` and `question.rejected`, and publish the corresponding bridge frames; verify event payload fields against the installed `@opencode/plugin` 2.0.18 declarations and preserve display-only behavior.
- [ ] 2.2 Include observed outstanding questions in the bridge reconnect snapshot and remove them when their session is deleted; verify a simulated reconnect snapshot preserves unanswered question attention and a terminal event clears it.

## 3. Bridge integration and documentation

- [ ] 3.1 Route validated question frames through `StatusBridgeServer` without weakening its socket-instance identity or directory-source replacement rules; verify a loopback WebSocket client transitions `BUSY` → `ATTENTION` → `BUSY` or `READY` after reply and rejection in `streamdeck-plugin/test/status-bridge-server.test.mjs`.
- [ ] 3.2 Update `docs/opencode-status-bridge.md` with the OpenCode question event semantics and the limitation that already-pending questions cannot be recovered at plugin startup; verify the documentation continues to state that the bridge is read-only.

## 4. End-to-end verification

- [ ] 4.1 Run `npm test` from `streamdeck-plugin` and resolve all protocol, registry, and bridge-server test failures.
- [ ] 4.2 Run the configured build from `streamdeck-plugin` and manually verify that asking an agent question while its session is busy shows `ATTENTION`, then answering or rejecting it restores the applicable lower-priority status.
