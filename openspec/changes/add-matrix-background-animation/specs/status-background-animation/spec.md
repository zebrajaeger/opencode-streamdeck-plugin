## ADDED Requirements

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

## MODIFIED Requirements

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
