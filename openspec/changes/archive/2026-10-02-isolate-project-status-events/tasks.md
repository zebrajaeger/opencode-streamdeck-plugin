## 1. Project membership boundary

- [x] 1.1 Replace the blanket session-API rejection in opencode-plugin/test/index.test.mjs with a typed-shape session.get mock, retaining traps for unsupported session enumeration/status APIs; verify tests cover direct SessionInfo responses and the available/absent permission snapshot capability without adding dependencies.
- [x] 1.2 Add authoritative project-membership resolution and apply it before execution/status/idle/error and permission/question/form creation mutations or sends; verify table-driven own/foreign/unresolved tests for every recognized event family, including missing location, misleading directory, created project metadata, and session.get identity validation.
- [x] 1.3 Serialize event handling and reporting work with bounded lookup timeout and disposal/socket-generation guards; verify deferred promises preserve busy-then-idle ordering, failures permit subsequent events, timeouts ignore late results, and plugin unload prevents further state mutation or publication.

## 2. Requests and session lifecycle

- [x] 2.1 Restrict reply/rejection/cancellation handling to admitted request IDs and consistent session ownership; verify permission, legacy question, and form tests cover own resolution, foreign unknown resolution, mismatched session IDs, and session-less local resolution without clearing unrelated requests.
- [x] 2.2 Handle explicit session.moved and metadata-discovered ownership changes by removing retained session/request contributions and publishing a filtered authoritative snapshot; verify A-to-B moves, missed move notifications followed by lookup, same-project directory moves, destination follow-up events, and existing snapshot error-clearing semantics.
- [x] 2.3 Clean up verified owned sessions on deletion without requiring a successful post-deletion metadata read; verify removal of associated requests and busy state, no publication for never-owned foreign deletion, and no stale membership in later snapshots.

## 3. Snapshot isolation

- [x] 3.1 Filter available initialization/reconnect permission snapshots through membership resolution with capability guards; verify mixed A/B lists, failed individual lookups, missing permission.request.list, failed listing preserving retained verified state, and diagnostics without prompt/request payload content.
- [x] 3.2 Revalidate retained state before reconnect publication, excluding unresolved/foreign entries and preserving ordered subsequent events; verify hello-before-snapshot, own-only sessions/requests, retry after transient ownership failure, concurrent recovery/events, obsolete-socket suppression, and no historical failure state in snapshots.

## 4. Integration and live acceptance

- [x] 4.1 Add a regression that feeds the same mixed-project stream into two OpenCodeBridge instances with distinct project IDs and delivers their emitted frames through StatusBridgeServer/StatusRegistry; verify A work makes A/global BUSY while B remains READY, then reverse A/B, exercise independent attention/error states, foreign idle not clearing a local error, and reconnect ownership isolation. Do not rely solely on hand-written already-scoped frames.
- [x] 4.2 Run npm test in opencode-plugin and streamdeck-plugin and npm run build in streamdeck-plugin from a temporary implementation copy; verify all pass with unchanged global precedence, missing-handshake behavior, and existing aggregation regressions, coordinating any already-applied stabilize-project-status-display lifecycle guards.
- [x] 4.3 After deploying/reloading the reporting plugin, record two project-specific keys with distinct selected project IDs plus a global key and one OpenCode instance per project; verify alternating work changes only the owning project key, the unrelated key retains its actual state, attention is isolated, and reconnect does not republish foreign state. Record observed results and non-content ownership diagnostics before marking acceptance complete. Accepted by the user on 2026-10-02; see verification.md for the evidence limitation and explicit acceptance decision.
