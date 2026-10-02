## Purpose

Provide configurable Stream Deck keys that summarize the current OpenCode status for one selected project without mixing in other connected projects.

## Requirements

### Requirement: Configurable project status display
The system SHALL provide a display-only Stream Deck action whose instance settings identify the OpenCode project to monitor by its OpenCode project ID. The property inspector SHALL let users select known OpenCode projects by human-readable directory-derived labels while storing the selected project's OpenCode project ID as the action setting. It SHALL provide an advanced manual project-ID entry for a project that is not known to the selector.

#### Scenario: Configured project is active
- **WHEN** a project-status action is configured for a project ID that has one or more active bridge connections
- **THEN** the action displays that project's aggregated status

#### Scenario: User selects a known project
- **WHEN** a user chooses a known project from the property inspector's project selector
- **THEN** the action saves that project's OpenCode project ID and updates to display the selected project's current status

#### Scenario: Manual project ID is saved
- **WHEN** a user saves an OpenCode project ID through the advanced manual entry
- **THEN** the action updates to display that project's current status

#### Scenario: Project selection is changed
- **WHEN** a user saves a different project ID in a project-status action's settings
- **THEN** the action updates to display the newly selected project's current status

### Requirement: Human-readable known-project selection
The system SHALL retain display metadata for every bridge handshake that supplies both an OpenCode project ID and a non-empty project directory. The property inspector SHALL offer those projects as known selections, using the final directory name as the primary label and the complete directory path as supporting detail. When primary labels collide, the selector SHALL include enough of the full directory path to distinguish the entries.

#### Scenario: Connected project appears in selector
- **WHEN** a bridge handshake supplies a project ID and project directory
- **THEN** the property inspector offers the project by a directory-derived label instead of requiring the user to discover its project ID

#### Scenario: Directory names collide
- **WHEN** two known projects have the same final directory name and different full directory paths
- **THEN** the property inspector distinguishes their selectable entries using their paths

#### Scenario: Handshake lacks display metadata
- **WHEN** a bridge handshake omits either the project ID or project directory
- **THEN** the handshake does not create a selectable known-project entry

### Requirement: Persistent offline project labels
The system SHALL persist each known project's last-known directory-derived display metadata across Stream Deck plugin restarts. A configured project status action SHALL remain configured by its project ID and SHALL present its retained human-readable label when its project has no active bridge connection.

#### Scenario: Configured project is offline after restart
- **WHEN** a project-status action is configured for a previously known project and the Stream Deck plugin restarts while that project is not connected
- **THEN** the property inspector retains the project's last-known directory-derived label and the action displays `OFFLINE`

#### Scenario: Project reconnects from a different directory
- **WHEN** a known project ID later connects with a different project directory
- **THEN** the system updates that project's persisted display metadata with the newly reported directory

### Requirement: Project-scoped status aggregation
The system SHALL aggregate only the bridge connections, sessions, and unanswered permission requests that identify the configured project, using descending precedence `ATTENTION`, `ERROR`, `BUSY`, `READY`, and `OFFLINE`.

#### Scenario: Another project requires attention
- **WHEN** the configured project is ready and a different connected project has an unanswered permission request
- **THEN** the configured project's action displays `READY`

#### Scenario: Configured project requires attention
- **WHEN** one or more connections for the configured project have an unanswered permission request
- **THEN** the configured project's action displays `ATTENTION`

#### Scenario: Multiple connections represent one project
- **WHEN** two or more active bridge connections identify the configured project and one of them reports a busy session
- **THEN** the configured project's action displays `BUSY` unless a higher-priority status exists for that project

### Requirement: Project availability state
The system SHALL display `OFFLINE` for a configured project when no active bridge connection identifies that project.

#### Scenario: Configured project is not connected
- **WHEN** no active bridge connection identifies the configured project ID
- **THEN** the action displays `OFFLINE`

#### Scenario: Final project connection disconnects
- **WHEN** the last active bridge connection for the configured project disconnects
- **THEN** the action updates to display `OFFLINE`

