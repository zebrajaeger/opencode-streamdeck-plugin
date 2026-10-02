## ADDED Requirements

### Requirement: Configurable combined-status font
The global OpenCode status action SHALL offer a property inspector with a Display section and a status-font dialog using the same font family, whole-pixel size range of 10 through 28, regular/bold/italic/bold-italic style, underline, and text-color choices as the project-status font dialog. The font choices SHALL be saved independently per global key and SHALL NOT change which connected instances contribute to the combined status or affect project-status keys. The inspector SHALL display the same effective settings as the key for absent or unsupported values, using the existing status-font defaults.

#### Scenario: Global inspector opens
- **WHEN** a user opens the property inspector for a combined-status key
- **THEN** a Display section offers a status-font control that opens the same kind of font dialog as the project-status action, without project-selection or project-name controls

#### Scenario: Size slider edits a draft
- **WHEN** a user moves the dialog's font-size slider to 23 px
- **THEN** the dialog displays 23 px without changing the key until the user applies the dialog

#### Scenario: User applies font changes
- **WHEN** the user applies family, size, style, underline, or color choices for a combined-status key
- **THEN** that key displays its current status with those choices without waiting for a status transition
- **AND** another global key and all project-status keys retain their own appearance

#### Scenario: User dismisses the dialog
- **WHEN** the user cancels or dismisses the dialog before applying
- **THEN** the saved font and displayed key remain unchanged

#### Scenario: Global key settings are restored
- **WHEN** a configured global key's inspector is reopened after a plugin restart
- **THEN** its saved font choices appear in the dialog and on the key

#### Scenario: Missing or malformed font choices
- **WHEN** a global key has no font settings or loads unsupported font values
- **THEN** its inspector and key show the same safe default status font without changing unrelated settings

### Requirement: Combined-status font rendering
The global status action SHALL display the effective OFFLINE, READY, BUSY, ATTENTION, or ERROR label as styled key text in every static image and animated frame. The configured size SHALL remain fixed; text exceeding its available area SHALL be shortened with an ellipsis instead of shrinking or overlapping outside its region. The native Stream Deck title SHALL NOT duplicate or obscure the rendered label. A font-only change during an animation SHALL take effect on subsequent frames without resetting that animation or allowing queued older frames to restore the previous appearance. Global status calculation and effects SHALL remain unchanged.

#### Scenario: Configured key shows static status
- **WHEN** an OFFLINE or ERROR global key has a configured status font
- **THEN** the status label appears in that font without a duplicate native title

#### Scenario: Configured key animates
- **WHEN** a global key displays READY, BUSY, or ATTENTION
- **THEN** every displayed animation frame retains the current status label with its configured font and existing background effect

#### Scenario: Font changes during animation
- **WHEN** a user applies another font while a global READY, BUSY, or ATTENTION animation is active
- **THEN** the updated font is displayed without restarting the background animation
- **AND** queued older frames do not restore the previous font

#### Scenario: Global aggregation remains independent of presentation
- **WHEN** a global key's font is changed while multiple OpenCode instances contribute status
- **THEN** the key still shows the same effective combined status according to existing aggregation rules
