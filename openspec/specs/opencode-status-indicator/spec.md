## Purpose

Provide a single Stream Deck action that reliably summarizes the activity and attention state of every connected local OpenCode instance.

## Requirements

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

### Requirement: Activity status aggregation
The system SHALL display `BUSY` when one or more connected OpenCode sessions are working and no higher-priority state applies. Each visible status key displaying `BUSY` SHALL present the dynamic particle-network wait animation defined by the `particle-wait-animation` capability instead of the regular static status image.

#### Scenario: One session is working
- **WHEN** one connected session reports that it is working
- **THEN** the status action displays `BUSY` with the particle-network wait animation

#### Scenario: Sessions from separate instances are working
- **WHEN** sessions in two or more connected OpenCode instances report that they are working
- **THEN** the status action displays one global `BUSY` state with the particle-network wait animation

### Requirement: Attention status for permission requests
The system SHALL display `ATTENTION` while one or more connected OpenCode instances have an unanswered permission request or an unanswered agent question. Every visible global status key in this state SHALL display the continuous orange attention halo defined by `status-background-animation`.

#### Scenario: Permission request arrives while a session is working
- **WHEN** a connected instance reports an unanswered permission request while any session is working
- **THEN** the status action displays `ATTENTION` with the attention halo

#### Scenario: Permission request is answered
- **WHEN** the final unanswered permission request is answered and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Agent question arrives while a session is working
- **WHEN** a connected instance reports an unanswered agent question while any session is working
- **THEN** the status action displays `ATTENTION` with the attention halo

#### Scenario: Agent question is resolved
- **WHEN** the final unanswered permission request or agent question is answered or rejected and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Multiple attention requests coexist
- **WHEN** a connected instance has unanswered permission requests and agent questions
- **THEN** the status action continues to display `ATTENTION` with the attention halo until every unanswered permission request and agent question is resolved

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

### Requirement: Configurable combined-status font
The global OpenCode status action SHALL offer a property inspector with a Display section and a status-font dialog using the same font family, whole-pixel size range of 10 through 28, regular/bold/italic/bold-italic style, underline, and text-color choices as the project-status font dialog. The font choices SHALL be saved independently per global key and SHALL NOT change which connected instances contribute to the combined status or affect project-status keys. The inspector SHALL display the same effective settings as the key for absent or unsupported values, using the existing status-font defaults.

#### Scenario: Global inspector opens
- **WHEN** a user opens the property inspector for a combined-status key
- **THEN** a Display section offers a status-font control that opens the same kind of font dialog as the project-status action, without project-selection or project-name controls

#### Scenario: Size slider edits a draft
- **WHEN** a user moves the dialog's font-size slider to 23 px
- **THEN** the dialog displays 23 px without changing the key until the user applies the dialog

#### Scenario: User applies font changes
- **WHEN** the user applies family, size, style, underline, or color choices for a combined-status key
- **THEN** that key displays its current status with those choices without waiting for a status transition
- **AND** another global key and all project-status keys retain their own appearance

#### Scenario: User dismisses the dialog
- **WHEN** the user cancels or dismisses the dialog before applying
- **THEN** the saved font and displayed key remain unchanged

#### Scenario: Global key settings are restored
- **WHEN** a configured global key's inspector is reopened after a plugin restart
- **THEN** its saved font choices appear in the dialog and on the key

#### Scenario: Missing or malformed font choices
- **WHEN** a global key has no font settings or loads unsupported font values
- **THEN** its inspector and key show the same safe default status font without changing unrelated settings

### Requirement: Combined-status font rendering
The global status action SHALL display the effective OFFLINE, READY, BUSY, ATTENTION, or ERROR label as styled key text in every static image and animated frame. The configured size SHALL remain fixed; text exceeding its available area SHALL be shortened with an ellipsis instead of shrinking or overlapping outside its region. The native Stream Deck title SHALL NOT duplicate or obscure the rendered label. A font-only change during an animation SHALL take effect on subsequent frames without resetting that animation or allowing queued older frames to restore the previous appearance. Global status calculation and effects SHALL remain unchanged.

#### Scenario: Configured key shows static status
- **WHEN** an OFFLINE or ERROR global key has a configured status font
- **THEN** the status label appears in that font without a duplicate native title

#### Scenario: Configured key animates
- **WHEN** a global key displays READY, BUSY, or ATTENTION
- **THEN** every displayed animation frame retains the current status label with its configured font and existing background effect

#### Scenario: Font changes during animation
- **WHEN** a user applies another font while a global READY, BUSY, or ATTENTION animation is active
- **THEN** the updated font is displayed without restarting the background animation
- **AND** queued older frames do not restore the previous font

#### Scenario: Global aggregation remains independent of presentation
- **WHEN** a global key's font is changed while multiple OpenCode instances contribute status
- **THEN** the key still shows the same effective combined status according to existing aggregation rules