### Requirement: Project identity isolation
The system SHALL obtain each reporting source's project identity from the OpenCode bridge connection handshake and SHALL not infer project membership from a directory path or session identifier. Before contributing session activity, idle state, execution failures, permission requests, or agent questions to that source, the OpenCode integration SHALL verify that the session belongs to the handshake's project using authoritative OpenCode project metadata. Receiving an event from the shared server SHALL NOT establish project membership. Events or snapshot entries whose ownership is foreign or unresolved SHALL NOT mutate that source's reported state or be forwarded under its project identity. Resolution failures SHALL NOT interrupt OpenCode execution and SHALL permit a later ownership check.

#### Scenario: Projects have distinct identifiers
- **WHEN** two connected bridges report distinct project IDs
- **THEN** their sessions and permission requests contribute only to the action configured for their respective project ID

#### Scenario: A bridge omits project identity
- **WHEN** a bridge connection does not provide a project ID
- **THEN** its state does not contribute to any project-status action

#### Scenario: One shared server reports another project's activity
- **WHEN** bridges for projects A and B receive an execution-start or busy event for a session belonging to A while B is otherwise ready
- **THEN** only A's bridge reports that session as busy
- **AND** A's key and the global key display `BUSY` while B's key remains `READY`

#### Scenario: Foreign idle event does not clear a local error
- **WHEN** B has an unexpired error indication and its bridge receives an idle or successful-execution event for a session belonging to A
- **THEN** the foreign event is not forwarded as B's state and does not replace B's error indication

#### Scenario: Foreign failure and attention requests are ignored
- **WHEN** B's bridge receives an execution failure, permission request, or agent question for a session belonging to A
- **THEN** none of those events contributes `ERROR` or `ATTENTION` to B

#### Scenario: Event lacks project identity
- **WHEN** a session event does not contain an authoritative project ID
- **THEN** the integration establishes ownership through supported OpenCode session metadata before contributing the event
- **AND** it does not assume ownership from a matching directory, event receipt, parent session, or session-ID format

#### Scenario: Ownership lookup fails and later recovers
- **WHEN** ownership of an event's session cannot be established and a later event successfully resolves that session to the bridge's project
- **THEN** the unresolved event makes no reported-state changes
- **AND** the later verified event contributes normally without restarting OpenCode

### Requirement: Project-local snapshot and request lifecycle
Initialization and reconnect snapshots SHALL include only verified sessions and outstanding requests belonging to the reporting project. Request resolutions SHALL act only on locally admitted requests, including question/form resolution events that identify a request rather than a session. For admitted events, asynchronous ownership resolution SHALL preserve event order so a late busy update cannot overwrite a later idle update. Plugin cleanup SHALL prevent unfinished ownership work from publishing further state.

#### Scenario: Permission snapshot includes requests from different projects
- **WHEN** initialization obtains outstanding permission requests for sessions belonging to A and B
- **THEN** A's bridge snapshot includes only A's verified requests and B's includes only B's verified requests

#### Scenario: Bridge reconnects after mixed-project activity
- **WHEN** B's bridge reconnects after receiving a mixed stream of events for A and B
- **THEN** its authoritative snapshot contains only B's verified retained sessions, permissions, and questions

#### Scenario: Foreign request resolution arrives
- **WHEN** a bridge receives a reply, rejection, or cancellation for a request it never admitted
- **THEN** it does not forward that resolution or alter its locally owned outstanding requests

#### Scenario: Owned question is resolved without a session identifier
- **WHEN** a reply or cancellation identifies a previously admitted local question or form by request ID
- **THEN** the integration resolves that local request and preserves the existing attention-status rules

#### Scenario: Busy and idle events await ownership resolution
- **WHEN** a busy event followed by an idle event for the same owned session arrives while ownership resolution is pending
- **THEN** the final reported state is idle, not a late-arriving busy state

#### Scenario: Integration unloads during lookup
- **WHEN** the plugin unloads while session ownership resolution is unfinished
- **THEN** completion of that work does not mutate or publish additional bridge state

### Requirement: Session reassignment removes former contributions
When authoritative OpenCode metadata reassigns a session to another project, the former reporting project SHALL remove the session and its outstanding permission and question contributions from its retained and reported live state. Later events SHALL be admitted only by a source matching the new project identity. The integration SHALL NOT infer reassignment solely from a directory change; a move within the same project SHALL retain membership. This requirement does not add automatic discovery of execution state that was never observed by the destination bridge.

