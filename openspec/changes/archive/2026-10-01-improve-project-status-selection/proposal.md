## Why

Project-status keys currently require a manually copied opaque OpenCode project ID. The bridge already knows the connected instance's directory, so the Stream Deck property inspector can offer an understandable project selection experience without weakening the stable identity used for status aggregation.

## What Changes

- Replace the normal project-ID text-entry workflow with a dropdown of known and currently connected OpenCode projects, labelled from their concrete `location.directory` paths.
- Persist last-known project display metadata across Stream Deck plugin restarts, so configured keys remain understandable while their project is offline.
- Retain the OpenCode project ID as the sole configured aggregation key and provide a manual ID entry as an advanced fallback for projects that have not yet connected.
- Show full directory paths as supporting detail and disambiguate projects whose directory names collide.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-status-indicator`: Make configuring a project-status key human-readable while preserving project-ID-based isolation and offline behavior.

## Impact

- Stream Deck project-status action settings and property inspector UI.
- Local status bridge project metadata exposed from connection handshakes.
- Stream Deck global plugin settings used to store display metadata.
- Project-status action, bridge-server, and UI tests.
