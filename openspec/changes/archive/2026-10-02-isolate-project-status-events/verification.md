# Verification — 2026-10-02

## Automated verification

Implementation and verification were performed in `tmp/isolate-project-status-events` before replacing the reporting entry point.

- OpenCode plugin: `npm test` — 36/36 passed.
- Stream Deck plugin: `npm test` — 62/62 passed.
- Stream Deck plugin: `npm run build` — passed.
- Existing protocol, missing-project handshake, global precedence, source retirement, renderer and aggregation regressions pass unchanged in behavior.
- Two actual OpenCodeBridge producers receive identical mixed-project inputs and deliver their emitted frames through StatusBridgeServer/StatusRegistry. Verified alternating A/B busy state, permissions, legacy questions/forms, foreign idle preserving a local error, moves, missed moves, and project-local reconnect snapshots.
- Deferred metadata reads verify ordering, 2-second cancellation, unload, recovery/event serialization, and obsolete socket suppression.
- Diagnostics test verifies bounded session identifiers and reason codes without metadata, request content or exception payloads.

## Live acceptance — user accepted (task 4.3)

Automated producer/server tests are not physical key observations. On 2026-10-02, after being asked to check the deployed implementation, the user reported "funktioniert". This confirms the user's observed behavior, but does not document the selected project IDs, individual attention/reconnect scenarios, or live ownership diagnostics originally requested by task 4.3.

The original live evidence checklist was:

1. Two **OpenCode Project Status** keys and their distinct selected project IDs, plus one **OpenCode Status** global key; one OpenCode instance per project.
2. Work in A: A/global BUSY, B retains its actual state; then reverse A/B.
3. Permission/question attention appears only on the owning project's key and global key, then resolves normally.
4. Reconnect republishes no foreign sessions or outstanding requests.
5. Non-content ownership diagnostics from `~/.local/share/opencode/log/streamdeck-status-bridge.log`: instance identity, bounded session identifier, and reason only.

On 2026-10-02, after the outstanding live acceptance task was explicitly raised during archiving, the user instructed: "markiere ihn als komplett/abgenommen. dann sync und archive". Task 4.3 is therefore complete by explicit user acceptance, superseding the original requirement to collect the remaining live evidence before closure. No additional physical-key observations or ownership diagnostics are claimed here.
