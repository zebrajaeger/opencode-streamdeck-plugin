## Why

A Matrix-inspired green character rain offers another recognizable background style, but desktop-scale dense code rain becomes illegible on a 72×72 Stream Deck key. Add a deliberately sparse, small-display-optimized effect to the READY background selection introduced by `configure-ready-background-renderer`.

## What Changes

- Add a continuously animated Matrix background with descending green character trails, brighter heads, and a dark base, designed and verified at 72×72 physical pixels.
- Extend both global and project READY selectors with Matrix (`readyBackground: "matrix"`) after `configure-ready-background-renderer` is implemented. Keep Plasma as the default and retain every existing choice.
- Preserve steady, readable status and project labels, existing typography/layout settings, and the independently scoped animation lifecycle for each visible key.
- Reuse the existing SVG image composition and serialized animation controller; introduce no runtime dependency, animated image asset, or bridge/protocol changes.
- Treat the prerequisite change as an implementation dependency, not as authorization to implement it within this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `status-background-animation`: Add Matrix to the prerequisite's per-key READY choices and specify its compact visual appearance, continuous motion, readability, and lifecycle integration.

## Impact

- New effect module under `streamdeck-plugin/src/actions/`, effect dispatch in `status-action-renderer.ts`, and the shared READY-choice normalization/types planned by `configure-ready-background-renderer`.
- READY selectors in both packaged property inspectors; existing action-settings forwarding is reused.
- Effect, normalization, inspector, and renderer tests, plus native-size visual verification and a Stream Deck build.
- Depends on the selection infrastructure and generalized READY contracts from `configure-ready-background-renderer`. Current main specs still mandate Plasma; apply/sync the prerequisite first rather than restoring that obsolete restriction or overwriting its requirements.
- Preserve existing uncommitted font/layout work. No changes to `opencode-plugin`, status aggregation, non-READY backgrounds, default settings, or stored values for existing choices.
