## Context

See `proposal.md` for motivation. The current source contains three `BackgroundEffect` implementations and a `BackgroundAnimation` controller that owns timers, cancellation, serialized delivery, and refresh. Images use a 144×144 SVG coordinate system, which must remain compatible with a 72×72 physical key. `StatusActionRenderer` currently dispatches solely by status; the active prerequisite `configure-ready-background-renderer` plans an explicit effect identity and shared `ready-background.mjs` choice normalization. Those planned interfaces are not implemented in the inspected working tree.

The prerequisite delta adds `Per-key READY background selection` and generalizes existing plasma-only requirements. This change modifies that prerequisite requirement, including its complete scenarios, and adds Matrix-specific requirements. Apply and sync the prerequisite before this dependent delta; the modified requirement does not exist in today's main spec. Do not change the prerequisite's planning files or reintroduce its pre-selection plasma-only contracts.

Read-only graph discovery identifies the shared renderer in both global/project appearance and settings flows. Source inspection additionally finds uncommitted font/layout work, including `configureGlobal` and steady label composition in `project-status-image.mjs`. The renderer composes the effect first, then the effective-status glyph and label overlays. Qt SVG support already requires flat groups rather than nested SVG. Existing effect tests use an injected clock, inspect bounded SVG geometry, and reject unsupported animation/filter constructs.

## Goals / Non-Goals

**Goals:**
- Keep the new effect geometry-only and deterministic under an injected monotonic clock.
- Make tiny character shapes and movement legible after 2:1 downsampling, without depending on installed fonts.
- Extend the prerequisite's existing selection/factory seam, rather than introducing another setting or controller.

**Non-Goals:**
- Implementing the prerequisite, selecting backgrounds for non-READY states, or changing status aggregation.
- Full-density cinematic code rain, authentic Japanese glyph fonts, adjustable speed/color/density, or a preview dialog.
- Changes to the OpenCode plugin, protocol, typography settings, or existing effect geometry/timing.

## Decisions

### 1. Add one READY effect identity

Extend the prerequisite's shared choice list and declaration types with `matrix` / `Matrix`, and its explicit factory with `MatrixBackgroundAnimation` in a new `matrix-background-animation.ts` module. Both inspectors consume the shared choices; retain `plasma` as normalization fallback. Reuse action settings forwarding, active-effect identity comparison, same-selection refresh, and disposal without broad renderer rewrites.

Alternative: a separate Matrix toggle or replacing the READY default. Rejected because the user explicitly wants an additional option after the selector exists.

### 2. Sparse bitmap-style character geometry

Use a small fixed alphabet of recognizable 3×5 bitmap letters/digits, encoded as flat SVG path geometry rather than SVG text. Start with six columns, a 20-unit column pitch, 16-unit row pitch, and glyphs built from 2×2 SVG-unit cells: each stroke becomes one physical pixel at 72×72. Each trail has a head and three or four progressively dimmer glyphs. Keep a dark `#101216` base, restrained green tails, and light-green heads; avoid white flashes, glow filters, nested SVG, and external font/image references.

Clip character paths by emitted visible cells within the 144×144 canvas instead of relying on nested SVG. Bound output to at most 30 glyphs and 25 KB per frame. Small adjustments to column count, speeds, brightness, and tail length are allowed during visual verification while retaining sparse character rain and these bounds.

Alternative: dense desktop-style text columns with Katakana or a custom font asset. Rejected because subpixel glyphs and font fallback are unreliable at the target size and assets add packaging complexity.

### 3. Monotonic time and staggered trails

Use a 150 ms frame interval like plasma and inject `now` through the existing renderer options. Compute head row, trail position, and character substitutions from elapsed time, with deterministic per-column offsets and distinct speeds (initially about three to five physical pixels/second). Wrap each column only after its tail leaves the canvas, with offscreen spacing before re-entry. Avoid random regeneration in `background()` so repeated rendering at one time is stable and settings refreshes cannot mutate the rain. `advance()` can remain a no-op as in plasma.

Alternative: advance by delivered-frame count or randomize every frame. Rejected because slow writes then change apparent speed and refreshes visibly jump.

### 4. Preserve foreground composition

Continue passing READY, not Matrix, to glyph/title/label composition. Keep the green READY glyph and existing font/color/position settings. Limit background brightness and attenuate rain behind the existing top/middle/bottom text-band regions using geometry/opacity, so supported label positions remain readable without changing typography or adding panel overlays to other effects. Validate with default white labels and representative existing fonts; user-chosen unreadable colors are not corrected automatically.

Alternative: hide labels or remove the READY glyph to make room for rain. Rejected because the feature changes a background, not status presentation. Keep sufficient visible rain around overlays and verify this at native size.

### 5. Verify behavior and actual tiny rendering

Add `matrix-background-animation.test.mjs` following the clock-controlled plasma tests: deterministic frame capture, descending heads, fading tails, staggered wrapping, bounded finite coordinates/payload, and font-independent SVG. Extend the prerequisite's normalization, inspector, and renderer tests to include Matrix, restore/save preservation, live switches, non-READY changes, mixed keys, phase-stable refresh, delayed/rejected writes, disappearance, and reused IDs.

Capture several composed frames at different times with global labels and each supported project text position; rasterize/display at exactly 72×72 without magnification. Review a short native-size sequence over multiple wraps, not just static SVG assertions. An isolated browser page can inspect SVG/inspector behavior, but the final check must include actual Stream Deck/Qt rendering when available; record any hardware-verification limitation rather than claiming it passed.

## Risks / Trade-offs

- [READY-selection infrastructure is not implemented yet] → Block apply until the prerequisite is implemented and its spec baseline is synced; do not silently fold it into this work.
- [Small glyphs turn into noise or overlays conceal the rain] → Integer-aligned bitmap shapes, sparse columns, restrained brightness, and native-size composed-frame review.
- [SVG differs between browser and Qt] → Flat path geometry and no font/filter dependency; verify on the physical key when available.
- [New factory branch regresses lifecycle behavior] → Reuse the shared controller and run existing slow-write, failure, settings, and multi-key tests with Matrix.
- [Overlapping uncommitted font/layout work] → Preserve current files and settings fields; make only targeted integration edits after fresh impact analysis during apply.

## Migration Plan

First implement `configure-ready-background-renderer` and sync its deltas into the main specs. Then add and verify Matrix, run the full Stream Deck test suite, build the bundle, and deploy through the existing Stream Deck workflow. No settings migration or OpenCode bridge deployment is needed: existing selections/defaults remain unchanged. Rollback removes the Matrix choice/factory; persisted `matrix` values then follow the prerequisite's unsupported-value fallback to Plasma.
