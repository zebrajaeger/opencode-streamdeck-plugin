## Why

Small cellular automata can provide lively sparks, calm organic motion, and fading particle trails that remain recognizable on a 72×72 Stream Deck key. Extend the configurable READY backgrounds after `configure-ready-background-renderer` with three distinct, indefinitely running alternatives rather than conventional Life that can become static.

## What Changes

- Add Brian's Brain, Day & Night, and Generations + Trails as independently selectable READY backgrounds for both global and project keys.
- Use a 24×24 simulation grid, displayed as 3×3 physical pixels per cell on a 72×72 key, with a dark base and subdued palettes that preserve label readability.
- Implement Brian's Brain's three-state sparks, Day & Night's `B3678/S34678` organic structures, and five-state Generations with birth at two active neighbors and decaying trails.
- Recover from extinction or sustained low activity through small local seed injections, not visible whole-grid resets.
- Preserve Plasma as default, existing selections and settings, READY labels, and the prerequisite's independent, serialized lifecycle and live switching behavior.
- Exclude Seeds, HighLife, Life without Death, adjustable rules/speed/palettes, and selection for non-READY statuses.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `status-background-animation`: Extend per-key READY selection with three compact cellular backgrounds, precise evolution rules, localized recovery, readable rendering, and stable lifecycle integration.

## Impact

- New cellular simulation/effect modules under `streamdeck-plugin/src/actions/`, READY effect dispatch in `status-action-renderer.ts`, and the shared `ready-background.mjs` normalization/types introduced by the prerequisite.
- Both packaged property inspectors' READY choice lists; reuse existing action-settings forwarding and SVG/text composition.
- Rule-level tests, effect tests, normalization/inspector tests, renderer lifecycle tests, and native 72×72 visual verification; no new runtime dependencies.
- Implementation dependency: finish and verify `configure-ready-background-renderer` first. Its deltas generalize main specs that currently mandate Plasma. This change does not implement that prerequisite or modify those main specs during planning.
- Coordinate the overlapping `add-matrix-background-animation` selector delta additively, preserving Matrix if present. Matrix is not an implementation dependency.
- Preserve uncommitted font/layout work. No changes to `opencode-plugin`, bridge/protocol, status aggregation, project scope, click behavior, or non-READY backgrounds.
