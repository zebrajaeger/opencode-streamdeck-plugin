## ADDED Requirements

### Requirement: Project READY background
Every visible project status key whose configured project has effective status `READY` SHALL display the continuous green plasma defined by `status-background-animation`. Its status and configured project labels SHALL remain readable on every frame. Another project's activity or requests SHALL NOT select a different effect or restart the configured project's plasma unless its own effective status changes.

#### Scenario: Configured project is inactive
- **WHEN** a configured project is connected and its effective status is READY
- **THEN** its visible key displays green plasma with its configured labels

#### Scenario: Another project starts work
- **WHEN** project A becomes BUSY while project B remains READY
- **THEN** A's key and the global key display particles while B's plasma continues without restarting

## MODIFIED Requirements

### Requirement: Project attention background
Every visible project status key whose configured project has effective status `ATTENTION` SHALL display the continuous orange attention halo defined by `status-background-animation`. It SHALL stop the halo when that project's effective status changes, and SHALL NOT change presentation because another project's requests change without affecting the configured project's status.

#### Scenario: Configured project has an unanswered agent question
- **WHEN** an admitted unanswered agent question makes the configured project's effective status ATTENTION
- **THEN** the project's key displays ATTENTION with the halo until its effective status changes

#### Scenario: Configured project has an unanswered permission request
- **WHEN** an admitted unanswered permission request makes the configured project's effective status ATTENTION
- **THEN** the project's key displays ATTENTION with the halo

#### Scenario: Foreign attention does not animate a ready project
- **WHEN** another project needs attention while the configured project remains READY
- **THEN** the configured project's key continues its green READY plasma rather than switching to the attention halo

### Requirement: Stable presentation for a single project instance
With one OpenCode instance for the configured project, the project-status action SHALL retain its displayed effective status while the reported aggregate remains unchanged. Repeated identical reports SHALL NOT rewrite an unchanged static image or title, restart the BUSY, ATTENTION, or READY animation, reset an active animation's phase, or introduce artificial READY, BUSY, ATTENTION, or OFFLINE transitions. Scheduled animation frames SHALL continue independently of status reports. Legitimate status transitions SHALL remain immediate, without added debounce or minimum-display delays. Simultaneous OpenCode instances of the same project are outside this requirement's acceptance scope.

#### Scenario: Connected project remains inactive
- **WHEN** a connected project's single source remains idle and repeatedly reports unchanged state
- **THEN** its visible key remains READY with continuously advancing plasma
- **AND** unchanged reports do not restart the plasma, reset phase, or rewrite its unchanged title

#### Scenario: Connected project remains busy
- **WHEN** a connected project's single source continuously reports busy or retry activity without a higher-priority state
- **THEN** the key remains BUSY with a continuously advancing animation
- **AND** repeated BUSY reports do not restart that animation or introduce READY frames

#### Scenario: Another project emits unchanged or changing reports
- **WHEN** another project's source emits events that do not change the configured project's effective status
- **THEN** those events cause no extra redraw or effect restart on the configured project's key
- **AND** its own scheduled animation frames continue normally

#### Scenario: Actual work completes
- **WHEN** the configured project's final working session becomes idle and no higher-priority state applies
- **THEN** the key promptly changes from BUSY to READY, stops particles, and starts green plasma

#### Scenario: Attention, failure, or disconnection is real
- **WHEN** the configured project's effective status changes because of an attention request, execution failure, error expiry, or connection loss
- **THEN** the key promptly displays the new status according to the existing precedence and expiry rules

#### Scenario: Connected project remains in attention
- **WHEN** a connected project's single source repeatedly reports unresolved attention without changing its effective status
- **THEN** its halo continues without resetting its phase or rewriting its unchanged title

### Requirement: Initial and explicit presentation refreshes remain available
Status subscriptions SHALL deliver an initial effective status and subsequent changed effective statuses independently for each scope. A newly visible or reappearing project key SHALL render its current status even when that status has not changed. Explicit changes to project selection or presentation SHALL NOT be suppressed by unchanged-status detection. Refreshing an already active READY presentation SHALL preserve its plasma phase while updating its configured labels.

#### Scenario: Key appears while the project is READY
- **WHEN** a key becomes visible while its configured project is already READY
- **THEN** it immediately starts its own READY plasma without needing another status transition

#### Scenario: Key reappears during work
- **WHEN** a previously hidden key reappears while its project is BUSY
- **THEN** it starts its own current BUSY animation without affecting other visible keys

#### Scenario: Project selection changes to another READY project
- **WHEN** the user changes the selected project while both projects have effective status READY
- **THEN** the subscription switches to the new project and its labels update while the active READY plasma phase is preserved

#### Scenario: Presentation is explicitly updated
- **WHEN** the action explicitly requests a presentation refresh while its effective status is unchanged
- **THEN** the key reflects that presentation update rather than treating it as a redundant status notification
- **AND** an active READY plasma retains its phase and uses updated configured labels on subsequent frames
