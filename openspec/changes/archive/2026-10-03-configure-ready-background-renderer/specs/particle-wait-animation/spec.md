## MODIFIED Requirements

### Requirement: Animation stops and status image is restored
The system SHALL end a key's BUSY presentation when its status changes from `BUSY` to any other status and SHALL display the new status's presentation. For `ATTENTION`, it SHALL display the attention halo defined by `status-background-animation`; for `READY`, it SHALL display that capability's configured READY background, defaulting to green plasma; for `ERROR` or `OFFLINE`, it SHALL display the regular static image. A READY selection of Particles SHALL continue displaying animated particles with a READY label rather than forcing plasma or stopping animation. Queued frames from the old BUSY presentation SHALL NOT overwrite the new status presentation.

#### Scenario: Busy status resolves to ready
- **WHEN** a visible global status key changes from `BUSY` to `READY` without a saved READY renderer selection
- **THEN** its particle-network animation stops and the green READY plasma starts

#### Scenario: Busy status resolves to ready with particles selected
- **WHEN** a visible global status key changes from `BUSY` to `READY` with Particles selected for READY
- **THEN** it displays READY with animated particles and no artificial intermediate status or static frame

#### Scenario: Busy status escalates
- **WHEN** a visible global status key changes from `BUSY` to `ATTENTION` or `ERROR`
- **THEN** its BUSY particle-network animation stops and the attention halo or regular static `ERROR` image is displayed respectively
