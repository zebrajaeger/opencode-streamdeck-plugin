## MODIFIED Requirements

### Requirement: Global OpenCode status display
The system SHALL provide one Stream Deck action that displays a status aggregated from all connected local OpenCode instances and their current live sessions, outstanding permission requests, and any unexpired execution-failure indication. Every visible global status key whose effective status is `READY` SHALL display its independently configured READY background defined by `status-background-animation`, defaulting to continuous green plasma, without changing how the effective status is calculated.

#### Scenario: No OpenCode instance is connected
- **WHEN** no OpenCode instance has an active bridge connection
- **THEN** the status action displays the static OFFLINE presentation

#### Scenario: Connected instances are inactive
- **WHEN** at least one OpenCode instance is connected and it has no working session, unanswered permission request, or unexpired failure indication
- **THEN** the status action displays READY with its selected continuously animated background, using green plasma when no valid selection is saved

#### Scenario: Global ready resolves into work
- **WHEN** the global effective status changes from READY to BUSY
- **THEN** the READY presentation is replaced by BUSY particles without changing the status aggregation rules

#### Scenario: Global keys choose different READY appearances
- **WHEN** two visible global keys choose Attention halo and Particles respectively while the aggregate is READY
- **THEN** both show READY with their independently selected backgrounds and changing one key's selection does not restart the other
