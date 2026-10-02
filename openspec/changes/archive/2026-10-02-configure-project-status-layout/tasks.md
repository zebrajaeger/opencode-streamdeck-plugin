## 1. Settings and native-title feasibility

- [ ] 1.1 Configure project-only native title suppression using supported manifest/SDK mechanisms on a newly created view; verify it shows no native overlay and the global action remains unchanged, without adding legacy-title migration logic.
- [x] 1.2 Add projectName, namePosition, and statusPosition settings and deterministic normalization; verify tests cover blank names, defaults for newly configured views, all six valid pairs, unsupported values, and collisions.

## 2. Project-view configuration

- [x] 2.1 Add the dedicated Project name field and independent top/middle/bottom selectors; verify the UI initially selects status=middle and name=bottom and disables each occupied position in the opposite selector, including with a blank name.
- [x] 2.2 Preserve complete action settings while saving project, name, or layout changes; verify tests cover known-project selection, manual project-ID selection, unrelated settings, and inspector reopenings without lost values.
- [x] 2.3 Explain use of the dedicated name field instead of the native title; verify the instruction is visible in the inspector and matches the actual controls.

## 3. Static and animated presentation

- [x] 3.1 Add a testable project-image text compositor with bounded top/middle/bottom regions, literal XML escaping, and long-name fitting or truncation; verify SVG tests cover all six layouts, multiline/long names, special characters, and non-ASCII text without overlapping regions.
- [x] 3.2 Wire per-key name/layout state into project-action lifecycle and static status rendering without native status titles; verify OFFLINE, READY, ATTENTION, and ERROR each display correct text and immediate layout updates without a status transition.
- [x] 3.3 Apply the same text composition to every BUSY animation frame and handle live presentation changes safely; verify tests cover name/layout changes during BUSY, queued stale frames, transitions back to static states, and disappearance cleanup.
- [x] 3.4 Keep the shared renderer's existing global presentation path unchanged; verify existing animation tests pass and tests demonstrate independent layouts on multiple project keys alongside an unchanged global key.

## 4. Integration verification

- [x] 4.1 Run the project's type checks, build, and complete tests from a temporary implementation copy before replacing live code; verify all commands pass and project-only manifest title settings are valid.
- [ ] 4.2 Verify a newly configured running Stream Deck project view across all six position pairs and all five statuses, including BUSY readability, long names, inspector reopenings, plugin restart, and project changes; record observable results and confirm no duplicate native title or loss of project selection within the new configuration flow.
- [ ] 4.3 Verify a global key and multiple project keys coexist without changed aggregation or presentation leakage; record the integration result and check acceptance scenarios against the delta specification.

## 5. Independent font sizes (approved readability refinement)

- [x] 5.1 Add independent nameFontSize and statusFontSize settings, shared supported size choices, and readable defaults; verify deterministic normalization of missing and unsupported values and independence per element and per key.
- [x] 5.2 Add separate name/status font-size selections to the inspector; verify immediate saves, effective defaults, full-settings preservation through known/manual project changes, and restored selections after reopening.
- [x] 5.3 Render each element at its selected fixed size without automatic shrinking or horizontal glyph compression; normalize name line breaks and shorten overflowing text with an ellipsis. Verify all six layouts, all supported sizes, long/wide/non-ASCII text, and blank names using SVG assertions and actual Qt-rendered pixels for visibility and region bounds.
- [x] 5.4 Apply font-size updates immediately in static states and every BUSY frame; verify queued stale-frame protection, transitions, disappearance cleanup, independent project keys, and unchanged global presentation.
- [x] 5.5 Run type checks, build, complete tests, manifest validation, and Qt pixel checks in a temporary implementation copy before publishing the font-size changes to live code.
- [ ] 5.6 Verify readability and independent size changes on running Stream Deck keys, including BUSY, long names, inspector reopening, plugin restart, and project changes; record observable results without marking existing hardware acceptance tasks complete solely on automated evidence.
