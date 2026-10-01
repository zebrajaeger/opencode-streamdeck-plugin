## 1. Directory-scoped source ownership

- [x] 1.1 Extend `StatusBridgeServer` with directory-to-active-source ownership while preserving its socket-to-instance and instance-to-socket checks; verify an older socket close cannot remove a newer source for the same directory.
- [x] 1.2 On a valid `hello` with a non-empty directory, replace and close any prior source for that directory, remove its registry contribution, and register the new source before it receives state; verify the same-directory replacement test reaches the replacement's final status only.
- [x] 1.3 Preserve UUID-scoped behavior for missing or empty directories and independent aggregation for different directories; verify protocol/frame handling remains backward compatible and two different directories contribute according to status priority.

## 2. Diagnostics and validation coverage

- [x] 2.1 Add structured lifecycle diagnostics for plugin setup/disposal and server source registration/replacement using instance ID and directory but no frame payloads; verify the documented duplicate-load reproduction produces an identifiable replacement record.
- [x] 2.2 Extend `streamdeck-plugin/test/status-bridge-server.test.mjs` with same-directory replacement, stale-close safety, and different-directory aggregation scenarios; verify with `npm test` from `streamdeck-plugin`.
- [x] 2.3 Extend `streamdeck-plugin/test/protocol.test.mjs` for directory-bearing and directory-omitting hello compatibility; verify with `npm test` from `streamdeck-plugin`.

## 3. User-facing operational guidance

- [x] 3.1 Update `docs/opencode-status-bridge.md` to document one active bridge per exact project directory, treatment of distinct directories, and the log fields used to diagnose repeated OpenCode plugin loads; verify the instructions match the emitted diagnostic names and local log location.
- [x] 3.2 Perform a manual local OpenCode smoke test with the configured single plugin path, reproduce or simulate repeated setup for one directory, and verify Stream Deck receives one authoritative source while a different project directory remains independently represented.
