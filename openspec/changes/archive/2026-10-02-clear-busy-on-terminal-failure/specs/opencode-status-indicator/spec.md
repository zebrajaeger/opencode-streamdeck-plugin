## MODIFIED Requirements

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
