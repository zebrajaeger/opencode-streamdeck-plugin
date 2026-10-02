# sdpi-components surface (v4.0.1)

Pinned build: https://sdpi-components.dev/releases/v4/sdpi-components.js (header identifies v4.0.1). Elgato's local-install instructions: https://docs.elgato.com/streamdeck/sdk/guides/ui

Inspected the built release:

- `sdpi-item` accepts a `label` attribute and renders its light-DOM children in a slot alongside its own fixed-width (95px) label grid. Its label click focuses the first child exposing `canFocus`. For a dialog-wide adjustable grid, use the controls directly in our shared row grid instead of nesting `sdpi-item` rows (which have their own fixed grid).
- `sdpi-select` accepts light-DOM `<option>` children (observed by a MutationObserver), exposes `value` and `disabled` properties, and updates `value` on the inner select's `change` event. The base value setter dispatches `valuechange` on the custom element; the native `change` event from the shadow root is not a reliable public event. Its options are rendered inside a shadow root, so `.options` on the host is unavailable. It also waits for its asynchronous option list before enabling the select.
- `sdpi-textfield` exposes `value`, `disabled` and `placeholder` properties. Its internal input updates `value` on `input`, emitting `valuechange` from the host. Use `valuechange` (not `change`) when binding it; programmatic value writes also emit this event, so render paths must suppress writes.
- A `setting` attribute on either control activates the library's own settings synchronization and writer. Omit `setting` entirely when the existing inspector owns settings. The release wraps `window.connectElgatoStreamDeckSocket` and opens its own websocket when that wrapper is invoked; loading the inspector module afterward replaces that callback with our original callback before Stream Deck invokes it, avoiding a second connection.
- The release injects a dark body background and defaults controls to dark colors. Appearance overrides must be supplied by the dialog stylesheet (including its injected background rule).
