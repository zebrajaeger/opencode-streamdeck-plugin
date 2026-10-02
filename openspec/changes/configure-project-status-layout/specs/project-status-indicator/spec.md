## ADDED Requirements

### Requirement: Dedicated project-view name
Newly configured project-status views SHALL provide their own project-name text field in their configuration. The configured name SHALL be a display label only and SHALL NOT change the selected OpenCode project ID or status aggregation. The native Stream Deck title SHALL NOT replace or duplicate the configured name or status in these views. A blank project-name field SHALL leave the name region empty while keeping the status visible. Migration of project-key configurations created before this change is outside this capability extension's scope.

#### Scenario: User names a project view
- **WHEN** the user enters a project name in the project-status action's configuration
- **THEN** the key displays that name and its current status simultaneously
- **AND** the selected project ID is unchanged

#### Scenario: User clears the project name
- **WHEN** the user clears the project-name field
- **THEN** the key shows its current status without a project-name label

#### Scenario: Native title does not compete with the layout
- **WHEN** a newly configured project-status view uses the configured name and status layout
- **THEN** no native title is displayed over that layout

### Requirement: Independently configurable name and status positions
The project-status action SHALL provide separate position selectors for the project name and status, each offering top, middle, and bottom. The default status position SHALL be middle and the default name position SHALL be bottom. Each selection SHALL update the visible key without requiring a status transition. The selections SHALL apply independently to each project-status key.

#### Scenario: Newly configured view uses default positions
- **WHEN** the user creates a new project-status view without customizing its position settings
- **THEN** the configuration selects middle for status and bottom for project name
- **AND** the key renders its status and any configured name in those positions

#### Scenario: User selects a valid position pair
- **WHEN** the user selects any of the six distinct name and status position pairs
- **THEN** the key displays each text in its selected region without overlap

#### Scenario: Layout changes without a status change
- **WHEN** the user changes a position while the project's status remains unchanged
- **THEN** the key updates to the newly selected layout

#### Scenario: Keys have different layouts
- **WHEN** two project-status keys have different saved position pairs
- **THEN** each key displays its own configured layout independently

### Requirement: Non-overlapping position selection
The name and status SHALL NOT occupy the same position. Each position selector SHALL disable the position currently occupied by the other element, including when the name is blank. If saved position values are missing, unsupported, or conflicting, the action and its configuration SHALL resolve them consistently to a valid distinct pair.

#### Scenario: Status occupies the middle
- **WHEN** the status position is middle
- **THEN** middle is disabled in the project-name position selector
- **AND** the name can be placed at top or bottom

#### Scenario: Occupied position becomes available
- **WHEN** the user moves one element to the unused position
- **THEN** its former position becomes available in the other element's selector
- **AND** its new position becomes disabled there

#### Scenario: Saved settings contain a collision or unsupported position
- **WHEN** a key loads unsupported or colliding position settings
- **THEN** its name and status render in distinct supported positions
- **AND** the configuration shows the same effective positions as the key

### Requirement: Persistent project-view presentation
The project-status action SHALL persist its configured name and position pair per key across inspector reopenings and plugin restarts. Editing the name or layout SHALL preserve project selection and unrelated action settings. Changing project selection SHALL preserve the configured name and layout.

#### Scenario: Configuration is reopened after restart
- **WHEN** the user reopens a configured project-status action after a plugin restart
- **THEN** the saved name and position selections are restored in both the configuration and key display

#### Scenario: Presentation settings are saved
- **WHEN** the user saves a name or position change
- **THEN** the action retains its selected project ID and unrelated settings

#### Scenario: Project selection is changed
- **WHEN** the user selects a different known project or saves a manual project ID
- **THEN** the action retains its configured name and position pair
- **AND** the displayed status changes to that of the newly selected project

### Requirement: Layout remains visible in every status
The project-status action SHALL show the current status text at its configured position for OFFLINE, READY, BUSY, ATTENTION, and ERROR. Any configured project name SHALL remain visible in its separate position throughout static states, BUSY animation frames, and status transitions. Long or multiline names SHALL remain confined to their own region and SHALL NOT obscure the status. These presentation changes SHALL NOT change the global status action's presentation or aggregation.

#### Scenario: Busy animation is running
- **WHEN** the configured project is BUSY
- **THEN** every displayed animation frame includes BUSY at the selected status position and any configured name at the selected name position

#### Scenario: Status changes or project disconnects
- **WHEN** the configured project transitions among OFFLINE, READY, BUSY, ATTENTION, and ERROR
- **THEN** the displayed status text updates while the configured name and position pair are retained

#### Scenario: Name exceeds available space
- **WHEN** the configured name is too long or contains multiple lines
- **THEN** its display remains within the selected name region without obscuring the status region

#### Scenario: Global and project keys coexist
- **WHEN** a global status key and a project-status key are visible together
- **THEN** the global key retains its existing presentation and aggregation behavior while the project key uses its configured layout
