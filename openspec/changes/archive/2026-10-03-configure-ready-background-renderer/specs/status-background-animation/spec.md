## ADDED Requirements

### Requirement: Per-key READY background selection
Both global and project status keys SHALL expose a READY background selector in their property inspector's Display section with exactly the currently implemented animated backgrounds: Plasma, Attention halo, and Particles. Selection SHALL be persisted independently per key and restored when the inspector opens, settings arrive, or the key reappears. Missing, malformed, or unsupported selections SHALL resolve to Plasma consistently in the inspector and key. Saving a selection SHALL preserve unrelated settings, including project selection, fonts, positions, and section state. The selector SHALL explain that the setting changes only READY appearance and retains the renderer's original colors.

#### Scenario: Select and restore a background
- **WHEN** a user selects Particles or Attention halo on either action and later reopens its inspector or makes the key visible again
- **THEN** the saved selection is restored and a READY key uses that selection without waiting for a status report
- **AND** other keys and unrelated settings are unchanged

#### Scenario: Legacy or invalid settings
- **WHEN** the READY background setting is absent, malformed, or unsupported
- **THEN** the inspector shows Plasma and a READY key uses green plasma without preventing other settings from loading

#### Scenario: Change the selection outside READY
- **WHEN** the user changes a key's READY background while it is BUSY, ATTENTION, ERROR, or OFFLINE
- **THEN** its current status background and active animation phase remain unchanged
- **AND** the saved selection takes effect the next time that key becomes READY

### Requirement: Live READY renderer changes
A changed effective READY background selection SHALL replace only that visible READY key's active background without an artificial status transition or static intermediate frame. Unchanged effective selections, including different invalid values that both resolve to Plasma, SHALL NOT restart an effect. Rapid selection changes SHALL settle on the latest selection. Already issued image writes SHALL be allowed to settle before the latest presentation; superseded queued frames SHALL NOT overwrite it. Write failure SHALL NOT block recovery or cleanup.

#### Scenario: Switch a READY key
- **WHEN** a READY key changes from Plasma to Attention halo
- **THEN** its plasma stops and the orange halo starts while the displayed status remains READY
- **AND** other keys continue without restarting

#### Scenario: Rapid changes during a slow or failing write
- **WHEN** a READY key switches Plasma to Attention halo to Particles while an old image write is delayed or fails
- **THEN** the latest selection becomes the visible READY background after the issued write settles
- **AND** queued superseded frames cannot overwrite it and later frames and cleanup remain possible

## MODIFIED Requirements

### Requirement: Status-selected backgrounds for both status actions
Every visible global or project status key SHALL display the existing particle-network background while its effective status is `BUSY`, a smoothly pulsing orange halo while its effective status is `ATTENTION`, its independently configured animated background while its effective status is `READY` (defaulting to green plasma), and the existing static status image for `ERROR` or `OFFLINE`. READY selections SHALL retain the existing renderer palettes and timing: green plasma, orange attention halo, and blue/light-blue particles. Background selection SHALL NOT alter effective status, status aggregation, project scope, request handling, or action interaction.

#### Scenario: Global and project attention coexist
- **WHEN** a global key and a project key both have effective status `ATTENTION`
- **THEN** both display the pulsing orange halo regardless of their READY settings

#### Scenario: Another project stays ready
- **WHEN** project A needs attention and project B remains ready
- **THEN** A's key and the global key display the halo while B's key continues its configured READY background

#### Scenario: Work continues without attention
- **WHEN** a visible global or project key has effective status `BUSY`
- **THEN** its particle-network appearance and frame interval remain unchanged regardless of its READY setting

#### Scenario: Global and project keys are ready
- **WHEN** a global key configured with Particles and a project key configured with Attention halo both have effective status `READY`
- **THEN** each displays its selected background in its original palette while both status labels remain READY

#### Scenario: No connection or a failure applies
- **WHEN** a key has effective status `OFFLINE` or `ERROR`
- **THEN** it displays the corresponding static image without running a READY background

### Requirement: Safe transitions and recoverable image writes
On a status change, the old status presentation SHALL stop and the new status presentation SHALL take over without an artificial intermediate status. The new status SHALL select its own background, including the configured READY selection. Queued old frames SHALL NOT overwrite the new presentation. Image-write failures SHALL NOT permanently prevent later frames, status transitions, or cleanup.

#### Scenario: Busy requires attention
- **WHEN** a key changes from `BUSY` to `ATTENTION`
- **THEN** particles stop and the halo replaces them without an intermediate `READY` or static `ATTENTION` frame