#### Scenario: Busy session moves from A to B
- **WHEN** A's bridge learns through authoritative metadata that a retained busy session now belongs to B
- **THEN** that session and its associated requests no longer contribute to A's current or reconnect state
- **AND** subsequent verified B events contribute only to B

#### Scenario: Session moves within one project
- **WHEN** a session changes directory while its authoritative project ID remains A
- **THEN** it continues to belong to A without being treated as another project

#### Scenario: Owned session is deleted
- **WHEN** the integration receives deletion of a previously verified local session after metadata lookup is no longer possible
- **THEN** it removes that session and its associated requests using its established ownership rather than retaining stale busy or attention state

### Requirement: Global status compatibility
The system SHALL retain the existing global status action, and it SHALL continue aggregating the status of all connected bridge instances regardless of their project IDs.

#### Scenario: Project and global keys coexist
- **WHEN** a global status action and one or more project-status actions are present on Stream Deck
- **THEN** each action updates according to its own aggregation scope

### Requirement: Stable presentation for a single project instance
With one OpenCode instance for the configured project, the project-status action SHALL retain its displayed effective status while the reported aggregate remains unchanged. Repeated identical reports SHALL NOT rewrite an unchanged static image or title, restart the BUSY animation, or introduce artificial READY, BUSY, or OFFLINE transitions. Legitimate status transitions SHALL remain immediate, without added debounce or minimum-display delays. Simultaneous OpenCode instances of the same project are outside this requirement's acceptance scope.

#### Scenario: Connected project remains inactive
- **WHEN** a connected project's single source remains idle and repeatedly reports unchanged state
- **THEN** its visible key remains READY without periodic image or title rewrites

#### Scenario: Connected project remains busy
- **WHEN** a connected project's single source continuously reports busy or retry activity without a higher-priority state
- **THEN** the key remains BUSY with a continuously advancing animation
- **AND** repeated BUSY reports do not restart that animation or introduce READY frames

#### Scenario: Another project emits unchanged or changing reports
- **WHEN** another project's source emits events that do not change the configured project's effective status
- **THEN** the configured project's key is not redrawn because of those events

#### Scenario: Actual work completes
- **WHEN** the configured project's final working session becomes idle and no higher-priority state applies
- **THEN** the key promptly changes from BUSY to READY and stops its animation

#### Scenario: Attention, failure, or disconnection is real
- **WHEN** the configured project's effective status changes because of an attention request, execution failure, error expiry, or connection loss
- **THEN** the key promptly displays the new status according to the existing precedence and expiry rules

### Requirement: Initial and explicit presentation refreshes remain available
Status subscriptions SHALL deliver an initial effective status and subsequent changed effective statuses independently for each scope. A newly visible or reappearing project key SHALL render its current status even when that status has not changed. Explicit changes to project selection or presentation SHALL NOT be suppressed by unchanged-status detection.

#### Scenario: Key appears while the project is READY
- **WHEN** a key becomes visible while its configured project is already READY
- **THEN** it renders READY once without needing another status transition

#### Scenario: Key reappears during work
- **WHEN** a previously hidden key reappears while its project is BUSY
- **THEN** it starts its own current BUSY animation without affecting other visible keys

#### Scenario: Project selection changes to another READY project
- **WHEN** the user changes the selected project while both projects have effective status READY
- **THEN** the subscription switches to the new project and any required presentation refresh remains possible

#### Scenario: Presentation is explicitly updated
- **WHEN** the action explicitly requests a presentation refresh while its effective status is unchanged
- **THEN** the key reflects that presentation update rather than treating it as a redundant status notification

### Requirement: Project-scoped terminal failure recovery
The system SHALL apply the global terminal-failure recovery rules to each configured project status action for both execution and compaction failures. Only failures admitted through authoritative session-project ownership SHALL end the affected session's previous working contribution and trigger the project's transient error indication. Failure recovery SHALL NOT clear other sessions' activity or outstanding attention requests. Foreign or unresolved failures SHALL NOT change a project's retained or displayed status. Error expiry and reconnect SHALL NOT restore a failed session's obsolete working contribution.

