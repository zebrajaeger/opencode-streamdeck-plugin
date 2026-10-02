## Why

A custom title entered in Stream Deck currently replaces the project-status text because both use the same native title channel. Project views need an independently positioned name and status so naming a key does not hide its status.

## What Changes

- Add separate project-name and status position selectors to each project view's configuration, offering top, middle, and bottom.
- Add a dedicated project-name text field to the project view's property inspector; use it instead of the native Stream Deck title field.
- Default newly configured project views to status in the middle and name at the bottom.
- Disable the position occupied by one element in the other element's selector so both cannot occupy the same position.
- Display the custom project-view name and current status simultaneously, including during the BUSY animation.
- Compose both texts in the project view's image and disable its native title display to avoid competing overlays.
- Persist layout per key without losing project selection or unrelated settings.
- Keep the global status view and project aggregation behavior unchanged.
- Exclude migration and compatibility handling for pre-existing project-key configurations; users can configure new project views.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-status-indicator`: Add independent, persistent, non-overlapping name and status positions and ensure custom names do not replace status text.

## Impact

- Project-status action settings and project-action manifest title configuration.
- Project-status property inspector controls and settings preservation.
- Project-specific image composition for static states and animated BUSY frames; shared renderer changes must preserve the global action's behavior.
- Tests for layout defaults, all valid position pairs, collisions, persistence, and simultaneous name/status display on newly configured views.
- No bridge protocol, project identity, status precedence, or additional runtime dependency is required by this proposal.
