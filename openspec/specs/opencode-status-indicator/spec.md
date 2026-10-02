## Purpose

Provide a single Stream Deck action that reliably summarizes the activity and attention state of every connected local OpenCode instance.

## Requirements

### Requirement: Global OpenCode status display
The system SHALL provide one Stream Deck action that displays a status aggregated from all connected local OpenCode instances and their current live sessions, outstanding permission requests, and any unexpired execution-failure indication.

#### Scenario: No OpenCode instance is connected
- **WHEN** no OpenCode instance has an active bridge connection
- **THEN** the status action displays `OFFLINE`

#### Scenario: Connected instances are inactive
- **WHEN** at least one OpenCode instance is connected and it has no working session, unanswered permission request, or unexpired failure indication
- **THEN** the status action displays `READY`

### Requirement: Activity status aggregation
The system SHALL display `BUSY` when one or more connected OpenCode sessions are working and no higher-priority state applies. Each visible status key displaying `BUSY` SHALL present the dynamic particle-network wait animation defined by the `particle-wait-animation` capability instead of the regular static status image.

#### Scenario: One session is working
- **WHEN** one connected session reports that it is working
- **THEN** the status action displays `BUSY` with the particle-network wait animation

#### Scenario: Sessions from separate instances are working
- **WHEN** sessions in two or more connected OpenCode instances report that they are working
- **THEN** the status action displays one global `BUSY` state with the particle-network wait animation

### Requirement: Attention status for permission requests
The system SHALL display `ATTENTION` while one or more connected OpenCode instances have an unanswered permission request or an unanswered agent question.

#### Scenario: Permission request arrives while a session is working
- **WHEN** a connected instance reports an unanswered permission request while any session is working
- **THEN** the status action displays `ATTENTION`

#### Scenario: Permission request is answered
- **WHEN** the final unanswered permission request is answered and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Agent question arrives while a session is working
- **WHEN** a connected instance reports an unanswered agent question while any session is working
- **THEN** the status action displays `ATTENTION`

#### Scenario: Agent question is resolved
- **WHEN** the final unanswered permission request or agent question is answered or rejected and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Multiple attention requests coexist
- **WHEN** a connected instance has unanswered permission requests and agent questions
- **THEN** the status action continues to display `ATTENTION` until every unanswered permission request and agent question is resolved

### Requirement: Error status aggregation
The system SHALL display `ERROR` immediately after a connected instance reports an execution failure or compaction failure when no unanswered permission request or agent question exists. Reporting either failure SHALL end the affected session's previously reported working contribution without requiring a subsequent idle event. The failure indication SHALL expire after 15 seconds unless a newer live-status event replaces it first, and it SHALL NOT be represented as persistent session state. Other sessions' working contributions and outstanding attention requests SHALL remain unchanged. A subsequent working or retry event SHALL be permitted to restore the affected session's working contribution.

#### Scenario: Error without an unanswered permission request
- **WHEN** a connected session reports an execution failure and no instance has an unanswered permission request or agent question
- **THEN** the status action displays `ERROR`

#### Scenario: Permission request and error coexist
- **WHEN** at least one instance has an unanswered permission request and another session reports an error
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

#### Scenario: Busy execution fails without a later idle event
- **WHEN** the only working session reports an execution failure and no later live-status event or outstanding attention request exists
- **THEN** the status action displays `ERROR` for 15 seconds and then `READY`
- **AND** the failed session does not continue contributing `BUSY`

#### Scenario: Compaction fails after context-window overflow
- **WHEN** a previously working session reports a compaction failure because input exceeds the model context window and no later live-status event or outstanding attention request exists
- **THEN** the status action displays `ERROR` for 15 seconds and then the highest applicable live status excluding that session's obsolete working contribution
- **AND** no additional execution-failure or idle event is required for recovery

#### Scenario: Another session remains active after failure
- **WHEN** one working session fails while another session remains working and the error indication expires without a newer live-status event or an outstanding attention request
- **THEN** the status action displays `BUSY` because of the other session
- **AND** once that other session reports idle the action displays `READY` without requiring an idle event from the failed session

#### Scenario: Retry activity is not terminal failure
- **WHEN** a session reports scheduled retry activity without a subsequent execution-failure or compaction-failure event
- **THEN** its working contribution remains `BUSY` unless a higher-priority state applies

#### Scenario: Failed session starts new work
- **WHEN** a failed session subsequently reports working or retry activity
- **THEN** it contributes `BUSY` again and the newer live event replaces that instance's transient error indication

#### Scenario: Reconnect does not restore failed busy state
- **WHEN** an instance reconnects after reporting an execution or compaction failure and the affected session has not subsequently reported new work
- **THEN** the reconnect snapshot does not restore the affected session's obsolete `BUSY` contribution or historical error indication

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
The system SHALL exchange state through a persistent bidirectional local connection between the OpenCode integration and Stream Deck integration, and each reconnect snapshot SHALL authoritatively replace the connected instance's current observable sessions and outstanding attention requests. Each directory-identified OpenCode source SHALL have at most one active connection contributing state; a newly connected source for the same project directory SHALL replace the prior source and its contributed state.

#### Scenario: Snapshot recovery uses supported plugin APIs
- **WHEN** the OpenCode integration initializes or reconnects under the supported OpenCode plugin API
- **THEN** it reports only state obtainable through supported plugin APIs and its event-observed state without preventing OpenCode from operating

#### Scenario: Bridge becomes unavailable
- **WHEN** an OpenCode integration cannot connect to the local Stream Deck integration
- **THEN** it retries connection without preventing OpenCode from operating

#### Scenario: Connected instance disconnects
- **WHEN** an OpenCode integration disconnects
- **THEN** its sessions and unanswered permission requests no longer contribute to the global status

#### Scenario: Duplicate bridge source connects
- **WHEN** another bridge source for an already connected project directory establishes a local connection
- **THEN** only the newer source for that directory contributes sessions and unanswered permission requests to the global status

#### Scenario: Different project directories connect
- **WHEN** bridge sources for two distinct project directories establish local connections
- **THEN** both directories contribute to one global status according to the defined state priority

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
