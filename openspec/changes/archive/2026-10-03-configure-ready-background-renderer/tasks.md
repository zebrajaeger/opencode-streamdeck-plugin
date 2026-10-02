## 1. Shared setting and action integration

- [x] 1.1 Before editing existing symbols, run GitNexus upstream impact for the renderer configuration/render/dispose methods, both action settings handlers, and inspector handlers; verify callers and risk are recorded, confirm UNKNOWN results with source searches, and preserve all pre-existing working-tree/font-change edits.
- [x] 1.2 Add the shared `ready-background.mjs` choice/normalization module and `.d.mts` declaration with `plasma`, `attention`, and `particle`; verify unit tests cover the three valid values and absent, malformed, and unsupported inputs defaulting to Plasma.
- [x] 1.3 Extend global/project settings types and renderer configuration to retain a normalized `readyBackground` per action ID separately from text presentation; clear it on dispose. Verify tests show independent global/project settings, default normalization, and cleanup without losing font/layout fields.
- [x] 1.4 Ensure both action appearance and settings handlers configure the saved selection before rendering current status. Verify action-wiring tests cover initially READY keys, settings changes without new status reports, and hide/reappear restoration.

## 2. Renderer identity and safe lifecycle

- [x] 2.1 Resolve background identity from effective status plus normalized READY selection, reuse the existing effect implementations/palettes/intervals, and keep glyph/text composition driven by actual status. Verify renderer tests cover all three selections for both action modes, original colors/timing, READY labels, and unchanged BUSY/ATTENTION/static appearances.
- [x] 2.2 Track effect identity with active status and replace controllers when either changes; bypass unchanged-status suppression for changed READY identity. Verify tests show live switching affects only one key and emits no false status or static intermediate frame.
- [x] 2.3 Preserve controllers on duplicate reports, equivalent normalized selections, non-READY selection changes, and same-renderer font/layout/project refreshes. Verify clock/controller-count tests demonstrate phase retention and selection application on the next READY transition.
- [x] 2.4 Retain presentation-version, controller-identity, and serialized action-ID write guards through renderer replacement. Verify deferred-write tests cover rapid Plasma → Attention halo → Particles switching with resolved/rejected old writes, latest-selection wins, no stale overwrite, and no leaked controllers.
- [x] 2.5 Verify all selected READY renderers survive later write failures and stop cleanly on ERROR/OFFLINE, disappearance, and reused action IDs; extend lifecycle tests to assert no queued/new writes after removal and unaffected neighboring animations, including BUSY ↔ READY particles and ATTENTION ↔ READY halo transitions.

## 3. Property inspector controls

- [x] 3.1 Add the shared-choice READY background selector and READY-only/original-color help text to the project inspector's Display section, using its SDPI event/restoration conventions. Verify inspector tests cover initial/default selection, each choice, settings reception, reopening, and no feedback writes on restoration.
- [x] 3.2 Add the equivalent selector to the global status inspector with native select events and shared normalization. Verify `status-inspector.test.mjs` covers the same restore/save/default behavior and confirms project-only controls remain absent.
- [x] 3.3 Ensure selector saves preserve project/font/layout/section/unknown settings and existing font/project/section saves preserve `readyBackground`. Verify round-trip tests in both inspectors and font Apply/Cancel regression tests.

## 4. Integration verification

- [x] 4.1 Run `npm test`, `npx tsc --noEmit`, and `npm run build` from `streamdeck-plugin`; verify the complete suite, type check, and bundle build pass without new runtime dependencies or OpenCode bridge changes.
- [ ] 4.2 Exercise both inspectors in a real browser with representative Stream Deck settings messages: change every choice, reopen, load invalid settings, and use font/layout controls. Verify visible restoration, correct action-scoped settings payloads, no console errors, no restoration write loops, and preserve screenshots or a concise verification record.
- [ ] 4.3 Verify multiple global/project keys with different READY selections using fake-key integration tests and, where hardware is available, Stream Deck: live changes, readable labels over multiple cycles, transition to/from work/attention, and independent hide/show. Record which observations are browser-, fake-key-, or hardware-verified rather than claiming browser proof of device writes.
- [x] 4.4 Run `openspec validate configure-ready-background-renderer --strict` and compare all four deltas against the active font change; verify READY selection and global font contracts can both be retained during later sync. Before any commit, run GitNexus `detect_changes` for all changes and resolve partial/truncated findings without including unrelated user changes.
