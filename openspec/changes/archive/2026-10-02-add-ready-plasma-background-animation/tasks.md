## 1. Prerequisite and safe working baseline

- [x] 1.1 Confirm `add-attention-background-animation` is implemented and verified, not merely planned: inspect its final shared effect/controller/composition interfaces and run its relevant BUSY/ATTENTION regressions. Record actual module paths and verification results; stop without production edits if the prerequisite is absent or fails. Do not implement the predecessor here.
- [x] 1.2 Compare the predecessor's final requirements with this change's MODIFIED blocks and confirm predecessor-first specification synchronization/archive ordering in the verification notes. Verify no materially different contract or missing predecessor requirement remains unresolved; synchronization/archive themselves require a separate request.
- [x] 1.3 Run GitNexus upstream impact analysis for each existing production symbol to be edited, report callers/processes/risk, resolve UNKNOWN using source evidence, and copy the affected Stream Deck code plus current project-layout work into ignored `tmp/`. Verify the copy contains the current composition modules/settings and that live OpenCode plugin sources remain untouched.

## 2. READY plasma effect

- [x] 2.1 Add deterministic READY plasma through the predecessor's effect contract, with centralized green palette, dark base, 144×144 dimensions, bounded sampling grid, 150-ms proposed cadence, and 12-second proposed cycle. Verify pure effect tests cover equal-time determinism, changed spatial waves at multiple phases, seamless cycle wrapping within numeric tolerance, finite SVG values, bounded frame size, and no new dependency or animated asset.
- [x] 2.2 Compose plasma behind the steady READY glyph and existing global/project labels through the shared composition boundary. Verify renderer/composition tests decode multiple frames and assert correct dimensions, READY identity, dark/green content, and unchanged project labels/placement on each frame.

## 3. Shared renderer integration and lifecycle

- [x] 3.1 Extend central effect selection to READY without another controller implementation; keep BUSY particles and ATTENTION halo unchanged and ERROR/OFFLINE static. Verify fake-scheduler tests cover immediate initial READY output and READY↔BUSY, READY↔ATTENTION, READY↔ERROR, and READY↔OFFLINE transitions with exactly one active controller per animated key and no temporary static READY frame.
- [x] 3.2 Preserve plasma controller/phase on duplicate reports, explicit refresh, label/position updates, and READY→READY project selection; ensure later frames compose current settings rather than captured obsolete labels. Verify controlled-clock tests show no timer/phase restart or unchanged-title rewrite, with refreshed labels on the current and all later frames.
- [x] 3.3 Apply predecessor cancellation, write serialization, and error recovery to plasma. Verify delayed/resolved/rejected image writes, rapid successive status changes, disappearance while a write is in flight, reused action IDs, and frame-write failures cannot publish queued old frames over newer presentations or prevent subsequent cleanup/delivery.
- [x] 3.4 Verify READY multi-key independence and resource release using controlled timers: appearance/reappearance starts the current effect, hiding one key leaves others advancing, and repeated show/hide cycles leave zero active controllers/timers for removed keys and no further queued/new writes.

## 4. Regression and scoped integration coverage

- [x] 4.1 Update existing static READY assumptions in renderer and stability tests: move truly static coalescing tests to ERROR/OFFLINE, keep delayed/rejected-write regressions, and assert READY's scheduled advancement separately from duplicate-report suppression. Verify affected suites pass with cleanup registered for every animated READY fixture and no uncontrolled real-time sleeps.
- [x] 4.2 Extend project/global integration tests for connected idle keys, work completion, attention resolution, error expiry, reconnect, and project A BUSY/ATTENTION while B remains READY. Verify expected status notifications and precedence are unchanged while effect selection follows each key's own scope and B's phase is not restarted by A's events.
- [x] 4.3 Extend project-layout renderer/lifecycle tests for READY label/name/position changes, selection between two READY projects, and reappearance. Verify updated overlays persist across subsequent frames, project keys still avoid native-title writes, and another key's overlays/effect phase remain unchanged.

## 5. Verification, publication, and documentation

- [x] 5.1 Run `npm test`, `npx tsc --noEmit`, and `npm run build` from the prepared Stream Deck copy. Record command results and verify READY additions pass together with predecessor BUSY/ATTENTION, layout, failure-recovery, isolation, and write-ordering regressions.
- [x] 5.2 Update `docs/opencode-status-bridge.md` with calm green READY plasma, BUSY particles, ATTENTION halo, static ERROR/OFFLINE, and steady labels. Verify the delivered documentation describes presentation only and does not imply new settings, bridge semantics, or controls.
- [x] 5.3 Publish only verified changed sources/build outputs in a minimal coordinated replacement, preserving saved pre-change copies and unrelated work. Verify the published plugin starts, and review the diff to confirm no OpenCode integration/protocol/action-UUID/persisted-setting changes; restore only this change's published files if deployment fails.
- [x] 5.4 Verify on actual Stream Deck global and project READY keys over several cycles: smooth calm green spatial waves, readable labels, mixed-project isolation, label updates, direct status transitions, hiding/reappearance, and no updates after disappearance. Record evidence and any bounded centralized visual tuning; re-run affected automated checks after tuning.
- [x] 5.5 Produce verification notes mapping delta scenarios to automated or hardware evidence and recording the predecessor gate. Run GitNexus change analysis before any requested commit, re-running partial/truncated analysis rather than treating it as clean, and verify only intended plasma-related changes are included.
