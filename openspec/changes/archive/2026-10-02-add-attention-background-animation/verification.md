# Attention background verification

## Baseline and isolation

- Implementation and build completed in ignored `tmp/attention-implementation/`.
- Pre-change sources and binaries saved as `baseline-src/` and `baseline-bin/` there.
- Baseline: 94 tests passed; copied Rollup build passed.
- The separate layout change is already archived and present in the clean baseline. Its compositor, presentation settings, manifest and inspector are untouched. Its renderer tests remain in the suite; only imports, attention cleanup and immediate-frame flushing were adapted.

## Upstream impact

- Ran `node .gitnexus/run.cjs analyze --index-only` before editing. No source index changes were required.
- MCP retained an older commit freshness hint after reindex; CLI impact was used to confirm the current local index.
- `StatusActionRenderer`: LOW; 4 direct dependents, 5 total. Both action classes/imports and plugin registration are covered. No class-level process memberships reported.
- `ParticleWaitAnimation`: CRITICAL; 4 direct dependents, 15 total. Direct dependencies include the renderer/render method and both action imports. Affected entry processes: project `onDidReceiveSettings`, project/global `onWillAppear`, project/global `setStatus`; paths reach geometry, scheduling, images, titles and write serialization.
- `OpenCodeStatus` / `OpenCodeProjectStatus`: LOW; each has plugin registration as its one direct dependent. No UNKNOWN results.

## Software verification

- `npm test`: **110 passed**, zero failures/cancellations/skips; exits normally.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- All commands ran in the copied Stream Deck package.
- Added deterministic controller, halo and renderer tests: immediate/idempotent start, cancellation/draining, rejected writes, three pulse cycles, invariant glyph, duplicate reports, phase-preserving refresh, direct animated transitions, static exits, hidden keys, independent mixed effects, project overlays, delayed/rejected writes and reused IDs.
- Extended producer → bridge → registry → renderer coverage: admitted permissions/questions, partial resolution, final rejection, current form transport, restoration of still-running work, unchanged ready project B.
- Dependencies, bridge implementation, protocol, action UUIDs, settings and inspector remain unchanged.
- TypeScript `rewriteRelativeImportExtensions` enables explicit `.ts` imports for Node strip-only tests while preserving Rollup compilation. No runtime dependency or setting was added.

## Delivery / visual verification

- Stream Deck CLI discovers the installed plugin linked to this checkout.
- Physical-key observation is unavailable through this agent's tools. Software tests prove frame variation and constant glyph/text composition, not actual Qt/Stream Deck gradient rendering or hardware legibility at pulse extremes.
- Published only the affected verified sources/tests, compiler configuration, documentation and built `bin/plugin.js` in one staged replacement operation. Build output is git-ignored as before. No OpenCode bridge files were replaced.
- `npx streamdeck restart de.lars-brandt.opencode`: **Restarted successfully**.
- Task 5.3 uses its explicitly allowed unavailable-hardware reporting path; actual physical-key visual verification is not claimed.

## Subsequent live attention test

- The user initially reported static ATTENTION, then explicitly confirmed visible pulsing on a second real question prompt. The cause of the first observation remains unresolved; no corrective code change was made or claimed.
- A read-only inspector probe of the running Stream Deck plugin confirmed the loaded bundle contains the halo, and two effect instances advanced around every 100 ms with constant start times. The probe disconnected and its temporary script was removed.
- `uv run --with PySide6 python test/render-attention-halo.py` in the ignored implementation copy: **8,270 changed Qt-rendered pixels** between maximum/minimum intensity, confirming the generated gradient pulse is not pixel-static. PySide6 is verification tooling only.
- This user confirmation is evidence of visible pulsing, not a claim that every hardware transition/layout/legibility case was inspected.

## Final diff and graph analysis

- `git diff --check`: passed (only repository LF/CRLF normalization warnings).
- New files were added with `git add -N` (intent-to-add only) so graph diff analysis includes the extraction/new effects/tests, not just pre-existing tracked files.
- Full `detect_changes(scope: all)` result: **18 files, 190 changed symbols, 26 affected processes, CRITICAL risk**; no partial/truncated result. This includes test and documentation symbols, not 190 production functions.
- `node .gitnexus/run.cjs detect-changes --scope all --repo . --limit 1000` records every returned changed symbol and affected flow in `graph-change-analysis.txt`.
- The affected flows cover generic start/refresh/dispose, title/image queues, project composition, static presentation and particle geometry; these were reviewed against the controller/renderer tests and preserved layout regressions.
- CRITICAL is explicitly retained as the broad shared-lifecycle refactor risk, not waived using shared-axis risk. No commit or push was performed.
- Final changes stay within this feature's rendering, tests, documentation, compiler support and verification artifacts. Manifest, inspector, project compositor, settings definitions, protocol, aggregation and bridge implementation are unchanged.
