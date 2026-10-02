## Purpose

Defines how the plugin's property inspector dialogs are structured, grouped, themed and remembered, so every action's settings are scannable and legible in both Stream Deck appearances.

## ADDED Requirements

### Requirement: Sectioned dialog with collapsible groups
A property inspector dialog SHALL present its settings in named sections. Each section SHALL have a header carrying a disclosure arrow that indicates whether the section is expanded or collapsed, and activating the header SHALL toggle the section. A collapsed section SHALL hide its settings; an expanded section SHALL show them.

#### Scenario: Section is collapsed
- **WHEN** a user activates the header of an expanded section
- **THEN** the section's settings are hidden and the disclosure arrow indicates the collapsed state

#### Scenario: Section is expanded
- **WHEN** a user activates the header of a collapsed section
- **THEN** the section's settings become visible and the disclosure arrow indicates the expanded state

#### Scenario: Collapsed settings keep their values
- **WHEN** a section containing a configured setting is collapsed
- **THEN** the stored setting value is unchanged and still applied by the action

### Requirement: Persisted section state
A dialog SHALL store each section's expanded or collapsed state in the action's settings and SHALL restore that state when the dialog is reopened for the same action. A section with no stored state SHALL use its defined default state.

#### Scenario: Dialog is reopened
- **WHEN** a user collapses a section, closes the dialog, and selects the same key again
- **THEN** that section is shown collapsed and the sections the user left expanded are shown expanded

#### Scenario: No state has been stored yet
- **WHEN** a dialog is opened for a key whose settings contain no section state
- **THEN** each section is shown in its defined default state

#### Scenario: Section state does not affect behavior
- **WHEN** section state is stored or restored
- **THEN** no action behavior other than dialog presentation changes

### Requirement: Label-left, control-right row layout
Within a section, each setting SHALL be presented as a single row with its label in a left-hand column and its control in a right-hand column. Labels SHALL share a common column width across rows of a dialog so controls align vertically. A row's explanatory text SHALL be presented as supporting detail beneath the control rather than as a full-width paragraph between rows.

#### Scenario: Settings align in a section
- **WHEN** a section shows several settings with labels of different lengths
- **THEN** their controls start at the same horizontal position

#### Scenario: Setting carries explanatory text
- **WHEN** a setting has explanatory text
- **THEN** that text appears with the setting's control and does not break the row alignment

### Requirement: Titled divider grouping within a section
A section SHALL be able to group related rows under a titled divider: a caption with a horizontal rule extending to each side. A titled divider SHALL label the rows that follow it until the next divider or the end of the section, and SHALL NOT be independently collapsible.

#### Scenario: Group is introduced
- **WHEN** a section contains two groups of related settings
- **THEN** each group is introduced by a captioned divider rule and the rows below a caption belong to that group

#### Scenario: Divider is not a control
- **WHEN** a user activates a titled divider
- **THEN** no setting changes and the section's expanded state is unaffected

### Requirement: Appearance-adaptive legible colors
A dialog SHALL derive its text, control, divider and background colors from the Stream Deck application appearance rather than from fixed values tuned for one appearance. All text, labels, divider captions and control values SHALL remain legible against their background in both the light and the dark appearance.

#### Scenario: Dark appearance
- **WHEN** the dialog is shown while Stream Deck uses its dark appearance
- **THEN** labels, values, divider captions and supporting text are legible against the dark background

#### Scenario: Light appearance
- **WHEN** the dialog is shown while Stream Deck uses its light appearance
- **THEN** the same text is legible against the light background without any element rendering near-invisible

#### Scenario: Appearance changes while open
- **WHEN** the Stream Deck appearance changes while a dialog is open
- **THEN** the dialog presents itself in the new appearance without losing entered or stored values

### Requirement: Offline dialog assets
A dialog SHALL render completely using assets shipped inside the plugin and SHALL NOT depend on network access at display time.

#### Scenario: No network available
- **WHEN** a dialog is opened on a machine with no internet connection
- **THEN** it renders its sections, rows and controls fully and remains operable
