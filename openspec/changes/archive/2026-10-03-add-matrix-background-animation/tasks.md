## 1. Prerequisite and safe integration boundary

- [x] 1.1 Confirm `configure-ready-background-renderer` is implemented and its deltas are synced: verify both inspectors expose the existing three choices, the shared normalization/factory seam exists, selection tests pass, and main `status-background-animation` contains `Per-key READY background selection`. If not, stop this apply and report the dependency; do not implement the prerequisite here.
- [x] 1.2 Record the current working-tree baseline and run fresh GitNexus upstream impact analysis before each existing symbol edit, resolving UNKNOWN findings with targeted source checks; verify affected global/project callers and risk are recorded and unrelated font/layout work remains intact.

## 2. Compact Matrix effect

- [x] 2.1 Add `streamdeck-plugin/src/actions/matrix-background-animation.ts` with a geometry-only `BackgroundEffect`, fixed bitmap alphabet, dark base, sparse green heads/tails, and bounded visible-cell paths; verify `matrix-background-animation.test.mjs` covers valid finite SVG, no font/external/filter/animation dependency, at most 30 glyphs, and less than 25 KB per frame.
- [x] 2.2 Implement clock-driven descending trails with independent offsets/speeds, staggered offscreen recycling, deterministic character changes, and a 150 ms frame interval; verify injected-clock tests demonstrate downward motion, fading tails, repeatable same-time output, continued animation across multiple wraps, and no synchronized full-frame reset.
- [x] 2.3 Attenuate rain behind supported text bands without changing foreground settings or existing effects; verify composed global/project SVG retains READY glyph/labels and configured fonts/positions, and produce representative native-size frames for the visual gate in section 4.

## 3. READY selection integration

- [x] 3.1 Extend the prerequisite's shared READY-choice list, normalization, and declaration types with `matrix` / `Matrix`; verify Matrix is accepted, missing/invalid inputs still default to Plasma, and the three existing values retain their meaning.
- [x] 3.2 Extend the renderer's existing effect factory with Matrix using the injected clock and existing controller; verify global and project keys independently select Matrix, restore it on appearance, preserve actual READY status, and leave non-READY backgrounds unchanged.
- [x] 3.3 Verify both inspectors expose, save, and restore Matrix through the shared choices, making only necessary targeted inspector changes; extend inspector tests to cover incoming settings without feedback writes, reopen restoration, and preservation of fonts, project selection, positions, and section state.
- [x] 3.4 Extend renderer/lifecycle tests for duplicate READY reports, same-selection font/layout refresh, live and rapid switches into/out of Matrix, non-READY selection changes, mixed keys, rejected/delayed image writes, disappearance, reused action IDs, and every exit from READY; verify no phase reset for unchanged selections, leaked timers, stale overwrite, or blocked recovery.

## 4. Native-size and full integration verification

- [x] 4.1 Create review captures and a short moving sequence of composed Matrix frames at exactly 72×72 for global READY and project labels at all supported positions; inspect without magnification across bright heads and multiple wraps, tuning only bounded visual parameters until separate character trails and steady labels remain recognizable, and record results in this change's verification notes.
- [x] 4.2 Exercise both real inspectors and, when available, the deployed Stream Deck/Qt output: verify Matrix selection/restoration, independent keys, live switching, and native-size readability; record any hardware-verification limitation explicitly instead of marking it passed.
- [x] 4.3 Run `npm test` and `npm run build` from `streamdeck-plugin`, plus `openspec validate add-matrix-background-animation --strict`; verify all commands pass and no OpenCode-plugin/protocol/runtime-dependency changes were introduced.
- [x] 4.4 If preparing a commit, run GitNexus `detect_changes` with scope `all` and resolve partial/truncated results; verify the report covers only intended implementation changes and that unrelated user work is not included.
