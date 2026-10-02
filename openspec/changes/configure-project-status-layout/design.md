## Context

See proposal.md for motivation and specs/project-status-indicator/spec.md for the behavioral contract. This design is needed because the change crosses the inspector, per-key settings, manifest, and static/animated rendering.

The current project action stores only projectID and delegates rendering to StatusActionRenderer, which is also used by the global action. That renderer calls setTitle(status); its SVGs contain graphics but no text. Stream Deck gives user-defined titles precedence over plugin titles. The installed SDK exposes no command to set native title alignment; title-change events report user choices rather than giving the plugin control over them.

The inspector currently builds replacement settings containing only projectID. This must change before adding presentation settings, otherwise selecting a project would erase them.

## Goals / Non-Goals

**Goals:**
- Keep presentation state isolated per key and independent from status aggregation.
- Make layout normalization and SVG text composition deterministic and directly testable.
- Preserve animation cancellation and stale-frame protection when layout changes.

**Non-Goals:**
- Native Stream Deck title styling, automatic directory-derived names, or automatic import of existing native titles.
- Migration or compatibility handling for project-key configurations created before this change, including saved native custom titles.
- Changes to the global action, bridge protocol, project identity, status precedence, or animation timing.
- User-controlled font styling or graphics positions.

## Decisions

### 1. Own both text elements in the project image

The user approved a dedicated Project name field in the inspector instead of using the native title field. Compose that name and the status into the same SVG image. For the project action only, disable native title editing with UserTitleEnabled: false, set the state's ShowTitle: false, and stop publishing status through the native title channel. Verify native-title suppression on newly configured views; previously saved per-key title parameters are outside this change's scope.

No native-title import or legacy settings migration is required. Explain the dedicated name field in the inspector. New keys default to an empty name.

Alternatives: keeping the name native cannot honor the independent position selector; drawing a second copy of the native name creates duplicates; relying only on setTitle("") cannot clear a user-defined title because of precedence.

### 2. Persist presentation per action instance

Extend ProjectStatusSettings with projectName, namePosition, and statusPosition. Positions use top, middle, and bottom. Missing names normalize to an empty string; missing or unsupported positions use name=bottom and status=middle. If individually normalized positions collide, preserve the status position and choose bottom for the name unless bottom is occupied, in which case choose middle. Thus malformed settings always produce a deterministic distinct pair.

Share the normalization contract between inspector and runtime through a small testable boundary compatible with the inspector's browser module and the project's TypeScript build. Use the same fixtures to prevent drift if build constraints require separate adapters. Normalization must not overwrite unknown settings.

Keep a complete current-settings snapshot in the inspector and merge only changed fields. Both project selection paths must preserve presentation and unrelated fields. Persist and render changes per action ID, never through a renderer-wide name or layout value.

Alternative: global presentation settings would couple otherwise independent project keys. Automatic swapping on collision is unnecessary because the UI disables occupied choices.

### 3. Three bounded text regions

Use the existing 144 by 144 coordinate system and define non-overlapping top, middle, and bottom text bands with horizontally centered text. Keep both labels inside their assigned bands; normalize line breaks for a single-line name and fit or truncate long names with an ellipsis. Exact font size and band padding can be tuned during visual verification without changing the behavioral contract. Reserve sufficient contrast behind text so particles and static graphics do not impair readability.

Escape all user text as XML text before composing SVG; names containing &, <, >, quotes, or non-ASCII characters must remain literal content, not markup. Status values come from the existing status type.

Alternative: unrestricted multiline SVG text can occupy neighboring regions and defeats collision prevention.

### 4. Compose static and animated images through the same layout boundary

Add a project-specific presentation path rather than changing the global action's default rendering. Static status images and every BUSY frame must use the same text compositor and effective layout. A layout/name update triggers a redraw immediately, even if status has not changed. Active animation frames must use the current presentation, and queued old frames must not overwrite a newer layout or a subsequent static status.

Reuse the particle engine and its generation/serialized-write lifecycle where practical; keep text composition separate from particle movement. Existing global renderer behavior must remain the default when no project presentation is supplied.

Alternative: drawing labels once after starting the animation fails because the next animation frame replaces the image.

## Risks / Trade-offs

- [Native overlays could compete with composed text] -> Verify a newly configured view on hardware and in the Stream Deck software with native title display disabled; legacy native-title configurations are not an acceptance gate.
- [Settings replacement loses fields] -> Merge snapshots and test both known-project and manual-ID selection after configuring presentation.
- [Text is less customizable than native titles] -> Keep styling intentionally fixed; verify long names and ATTENTION at all three positions.
- [Animation race causes old layouts to reappear] -> Extend stale-frame tests to layout changes during BUSY and subsequent status transitions.
- [Shared renderer accidentally changes global keys] -> Run existing tests and explicitly verify a global and project key together.

## Deployment and Verification

1. Implement and verify in a temporary project copy before replacing live plugin code, since this repository hosts the running integration.
2. Configure new project views with status=middle, name=bottom, and an initially blank name. Do not add conversion logic for pre-existing key configurations.
3. Verify newly configured views, inspector reopening, and plugin restart on Stream Deck. Persistence of views configured with the new version remains required.
4. Roll back the plugin build if verification fails; no cross-version settings migration or rollback compatibility is required.
