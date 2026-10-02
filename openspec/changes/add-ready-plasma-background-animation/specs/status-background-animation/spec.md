## MODIFIED Requirements

### Requirement: Status-selected backgrounds for both status actions
Every visible global or project status key SHALL display the existing particle-network background while its effective status is `BUSY`, a smoothly pulsing orange halo while its effective status is `ATTENTION`, a calm continuously evolving green plasma background while its effective status is `READY`, and the existing static status image for `ERROR` or `OFFLINE`. Background selection SHALL NOT alter status aggregation, project scope, request handling, or action interaction.

#### Scenario: Global and project attention coexist
- **WHEN** a global key and a project key both have effective status `ATTENTION`
- **THEN** both display the pulsing orange halo

#### Scenario: Another project stays ready
- **WHEN** project A needs attention and project B remains ready
- **THEN** A's key and the global key display the halo while B's key continues its green READY plasma

#### Scenario: Work continues without attention
- **WHEN** a visible global or project key has effective status `BUSY`
- **THEN** its particle-network appearance and frame interval remain unchanged

#### Scenario: Global and project keys are ready
- **WHEN** a global key and a project key both have effective status `READY`
- **THEN** both display the green plasma background

#### Scenario: No connection or a failure applies
- **WHEN** a key has effective status `OFFLINE` or `ERROR`
- **THEN** it displays the corresponding static image without running plasma

### Requirement: Safe transitions and recoverable image writes
On a status change, the old effect SHALL stop and the new status presentation SHALL take over without an artificial intermediate status. Queued old frames SHALL NOT overwrite the new presentation. Image-write failures SHALL NOT permanently prevent later frames, status transitions, or cleanup.

#### Scenario: Busy requires attention
- **WHEN** a key changes from `BUSY` to `ATTENTION`
- **THEN** particles stop and the halo replaces them without an intermediate `READY` or static `ATTENTION` frame

#### Scenario: Attention resolves into continuing work
- **WHEN** a key changes from `ATTENTION` to `BUSY`
- **THEN** the halo stops and the particle-network animation replaces it

#### Scenario: Attention resolves to ready
- **WHEN** a key changes from `ATTENTION` to `READY`
- **THEN** the halo stops and the green plasma replaces it without a temporary static READY frame

#### Scenario: Attention resolves to a static status
- **WHEN** a key changes from `ATTENTION` to `ERROR` or `OFFLINE`
- **THEN** the halo stops and the corresponding static status image is displayed

#### Scenario: Ready enters another status
- **WHEN** a key changes from `READY` to `BUSY`, `ATTENTION`, `ERROR`, or `OFFLINE`
- **THEN** plasma stops and the corresponding particles, halo, or static image replaces it

#### Scenario: Another status resolves to ready
- **WHEN** a key changes from `BUSY`, `ERROR`, or `OFFLINE` to `READY`
- **THEN** the prior presentation is replaced by the green plasma without an artificial intermediate status

#### Scenario: Slow old write overlaps a transition
- **WHEN** an old animation image write is already in flight during a status transition
- **THEN** the new presentation is serialized after that write settles and queued old frames are suppressed
- **AND** the old effect cannot overwrite the new presentation afterward

#### Scenario: Frame write fails
- **WHEN** writing a halo or plasma frame fails and the key remains visible
- **THEN** later frames can still be displayed and a subsequent status change or disappearance can still stop the animation

## ADDED Requirements

### Requirement: Continuous readable READY plasma
The READY background SHALL show smoothly evolving spatial wave patterns in a green palette over a dark background, continuously while the key is visible and READY. It SHALL remain visually distinct from BUSY particles and the orange ATTENTION pulse, without hard blinking or a duration limit. Status labels and any configured project labels SHALL remain steady and readable throughout the animation. Frames SHALL use the Stream Deck image API without additional runtime dependencies or animated image files.

#### Scenario: Ready persists over multiple cycles
- **WHEN** a visible key remains READY over multiple animation cycles
- **THEN** its green spatial wave pattern continues changing smoothly rather than freezing or switching off
- **AND** its status and configured project labels remain readable and do not animate with the background

### Requirement: Stable independent READY animation lifecycle
Each visible READY key SHALL have an independent animation lifecycle. Repeated READY reports and unrelated project events SHALL NOT restart plasma, reset its phase, or rewrite unchanged titles. Explicit presentation refreshes SHALL update the presentation without resetting the active plasma phase. Appearance or reappearance SHALL display the current READY plasma without waiting for a new report. Disappearance SHALL release that key's animation resources and suppress queued and newly scheduled frame writes; an already issued write is allowed to settle.

#### Scenario: Duplicate ready reports
- **WHEN** a visible READY key repeatedly receives unchanged status reports
- **THEN** its plasma continues without restarting or resetting phase and its unchanged title is not rewritten

#### Scenario: Explicit refresh or layout update during ready
- **WHEN** a READY key receives an explicit presentation refresh, including an update of configured project labels or positions
- **THEN** the updated presentation is applied to the current and subsequent plasma frames without resetting phase

#### Scenario: Ready key appears or reappears
- **WHEN** a key appears or reappears with current effective status READY
- **THEN** it immediately starts its own plasma without restarting other keys

#### Scenario: One ready key disappears
- **WHEN** one of two visible READY keys disappears
- **THEN** only its animation resources are released and its queued and newly scheduled frame writes are suppressed
- **AND** the other key's plasma continues unaffected
- **AND** an already issued write may settle without triggering further writes to the removed key

#### Scenario: A disappeared key ID is reused
- **WHEN** a key disappears during an in-flight plasma write and a new key object appears using the same action ID
- **THEN** the new presentation follows the already issued write and old queued frames cannot overwrite it
