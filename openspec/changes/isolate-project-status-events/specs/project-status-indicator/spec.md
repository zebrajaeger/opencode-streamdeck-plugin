## MODIFIED Requirements

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

## ADDED Requirements

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
