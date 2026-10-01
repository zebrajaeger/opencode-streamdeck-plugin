## 1. Known-project metadata

- [x] 1.1 Add a validated, versioned global-settings store for last-known `projectID` to directory metadata and verify its unit tests cover loading, merging, malformed settings, and restart persistence.
- [x] 1.2 Extend bridge-handshake handling to publish qualifying project ID and directory metadata without changing status aggregation, and verify bridge-server tests cover missing metadata and directory updates.
- [x] 1.3 Wire metadata loading and serialized persistence into plugin startup and handshake updates, and verify a known project remains available after recreating the plugin-side services.

## 2. Project-status selector

- [x] 2.1 Add a project-status action interface that supplies known projects to an open property inspector and verify action tests cover the initial and refreshed selector payloads.
- [x] 2.2 Replace the normal free-text project-ID inspector control with a known-project dropdown that uses directory names, full-path detail, and collision disambiguation; verify the inspector's message handling and generated settings payloads.
- [x] 2.3 Retain an advanced manual project-ID path for unknown projects and verify it saves the existing `projectID` setting and produces the expected offline behavior.

## 3. Integration verification

- [x] 3.1 Add end-to-end tests covering selection of a connected project, an offline persisted project after restart, and a reconnect from a different directory.
- [x] 3.2 Run the Stream Deck and OpenCode bridge test suites and the Stream Deck production build; verify all commands exit successfully.
