# Invisible project text: Qt rendering regression

## Reproduction

The original compositor put labels inside nested `<svg>` viewports. Qt's SVG renderer accepted the image as valid but rendered zero bright text pixels in the status band. Changing fonts or removing text fitting attributes did not fix the symptom. Replacing nested viewports with flat translated `<g>` elements produced 228 visible status-text pixels for the READY fixture.

## Fix and verification

`src/actions/project-status-image.mjs` now emits flat groups and bounds long labels using single-line normalization, a conservative character limit, and font sizing. It does not depend on nested viewports or textLength support.

- `uv run --with PySide6 python test/render-project-text.py`: 150 Qt-rendered fixtures passed, covering six layouts, five statuses, and blank, ordinary, long, multiline, and non-ASCII names. Tests assert actual visible pixels in occupied regions and no bright pixels outside those regions.
- `npm test`: 87/87 passed in the temporary implementation copy.
- `npx tsc --noEmit`: passed in the temporary implementation copy.
- `npm run build`: passed in the temporary implementation copy.
- Published the compositor and regression tests after verification. The live Rollup watcher rebuilt the bundle; the rebuilt bundle contains the flat-group implementation.
- `npx streamdeck restart de.lars-brandt.opencode`: succeeded.

PySide6 is verification tooling only, not a runtime dependency. The hardware acceptance tasks remain open pending observation of the updated key.
