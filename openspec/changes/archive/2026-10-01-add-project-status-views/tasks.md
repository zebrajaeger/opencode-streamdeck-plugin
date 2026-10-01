## 1. Bridge project identity and scoped state

- [x] 1.1 Extend `hello` frame validation to accept an optional string `projectID` while retaining acceptance of existing project-less handshakes, and verify with `streamdeck-plugin/test/protocol.test.mjs`.
- [x] 1.2 Retain each source's `projectID` when the bridge server registers it, preserve existing instance- and directory-replacement behavior, and verify project identity reaches the registry with bridge-server tests.
- [x] 1.3 Add project-scoped registry status calculation and subscriptions using the established precedence, excluding untagged and other-project sources while preserving global aggregation, and verify READY/BUSY/ERROR/ATTENTION/OFFLINE cases in `streamdeck-plugin/test/status-registry.test.mjs`.
- [x] 1.4 Cover end-to-end bridge-server cases for different project IDs, multiple sources for one project, and final-source disconnect, and verify `npm test` passes in `streamdeck-plugin`.

## 2. Configurable Stream Deck action

- [x] 2.1 Add a project-status action that reads and persists a per-key `projectID`, subscribes only to that project's registry status, re-subscribes on setting changes, and renders `OFFLINE` until configured; verify it with focused action tests or Stream Deck SDK-compatible unit coverage.
- [x] 2.2 Factor or reuse status rendering and status types so global and project actions render the same status vocabulary without changing global-action behavior; verify existing global status tests continue to pass.
- [x] 2.3 Register the new action in `src/plugin.ts` and declare its distinct UUID, display metadata, and property-inspector configuration in `de.lars-brandt.opencode.sdPlugin/manifest.json`; verify the plugin build succeeds and Stream Deck exposes both actions.

## 3. Documentation and verification

- [x] 3.1 Document how to obtain and enter the OpenCode project ID for the project-status action, including that unconfigured or disconnected projects display `OFFLINE`, and verify the documented behavior against the settings UI.
- [x] 3.2 Run `npm test` and `npm run build` from `streamdeck-plugin`, then manually verify that a global key remains aggregate while two project keys isolate status updates for different connected projects.
