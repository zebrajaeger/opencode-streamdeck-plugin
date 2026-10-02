## Context

See proposal.md for motivation and scope. The user confirmed both global and project keys, with calm green plasma throughout READY.

Observed code still has a BUSY-only `StatusActionRenderer` inside `particle-wait-animation.ts`: SVG data URLs at 144×144, per-action-ID write serialization, presentation-version guards, and an injectable particle scheduler. READY is currently a static green glyph (`#2E9E5B`) on `#101216`. Global status titles are native; project layout work already composes steady name/status text bands via `project-status-image.mjs`, and project actions do not write native titles. That work is uncommitted and must be preserved.

`add-attention-background-animation` is planned, not implemented. It introduces effect/controller/renderer separation, elapsed-time injection, independent per-key lifecycles, phase-preserving refresh, and an orange attention halo. This dependent change targets that resulting architecture, not today's particle-specific renderer. Its delta specs intentionally modify requirements from the predecessor, including `status-background-animation` which does not exist in main specs yet. Main and predecessor specs currently require static READY after work/attention and prohibit periodic READY image changes; this change explicitly replaces those clauses without changing status subscriptions.

GitNexus was refreshed for repository `opencode-streamdeck-plugin` during planning. Its context confirms both action classes consume `StatusActionRenderer`; process analysis reports truncated flow coverage, so it is not an exhaustive dependency guarantee. Source and tests confirm the composition and write-ordering behavior. No production symbol is edited in this planning workflow.

## Goals / Non-Goals

**Goals:**
- Add a bounded-cost, deterministic effect through the predecessor's small effect contract.
- Keep composition and effect phase independent so labels/settings can update without rebuilding plasma.
- Extend lifecycle coverage to long-lived READY keys without changing subscription coalescing.

**Non-Goals:**
- Reimplementing the ATTENTION refactor, introducing another scheduler, a generic shader engine, WebGL/canvas, new libraries, or user effect settings.
- Changing shared registry/bridge semantics, interactions, project selection behavior, or native/global title customization.
- Editing or completing the layout change or the predecessor in this apply workflow.

## Decisions

### 1. Gate implementation on the verified predecessor

Before any production edit, confirm that `add-attention-background-animation` has been implemented and verified, and that the shared lifecycle and compositor actually exist. An apply-ready planning status alone is not proof of implementation. If the prerequisite is absent, stop and report the blocker; do not implement it as part of plasma. Bind actual module names at this gate; the predecessor's proposed `background-animation.ts` and `status-action-renderer.ts` are not guaranteed filenames.

This plan uses MODIFIED deltas against the predecessor's final requirements. Sync the predecessor's specs before syncing this change and archive it first. Archival is a separate requested operation, not an implicit task here. If its final contracts differ materially from the planned baseline, reconcile this plan explicitly before editing.

Alternative: add READY now to the current BUSY-only renderer. Rejected because it violates the requested ordering and would duplicate or conflict with the upcoming refactor.

### 2. Deterministic SVG plasma from a small spatial wave field

Implement a pure `ready-plasma-animation.ts` effect using elapsed monotonic time supplied by the shared controller. Proposed centralized defaults: 144×144 output, a 12×12 sampling grid, 150-ms frame interval, and a 12-second seamless cycle. Normalize coordinates and combine three bounded waves, for example `sin(2π(x+p))`, `sin(2π(y-p))`, and `sin(2π(x+y+p))`, where `p` is elapsed time divided by the cycle duration. Average their values and map smoothly into a dark-green palette based on the existing READY green. Render samples as overlapping, low-opacity radial-gradient cells so moving wave contours blend rather than appear as a hard pixel grid. Bound intensity and keep the dark base and steady READY glyph visible; project overlays remain above all effect content.

Use ordinary SVG geometry/gradients in each generated frame, with no SVG animation tags, external assets, filters, or animated image files. Grid, palette, opacity limits, timing, and cycle period belong in one exported parameter constant. Inject time for tests; no randomness or wall-clock Date dependency is needed. Test several phases, cycle wrapping, valid finite SVG values, and bounded output size. Slight palette/grid/intensity tuning is allowed during hardware review without changing the calm spatial-wave contract.

Alternative: multicolor classic rainbow plasma would conflict with READY's green semantics. Canvas/shaders or animated SVG depend on additional runtime facilities or rendering support. Hard-edged cells are simpler but less convincingly smooth. A copy of the halo only changing green intensity is not spatial plasma.

### 3. Extend central effect selection, not animation ownership

