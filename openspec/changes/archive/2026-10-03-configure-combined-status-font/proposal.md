## Why

The global (combined) OpenCode Status key has no property inspector, so its status text cannot be styled even though the project-status key already offers a font dialog. Users should be able to configure the combined status text with the same controls without changing which projects contribute to the global status.

## What Changes

- Add a property inspector for the global status action with a Display section and the existing status-font dialog (family, size, style, underline, color).
- Persist font choices per global key, restore them on reopening, and apply them to the global status label in static and animated states; keep an unconfigured key visually equivalent to its current default status presentation wherever possible.
- Render the configured global status text in the key image instead of the native title so all supported font attributes, including underline and color, work consistently. Suppress the native title to avoid duplicate text.
- Leave global aggregation, status transitions, and project-key settings untouched; no project name or selection controls are added to the global inspector.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opencode-status-indicator`: Allow per-key configuration of the global status label through the existing status-font dialog and render it consistently in all states without changing aggregation.

## Impact

The global action manifest and inspector assets, `OpenCodeStatus`, shared status rendering/image composition, and inspector/runtime tests will be affected. The existing project font normalization and modal can be reused; no bridge protocol or external dependencies are required. The existing native global title will be replaced by an image-drawn status label so customized text appearance is actually visible.
