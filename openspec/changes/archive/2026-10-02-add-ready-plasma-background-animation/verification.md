# Verification notes

## Predecessor gate

- `add-attention-background-animation` was implemented in commit `c37ff4a` and is no longer an active change. Its production interfaces are `streamdeck-plugin/src/actions/background-animation.ts` (`BackgroundEffect`, `BackgroundAnimation`, `backgroundImage`), `attention-halo-animation.ts` (`AttentionHaloAnimation`), and `status-action-renderer.ts` (`StatusActionRenderer.compose`, per-key selection, action-ID write queue). Project overlays use `project-status-image.mjs` and normalized per-action project presentation.
- Before plasma edits, `node --test test/background-animation.test.mjs test/attention-halo-animation.test.mjs test/status-action-renderer.test.mjs test/particle-wait-animation.test.mjs` passed: 30/30 tests including BUSY/ATTENTION transitions, cancellation, slow/rejected writes, phase-preserving refresh and mixed-key isolation.
- Final predecessor requirements reside in `openspec/specs/status-background-animation/spec.md`, `particle-wait-animation/spec.md`, `project-status-indicator/spec.md`, and `opencode-status-indicator/spec.md`. The plasma MODIFIED blocks replace the predecessor's static READY language (including transitions, unchanged reports, initial display and foreign-project attention); other status precedence, animation safety, and composition contracts remain. No materially different predecessor contract or missing requirement was found. The predecessor's main-spec sync/archive has already happened; plasma delta specs must be synced only after it, during a separately requested archive operation.

## Safe baseline and impact

- GitNexus upstream impact on `StatusActionRenderer`: LOW, direct callers `OpenCodeProjectStatus` and `OpenCodeStatus`, plus their imports and `plugin.ts`; no processes recorded for the class itself. On `StatusActionRenderer.render` and `compose`: CRITICAL, affecting global/project `onWillAppear`, `setStatus`, and project `onDidReceiveSettings` execution flows (five entrypoint groups). This is a graph process-membership warning, not an all-clear; regressions must exercise these paths. No other existing production symbols need editing. No UNKNOWN zero-caller verdict was used. GitNexus index refreshed with `node .gitnexus/run.cjs analyze --index-only` before work; MCP reported a stale-index warning despite CLI refresh, so source/tests remain necessary corroboration.
- Copied the existing `streamdeck-plugin` tree and bridge documentation to ignored `tmp/plasma/` before any production edits. Copy contains `src/actions/background-animation.ts`, `status-action-renderer.ts`, `project-status-image.mjs`, `de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs`, and the current presentation settings. Live sources remained unchanged (`git status --short` showed only this change's planning notes).

## Copy verification

- `tmp/plasma/streamdeck-plugin`: `npm test` passed 117/117 including halo, particles, READY, layout, write ordering and bridge lifecycle; `npx tsc --noEmit` passed; `npm run build` passed and produced `de.lars-brandt.opencode.sdPlugin/bin/plugin.js`.

## Publication

- Saved pre-publication renderer, build bundle and documentation under ignored `tmp/plasma/pre-publication/`; source/test baseline remains in `tmp/plasma/streamdeck-plugin/` (note that edited source paths in that copy now contain the verified implementation). Copied only the changed renderer, new plasma effect, affected tests, documentation and verified build bundle to the live plugin. The bundle is gitignored, so it is not shown by `git status`.
- `streamdeck restart de.lars-brandt.opencode` reported success; `streamdeck validate streamdeck-plugin/de.lars-brandt.opencode.sdPlugin` reported validation successful. `git diff --check` found no whitespace errors; tracked/untracked changes are confined to READY effect, renderer, presentation tests, docs and this change's task/verification files. No protocol, OpenCode integration, UUID or persisted settings files changed.

## Hardware observation

- The user confirmed observing both global and project READY keys on the actual Stream Deck over multiple cycles, with smooth green spatial waves and readable labels. The user also confirmed mixed-project isolation, label updates, direct status transitions, hiding/reappearance, and no further updates to disappeared keys. This is user-reported hardware evidence; no visual tuning was requested or made after the automated checks.

## Delta-scenario evidence

- `status-background-animation` READY selection, continuous readable plasma and global/project coexistence: `test/ready-plasma-animation.test.mjs` checks deterministic spatial waves and cycle wrapping; `test/status-action-renderer.test.mjs` checks global/project frame composition, duplicate reports, direct transitions and static exits. The user confirmed appearance and readability on hardware.
- Safe transitions, slow writes, failures, disappearance and reused IDs: `test/status-action-renderer.test.mjs` checks delayed/rejected writes, queued-frame suppression and recovery; `test/background-animation.test.mjs` checks controller cancellation and drain. Hardware transitions, hiding and reappearance were confirmed by the user.
- `particle-wait-animation` BUSY exits to READY plasma or ATTENTION halo: `test/status-action-renderer.test.mjs` checks direct effect switches; `test/particle-wait-animation.test.mjs` retains BUSY, static-status and write-failure regressions.
- `opencode-status-indicator` connected idle and READY-to-BUSY presentation without aggregation changes: `test/status-stability-flow.test.mjs` covers global/project bridge status and notifications; renderer transition tests check effect selection. Global READY was confirmed on hardware.
- `project-status-indicator` independent READY scope, unchanged reports, selection, refresh and labels: `test/status-stability-flow.test.mjs` checks A's BUSY/ATTENTION while B's READY phase advances; `test/status-action-renderer.test.mjs` checks per-key timers and phase-preserving refresh; `test/project-layout-lifecycle.test.mjs` and `test/project-layout-renderer.test.mjs` check overlays, selection and reappearance. The user confirmed project isolation and labels on hardware.

## Final scope check

- GitNexus `detect_changes({scope: "all"})` completed without `partial` or `truncated`; it reported 33 changed symbols, 15 affected renderer-driven presentation flows, and high overall risk. These are the expected `onWillAppear`, `setStatus`, and `onDidReceiveSettings` global/project write/image/title flows covered by the passing integration and renderer tests; high risk is not waived. No commit was requested or made.
- `git status --short` contains only this change's docs, tasks/notes, READY effect, renderer and presentation tests; the delivered build bundle is ignored. No OpenCode integration, bridge protocol, action UUID, migration, or persisted-setting changes are included.
