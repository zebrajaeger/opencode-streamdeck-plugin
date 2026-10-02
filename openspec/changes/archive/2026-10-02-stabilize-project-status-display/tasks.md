## 1. Bridge lifecycle stabilization

- [x] 1.1 Add a shared explicit supersession close code and use it for directory/instance source replacements; verify status-bridge-server tests assert the close signal, sole replacement ownership, ignored retired frames, and harmless delayed old-socket closure.
- [x] 1.2 Classify current-socket close events in OpenCodeBridge, stop retries after supersession, and guard obsolete socket callbacks; verify fake WebSocket/timer tests cover terminal replacement, pending-timer cancellation, stale open/error/close events, disposal, and a fresh setup connecting normally.
- [x] 1.3 Retain ordinary outage backoff and supported snapshot recovery, and add bounded retirement diagnostics; verify tests cover normal/abnormal non-supersession closes, bridge restart, snapshot contents, and diagnostics without event payloads.

## 2. Effective-status notifications

- [x] 2.1 Add subscriber-local status change detection in StatusRegistry while retaining initial delivery; verify status-registry tests cover repeated snapshots/idle/busy reports, independent project/global subscribers, new subscribers, unsubscribe, and unrelated-project events without duplicate notifications.
- [x] 2.2 Verify genuine effective transitions remain immediate with existing precedence; use deterministic tests for multiple sessions within one instance, busy/retry to idle, permission/question resolution, error replacement/expiry, and disconnect without debounce timers.

## 3. Per-key rendering

- [x] 3.1 Coalesce unchanged ordinary status render requests per key, including in-flight duplicates; verify renderer tests count title/static-image writes, retain independent keys, and show repeated BUSY reports do not reset particles or animation timers.
- [x] 3.2 Preserve explicit refresh and invalidate caches for every disappearing/reappearing key, including static keys; verify renderer/action lifecycle tests cover READY/BUSY appearance, equal-status project selection changes, explicit presentation refresh, and reused action IDs.
- [x] 3.3 Keep stale-render guards and recoverable render failure behavior; verify deferred/rejected title/image promises cannot overwrite a newer transition, poison later retries, or emit animation frames after disappearance.

## 4. End-to-end verification

- [x] 4.1 Add an integration regression for accidental duplicate bridge setups followed by stable replacement ownership; advance controlled retry time beyond several 500 ms intervals and verify the retired bridge does not reclaim ownership, while the replacement's READY/BUSY reports reach project/global subscribers correctly.
- [x] 4.2 Run npm test in opencode-plugin and streamdeck-plugin and npm run build in streamdeck-plugin from a temporary implementation copy; verify all pass before replacing the running integration and retain existing aggregation tests without adding same-project multi-instance support.
- [x] 4.3 Verify the paired updated plugins on Stream Deck with one OpenCode instance per tested project: observe at least 30 seconds idle READY without periodic twitching, continuous work with BUSY animation, actual completion, attention, and an ordinary bridge restart; record visible results and lifecycle/status diagnostics. If activity still oscillates without reconnect churn, capture ordered event types/session IDs and bridge transitions without payloads and resolve the evidenced conflict before marking acceptance complete. User accepted the change on 2026-10-02 after confirming the display looked OK; the individual physical scenarios were not separately attested (see verification.md).