Select plasma for READY alongside particles for BUSY and halo for ATTENTION; ERROR/OFFLINE remain static. Reuse exactly one active controller per visible animated key, the action-ID write queue, effect identity checks, synchronous cancellation, and drain-before-replacement rules from the prerequisite. Direct transitions READY↔BUSY and READY↔ATTENTION must not publish temporary static frames. Transition/disappearance invalidates queued work immediately; issued SDK calls cannot be recalled and must settle before newer writes. Rejecting writes must not poison later delivery.

Duplicate status reports preserve the existing controller and elapsed phase. Explicit refresh composes the current plasma sample with current presentation settings; later frames read the current composition settings rather than closing over obsolete project labels. READY→READY project selection also preserves phase while replacing the subscription and labels. Disappearance/reappearance may start a fresh independent phase; continuity across invisibility is not required. Scheduling remains confined to visible keys.

Alternative: a separate READY scheduler increases race and cleanup risk. Recreating the effect on every label update loses phase and would conflict with the predecessor's refresh guarantees.

### 4. Update test intent instead of removing coalescing guarantees

`particle-wait-animation.test.mjs` currently uses READY for static-image coalescing and delayed/rejected-write tests. Move truly static assertions to ERROR/OFFLINE, retaining stale-write/failure coverage; add separate READY assertions that distinguish scheduled frames from report-triggered writes. Existing stability/subscription tests must continue to assert no duplicate status notifications, but no longer require a frozen READY image. Add fake-clock/scheduler coverage for READY phase, initial frames, all status transitions, hidden keys, ID reuse, and multi-key independence.

Use `project-layout-lifecycle.test.mjs` and renderer/layout tests to verify label and placement changes on every READY frame, including selection between two READY projects. Integration coverage includes project A in ATTENTION or BUSY while B remains READY, and global READY returning after work, request resolution, error expiry, or reconnect. Register cleanup for every animated key, including fixtures that previously used READY without disposing it.

Alternative: simply deleting image-count assertions weakens duplicate-report and timer-leak protection. Unbounded real-time sleeps produce flaky tests; control scheduler and monotonic time together.

## Risks / Trade-offs

- [Predecessor API changes before implementation] → Stop at the gate if absent; map final module names and review final requirement blocks before continuing.
- [Many idle keys now generate ongoing writes] → Fixed 150-ms cadence, small bounded grid, no off-screen timers; verify per-key resource release and multi-key operation. Retain the predecessor's write-queue policy; no new timeout policy.
- [Slow device writes create delayed frames] → Reuse queue identity/cancellation guards and test controlled slow writes. A permanently hung SDK call remains the predecessor's known limitation.
- [Plasma looks pixelated or too urgent on hardware] → Verify gradients and several cycles on actual Stream Deck; tune only bounded centralized visual defaults while preserving readable calm green waves.
- [Existing READY tests leak timers or misinterpret animation as status flicker] → Mock clock/scheduler, dispose all animated fixtures, and assert stable status/phase separately from periodic image advancement.
- [Concurrent text-layout changes lose overlays] → Preserve current files, compose every frame through the final shared boundary, and test settings updates mid-cycle. Do not overwrite unrelated work.
- [Delta synchronization runs out of order] → Record predecessor-first sync/archive ordering and do not apply these MODIFIED blocks to absent requirements.

## Migration Plan

1. After a separate explicit apply request, check the predecessor gate and run GitNexus impact analysis before each production symbol edit; report HIGH/CRITICAL and resolve UNKNOWN with source evidence.
2. Follow AGENTS.md: copy the affected Stream Deck implementation into ignored project `tmp/`, include current uncommitted layout work, implement and test there, and do not edit the running OpenCode plugin.
3. In the copy, run the Stream Deck test suite (`npm test`), TypeScript checking (`npx tsc --noEmit`), and Rollup build (`npm run build`). Verify predecessor BUSY/ATTENTION regressions together with new READY tests.
4. Publish verified changed sources/build in the smallest coordinated replacement; leave unrelated sources and planning artifacts untouched. Hardware-check global/project READY for multiple cycles, labels, real transitions, hiding/reappearance, and mixed projects.
5. No settings or protocol migration is needed. On deployment failure, restore only this implementation's files/build outputs from saved pre-change copies. Update `docs/opencode-status-bridge.md` to describe all three animated statuses and steady labels.
6. At later requested synchronization/archive, process predecessor specs first; before any commit run complete GitNexus change analysis, re-running partial/truncated checks as required by AGENTS.md.
