# Verification: configure-project-status-layout

## Automated verification (2026-10-02)

Implementation and verification ran in `tmp/configure-project-status-layout` before publishing files to the live checkout.

- Stream Deck: `npm test` — 87/87 passed.
- OpenCode bridge: `npm test` — 43/43 passed; bridge implementation is unchanged.
- Stream Deck: `npx tsc --noEmit` — passed.
- Stream Deck: `npm run build` — passed.
- Stream Deck: `npx streamdeck validate de.lars-brandt.opencode.sdPlugin` — validation successful.

New tests cover all six position pairs, deterministic collision resolution, blank names, unsupported settings, XML escaping, non-ASCII text, bounded long/multiline labels, inspector defaults and disabled options, full-settings preservation through both project selection paths, reopening with saved settings, static redraws without status transitions, BUSY presentation refreshes with queued frames, disposal/reappearance, action lifecycle subscription changes, and independent project/global presentation.

The project manifest uses `UserTitleEnabled: false` and `ShowTitle: false`; the global action manifest is unchanged. Project rendering no longer issues native title commands. No legacy-title migration was introduced.

## Outstanding live verification

Stream Deck's local inspector debugging endpoint is available, but its target list contains no OpenCode project-status inspector. Automated mocks and manifest validation do not prove native overlay suppression or hardware readability. Tasks 1.1, 4.2 and 4.3 remain unchecked.

To complete acceptance, configure a **new** project key and open its inspector after loading the new build:

1. Confirm the dedicated name controls, default middle/bottom positions, occupied-option disabling, and absence of native title overlay.
2. Exercise all six layouts and OFFLINE, READY, BUSY, ATTENTION and ERROR, including long and multiline names; observe readability on the key.
3. Change name/layout during BUSY and without a status transition.
4. Change known/manual project selection without losing presentation; reopen the inspector and restart the plugin to verify persistence.
5. Display a global key and multiple independently configured project keys together; confirm unchanged aggregation and no presentation leakage.

Do not archive until the observable results of these checks are recorded.
