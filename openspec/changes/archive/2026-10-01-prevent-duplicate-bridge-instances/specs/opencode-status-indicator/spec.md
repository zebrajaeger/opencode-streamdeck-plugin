## MODIFIED Requirements

### Requirement: Local persistent bridge
The system SHALL exchange state through a persistent bidirectional local connection between the OpenCode integration and Stream Deck integration. Each directory-identified OpenCode source SHALL have at most one active connection contributing state; a newly connected source for the same project directory SHALL replace the prior source and its contributed state.

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
