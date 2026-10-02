## 1. Global inspector

- [x] 1.1 Add a global action property-inspector path and status-only Display dialog in `manifest.json` and property-inspector assets, with no project controls; verify an HTML/manifest assertion test finds the path, status trigger, and all five modal controls.
- [x] 1.2 Reuse project font options, normalization, and dialog draft/Apply/Cancel behavior for action-scoped global settings, preserving unrelated fields; verify inspector tests cover size slider draft, cancel, all font attributes, invalid values, and reopening with saved values.

## 2. Global key rendering

- [x] 2.1 Extract/share status SVG font rendering and add global per-key font configuration to `StatusActionRenderer`, preserving project rendering; verify renderer tests show defaults and chosen attributes on OFFLINE, ERROR, and animated READY/BUSY/ATTENTION frames without native title duplication.
- [x] 2.2 Wire `OpenCodeStatus` settings appear/update/disappear events to configure, refresh, and dispose each key's font independently, and disable native global title in the manifest; verify action/renderer tests show two global keys retain different fonts and changing one does not affect project keys or aggregate status.
- [x] 2.3 Verify active animation settings refreshes preserve phase and discard queued stale frames in READY, BUSY, and ATTENTION using delayed-write tests; verify existing project renderer tests still pass.

## 3. Integration verification

- [x] 3.1 Run the Stream Deck plugin test/build commands from `streamdeck-plugin/package.json` and `openspec validate configure-combined-status-font --strict`; verify no regressions, plus inspect a rendered global key in static and animated states for readability at default and customized fonts.
