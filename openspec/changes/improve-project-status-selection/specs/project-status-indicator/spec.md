## MODIFIED Requirements

### Requirement: Configurable project status display
The system SHALL provide a display-only Stream Deck action whose instance settings identify the OpenCode project to monitor by its OpenCode project ID. The property inspector SHALL let users select known OpenCode projects by human-readable directory-derived labels while storing the selected project's OpenCode project ID as the action setting. It SHALL provide an advanced manual project-ID entry for a project that is not known to the selector.

#### Scenario: Configured project is active
- **WHEN** a project-status action is configured for a project ID that has one or more active bridge connections
- **THEN** the action displays that project's aggregated status

#### Scenario: User selects a known project
- **WHEN** a user chooses a known project from the property inspector's project selector
- **THEN** the action saves that project's OpenCode project ID and updates to display the selected project's current status

#### Scenario: Manual project ID is saved
- **WHEN** a user saves an OpenCode project ID through the advanced manual entry
- **THEN** the action updates to display that project's current status

#### Scenario: Project selection is changed
- **WHEN** a user saves a different project ID in a project-status action's settings
- **THEN** the action updates to display the newly selected project's current status

## ADDED Requirements

### Requirement: Human-readable known-project selection
The system SHALL retain display metadata for every bridge handshake that supplies both an OpenCode project ID and a non-empty project directory. The property inspector SHALL offer those projects as known selections, using the final directory name as the primary label and the complete directory path as supporting detail. When primary labels collide, the selector SHALL include enough of the full directory path to distinguish the entries.

#### Scenario: Connected project appears in selector
- **WHEN** a bridge handshake supplies a project ID and project directory
- **THEN** the property inspector offers the project by a directory-derived label instead of requiring the user to discover its project ID

#### Scenario: Directory names collide
- **WHEN** two known projects have the same final directory name and different full directory paths
- **THEN** the property inspector distinguishes their selectable entries using their paths

#### Scenario: Handshake lacks display metadata
- **WHEN** a bridge handshake omits either the project ID or project directory
- **THEN** the handshake does not create a selectable known-project entry

### Requirement: Persistent offline project labels
The system SHALL persist each known project's last-known directory-derived display metadata across Stream Deck plugin restarts. A configured project status action SHALL remain configured by its project ID and SHALL present its retained human-readable label when its project has no active bridge connection.

#### Scenario: Configured project is offline after restart
- **WHEN** a project-status action is configured for a previously known project and the Stream Deck plugin restarts while that project is not connected
- **THEN** the property inspector retains the project's last-known directory-derived label and the action displays `OFFLINE`

#### Scenario: Project reconnects from a different directory
- **WHEN** a known project ID later connects with a different project directory
- **THEN** the system updates that project's persisted display metadata with the newly reported directory
