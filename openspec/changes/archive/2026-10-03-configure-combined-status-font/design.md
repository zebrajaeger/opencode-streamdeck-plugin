## Context

See `proposal.md` for motivation and `specs/opencode-status-indicator/spec.md` for the behavior contract. The global action in `manifest.json` currently has no `PropertyInspectorPath` and `OpenCodeStatus` only forwards aggregate status to `StatusActionRenderer`. That renderer uses `setTitle(status)` for global keys, while configured project keys use `projectStatusImage` to overlay SVG labels on static and animated backgrounds. The project's inspector already contains a reusable font modal contract and a shared `normalizeProjectPresentation` validator. Existing changes to these project assets are staged user work; implementation must build on them without replacing them wholesale.

## Goals / Non-Goals

**Goals:**
- Keep a single font-choice vocabulary and validation for both inspectors, while storing only the global status font for global keys.
- Preserve the renderer's per-key animation lifecycle and stale-write protection when global presentation is refreshed.
- Keep project presentation and status subscription behavior independent of global appearance.

**Non-Goals:**
- Adding a project-name field, selectable project, or name/status positioning controls to the global action.
- Altering bridge aggregation, status precedence, or animation effects.
- Introducing a new font dependency or arbitrary font-face upload.

## Decisions

1. **A small global inspector backed by shared font controls.** Add a dedicated global HTML inspector containing a Display section and the same modal fields, CSS, choices, and Apply/Cancel behavior as the project inspector. Extract/reuse the font dialog event and normalization logic where practical instead of duplicating divergent validation; keep the project selector and project-specific controls in their existing inspector. Save through the same Stream Deck action-scoped `setSettings` protocol, merging the existing settings object so unrelated fields survive. Alternative: point the global action at the full project inspector; rejected because it would expose irrelevant project controls and require special-case hiding.
2. **A status-only image presentation mode.** Extend `StatusActionRenderer` with a distinct per-action-ID global font configuration, separate from its project presentation map. Render global text in the SVG at a single readable position (middle) via a shared text rendering helper that supports the same font properties, width cap, ellipsis, and explicit underline path as project labels. Ensure `compose` uses the latest settings for every effect frame and static status. Suppress the global native title in the manifest (`UserTitleEnabled`/`ShowTitle`) rather than combining an unstyleable title with an image label. Alternative: keep the native title and change only Stream Deck title settings; rejected because underline/family/color cannot be delivered consistently across effect frames.
3. **Settings lifecycle and refresh.** On global `onWillAppear`, configure the per-key font before rendering current status; on `onDidReceiveSettings`, update only that key's presentation and explicitly refresh it at the current global effective status; on disappear, clear per-key presentation along with renderer cleanup. For existing keys with absent or invalid settings use the project status font defaults (Arial, 20 px, regular, no underline, white), and keep the inspector's effective display in sync with the renderer. Preserve animation controllers on presentation-only refresh; rely on renderer versioned write queue to discard stale pending frames. Alternative: force animation restart after settings change; rejected because it needlessly resets READY/ATTENTION/BUSY phase.

## Risks / Trade-offs

- [Previously native title now image text] → Native title typography/placement can differ slightly even at default font; verify the default global key remains readable at Stream Deck size across every status, and document that exact pixel equivalence is not guaranteed.
- [Shared renderer changes affect project action] → Keep global and project presentation maps independent; run both existing project renderer/inspector tests and new global tests, including mixed-key effects.
- [Renderer and inspector could disagree on invalid values] → Normalize using shared font rules and test absent/malformed input in both places.
- [Queued animation frames may carry prior settings] → Exercise delayed writes and rapid setting changes; apply the renderer's version/current guards to global refresh as for project refresh.

## Migration Plan

No stored-settings migration is required: global keys without font settings acquire the default image-rendered label. Existing project keys keep their own fields and rendering. Rollback of the feature restores the previous native-title global presentation; any new global font settings remain inert until re-enabled.
