## MODIFIED Requirements

### Requirement: Global OpenCode status display
The system SHALL provide one Stream Deck action that displays a status aggregated from all connected local OpenCode instances and their current live sessions, outstanding permission requests, and any unexpired execution-failure indication. Every visible global status key whose effective status is `READY` SHALL display the continuous green plasma defined by `status-background-animation` without changing how the effective status is calculated.

#### Scenario: No OpenCode instance is connected
- **WHEN** no OpenCode instance has an active bridge connection
- **THEN** the status action displays the static OFFLINE presentation

#### Scenario: Connected instances are inactive
- **WHEN** at least one OpenCode instance is connected and it has no working session, unanswered permission request, or unexpired failure indication
- **THEN** the status action displays READY with continuously evolving green plasma

#### Scenario: Global ready resolves into work
- **WHEN** the global effective status changes from READY to BUSY
- **THEN** plasma stops and BUSY particles start without changing the status aggregation rules
