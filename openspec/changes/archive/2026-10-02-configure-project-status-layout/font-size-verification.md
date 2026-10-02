# Independent font-size verification

Implemented in `tmp/project-font-sizes` before publishing to live code.

Name and status have independent numeric size selections: 16, 20, 24 and 28 SVG pixels. Each defaults to 20; missing, nonnumeric or unsupported values normalize independently to that default. Both settings are saved per key. Text keeps the selected size; conservative per-glyph width estimates determine ellipsis truncation without shrinking or horizontal compression. Text is vertically centered inside the existing 32-pixel bands using Qt-compatible flat SVG groups.

## Automated results

- Stream Deck `npm test`: 89/89 passed.
- OpenCode bridge `npm test`: 43/43 passed; bridge code unchanged.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `npx streamdeck validate de.lars-brandt.opencode.sdPlugin`: passed after build completion. An initial concurrent validation ran before the bundle existed; the sequential rerun succeeded.
- `uv run --with PySide6 python test/render-project-text.py`: 2,880 actual Qt-rendered fixtures passed (six layouts, five statuses, all sixteen independent size pairs, and six name fixtures). Checks verify visible pixels in occupied text bands and no text pixels outside their bounds.

Inspector tests cover default/unsupported sizes, independent saves, preservation through known/manual project changes, unrelated settings and reopening. Renderer tests cover immediate static updates, BUSY updates with queued stale frames, static transitions, cleanup, independent project keys and unchanged native-title/image behavior on a global key.

## Outstanding hardware acceptance

Tasks 1.1, 4.2, 4.3 and 5.6 remain open. The Stream Deck inspector debugging endpoint is reachable, but no OpenCode project-status inspector was open during verification. Automated rendering does not establish hardware readability, native overlay suppression, or full persistence through a running-plugin restart.

Open the project-status inspector after the plugin reload and check the two font-size controls, readability at each size, changes during BUSY, reopening/restart, preserved project selection, and coexistence with a global key and other project keys. Record these observations before archiving.
