## Context

The global status action currently renders each visible Stream Deck key as a static SVG when the aggregated status changes. The status bridge and registry already supply the required `BUSY` value and remain outside this change. See `proposal.md` for motivation and the change specifications for behavior requirements.

## Goals / Non-Goals

**Goals:**
- Give each visible global status key a calm, visually changing particle-network image while it is `BUSY`.
- Keep animation state, timer ownership, rendering, and cleanup local to each key/action instance.
- Restore the existing static status image immediately when a key leaves `BUSY`.
- Keep rendering deterministic under tests by allowing the particle state and frame advancement to be controlled without waiting for wall-clock animation intervals.

**Non-Goals:**
- Changing global-status aggregation, bridge messages, or the Stream Deck action UUID.
- Adding user-facing animation settings, GIF/video assets, or third-party runtime dependencies.
- Synchronizing animation phases across keys or preserving a key's animation phase after it disappears.

## Decisions

### Use a reusable TypeScript animation component per key

Create an animation component that owns the particle positions and velocities, frame interval, SVG rendering, and start/stop lifecycle for one `KeyAction`. The status action stores one component for each visible key and delegates BUSY lifecycle transitions to it.

This makes cleanup explicit and prevents a shared timer or particle state from coupling visible keys. A single shared renderer/timer was considered but rejected because a disappearing key could affect other keys and would complicate independent lifecycle tests.

### Render SVG data URIs directly through the existing image API

Each animation frame is an SVG with a dark background, moving particle circles, and distance-limited connecting lines. The component encodes it as a Data URI and supplies it with `KeyAction.setImage()`, matching the existing static status-image path.

This keeps the plugin self-contained and compatible with the existing Stream Deck image contract. GIF/video assets and an additional animation dependency were rejected because they add distribution/runtime complexity and reduce control over cleanup.

### Centralize initial visual and performance parameters

The component exposes module-level constants for canvas size, particle count, movement speed, connection distance, colors, and frame interval. Initial particle placement and updates are deterministic when supplied a controllable random/frame source in tests.

This permits later visual tuning without creating a user configuration surface. Hard-coding values throughout rendering was rejected because it would make tuning and test control unnecessarily difficult.

### Serialize rendering transitions per key

Starting an animation renders an initial frame, then schedules future frames. Stopping clears the interval before setting the static image. The component guards against late asynchronous frame completion after stopping, so a stale BUSY frame cannot overwrite a newer non-BUSY image.

This preserves the requirement that status transitions restore the regular image. Allowing concurrent unguarded `setImage()` calls was rejected because asynchronous completion could show an obsolete state.

### Dispose animation on the action disappearance lifecycle event

The status action handles the key-disappearance lifecycle event, stops the associated animation, and removes it from its per-key collection. Reappearing keys create a fresh component and render based on the current global status.

This releases timers and action references for removed keys. Retaining animation instances for possible reuse was rejected because it risks sending frames to removed keys and offers no behavioral benefit.

## Risks / Trade-offs

- [Rapid image updates consume more Stream Deck/plugin resources than a static image] → Use a modest frame interval and small fixed particle count, both centrally tunable.
- [Asynchronous image updates can race with a status change or disappearance] → Stop timers first and use a lifecycle generation/active-state guard before applying a frame.
- [Random particle motion can make tests flaky] → Inject or isolate deterministic particle initialization and frame advancement for unit tests.
- [An animation can reduce legibility of the status title] → Preserve the existing textual `BUSY` title and use a restrained color palette and motion.

## Migration Plan

1. Add the reusable animation component and focused unit tests for frame rendering, start/stop behavior, and cleanup.
2. Integrate it with the global status action's status-update and key lifecycle handling.
3. Build and run the plugin test suite; verify a visible key animates only while the aggregate status is `BUSY`.
4. Roll back by removing the animation integration; the existing static BUSY image remains the fallback behavior and no protocol or persisted data migration is required.
