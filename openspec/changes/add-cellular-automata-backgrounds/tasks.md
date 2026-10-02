## 1. Prerequisite and integration safety

- [ ] 1.1 Confirm `configure-ready-background-renderer` has been implemented and verified before changing code; verify both inspectors share the READY choices/normalizer, runtime tracks effect identity, and prerequisite selection/lifecycle tests pass. If absent, stop this apply rather than implementing the prerequisite here.
- [ ] 1.2 Record the current working-tree baseline and perform GitNexus upstream impact analysis for every existing symbol to be edited, refreshing a stale index first; verify callers, affected processes, risk, and UNKNOWN confirmations are recorded and unrelated font/layout or Matrix work is preserved.

## 2. Deterministic cellular evolution and recovery

- [ ] 2.1 Add the 24×24 double-buffer cellular engine and pure rule-testing seam in `src/actions/cellular-automaton.ts`; verify simultaneous updates and wrapping edge/corner neighbor fixtures in `test/cellular-automaton.test.mjs`.
- [ ] 2.2 Implement Brian's Brain's off/active/dying transitions and active-only counting; verify every neighbor count 0–8 and unconditional active-to-dying-to-off decay with table-driven fixtures.
- [ ] 2.3 Implement Day & Night `B3678/S34678`; verify all nine neighbor counts for both prior states and wrapped-edge evolution.
- [ ] 2.4 Implement five-state Generations birth at two state-4 neighbors and unconditional 4→3→2→1→0 decay; verify every neighbor count, trail exclusion from counting, and no rebirth during decay.
- [ ] 2.5 Add deterministic injectable initialization and bounded local recovery templates/counters; verify all-off/full Day & Night recovery, thresholds at 99/100 low-activity generations, reset above five changes, one-to-three 3×3 patches, outside-patch preservation, and termination with constant random inputs.

## 3. Cellular background rendering

- [ ] 3.1 Add `src/actions/cellular-background-animation.ts` as a `BackgroundEffect` adapter with 150/250/150 ms intervals; verify initialization is reproducible, each advance performs one generation, and repeated background snapshots neither mutate state nor consume randomness in `test/cellular-background-animation.test.mjs`.
- [ ] 3.2 Render six-SVG-unit cells in a 144×144 dark, rounded field using compact state-batched paths and subdued mode palettes; verify finite in-bounds geometry, progressively decreasing trail intensity, no filters/external assets/animation tags, and dense background fragments below 40 KB.
- [ ] 3.3 Exercise all modes over at least 10,000 seeded generations; verify state ranges, fixed-size storage, bounded SVG output, and continued valid rendering without whole-grid reinitialization.

## 4. Additive READY selection and delivery

- [ ] 4.1 Extend the prerequisite's packaged `ready-background.mjs` choices and `.d.mts` declarations with `brians-brain`, `day-night`, and `generations-trails`; verify all three normalize correctly, invalid inputs still use Plasma, and every existing choice including Matrix when present remains supported.
- [ ] 4.2 Extend READY effect dispatch in `status-action-renderer.ts` to construct independent cellular adapters using injected randomness; verify every new identity works for both global and project keys with unchanged READY glyph/text composition and non-READY dispatch.
- [ ] 4.3 Expose all three additional choices in both property inspectors through their existing shared choices and event conventions; verify initial restoration, `didReceiveSettings` without feedback writes, selection persistence, and preservation of fonts, positions, project IDs, section states, and existing choices in inspector tests.
- [ ] 4.4 Extend renderer tests for mixed global/project modes, duplicate READY reports, unchanged selections, font/layout refreshes, non-READY settings changes, and immediate reappearance; verify independent simulations, no snapshot-induced generation changes, no unintended restarts, and correct current overlays.
- [ ] 4.5 Extend deferred/rejected image-write tests for cellular-to-cellular/existing-effect rapid switching, all status exits, disappearance, and reused action IDs; verify latest selection wins, issued writes settle in order, stale frames are suppressed, unrelated keys continue, and timers/resources are released.

## 5. End-to-end acceptance

- [ ] 5.1 Run `npm test` and `npm run build` from `streamdeck-plugin`; verify the complete suite and Rollup build succeed without new runtime dependencies or changes to `opencode-plugin`.
- [ ] 5.2 Produce native 72×72 frame/motion evidence for all three modes with global and project overlays, including dense/low-activity recovery and representative font/layout settings; verify Qt-compatible SVG rasterization, recognizable motion, dimming trails, stable readable labels, and no visible whole-grid reset in a recorded acceptance note.
- [ ] 5.3 Exercise actual choice/save/restore events in both property inspectors using a browser; verify all new values, legacy fallback, unchanged unrelated settings, and additive existing choices, recording the observed results.
- [ ] 5.4 Verify the final implementation against every delta scenario and document the prerequisite's closed-choice-list reconciliation for later spec sync, preserving Matrix if present; run `openspec validate add-cellular-automata-backgrounds --strict` and GitNexus `detect_changes` with scope `all` before any authorized commit, resolving partial/truncated results and confirming only intended integration areas changed.
