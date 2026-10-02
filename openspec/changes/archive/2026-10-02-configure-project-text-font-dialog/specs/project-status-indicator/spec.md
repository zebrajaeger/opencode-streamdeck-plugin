## MODIFIED Requirements

### Requirement: Persistent project-view presentation
The project-status action SHALL persist its configured name, position pair, and independent name/status font settings (size, family, style, underline, color) per key across inspector reopenings and plugin restarts. Editing the name, layout, or either text's font SHALL preserve project selection and unrelated action settings. Changing project selection SHALL preserve the configured name, layout, and both fonts. Existing saved `nameFontSize` and `statusFontSize` values SHALL remain effective without migration; absent or unsupported new font attributes SHALL use the existing appearance (Arial/sans-serif, regular, no underline, white).

#### Scenario: Configuration is reopened after restart
- **WHEN** the user reopens a configured project-status action after a plugin restart
- **THEN** the saved name, positions, and both fonts are restored in both the configuration and key display

#### Scenario: Presentation settings are saved
- **WHEN** the user saves a name, position, or font change
- **THEN** the action retains its selected project ID and unrelated settings

#### Scenario: Project selection is changed
- **WHEN** the user selects a different known project or saves a manual project ID
- **THEN** the action retains its configured name, position pair, and both fonts
- **AND** the displayed status changes to that of the newly selected project

#### Scenario: Existing font sizes are loaded
- **WHEN** the action loads saved size settings without the new font attributes
- **THEN** the two texts and font dialogs retain their respective saved sizes and use the former default appearance for the other attributes

### Requirement: Independently configurable name and status font sizes
The project-status configuration SHALL provide a separate font dialog for the project name and status in place of the two font-size selectors. Each dialog SHALL offer font family, size, regular/bold/italic/bold-italic style, underline, and text color; each choice SHALL be persisted per key and SHALL update only its own displayed text without requiring a status transition. The chosen size SHALL remain fixed regardless of text length; text exceeding the available region SHALL be shortened with an ellipsis rather than rendered at a smaller size or horizontally compressed. Supported choices SHALL keep both elements within their separate regions. Missing or unsupported size settings SHALL resolve consistently in the inspector and runtime to readable defaults. These controls SHALL NOT change the global key's presentation.

The font-size control SHALL be a horizontal slider supporting every whole-pixel size from 16 through 28, with a visible value that updates as the slider moves. Moving the slider SHALL only edit the dialog's draft; applying the dialog SHALL save the selected value, and dismissing it SHALL leave the stored value unchanged.

#### Scenario: User changes the project-name size
- **WHEN** the user chooses a different project-name font size while status is unchanged
- **THEN** the key immediately renders the name at that size
- **AND** the status font size, position selections, and project ID are unchanged

#### Scenario: User changes the status size
- **WHEN** the user chooses a different status font size
- **THEN** the key immediately renders the status at that size
- **AND** the name font size is unchanged

#### Scenario: User adjusts the size slider
- **WHEN** the user moves the name or status font-size slider to an intermediate whole-pixel value such as 23
- **THEN** the dialog displays 23 px before applying without changing the key
- **AND** applying saves 23 for the selected text alone and updates that text on the key

#### Scenario: Font size changes during BUSY
- **WHEN** the user changes either font size while BUSY animation is running
- **THEN** subsequent displayed frames use the updated size for that element
- **AND** queued stale frames do not restore the previous presentation

#### Scenario: Long name at a chosen size
- **WHEN** the configured name exceeds the available width at the selected font size
- **THEN** the key displays a shortened name with an ellipsis at that same font size
- **AND** the name remains inside its own region without obscuring status

#### Scenario: Defaults or unsupported sizes are loaded
- **WHEN** a key loads missing or unsupported font-size settings
- **THEN** its name and status use the corresponding readable default sizes
- **AND** the inspector shows the same effective sizes as the key

#### Scenario: Keys have independent font sizes
- **WHEN** two project-status keys have different saved name and status sizes
- **THEN** each key renders its own selected sizes without affecting the other key or a global key

#### Scenario: Other font attributes are applied
- **WHEN** the user changes the name's family, style, underline, or color in its dialog
- **THEN** the name on the key reflects those choices in static states and every animation frame
- **AND** the status retains its independent font settings and position

#### Scenario: Status font attributes change during animation
- **WHEN** the user changes the status font while an animation is active
- **THEN** subsequent frames display the status with the selected attributes without resetting the animation phase
- **AND** queued older frames do not restore the former font

#### Scenario: Font dialog is dismissed without saving
- **WHEN** the user cancels or dismisses a font dialog before applying its changes
- **THEN** neither text's saved font nor its rendered appearance changes

#### Scenario: Unsupported font settings are loaded
- **WHEN** saved family, style, underline, or color values are unsupported or malformed
- **THEN** the inspector and key use matching safe defaults for those attributes
- **AND** the saved project selection and unrelated settings remain intact
