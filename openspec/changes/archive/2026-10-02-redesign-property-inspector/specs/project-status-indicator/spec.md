## MODIFIED Requirements

### Requirement: Configurable project status display
The system SHALL provide a display-only Stream Deck action whose instance settings identify the OpenCode project to monitor by its OpenCode project ID. The property inspector SHALL let users select known OpenCode projects by human-readable directory-derived labels while storing the selected project's OpenCode project ID as the action setting. It SHALL provide an advanced manual project-ID entry for a project that is not known to the selector. The property inspector SHALL present these controls, and every other setting of this action, through the sectioned, appearance-adaptive dialog presentation defined by the property-inspector-dialog capability, with the manual project-ID entry placed in a section that is collapsed by default.

#### Scenario: Configured project is active
- **WHEN** a project-status action is configured for a project ID that has one or more active bridge connections
- **THEN** the action displays that project's aggregated status

#### Scenario: User selects a known project
- **WHEN** a user chooses a known project from the property inspector's project selector
- **THEN** the action saves that project's OpenCode project ID and updates to display the selected project's current status

#### Scenario: Manual project ID is saved
- **WHEN** a user saves an OpenCode project ID through the advanced manual entry
- **THEN** the action updates to display that project's current status

#### Scenario: Project selection is changed
- **WHEN** a user saves a different project ID in a project-status action's settings
- **THEN** the action updates to display the newly selected project's current status

#### Scenario: Settings are presented in sections
- **WHEN** a user opens the property inspector of a project-status action
- **THEN** its settings appear grouped in collapsible sections with label-left, control-right rows
- **AND** the advanced manual project-ID entry is collapsed until the user expands it

#### Scenario: Redesigned dialog preserves existing settings
- **WHEN** a project-status action configured before the dialog redesign is opened in the redesigned dialog
- **THEN** its stored project selection and presentation settings are shown unchanged and the key continues to display the same status presentation
