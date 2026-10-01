## Purpose

Provide configurable Stream Deck keys that summarize the current OpenCode status for one selected project without mixing in other connected projects.

## Requirements

### Requirement: Configurable project status display
The system SHALL provide a display-only Stream Deck action whose instance settings identify the OpenCode project to monitor by its OpenCode project ID.

#### Scenario: Configured project is active
- **WHEN** a project-status action is configured for a project ID that has one or more active bridge connections
- **THEN** the action displays that project's aggregated status

#### Scenario: Project selection is changed
- **WHEN** a user saves a different project ID in a project-status action's settings
- **THEN** the action updates to display the newly selected project's current status

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
