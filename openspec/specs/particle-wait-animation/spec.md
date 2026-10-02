## Purpose

Make active OpenCode work visibly distinguishable from a stalled status by showing a calm, continuously changing particle-network animation on each affected Stream Deck key.

## Requirements

### Requirement: Independent BUSY wait animation per visible key
The system SHALL display a dynamically changing particle-network image on every visible global OpenCode status key while its aggregated status is `BUSY`. Each visible key SHALL maintain an independent animation lifecycle so adding, removing, or updating one key does not stop or alter another visible key's animation.

#### Scenario: Multiple visible keys show BUSY
- **WHEN** two or more visible global status keys receive the `BUSY` status
- **THEN** each key displays a changing particle-network image independently

#### Scenario: A key appears while BUSY is already active
- **WHEN** a global status key becomes visible while the aggregated status is `BUSY`
- **THEN** that key starts displaying the particle-network animation

### Requirement: Animated particle-network rendering
The system SHALL render the BUSY wait animation as Stream Deck key images containing moving particles and connection lines between sufficiently close particles. The rendered frames SHALL be supplied through the Stream Deck image API without introducing additional runtime dependencies or animated image files.

#### Scenario: Animation frame is refreshed
- **WHEN** a visible global status key remains in the `BUSY` state across an animation interval
- **THEN** the system replaces its key image with a subsequent particle-network frame

### Requirement: Animation stops and status image is restored
The system SHALL stop a key's particle wait animation when its status changes from `BUSY` to any other status, and SHALL display the new status's presentation after stopping the particle animation. For `ATTENTION`, it SHALL display the attention halo defined by `status-background-animation`; for `READY`, `ERROR`, or `OFFLINE`, it SHALL display the regular static image.

#### Scenario: Busy status resolves to ready
- **WHEN** a visible global status key changes from `BUSY` to `READY`
- **THEN** its particle-network animation stops and the regular `READY` image is displayed

#### Scenario: Busy status escalates
- **WHEN** a visible global status key changes from `BUSY` to `ATTENTION` or `ERROR`
- **THEN** its particle-network animation stops and the attention halo or regular static `ERROR` image is displayed respectively

### Requirement: Animation resources are released when a key disappears
The system SHALL stop and release a key's animation resources when the key is no longer visible. A removed key SHALL receive no further animation image updates.

#### Scenario: Busy key is removed
- **WHEN** a global status key displaying the BUSY wait animation disappears
- **THEN** its animation stops and no further frame is sent to that key
