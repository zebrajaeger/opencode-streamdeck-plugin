## MODIFIED Requirements

### Requirement: Animation stops and status image is restored
The system SHALL stop a key's particle wait animation when its status changes from `BUSY` to any other status, and SHALL display the new status's presentation after stopping the particle animation. For `ATTENTION`, it SHALL display the attention halo defined by `status-background-animation`; for `READY`, `ERROR`, or `OFFLINE`, it SHALL display the regular static image.

#### Scenario: Busy status resolves to ready
- **WHEN** a visible global status key changes from `BUSY` to `READY`
- **THEN** its particle-network animation stops and the regular `READY` image is displayed

#### Scenario: Busy status escalates
- **WHEN** a visible global status key changes from `BUSY` to `ATTENTION` or `ERROR`
- **THEN** its particle-network animation stops and the attention halo or regular static `ERROR` image is displayed respectively
