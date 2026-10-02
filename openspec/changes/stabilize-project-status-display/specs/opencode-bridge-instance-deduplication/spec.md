## ADDED Requirements

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
