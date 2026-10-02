## Context

See proposal.md for motivation. The user selected a pulsing halo on both action types, continuously for the full ATTENTION state.

The current `particle-wait-animation.ts` combines particle physics, frame generation, timers, generation cancellation, and `StatusActionRenderer`. Both status actions import that renderer. Frames are encoded 144×144 SVG data URLs; status text is sent through `setTitle`. The renderer already coalesces duplicate status reports, serializes writes by action ID, and guards asynchronous work by presentation versions. Animation image errors are swallowed so later work can proceed. Stopped particle instances currently remain cached; `animationCount` counts retained instances rather than strictly active timers.

GitNexus's current index for `opencode-streamdeck-plugin` confirms both action classes consume the renderer. The relevant regression tests exercise delayed/rejected writes, reused action IDs, disappearance, duplicate BUSY reports, and explicit refreshes. Existing ATTENTION assertions assume static output and some tests therefore do not dispose attention keys.

The `particle-wait-animation` main spec requires static ATTENTION after BUSY; its delta explicitly replaces that rule. At initial inspection, the open `configure-project-status-layout` change proposed project-only SVG text composition but its code was not present. During final validation, concurrent layout source/test changes appeared in the working tree. They were not modified or verified by this planning workflow. Implementation must re-read that current rendering boundary before applying this design and preserve any completed layout behavior. This change does not implement those settings or suppress native titles itself.

## Goals / Non-Goals

**Goals:**
- Define one reusable scheduling and cancellation implementation, independent of effect geometry.
- Preserve the renderer's per-key caching, write ordering, retry behavior, and explicit-refresh semantics.
- Make effect generation deterministic under injected random/time inputs for tests.
- Expose a frame-composition boundary usable by the separate text-layout change later.

**Non-Goals:**
- A plugin registry, user-selectable effects, inspector settings, audio, or new dependencies.
- Changes to aggregation, bridge code, request resolution, action UUIDs, or title customization.
- Implementing the separate layout change or a generic graphics framework.

## Decisions

### 1. Separate effect generation, animation control, and status presentation

Introduce a small background-effect contract in `src/actions/background-animation.ts`: frame interval, state advancement, and SVG background generation. The generic controller owns the timer, active generation, immediate first frame, serialized frame delivery, stop/drain, and disposal. Retain the current injectable scheduling/cancellation hooks and deterministic random input for particles; inject a monotonic clock for the halo. Effects never call Stream Deck APIs or manage timers themselves.

Keep particle parameters and geometry in `particle-wait-animation.ts`, add `attention-halo-animation.ts`, and move `StatusActionRenderer`, its key contract, and static rendering to a neutral `status-action-renderer.ts`. Update both action imports and direct test imports. Names here are proposed implementation boundaries, not new public APIs; do not retain duplicate lifecycle implementations merely to preserve internal test imports.

Alternative: subclass or copy `ParticleWaitAnimation` for the halo. Rejected because it couples non-particle effects to particle state and duplicates race protection. A large extensible registry is unnecessary for two effects.

### 2. Central status-to-effect selection and background composition

The renderer selects particles for BUSY, halo for ATTENTION, and no animation for static statuses. Each key retains at most one active controller/effect pair, tagged with its status. Switching to another animated status invalidates and stops the old controller, drains already issued writes, then starts the new one without publishing a temporary static image. Leaving animation disposes and removes its resources. Make `animationCount` reflect active controllers and update tests that currently count stopped particle objects.

Effects produce SVG background content in the existing 144×144 coordinate system. The renderer wraps/encodes that content through a single composition boundary; the halo can be composed with the existing attention glyph while particles retain their current appearance. The current native title remains fixed and readable. A future project compositor can add its texts to every frame without coupling layout to effect state; no layout options are added now.

Alternative: make every effect return a complete status image and own its labels. Rejected because it duplicates presentation and conflicts with the planned text-layout seam.

### 3. Smooth orange halo with centralized parameters

Use the existing dark background `#101216` and orange attention color `#E69500`. Render a radial-gradient halo centered behind the existing attention glyph, varying its intensity with a cosine easing curve. Proposed defaults: 2.4-second pulse period, 100-ms frame interval, opacity range 0.20–0.65, and a radius of roughly 58 SVG units. Start at a visibly recognizable intensity, never fully black out the attention graphic, and keep the glyph/title steady. Use elapsed monotonic time so slow API writes do not accumulate phase drift. All visual parameters belong in one exported constant for deterministic tests and later tuning.

These are recorded design defaults, not user-facing options. Minor intensity/radius tuning during hardware verification is allowed provided the smooth, distinct, readable pulse contract remains intact. Preserve BUSY's 180-ms interval, particle count, speed, colors, and geometry. No SVG animation tags, GIFs, or external assets are needed.

Alternative: flashing the entire key would attract attention but conflicts with the user's chosen smooth halo and impairs readability. A sine-only frame counter is simpler but changes apparent speed under dropped frames.

### 4. Preserve asynchronous safety across all effect types

Keep the existing action-ID write queue and per-object presentation tokens. Frame delivery checks both current presentation identity and the active controller/effect identity, not just a hardcoded BUSY status. Stop invalidates generation synchronously before awaiting in-flight frames. Newly queued work from an old controller is suppressed; an API write already issued cannot be recalled, so the newest presentation is ordered after it settles.

Unchanged status reports do not touch timers, phase, or unchanged titles. Explicit refresh composes the current effect frame without replacing its controller. Disappearance removes presentation state and stops/disposes the controller; reused IDs remain serialized behind any issued old writes. Recoverable failures do not poison either queue, and the next frame or status request remains possible. A permanently hung API call has the same limitation as today; no new timeout policy is introduced.

Alternative: start the new effect immediately on a second independent write queue. Rejected because an old slow write could then overwrite the newer state.

## Risks / Trade-offs

- [Refactoring loses stale-write protection] → Preserve delayed/rejected title/image regressions and add BUSY↔ATTENTION and halo→static equivalents before switching live code.
- [More frequent ATTENTION image updates] → Use a bounded 100-ms interval and per-visible-key timers; ensure disappearance and static transitions release timers. No busy-loop or additional runtime dependency.
- [Hardware renders SVG gradients differently] → Inspect actual Stream Deck rendering for several cycles, verify legibility and contrast, and tune only centralized visual parameters.
- [New attention timers leak from existing tests] → Dispose every animated test key using test cleanup, including tests previously treating ATTENTION as static.
- [Concurrent layout work touches the renderer] → Keep the frame composition boundary neutral and leave its artifacts unchanged. If layout is implemented first, adapt only at that boundary without dropping either contract.
- [Native user title overrides the status] → Preserve current title behavior; solving native-title replacement remains the separate layout change's scope.

## Migration Plan

1. Implement and verify in the ignored project `tmp/` area before replacing live plugin sources, following AGENTS.md. Do not touch the running OpenCode bridge implementation.
2. Run renderer/effect and global/project flow tests, the full Stream Deck test suite, TypeScript checking, and the Rollup build in that copy.
3. Publish verified sources/build as a coordinated, minimal replacement rather than editing live runtime incrementally; restart the Stream Deck plugin only for verification/deployment.
4. Verify global and project keys together for attention entry, multiple cycles, resolution to BUSY/static, disappearance, and reappearance. Update the status bridge documentation.
5. No persisted setting or protocol migration is needed. On deployment failure, restore only files/build outputs changed by this implementation from their saved pre-change copies; do not discard unrelated user work.
