## MODIFIED Requirements

### Requirement: Global OpenCode status display
The system SHALL provide one Stream Deck action that displays a status aggregated from all connected local OpenCode instances and their current live sessions, outstanding permission requests, and any unexpired execution-failure indication.

#### Scenario: No OpenCode instance is connected
- **WHEN** no OpenCode instance has an active bridge connection
- **THEN** the status action displays `OFFLINE`

#### Scenario: Connected instances are inactive
- **WHEN** at least one OpenCode instance is connected and it has no working session, unanswered permission request, or unexpired failure indication
- **THEN** the status action displays `READY`

### Requirement: Error status aggregation
The system SHALL display `ERROR` immediately after a connected instance reports an execution failure when no unanswered permission request exists. The failure indication SHALL expire after 15 seconds unless a newer live-status event replaces it first, and it SHALL NOT be represented as persistent session state.

#### Scenario: Error without an unanswered permission request
- **WHEN** a connected session reports an execution failure and no instance has an unanswered permission request or agent question
- **THEN** the status action displays `ERROR` immediately

#### Scenario: Permission request and error coexist
- **WHEN** at least one instance has an unanswered permission request and another session reports an execution failure
- **THEN** the status action displays `ATTENTION`

#### Scenario: Error indication expires
- **WHEN** an execution failure remains unmatched by a newer live-status event for 15 seconds
- **THEN** the failure indication no longer contributes to the global status and the action displays the highest applicable live status

#### Scenario: New live event replaces error
- **WHEN** an unexpired failure indication exists and the bridge receives a newer `BUSY`, `READY`, or `ATTENTION` live-status event
- **THEN** the status action immediately displays the status derived from that newer live event rather than `ERROR`

#### Scenario: Reconnect does not restore historical error
- **WHEN** an instance reconnects after an execution failure and supplies its current state snapshot
- **THEN** the snapshot replaces the instance's prior live state and does not recreate the earlier failure indication

### Requirement: State priority
The system SHALL calculate persistent global live status using this descending priority: `ATTENTION`, `BUSY`, `READY`, `OFFLINE`. An unexpired error indication SHALL be displayed only until it expires or a newer live-status event is received.

#### Scenario: Attention supersedes error
- **WHEN** an unexpired error indication and an unanswered permission request coexist
- **THEN** the status action displays `ATTENTION`

#### Scenario: Busy supersedes obsolete error
- **WHEN** an unexpired error indication is replaced by a newer working-session event
- **THEN** the status action displays `BUSY`

#### Scenario: Multiple state classes coexist
- **WHEN** connected instances collectively contain a working session, an unexpired error indication, and an unanswered permission request
- **THEN** the status action displays `ATTENTION`

### Requirement: Local persistent bridge
The system SHALL exchange state through a persistent bidirectional local connection between the OpenCode integration and Stream Deck integration, and each reconnect snapshot SHALL authoritatively replace the connected instance's current observable sessions and outstanding attention requests.

#### Scenario: Snapshot recovery uses supported plugin APIs
- **WHEN** the OpenCode integration initializes or reconnects under the supported OpenCode plugin API
- **THEN** it reports only state obtainable through supported plugin APIs and its event-observed state without preventing OpenCode from operating

#### Scenario: Bridge becomes unavailable
- **WHEN** an OpenCode integration cannot connect to the local Stream Deck integration
- **THEN** it retries connection without preventing OpenCode from operating

#### Scenario: Connected instance disconnects
- **WHEN** an OpenCode integration disconnects
- **THEN** its sessions and unanswered permission requests no longer contribute to the global status
