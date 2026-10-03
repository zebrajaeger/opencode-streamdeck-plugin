## Purpose

Make active work and requests for user input visibly distinct through status-selected animated backgrounds that remain readable and independent on each visible Stream Deck key.

## Requirements

### Requirement: Per-key READY background selection
Both global and project status keys SHALL expose a READY background selector in their property inspector's Display section with Plasma, Attention halo, Particles, and Matrix. Matrix SHALL be persisted as `readyBackground: "matrix"`. Selection SHALL be persisted independently per key and restored when the inspector opens, settings arrive, or the key reappears. Missing, malformed, or unsupported selections SHALL resolve to Plasma consistently in the inspector and key. Saving a selection SHALL preserve unrelated settings, including project selection, fonts, positions, and section state. The selector SHALL explain that the setting changes only READY appearance and retains the renderer's original colors. Existing supported selection values SHALL retain their meaning.

#### Scenario: Select and restore a background
- **WHEN** a user selects Particles, Attention halo, or Matrix on either action and later reopens its inspector or makes the key visible again
- **THEN** the saved selection is restored and a READY key uses that selection without waiting for a status report
- **AND** other keys and unrelated settings are unchanged

#### Scenario: Legacy or invalid settings
- **WHEN** the READY background setting is absent, malformed, or unsupported
- **THEN** the inspector shows Plasma and a READY key uses green plasma without preventing other settings from loading

#### Scenario: Change the selection outside READY
- **WHEN** the user changes a key's READY background while it is BUSY, ATTENTION, ERROR, or OFFLINE
- **THEN** its current status background and active animation phase remain unchanged
- **AND** the saved selection takes effect the next time that key becomes READY

#### Scenario: Existing selections remain compatible
- **WHEN** a key already stores Plasma, Attention halo, or Particles before Matrix becomes available
- **THEN** its selection, original renderer palette, and timing remain unchanged

#### Scenario: Matrix is available independently on both actions
- **WHEN** a user selects Matrix for a global status key and Plasma for a project status key
- **THEN** their READY backgrounds follow those independent choices and both continue to report the actual READY status

### Requirement: Compact continuous Matrix character rain
When Matrix is selected for a visible READY key, its background SHALL continuously display sparse downward-moving green character trails over a dark base, with brighter leading characters and progressively dimmer trailing characters. At a native 72×72 pixel display size the trails SHALL remain recognizable as separate character columns rather than a dense green texture. Characters SHALL remain distinguishable as glyphs, not merely dots or lines. Trails SHALL enter and leave the visible area independently without whole-background blinking, synchronized resets, or a duration limit. Frames SHALL use the existing Stream Deck image API without additional runtime dependencies or animated image files.

#### Scenario: Recognizable rain on the physical key size
- **WHEN** representative Matrix frames are displayed at 72×72 pixels without magnification
- **THEN** distinct green character columns, brighter heads, and fading tails remain recognizable against the dark background
- **AND** the background does not become a solid green texture

#### Scenario: READY persists
- **WHEN** a visible READY key with Matrix selected remains READY over multiple trail traversals
- **THEN** downward character motion continues and individual trails recycle independently without the entire background flashing or stopping

### Requirement: Readable Matrix presentation and independent lifecycle
Matrix SHALL remain a background only: the effective status, status glyph, status label, configured project labels, fonts, and positions SHALL retain their existing meaning and settings. Labels SHALL remain steady and readable throughout the rain, including each supported project text position. Each visible Matrix key SHALL use the existing independent READY animation lifecycle and safe live-selection transitions. Repeated READY reports or same-selection presentation refreshes SHALL NOT reset its rain phase. Disappearance SHALL release resources and suppress queued or newly scheduled writes; an already issued write is allowed to settle. Image-write failures SHALL NOT permanently prevent subsequent frames or cleanup.

#### Scenario: Labels remain readable through motion
- **WHEN** Matrix runs on global and project READY keys with supported text positions and default readable fonts
- **THEN** their READY labels and configured project names remain steady and readable at 72×72 pixels across bright-head and dim-tail frames
- **AND** font or layout changes are applied without restarting rain or modifying the configured fields

#### Scenario: Duplicate reports and independent keys
- **WHEN** two visible keys use Matrix and one receives repeated READY reports or a same-selection refresh
- **THEN** neither rain phase is reset and unchanged titles are not rewritten

#### Scenario: Matrix switch races with an old image write
- **WHEN** a READY key rapidly switches from another background to Matrix and then to another choice while an image write is delayed or fails
- **THEN** the latest choice becomes visible after the issued write settles, no superseded queued frame overwrites it, and later animation and cleanup remain possible
- **AND** the displayed status remains READY and other keys continue unaffected

#### Scenario: Matrix key disappears and its ID is reused
- **WHEN** a Matrix key disappears during an in-flight write and a new key object appears with the same action ID
- **THEN** the removed key schedules no further writes, the new key displays its current status and settings after the issued write settles, and other keys continue unaffected

#### Scenario: Leave READY
- **WHEN** a Matrix key changes to BUSY, ATTENTION, ERROR, or OFFLINE
- **THEN** Matrix stops and the existing presentation for the new status replaces it without an artificial intermediate status or stale Matrix overwrite

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
