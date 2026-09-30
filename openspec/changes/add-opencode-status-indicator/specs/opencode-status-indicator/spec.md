## Purpose

Provide a single Stream Deck action that reliably summarizes the activity and attention state of every connected local OpenCode instance.

## ADDED Requirements

### Requirement: Global OpenCode status display
The system SHALL provide one Stream Deck action that displays a status aggregated from all connected local OpenCode instances and their sessions.

#### Scenario: No OpenCode instance is connected
- **WHEN** no OpenCode instance has an active bridge connection
- **THEN** the status action displays `OFFLINE`

#### Scenario: Connected instances are inactive
- **WHEN** at least one OpenCode instance is connected and none of its sessions is working, awaiting attention, or in an error state
- **THEN** the status action displays `READY`

### Requirement: Activity status aggregation
The system SHALL display `BUSY` when one or more connected OpenCode sessions are working and no higher-priority state applies.

#### Scenario: One session is working
- **WHEN** one connected session reports that it is working
- **THEN** the status action displays `BUSY`

#### Scenario: Sessions from separate instances are working
- **WHEN** sessions in two or more connected OpenCode instances report that they are working
- **THEN** the status action displays one global `BUSY` state

### Requirement: Attention status for permission requests
The system SHALL display `ATTENTION` while one or more connected OpenCode instances have an unanswered permission request.

#### Scenario: Permission request arrives while a session is working
- **WHEN** a connected instance reports an unanswered permission request while any session is working
- **THEN** the status action displays `ATTENTION`

#### Scenario: Permission request is answered
- **WHEN** the final unanswered permission request is answered and no error or working session remains
- **THEN** the status action displays `READY`

### Requirement: Error status aggregation
The system SHALL display `ERROR` when a connected session reports an error and no unanswered permission request exists.

#### Scenario: Error without an unanswered permission request
- **WHEN** a connected session reports an error and no instance has an unanswered permission request
- **THEN** the status action displays `ERROR`

#### Scenario: Permission request and error coexist
- **WHEN** at least one instance has an unanswered permission request and another session reports an error
- **THEN** the status action displays `ATTENTION`

### Requirement: State priority
The system SHALL calculate the global status using this descending priority: `ATTENTION`, `ERROR`, `BUSY`, `READY`, `OFFLINE`.

#### Scenario: Multiple state classes coexist
- **WHEN** connected instances collectively contain a working session, an errored session, and an unanswered permission request
- **THEN** the status action displays `ATTENTION`

### Requirement: Local persistent bridge
The system SHALL exchange state through a persistent bidirectional local connection between the OpenCode integration and Stream Deck integration.

#### Scenario: Bridge becomes unavailable
- **WHEN** an OpenCode integration cannot connect to the local Stream Deck integration
- **THEN** it retries connection without preventing OpenCode from operating

#### Scenario: Connected instance disconnects
- **WHEN** an OpenCode integration disconnects
- **THEN** its sessions and unanswered permission requests no longer contribute to the global status

### Requirement: Local-only access
The bridge SHALL accept connections only from the local machine.

#### Scenario: Remote connection attempt
- **WHEN** a connection attempt originates from a non-loopback network address
- **THEN** the bridge does not accept it

### Requirement: Read-only first release
The first release SHALL use the bridge only to display OpenCode state and SHALL NOT approve or deny permissions, submit prompts, or otherwise control OpenCode from Stream Deck.

#### Scenario: Status action is pressed during an attention state
- **WHEN** the status action is pressed while it displays `ATTENTION`
- **THEN** no OpenCode permission decision is sent