#### Scenario: Project's only working session fails
- **WHEN** the configured project's only working session reports an execution or compaction failure, no requests need attention, and no newer live-status event arrives
- **THEN** its key displays `ERROR` for 15 seconds followed by `READY` without a subsequent idle event

#### Scenario: Another session in the project is still working
- **WHEN** one working session in the configured project fails while another remains working and the transient error indication expires without a newer live-status event or outstanding attention request
- **THEN** the project's key displays `BUSY` due only to the still-working session
- **AND** the project's key becomes `READY` when the remaining working session becomes idle

#### Scenario: Another project's session is still working
- **WHEN** project A's only working session fails and project B remains working, with no outstanding attention requests or later live-status events
- **THEN** A's key displays `ERROR` followed by `READY` after 15 seconds, while B's key stays `BUSY`
- **AND** the global key displays `ERROR` followed by `BUSY` after expiry

#### Scenario: Foreign or unresolved compaction failure arrives
- **WHEN** a project bridge receives a compaction failure for a session belonging to another project or whose ownership cannot be resolved
- **THEN** that failure does not mutate or publish the bridge's project state or replace its current error indication

#### Scenario: Attention survives failure recovery
- **WHEN** a session in the configured project reports a failure while the project has an admitted unanswered permission request or agent question
- **THEN** the project's key continues displaying `ATTENTION`
- **AND** failure recovery does not resolve or remove that request

#### Scenario: Project reconnects after failure
- **WHEN** the configured project's source reconnects after an admitted failure and the affected session has not subsequently reported new work
- **THEN** its snapshot excludes the failed session's obsolete working contribution and historical error indication while retaining other verified session and request state

### Requirement: Dedicated project-view name
Newly configured project-status views SHALL provide their own project-name text field in their configuration. The configured name SHALL be a display label only and SHALL NOT change the selected OpenCode project ID or status aggregation. The native Stream Deck title SHALL NOT replace or duplicate the configured name or status in these views. A blank project-name field SHALL leave the name region empty while keeping the status visible. Migration of project-key configurations created before this change is outside this capability extension's scope.

#### Scenario: User names a project view
- **WHEN** the user enters a project name in the project-status action's configuration
- **THEN** the key displays that name and its current status simultaneously
- **AND** the selected project ID is unchanged

#### Scenario: User clears the project name
- **WHEN** the user clears the project-name field
- **THEN** the key shows its current status without a project-name label

#### Scenario: Native title does not compete with the layout
- **WHEN** a newly configured project-status view uses the configured name and status layout
- **THEN** no native title is displayed over that layout

### Requirement: Independently configurable name and status positions
The project-status action SHALL provide separate position selectors for the project name and status, each offering top, middle, and bottom. The default status position SHALL be middle and the default name position SHALL be bottom. Each selection SHALL update the visible key without requiring a status transition. The selections SHALL apply independently to each project-status key.

#### Scenario: Newly configured view uses default positions
- **WHEN** the user creates a new project-status view without customizing its position settings
- **THEN** the configuration selects middle for status and bottom for project name
- **AND** the key renders its status and any configured name in those positions

#### Scenario: User selects a valid position pair
- **WHEN** the user selects any of the six distinct name and status position pairs
- **THEN** the key displays each text in its selected region without overlap

#### Scenario: Layout changes without a status change
- **WHEN** the user changes a position while the project's status remains unchanged
- **THEN** the key updates to the newly selected layout

#### Scenario: Keys have different layouts
- **WHEN** two project-status keys have different saved position pairs
- **THEN** each key displays its own configured layout independently

### Requirement: Non-overlapping position selection
The name and status SHALL NOT occupy the same position. Each position selector SHALL disable the position currently occupied by the other element, including when the name is blank. If saved position values are missing, unsupported, or conflicting, the action and its configuration SHALL resolve them consistently to a valid distinct pair.

#### Scenario: Status occupies the middle
- **WHEN** the status position is middle
- **THEN** middle is disabled in the project-name position selector
- **AND** the name can be placed at top or bottom

#### Scenario: Occupied position becomes available
- **WHEN** the user moves one element to the unused position
- **THEN** its former position becomes available in the other element's selector
- **AND** its new position becomes disabled there

