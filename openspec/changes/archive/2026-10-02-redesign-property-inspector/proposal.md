## Why

The property inspector for the OpenCode Project Status action is an unstyled stack of full-width labels, inputs and paragraphs. It does not look like a Stream Deck settings dialog, it is hard to scan as the number of options grows, and its ad-hoc colors are only readable in one of the two Stream Deck appearances. The reference screenshots show the expected shape: collapsible sections, label on the left and control on the right, and titled divider rules that group related options.

## What Changes

- Adopt Elgato's `sdpi-components` for the project-status property inspector and vendor the library inside the plugin so the dialog renders without network access.
- Restructure the dialog into collapsible sections with a disclosure arrow, matching the reference layout.
- Lay every setting out as a row: label right-aligned on the left, control on the right, consistent widths across rows.
- Group related settings inside a section with titled divider rules (a centered caption with a horizontal line on each side).
- Use only colors that stay legible in both the light and the dark Stream Deck appearance, driven by the Stream Deck appearance rather than fixed values.
- Persist each section's expanded/collapsed state in the action settings so reopening the dialog restores what the user left open.
- Keep every existing setting and its stored value unchanged: project selection, manual project ID, project name, name/status position, name/status font size, and the live project detail text.

## Capabilities

### New Capabilities
- `property-inspector-dialog`: Visual structure, theming and section-state behavior of the plugin's property inspector dialogs.

### Modified Capabilities
- `project-status-indicator`: The project-status property inspector's selector, manual entry and presentation controls must now be presented through the dialog capability's sectioned layout, without changing which settings exist or what they store.

## Impact

- `streamdeck-plugin/de.lars-brandt.opencode.sdPlugin/property-inspector/project-status.html` — rewritten markup and styling.
- `streamdeck-plugin/de.lars-brandt.opencode.sdPlugin/property-inspector/project-status-inspector.mjs` — element wiring moves to the new controls; adds section-state persistence.
- New vendored asset under `property-inspector/` for `sdpi-components`.
- Action settings gain a non-behavioral `sections` field; existing settings keys are untouched, so configured keys keep working.
- No change to the plugin runtime, bridge protocol, or key rendering.
