## ADDED Requirements

### Requirement: Project attention background
Every visible project status key whose configured project has effective status `ATTENTION` SHALL display the continuous orange attention halo defined by `status-background-animation`. It SHALL stop the halo when that project's effective status changes, and SHALL NOT change presentation because another project's requests change without affecting the configured project's status.

#### Scenario: Configured project has an unanswered agent question
- **WHEN** an admitted unanswered agent question makes the configured project's effective status `ATTENTION`
- **THEN** the project's key displays `ATTENTION` with the halo until its effective status changes

#### Scenario: Configured project has an unanswered permission request
- **WHEN** an admitted unanswered permission request makes the configured project's effective status `ATTENTION`
- **THEN** the project's key displays `ATTENTION` with the halo

#### Scenario: Foreign attention does not animate a ready project
- **WHEN** another project needs attention while the configured project remains `READY`
- **THEN** the configured project's key retains its static `READY` presentation

## MODIFIED Requirements

### Requirement: Stable presentation for a single project instance
With one OpenCode instance for the configured project, the project-status action SHALL retain its displayed effective status while the reported aggregate remains unchanged. Repeated identical reports SHALL NOT rewrite an unchanged static image or title, restart the BUSY or ATTENTION animation, reset an active animation's phase, or introduce artificial READY, BUSY, ATTENTION, or OFFLINE transitions. Legitimate status transitions SHALL remain immediate, without added debounce or minimum-display delays. Simultaneous OpenCode instances of the same project are outside this requirement's acceptance scope.

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

#### Scenario: Connected project remains in attention
- **WHEN** a connected project's single source repeatedly reports unresolved attention without changing its effective status
- **THEN** its halo continues without resetting its phase or rewriting its unchanged title
