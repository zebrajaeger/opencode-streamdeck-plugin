## MODIFIED Requirements

### Requirement: Attention status for permission requests
The system SHALL display `ATTENTION` while one or more connected OpenCode instances have an unanswered permission request or an unanswered agent question.

#### Scenario: Permission request arrives while a session is working
- **WHEN** a connected instance reports an unanswered permission request while any session is working
- **THEN** the status action displays `ATTENTION`

#### Scenario: Agent question arrives while a session is working
- **WHEN** a connected instance reports an unanswered agent question while any session is working
- **THEN** the status action displays `ATTENTION`

#### Scenario: Permission request is answered
- **WHEN** the final unanswered permission request is answered and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Agent question is resolved
- **WHEN** the final unanswered permission request or agent question is answered or rejected and no error or working session remains
- **THEN** the status action displays `READY`

#### Scenario: Multiple attention requests coexist
- **WHEN** a connected instance has unanswered permission requests and agent questions
- **THEN** the status action continues to display `ATTENTION` until every unanswered permission request and agent question is resolved

### Requirement: State priority
The system SHALL calculate the global status using this descending priority: `ATTENTION`, `ERROR`, `BUSY`, `READY`, `OFFLINE`, where an unanswered permission request or agent question produces `ATTENTION`.

#### Scenario: Multiple state classes coexist
- **WHEN** connected instances collectively contain a working session, an errored session, and an unanswered permission request or agent question
- **THEN** the status action displays `ATTENTION`
