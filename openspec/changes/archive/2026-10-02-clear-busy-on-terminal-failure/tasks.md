## 1. Safe implementation preparation

- [x] 1.1 Run fresh GitNexus upstream impact checks for `OpenCodeBridge.applyEvent` and `StatusRegistry.apply` (use exact symbol IDs if names are ambiguous), report callers/processes/risk, and resolve UNKNOWN or warn on HIGH/CRITICAL before editing; verify analysis results are recorded and not partial/truncated.
- [x] 1.2 Stage affected implementation and test files with their import layout under ignored `tmp/`, retain pre-change copies, and run baseline `npm test` in both packages; verify the loaded live plugin remains unchanged during development and record any pre-existing failures.

## 2. Producer failure and retry handling

- [x] 2.1 Add producer regressions in `opencode-plugin/test/index.test.mjs` for BUSY followed independently by execution failure and auto/manual compaction failure with no subsequent idle; verify the new tests expose the missing retained-state correction and missing compaction handling.
- [x] 2.2 Admit `session.compaction.failed` through authoritative ownership checks, normalize both failure events to retained READY plus one existing `session.error` frame, and preserve other sessions/requests; verify unit tests assert no extra idle frame, no permanent ERROR session state, and no forwarding for foreign/unresolved ownership.
- [x] 2.3 Admit `session.retry.scheduled` through the same ownership gate and normalize it to BUSY without ERROR; verify scheduled retry and existing busy/retry/start events preserve or restore work after a failure, while idle/success/interruption retain current behavior.
- [x] 2.4 Extend producer coverage for failure during disconnected reporting, reconnect snapshots, queued ownership lookups, and disposal during lookup; verify corrected READY state survives reconnect, other activity remains present, event order is preserved, and no late result publishes after unload.

## 3. Receiver atomic recovery

- [x] 3.1 Add registry regressions for BUSY → session.error → expiry in `streamdeck-plugin/test/status-registry.test.mjs`, including a second working session; verify tests expose stale BUSY and assert exactly BUSY → ERROR → READY for a sole failed session without an intermediate READY notification.
- [x] 3.2 Make `session.error` atomically set only the identified session to READY before applying the existing transient error timer; verify fake-clock tests at 14,999 and 15,000 ms, other-session activity, permission/question preservation, newer-live-event replacement, repeated failures, and disconnect timer cleanup pass.
- [x] 3.3 Update the existing single-instance multi-session test that currently expects obsolete BUSY after failure expiry; verify its expected notification sequence reflects READY for the failed last working session while existing genuinely active-session expectations stay unchanged.

## 4. Integration and delivery verification

- [x] 4.1 Extend the bridge-to-server integration harness in `streamdeck-plugin/test/project-event-isolation.test.mjs` or a focused adjacent test to cover both failure events without a following idle, expiry, restart activity, and reconnect; verify project A recovers to READY while active project B remains BUSY and global status follows ERROR → BUSY, using controlled timers rather than real 15-second sleeps.
- [x] 4.2 Update `docs/opencode-status-bridge.md` with execution/compaction failure recovery, scheduled-retry behavior, unchanged 15-second expiry rules, and the limitation for hangs without signals; verify documentation matches the delta specs and contains no unsupported API or session-control instructions.
- [x] 4.3 Run complete staged-package `npm test` suites and the Stream Deck `npm run build`, then publish verified files as an atomic-as-practical final replacement; verify tests/build pass and the final diff contains only intended changes, without modifying the unrelated layout change.
- [ ] 4.4 Deploy both verified integrations when ready and perform a controlled context-window overflow/compaction-failure reproduction in a disposable session; verify the observed event sequence and global/project key transitions stop retaining BUSY for the failed session, and document a blocker explicitly if live reproduction is unavailable.

  **Blocked — awaiting user-run verification.** The code is implemented and verified automatically: producer, registry, and a bridge-to-server integration test cover both failure events without a following idle, error expiry, restart activity, and reconnect. Live reproduction was deliberately not performed because restarting the OpenCode service reloads this plugin and would end the session doing the work, and deliberately overflowing a model context window requires a user-driven chat. To close this task: restart OpenCode and the Stream Deck plugin, drive a disposable session into a context-window overflow or failed compaction, and confirm that neither its project key nor the global key stays BUSY after the 15-second error indication expires. The bridge log at `~/.local/share/opencode/log/streamdeck-status-bridge.log` records the observed event sequence.
- [x] 4.5 Run `openspec validate clear-busy-on-terminal-failure --strict` and GitNexus graph change analysis before any commit; verify validation passes and graph analysis is complete with no unresolved partial/truncated results, recording verification evidence alongside task completion.
