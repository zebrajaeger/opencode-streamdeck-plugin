## Purpose

Ensure duplicate OpenCode plugin loads for one project directory produce one
authoritative local status source while preserving status for other projects.

## Requirements

### Requirement: Project-directory source identity
The system SHALL identify an OpenCode status source by the non-empty project directory it supplies when establishing its local bridge connection, in addition to using its connection-specific instance identifier for frame ownership.

#### Scenario: Source supplies a project directory
- **WHEN** an OpenCode integration establishes a valid local bridge connection with a non-empty project directory
- **THEN** the system records that directory as the source identity for the connection

#### Scenario: Source omits a project directory
- **WHEN** a valid connection does not supply a non-empty project directory
- **THEN** the system keeps its existing instance-ID-based behavior and does not merge it with a directory-identified source

### Requirement: One active source per project directory
The system SHALL allow at most one active status source for each project directory. A newly established source for an already active directory SHALL replace the prior source, remove its contributed session and permission state, and make the new source authoritative.

#### Scenario: Duplicate plugin load for the same directory
- **WHEN** a second OpenCode bridge connection identifies the same project directory as an active connection
- **THEN** the prior connection is closed and its state no longer contributes to the global status

#### Scenario: Replacement source reports its snapshot
- **WHEN** the replacement connection supplies its snapshot after taking ownership of a project directory
- **THEN** the global status is calculated from the replacement snapshot and not from the replaced source's snapshot

### Requirement: Independent project-directory sources
The system SHALL retain separate active sources for distinct project directories, even when they connect to the same local Stream Deck bridge.

#### Scenario: Two distinct projects are active
- **WHEN** two OpenCode bridge connections identify different project directories
- **THEN** both sources contribute to the global status according to the existing aggregation priority rules

### Requirement: Duplicate-source lifecycle diagnostics
The system SHALL emit lifecycle diagnostics that identify source instances by project directory and indicate when a source replaces another source for the same directory.

#### Scenario: Source replacement is diagnosed
- **WHEN** a connection replaces an active source for its project directory
- **THEN** the local bridge logs an event containing the project directory and the replacement outcome without logging OpenCode event payload contents

### Requirement: Superseded source does not reclaim ownership
When the local bridge explicitly retires an OpenCode reporting source because a newer source replaces it, the retired integration SHALL stop automatic connection attempts for the remainder of that plugin setup lifecycle. The replacement SHALL remain the sole authoritative source for that directory. A fresh plugin setup SHALL be allowed to connect normally. This is protection against accidental duplicate bridge loads, not support for simultaneous OpenCode instances of one project.

#### Scenario: Accidentally duplicated bridge is superseded
- **WHEN** a newer bridge source replaces an existing source for the same project directory
- **THEN** the existing source receives an explicit supersession indication
- **AND** it does not reconnect automatically or displace the replacement after retry timers would normally expire

#### Scenario: Superseded integration is unloaded
- **WHEN** an integration is superseded and subsequently unloaded
- **THEN** its cleanup cancels pending connection attempts and releases its socket without reconnecting

#### Scenario: Fresh plugin setup after supersession
- **WHEN** a new plugin setup starts after the earlier setup was superseded
- **THEN** the new setup can establish a bridge connection using the existing source replacement rules

### Requirement: Supersession is distinct from transport failure
The integration SHALL distinguish an explicit source replacement from a connection outage. Ordinary transport failures or Stream Deck bridge restarts SHALL retain automatic retry and snapshot recovery. Events from an obsolete socket SHALL NOT retire, disconnect, or schedule recovery for the currently active socket. Diagnostics SHALL identify source retirement without exposing session content.

#### Scenario: Bridge becomes temporarily unavailable
- **WHEN** a non-superseded integration loses its transport connection
- **THEN** it retries with the existing bounded backoff and sends its current supported snapshot when the bridge becomes available

#### Scenario: Obsolete socket closes after a newer connection exists
- **WHEN** a close or error event arrives from an obsolete socket
- **THEN** the integration's current connection and retry lifecycle remain unaffected

#### Scenario: Source is retired explicitly
- **WHEN** a reporting source receives an explicit supersession indication
- **THEN** the integration logs its instance identity, directory, and retirement outcome without logging prompts or event payload contents
