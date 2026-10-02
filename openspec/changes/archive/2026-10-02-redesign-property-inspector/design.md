## Context

See proposal.md — Why.

The only property inspector today is `property-inspector/project-status.html`: a single `<style>` block of hand-written rules, full-width `label`/`select`/`input` stacks, explanatory `<p>` elements with a hard-coded `#666`, and one `<details>` block for the advanced project ID. Its logic lives in `project-status-inspector.mjs`, which opens the Stream Deck websocket itself (`connectElgatoStreamDeckSocket`), reads settings from `actionInfo`, and wires each control by `document.querySelector("#id")` with a `save({...})` call per `change` event. Presentation values are normalized by the shared `project-presentation.mjs`, which the plugin runtime also imports — that module is the contract between dialog and key rendering and must stay untouched.

Constraints that shape the approach:
- The dialog is a plain web page inside Stream Deck, no bundler step of its own; `.mjs` files are loaded directly from the `.sdPlugin` folder.
- `project-status-inspector.mjs` exports pure helpers (`projectOptions`, `projectSettings`, `knownProjectsFromGlobalSettings`, `mergeKnownProjects`, `inspectorRegistration`) that are unit-tested; the redesign must not break those exports.
- Per AGENTS.md, edits happen in `tmp/` first and are swapped in atomically.

## Goals / Non-Goals

**Goals:**
- A dialog whose visual grammar matches the reference screenshots: disclosure-arrow sections, aligned label/value rows, captioned divider rules.
- Legibility in both Stream Deck appearances with no appearance-specific tuning by hand.
- A layout pattern that a second action's inspector can reuse later without copying CSS.

**Non-Goals:**
- No new settings, no removed settings, no change to how settings are stored or normalized.
- No sliders or color pickers (the reference screenshots show them; this action has none).
- No property inspector for the global `OpenCode Status` action — it still has none.
- No change to key rendering, the bridge protocol, or `project-presentation.mjs`.

## Decisions

**Use `sdpi-components`, vendored into the plugin.**
The user chose it over hand-rolled CSS. It gives the native Stream Deck look and appearance-adaptive colors for free, which is exactly the hardest part of the request to get right by hand. The library is normally loaded from a CDN; the dialog must work offline, so the built `sdpi-components.js` is committed under `property-inspector/vendor/` and referenced by a relative `<script>` tag. Alternative considered: own CSS with `prefers-color-scheme` custom properties — rejected because it reimplements control styling the library already matches to the host app.

**Keep the existing websocket wiring; let the components only render.**
`sdpi-components` can manage settings itself through its own websocket connection, but `project-status-inspector.mjs` already owns registration, `getGlobalSettings`, the `sendToPropertyInspector` known-projects push, and the `save()` merge through `normalizeProjectPresentation`. Handing settings ownership to the library would duplicate that connection and risk two writers of the same payload. So the components are used for layout and controls, and the existing code continues to read/write values via `querySelector` on the component elements and its own `setSettings`. This also keeps the tested pure helpers intact. Alternative considered: full `sdpi-components` settings binding — rejected for the double-writer risk and the loss of the known-projects push path.

**Sections are `<details>`-based.**
The disclosure arrow, keyboard activation and expanded/collapsed semantics come free from `<details>`/`<summary>`; the arrow is restyled to the reference's triangle. Section state is read from `details.open` on `toggle` and written into settings. Alternative considered: custom button + `hidden` div — more code, worse accessibility.

**Section state lives in a single `sections` settings object.**
Shape: `{ sections: { "<section-id>": boolean } }`, written through the same `save()` path. Unknown or missing ids fall back to the section's default, so adding or renaming a section later degrades gracefully. The runtime ignores the field; `normalizeProjectPresentation` is not extended, because this is dialog state, not key presentation. Persisting per action (not globally) follows the user's choice.

**Sections and groups for this action:**
- `Project` (expanded by default): divider `Source` → project selector + detail line.
- `Advanced` (collapsed by default): manual project ID.
- `Display` (expanded by default): divider `Name` → project name, name position, name font size; divider `Status` → status position, status font size.

**Divider rule is one CSS class.**
A `.sdpi-group-title` element rendered with a centered caption and `flex` pseudo-element rules on each side, colored from the same appearance-driven custom properties as the rest of the dialog. It is non-interactive and carries no ARIA role, matching the spec requirement that it is not a control.

**Row layout is a two-column grid.**
A grid with a fixed label column (right-aligned) and a flexible control column, applied at the section level so every row in a dialog shares one label width. Today's explanatory `<p>` elements move under their control as small supporting text, spanning the control column only.

## Risks / Trade-offs

- **Vendored library drifts from upstream and is never updated** → Record the pinned version and source URL next to the vendored file so a later bump is a one-line decision.
- **`sdpi-components` custom elements expose values differently from native `<select>`/`<input>`, breaking the existing `querySelector`/`value` wiring** → Verify the value and event surface of each component used before converting the file, and keep the native element inside the component where the library supports it.
- **The library's own settings handling activates implicitly and competes with `save()`** → Confirm in a manual dialog test that only one `setSettings` payload is written per change; if the library insists on binding, fall back to its binding for presentation fields only and keep project selection on the existing path.
- **Light appearance is only reachable by switching the Stream Deck app theme, so it is easy to leave unverified** → Treat both appearances as explicit manual verification steps, not an afterthought.
- **Settings written by the redesigned dialog must stay readable by already-configured keys** → The `sections` field is additive and every existing key keeps its name and type; verified by opening a key configured before the change.

## Migration Plan

No data migration. The dialog is replaced in place; old settings load unchanged and `sections` appears on first toggle. Rollback is restoring the previous `project-status.html` and `project-status-inspector.mjs`; a leftover `sections` field in settings is then ignored.