#### Scenario: Attention resolves into continuing work
- **WHEN** a key changes from `ATTENTION` to `BUSY`
- **THEN** the attention presentation stops and BUSY particles replace it

#### Scenario: Attention resolves to ready
- **WHEN** a key changes from `ATTENTION` to `READY`
- **THEN** the configured READY background takes over with the READY label and without a temporary static READY frame

#### Scenario: Attention resolves to a static status
- **WHEN** a key changes from `ATTENTION` to `ERROR` or `OFFLINE`
- **THEN** the halo stops and the corresponding static status image is displayed

#### Scenario: Ready enters another status
- **WHEN** a key changes from `READY` to `BUSY`, `ATTENTION`, `ERROR`, or `OFFLINE`
- **THEN** its READY presentation is replaced by the corresponding particles, halo, or static image with the new status label

#### Scenario: Another status resolves to ready
- **WHEN** a key changes from `BUSY`, `ERROR`, or `OFFLINE` to `READY`
- **THEN** the prior presentation is replaced by its configured READY background without an artificial intermediate status

#### Scenario: Slow old write overlaps a transition
- **WHEN** an old animation image write is already in flight during a status transition
- **THEN** the new presentation is serialized after that write settles and queued old frames are suppressed
- **AND** the old presentation cannot overwrite the new presentation afterward

#### Scenario: Frame write fails
- **WHEN** writing an animated frame fails and the key remains visible
- **THEN** later frames can still be displayed and a subsequent status change or disappearance can still stop the animation

### Requirement: Continuous readable READY plasma
When Plasma is selected explicitly or by default, the READY background SHALL show smoothly evolving spatial wave patterns in a green palette over a dark background, continuously while the key is visible and READY. Plasma SHALL remain visually distinct from BUSY particles and the orange ATTENTION pulse, without hard blinking or a duration limit. Every selected READY background SHALL keep the READY status label and configured project labels steady and readable throughout its animation, including when the background uses the ATTENTION or BUSY palette. Frames SHALL use the Stream Deck image API without additional runtime dependencies or animated image files.

#### Scenario: Ready persists over multiple cycles
- **WHEN** a visible key remains READY with Plasma selected over multiple animation cycles
- **THEN** its green spatial wave pattern continues changing smoothly rather than freezing or switching off
- **AND** its status and configured project labels remain readable and do not animate with the background

#### Scenario: READY uses another status's background style
- **WHEN** a visible READY key uses Attention halo or Particles over multiple cycles
- **THEN** its selected animation continues in its original palette and timing
- **AND** the status label remains READY and configured labels stay steady and readable

### Requirement: Stable independent READY animation lifecycle
Each visible READY key SHALL have an independent animation lifecycle for its selected renderer. Repeated READY reports and unrelated project events SHALL NOT restart the effect, reset its phase, or rewrite unchanged titles. Explicit presentation refreshes with the same effective renderer selection SHALL update the presentation without resetting the active effect phase. A changed renderer selection SHALL follow the live READY renderer change requirement. Appearance or reappearance SHALL display the current selected READY background without waiting for a new report. Disappearance SHALL release that key's animation resources and suppress queued and newly scheduled frame writes; an already issued write is allowed to settle.

#### Scenario: Duplicate ready reports
- **WHEN** a visible READY key repeatedly receives unchanged status reports or the same effective renderer selection
- **THEN** its selected animation continues without restarting or resetting phase and its unchanged title is not rewritten

#### Scenario: Explicit refresh or layout update during ready
- **WHEN** a READY key receives an explicit presentation refresh, including an update of configured project labels or positions, without changing its effective renderer selection
- **THEN** the updated presentation is applied to current and subsequent frames without resetting phase

#### Scenario: Ready key appears or reappears
- **WHEN** a key appears or reappears with current effective status READY
- **THEN** it immediately starts its own selected background without restarting other keys

#### Scenario: One ready key disappears
- **WHEN** one of two visible READY keys disappears
- **THEN** only its animation resources are released and its queued and newly scheduled frame writes are suppressed
- **AND** the other key's selected animation continues unaffected
- **AND** an already issued write may settle without triggering further writes to the removed key

#### Scenario: A disappeared key ID is reused
- **WHEN** a key disappears during an in-flight animated write and a new key object appears using the same action ID
- **THEN** the new presentation uses the new key's current settings and follows the already issued write while old queued frames cannot overwrite it
