## Purpose

Make active work and requests for user input visibly distinct through status-selected animated backgrounds that remain readable and independent on each visible Stream Deck key.

## ADDED Requirements

### Requirement: Status-selected backgrounds for both status actions
Every visible global or project status key SHALL display the existing particle-network background while its effective status is `BUSY`, a smoothly pulsing orange halo while its effective status is `ATTENTION`, and the existing static status image for `READY`, `ERROR`, or `OFFLINE`. Background selection SHALL NOT alter status aggregation, project scope, request handling, or action interaction.

#### Scenario: Global and project attention coexist
- **WHEN** a global key and a project key both have effective status `ATTENTION`
- **THEN** both display the pulsing orange halo

#### Scenario: Another project stays ready
- **WHEN** project A needs attention and project B remains ready
- **THEN** A's key and the global key display the halo while B's key retains its static `READY` image

#### Scenario: Work continues without attention
- **WHEN** a visible global or project key has effective status `BUSY`
- **THEN** its particle-network appearance and frame interval remain unchanged

### Requirement: Continuous readable attention pulse
The attention halo SHALL repeatedly and smoothly vary in intensity while `ATTENTION` remains active, without hard on/off blinking or a time limit. The `ATTENTION` status label SHALL remain readable throughout the cycle and SHALL NOT pulse or disappear with the background. Frames SHALL use the Stream Deck image API without additional runtime dependencies or animated image files.

#### Scenario: Attention remains unresolved
- **WHEN** an attention key remains visible over multiple pulse cycles
- **THEN** its orange halo continues changing and its status label remains readable throughout

#### Scenario: Attention outlasts one pulse
- **WHEN** outstanding requests remain unresolved after the first pulse cycle
- **THEN** the animation continues rather than becoming static

### Requirement: Independent and stable animation lifecycle
Each visible animated key SHALL maintain an independent lifecycle. Repeated reports of the same effective status SHALL NOT restart its effect, reset its phase, or rewrite an unchanged title. An explicit presentation refresh SHALL remain possible without resetting the active effect. A newly visible or reappearing key SHALL render the current status without waiting for a new report.

#### Scenario: Repeated attention reports
- **WHEN** a visible key receives repeated `ATTENTION` reports
- **THEN** the existing pulse advances without restarting or rewriting the unchanged title

#### Scenario: One key disappears
- **WHEN** one of two animated keys disappears
- **THEN** its resources are released and it receives no further queued or newly scheduled frame writes while the other key continues unaffected
- **AND** a write already issued before disappearance is allowed to settle without triggering further writes

#### Scenario: Key appears during attention
- **WHEN** a key becomes visible or reappears while its effective status is already `ATTENTION`
- **THEN** it immediately starts its own halo without restarting other keys

#### Scenario: Explicit refresh during attention
- **WHEN** presentation is explicitly refreshed while a key remains in `ATTENTION`
- **THEN** the refreshed presentation is rendered and subsequent frames continue the same pulse phase

### Requirement: Safe transitions and recoverable image writes
On a status change, the old effect SHALL stop and the new status presentation SHALL take over without an artificial intermediate status. Queued old frames SHALL NOT overwrite the new presentation. Image-write failures SHALL NOT permanently prevent later frames, status transitions, or cleanup.

#### Scenario: Busy requires attention
- **WHEN** a key changes from `BUSY` to `ATTENTION`
- **THEN** particles stop and the halo replaces them without an intermediate `READY` or static `ATTENTION` frame

#### Scenario: Attention resolves into continuing work
- **WHEN** a key changes from `ATTENTION` to `BUSY`
- **THEN** the halo stops and the particle-network animation replaces it

#### Scenario: Attention resolves to a static status
- **WHEN** a key changes from `ATTENTION` to `READY`, `ERROR`, or `OFFLINE`
- **THEN** the halo stops and the corresponding static status image is displayed

#### Scenario: Slow old write overlaps a transition
- **WHEN** an old animation image write is already in flight during a status transition
- **THEN** the new presentation is serialized after that write settles and queued old frames are suppressed
- **AND** the old effect cannot overwrite the new presentation afterward

#### Scenario: Frame write fails
- **WHEN** writing a halo frame fails and the key remains visible
- **THEN** later frames can still be displayed and a subsequent status change or disappearance can still stop the animation
