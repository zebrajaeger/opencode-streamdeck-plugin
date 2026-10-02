## 1. Vendor sdpi-components

- [x] 1.1 Verify the component surface the dialog needs (`sdpi-item`, select, textfield, and how each exposes `value` and change events) against the pinned release, and record the findings plus the pinned version and source URL in the change folder as `component-surface.md`
- [x] 1.2 Add the built `sdpi-components.js` under `streamdeck-plugin/de.lars-brandt.opencode.sdPlugin/property-inspector/vendor/` with a short `README.md` stating version and source, and verify the file loads via a relative `<script>` tag in a scratch page with no network access
- [x] 1.3 Confirm the vendored file is included by the plugin packaging (`npm run build` in `streamdeck-plugin/` succeeds and the file is present in the built `.sdPlugin` folder)

## 2. Dialog layout primitives

- [x] 2.1 Working in `streamdeck-plugin/tmp/property-inspector/`, create the dialog stylesheet with appearance-driven custom properties for text, control, divider and background colors, and verify by opening the scratch page in both forced light and dark appearance that every text element stays legible
- [x] 2.2 Add the two-column row layout (label column right-aligned, control column flexible, shared label width per dialog) and verify in the scratch page that controls of rows with different label lengths align on the same horizontal position
- [x] 2.3 Add the titled-divider element (centered caption with a rule on each side, non-interactive) and verify activating it changes no setting and does not toggle a section
- [x] 2.4 Add the `<details>`-based section with a restyled disclosure arrow and verify collapsing hides the section's rows while expanding shows them, including keyboard activation

## 3. Project-status dialog markup

- [x] 3.1 In `tmp/`, rewrite `project-status.html` using the primitives: expanded section `Project` with divider `Source` (project selector + detail line), collapsed-by-default section `Advanced` (manual project ID), and expanded section `Display` with dividers `Name` (project name, name position, name font size) and `Status` (status position, status font size); verify every control present in today's dialog still exists exactly once
- [x] 3.2 Move each existing explanatory paragraph under its control as supporting text and verify no full-width paragraph remains between rows

## 4. Inspector wiring

- [x] 4.1 Update the `tmp/` copy of `project-status-inspector.mjs` so every `querySelector`/`value`/event binding targets the new elements, keeping `save()`, the websocket registration, the known-projects push and the exported pure helpers unchanged; verify `node --test test/project-status-inspector.test.mjs` still passes against the updated module
- [x] 4.2 Add reading and writing of the `sections` settings object (per-section booleans, unknown or missing ids fall back to the section default) through the existing `save()` path, and verify with a new unit test in `streamdeck-plugin/test/` that section state round-trips and that unknown ids fall back to defaults
- [x] 4.3 Verify by test or inspection that `sections` is additive: `normalizeProjectPresentation` is untouched and settings written by the new dialog still contain every previously stored key with the same name and type

## 5. Swap in and verify

- [x] 5.1 Replace `project-status.html` and `project-status-inspector.mjs` with the `tmp/` versions as one atomic step, then run `npm run build` and the full `npm test` in `streamdeck-plugin/` and verify both succeed
- [x] 5.2 Open the project-status key's settings in Stream Deck and verify the dialog shows the expected sections, aligned rows and titled dividers, and that exactly one `setSettings` payload is written per change (check the plugin log)
- [x] 5.3 Verify in Stream Deck that selecting a known project, entering a manual project ID, and changing each presentation setting all still update the key as before
- [x] 5.4 Verify section state persistence: collapse a section, close the dialog, reselect the same key, and confirm the section is still collapsed while the others remain expanded
- [x] 5.5 Verify the dialog in both the light and the dark Stream Deck appearance, including switching the appearance while the dialog is open, and confirm all text stays legible and no entered value is lost
- [x] 5.6 Verify a key configured before this change opens with its stored project and presentation settings intact and renders the same key image

Verification exception (user-accepted, 2026-10-02): 5.5 was checked with forced light/dark browser appearance and unchanged control values, but not by switching the actual Stream Deck appearance while open. For 5.6, an existing key's stored settings were restored and observed in the redesigned inspector, but its rendered key image was not compared with a pre-change baseline. The user explicitly accepted these remaining gaps and requested closing the tasks.
