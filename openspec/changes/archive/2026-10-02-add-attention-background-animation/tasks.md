## 1. Safe implementation setup

- [x] 1.1 Prepare an ignored `tmp/` implementation copy and save pre-change copies of affected live sources/build outputs; verify tests and build can run in the copy without editing the running integration.
- [x] 1.2 Re-read the concurrently changed renderer, project action, and layout compositor from `configure-project-status-layout` before applying the proposed extraction; verify the implementation baseline includes current layout tests and preserves any existing per-frame name/status composition without taking ownership of unrelated changes.
- [x] 1.3 Before editing existing symbols, check GitNexus freshness and reindex if needed, then run upstream impact for `StatusActionRenderer`, `ParticleWaitAnimation`, and affected action entry points; record callers, affected processes, and risk, warn on HIGH/CRITICAL, and resolve UNKNOWN with targeted source searches. Verify the impact results cover both global and project consumers.

## 2. Shared background animation boundary

- [x] 2.1 Add the effect contract and generic controller in `src/actions/background-animation.ts`, extracting immediate-first-frame scheduling, generation cancellation, serialized writes, stop/drain, and disposal; verify deterministic controller tests cover idempotent start, cancellation of queued frames, in-flight draining, and recovery after rejected writes.
- [x] 2.2 Refactor `particle-wait-animation.ts` to own particle state/geometry rather than duplicated scheduling; verify advancing deterministic frames still contain particles/connections and preserve the existing 144×144 dimensions, colors, movement parameters, and 180-ms interval.
- [x] 2.3 Move status presentation and static image composition to `status-action-renderer.ts`, update both action imports and test imports, and add the neutral background-composition seam; verify existing static/BUSY rendering, unchanged-status coalescing, explicit refresh, and action-ID reuse regressions pass before enabling ATTENTION.

## 3. Attention halo and effect selection

- [x] 3.1 Implement `attention-halo-animation.ts` with centralized orange/dark colors, smooth elapsed-time pulse, 2.4-second period, and 100-ms refresh defaults; verify fixed-clock frame tests cover changing intensity, a repeating cycle, bounded nonzero opacity, and invariant dimensions/glyph readability treatment.
- [x] 3.2 Select particles for BUSY and halo for ATTENTION in the neutral renderer, with at most one active controller per key and no temporary static image between effects; verify BUSY→ATTENTION→BUSY and ATTENTION→READY/ERROR/OFFLINE tests, including correct active `animationCount` and timer release.
- [x] 3.3 Preserve the active effect and its phase on duplicate reports and explicit presentation refreshes; verify fake-clock/timer tests demonstrate continuous ATTENTION over multiple cycles, no redundant title writes, no controller restart, and immediate refresh of the current frame.
- [x] 3.4 Extend stale-write protection to effect identity and status-independent frame callbacks; verify delayed/rejected title and image writes during rapid effect changes, disappearance, reappearance, and reused action IDs cannot overwrite the latest presentation or poison future writes.

## 4. Global and project integration coverage

- [x] 4.1 Update `particle-wait-animation.test.mjs` assumptions that ATTENTION is static, add renderer/halo tests as appropriate, and register cleanup for every animated test key; verify the animation tests exit normally with no leaked timers and retain all static/BUSY regressions.
- [x] 4.2 Extend `opencode-project-status.test.mjs` and `status-stability-flow.test.mjs` with continuous attention, repeated reports, attention reappearance, and project-selection refresh cases; verify project A and the global key animate while a ready project B remains static and unchanged.
- [x] 4.3 Extend global/project flow coverage for admitted permission requests and agent questions, partial and final resolution, and returning to still-running work; verify the halo persists until effective ATTENTION ends, then selects the correct BUSY or static presentation without changing aggregation or request lifecycles.
- [x] 4.4 Verify independent visible key lifecycles with mixed BUSY/ATTENTION keys and disappearance of one attention key; assert the remaining keys keep advancing, no new writes occur for the hidden key, and reappearance starts its current effect.

## 5. End-to-end verification and delivery

- [x] 5.1 Run `npm test`, `npx tsc --noEmit`, and `npm run build` from the copied `streamdeck-plugin` directory; record successful results and verify no new runtime dependency, action setting, UUID, or bridge implementation change was introduced.
- [x] 5.2 Update `docs/opencode-status-bridge.md` to describe BUSY particles and continuous ATTENTION halos on both action types, including unchanged display-only behavior; verify the documented behavior matches the new delta specs.
- [x] 5.3 Replace only verified affected live sources/build outputs in a coordinated operation and restart the Stream Deck plugin for validation; observe global and project keys through several halo cycles, check readable text at minimum/maximum intensity, BUSY transitions, static transitions, disappearance, and reappearance. Record actual hardware/software evidence or explicitly report unavailable hardware rather than claiming visual verification.
- [x] 5.4 Review the final diff against this change and the separate layout change boundary; verify only intended implementation/docs/tests are changed, run GitNexus `detect-changes --scope all --repo .` with no unresolved partial/truncated result before any commit, and record the full affected-symbol/risk result.
