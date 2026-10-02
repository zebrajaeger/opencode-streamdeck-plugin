# Verification status

- `npm test` in `streamdeck-plugin`: 121 tests passed.
- `npx tsc --noEmit` in `streamdeck-plugin`: passed.
- `npm run build` in `streamdeck-plugin`: passed.
- `streamdeck restart de.lars-brandt.opencode`: succeeded; the linked plugin is installed.
- Follow-up font-size slider (16–28 px in 1-px steps): `npm test` (121 passed), `npx tsc --noEmit` and `openspec validate --strict` passed. Its visible intermediate value, cancel/apply and independent name/status settings are covered by inspector and rendering tests. Live Stream Deck verification remains pending.
- Underline regression: Qt SVG rendered `text-decoration="underline"` and undecorated text identically (0 differing pixels). The renderer now adds a separate in-band stroke for the selected text. `QT_QPA_PLATFORM=offscreen uv run --with PySide6 python test/render-project-underline.py` passes (9 font/name/position pairs); `npm test` (121 passed) and `npx tsc --noEmit` pass. Physical-key confirmation is still pending.
- Manual Stream Deck property-inspector and Qt-key verification: **pending**. The available desktop capture showed an unrelated game rather than the Stream Deck inspector. No light/dark theme, Escape/Cancel/Apply, font glyph or animation-frame appearance is claimed verified.

To complete tasks 2.3 and 3.3, open a Project Status key in Stream Deck and verify both themes, opening each font button via keyboard, Escape and Cancel leaving settings unchanged, Apply saving once, and long names/colored styled text on OFFLINE, READY, BUSY, ATTENTION and ERROR frames. Confirm fonts persist after reopening the inspector and restarting the plugin. Note platform-specific font fallback or clipping if seen.