#### Scenario: Saved settings contain a collision or unsupported position
- **WHEN** a key loads unsupported or colliding position settings
- **THEN** its name and status render in distinct supported positions
- **AND** the configuration shows the same effective positions as the key

### Requirement: Persistent project-view presentation
The project-status action SHALL persist its configured name, position pair, and independent name/status font sizes per key across inspector reopenings and plugin restarts. Editing the name, layout, or either font size SHALL preserve project selection and unrelated action settings. Changing project selection SHALL preserve the configured name, layout, and both font sizes.

#### Scenario: Configuration is reopened after restart
- **WHEN** the user reopens a configured project-status action after a plugin restart
- **THEN** the saved name, position selections, and both font sizes are restored in both the configuration and key display

#### Scenario: Presentation settings are saved
- **WHEN** the user saves a name, position, or font-size change
- **THEN** the action retains its selected project ID and unrelated settings

#### Scenario: Project selection is changed
- **WHEN** the user selects a different known project or saves a manual project ID
- **THEN** the action retains its configured name, position pair, and both font sizes
- **AND** the displayed status changes to that of the newly selected project

### Requirement: Layout remains visible in every status
The project-status action SHALL show the current status text at its configured position for OFFLINE, READY, BUSY, ATTENTION, and ERROR. Any configured project name SHALL remain visible in its separate position throughout static states, BUSY animation frames, and status transitions. Long or multiline names SHALL remain confined to their own region and SHALL NOT obscure the status. These presentation changes SHALL NOT change the global status action's presentation or aggregation.

#### Scenario: Busy animation is running
- **WHEN** the configured project is BUSY
- **THEN** every displayed animation frame includes BUSY at the selected status position and any configured name at the selected name position

#### Scenario: Status changes or project disconnects
- **WHEN** the configured project transitions among OFFLINE, READY, BUSY, ATTENTION, and ERROR
- **THEN** the displayed status text updates while the configured name and position pair are retained

#### Scenario: Name exceeds available space
- **WHEN** the configured name is too long or contains multiple lines
- **THEN** its display remains within the selected name region without obscuring the status region
- **AND** line breaks are normalized and overflowing text is shortened with an ellipsis without reducing its selected font size

#### Scenario: Global and project keys coexist
- **WHEN** a global status key and a project-status key are visible together
- **THEN** the global key retains its existing presentation and aggregation behavior while the project key uses its configured layout

### Requirement: Independently configurable name and status font sizes
The project-status configuration SHALL provide separate font-size selections for project name and status. Each selection SHALL be persisted per key and SHALL update the displayed text immediately without requiring a status transition. The chosen font size SHALL remain fixed regardless of text length; text exceeding the available region SHALL be shortened with an ellipsis rather than rendered at a smaller size or horizontally compressed. Supported sizes SHALL keep both elements within their separate regions. Missing or unsupported size settings SHALL resolve consistently in the inspector and runtime to readable defaults. These controls SHALL NOT change the global key's presentation.

#### Scenario: User changes the project-name size
- **WHEN** the user chooses a different project-name font size while status is unchanged
- **THEN** the key immediately renders the name at that size
- **AND** the status font size, position selections, and project ID are unchanged

#### Scenario: User changes the status size
- **WHEN** the user chooses a different status font size
- **THEN** the key immediately renders the status at that size
- **AND** the name font size is unchanged

#### Scenario: Font size changes during BUSY
- **WHEN** the user changes either font size while BUSY animation is running
- **THEN** subsequent displayed frames use the updated size for that element
- **AND** queued stale frames do not restore the previous presentation

#### Scenario: Long name at a chosen size
- **WHEN** the configured name exceeds the available width at the selected font size
- **THEN** the key displays a shortened name with an ellipsis at that same font size
- **AND** the name remains inside its own region without obscuring status

#### Scenario: Defaults or unsupported sizes are loaded
- **WHEN** a key loads missing or unsupported font-size settings
- **THEN** its name and status use the corresponding readable default sizes
- **AND** the inspector selects the same effective sizes as the key

#### Scenario: Keys have independent font sizes
- **WHEN** two project-status keys have different saved name and status sizes
- **THEN** each key renders its own selected sizes without affecting the other key or a global key
