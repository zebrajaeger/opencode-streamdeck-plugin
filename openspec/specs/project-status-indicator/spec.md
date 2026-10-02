## Purpose

Provide configurable Stream Deck keys that summarize the current OpenCode status for one selected project without mixing in other connected projects.

## Requirements

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

### Requirement: Project-scoped status aggregation
The system SHALL aggregate only the bridge connections, sessions, and unanswered permission requests that identify the configured project, using descending precedence `ATTENTION`, `ERROR`, `BUSY`, `READY`, and `OFFLINE`.

#### Scenario: Another project requires attention
- **WHEN** the configured project is ready and a different connected project has an unanswered permission request
- **THEN** the configured project's action displays `READY`

#### Scenario: Configured project requires attention
- **WHEN** one or more connections for the configured project have an unanswered permission request
- **THEN** the configured project's action displays `ATTENTION`

#### Scenario: Multiple connections represent one project
- **WHEN** two or more active bridge connections identify the configured project and one of them reports a busy session
- **THEN** the configured project's action displays `BUSY` unless a higher-priority status exists for that project

### Requirement: Project availability state
The system SHALL display `OFFLINE` for a configured project when no active bridge connection identifies that project.

#### Scenario: Configured project is not connected
- **WHEN** no active bridge connection identifies the configured project ID
- **THEN** the action displays `OFFLINE`

#### Scenario: Final project connection disconnects
- **WHEN** the last active bridge connection for the configured project disconnects
- **THEN** the action updates to display `OFFLINE`

### Requirement: Project identity isolation
The system SHALL obtain project identity from the OpenCode bridge connection handshake and SHALL not infer project membership from a directory path or session identifier.

#### Scenario: Projects have distinct identifiers
- **WHEN** two connected bridges report distinct project IDs
- **THEN** their sessions and permission requests contribute only to the action configured for their respective project ID

#### Scenario: A bridge omits project identity
- **WHEN** a bridge connection does not provide a project ID
- **THEN** its state does not contribute to any project-status action

### Requirement: Global status compatibility
The system SHALL retain the existing global status action, and it SHALL continue aggregating the status of all connected bridge instances regardless of their project IDs.

#### Scenario: Project and global keys coexist
- **WHEN** a global status action and one or more project-status actions are present on Stream Deck
- **THEN** each action updates according to its own aggregation scope

### Requirement: Stable presentation for a single project instance
With one OpenCode instance for the configured project, the project-status action SHALL retain its displayed effective status while the reported aggregate remains unchanged. Repeated identical reports SHALL NOT rewrite an unchanged static image or title, restart the BUSY animation, or introduce artificial READY, BUSY, or OFFLINE transitions. Legitimate status transitions SHALL remain immediate, without added debounce or minimum-display delays. Simultaneous OpenCode instances of the same project are outside this requirement's acceptance scope.

#### Scenario: Connected project remains inactive
- **WHEN** a connected project's single source remains idle and repeatedly reports unchanged state
- **THEN** its visible key remains READY without periodic image or title rewrites

#### Scenario: Connected project remains busy
- **WHEN** a connected project's single source continuously reports busy or retry activity without a higher-priority state
- **THEN** the key remains BUSY with a continuously advancing animation
- **AND** repeated BUSY reports do not restart that animation or introduce READY frames

#### Scenario: Another project emits unchanged or changing reports
- **WHEN** another project's source emits events that do not change the configured project's effective status
- **THEN** the configured project's key is not redrawn because of those events

#### Scenario: Actual work completes
- **WHEN** the configured project's final working session becomes idle and no higher-priority state applies
- **THEN** the key promptly changes from BUSY to READY and stops its animation

#### Scenario: Attention, failure, or disconnection is real
- **WHEN** the configured project's effective status changes because of an attention request, execution failure, error expiry, or connection loss
- **THEN** the key promptly displays the new status according to the existing precedence and expiry rules

### Requirement: Initial and explicit presentation refreshes remain available
Status subscriptions SHALL deliver an initial effective status and subsequent changed effective statuses independently for each scope. A newly visible or reappearing project key SHALL render its current status even when that status has not changed. Explicit changes to project selection or presentation SHALL NOT be suppressed by unchanged-status detection.

#### Scenario: Key appears while the project is READY
- **WHEN** a key becomes visible while its configured project is already READY
- **THEN** it renders READY once without needing another status transition

#### Scenario: Key reappears during work
- **WHEN** a previously hidden key reappears while its project is BUSY
- **THEN** it starts its own current BUSY animation without affecting other visible keys

#### Scenario: Project selection changes to another READY project
- **WHEN** the user changes the selected project while both projects have effective status READY
- **THEN** the subscription switches to the new project and any required presentation refresh remains possible

#### Scenario: Presentation is explicitly updated
- **WHEN** the action explicitly requests a presentation refresh while its effective status is unchanged
- **THEN** the key reflects that presentation update rather than treating it as a redundant status notification
