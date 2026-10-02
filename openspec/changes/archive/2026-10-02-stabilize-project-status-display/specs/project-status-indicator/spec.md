## ADDED Requirements

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
