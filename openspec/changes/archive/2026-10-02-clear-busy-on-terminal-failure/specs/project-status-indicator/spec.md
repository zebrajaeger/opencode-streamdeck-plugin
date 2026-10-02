## ADDED Requirements

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
