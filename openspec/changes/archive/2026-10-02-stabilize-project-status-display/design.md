## Context

See proposal.md for motivation. The user explicitly limits this change to one OpenCode instance per project. Accidental duplicate integration setup is a lifecycle fault to contain, not a reason to design multi-instance aggregation.

Observed in the existing code and local diagnostics:
- Logs show alternating instance IDs for the same directory opening connections and losing them at approximately 500 ms intervals, including this repository. They do not prove whether these IDs originated from duplicate loads in one process or separate processes.
- The server closes an older source with code 1000 and reason `Replaced by directory source` (or `Replaced by reconnection`). The client ignores close metadata, resets its retry delay on open, and retries every closure starting at 500 ms. This allows retired sources to replace each other indefinitely.
- Source retirement removes contributed state. Registration initially contributes no sessions until the next snapshot. Repeated ownership swaps can therefore alternate active and ready states.
- StatusRegistry.subscribeToStatus calls listeners after every registry notification even when their scoped status is unchanged. StatusActionRenderer then sends setTitle and, outside BUSY, setImage each time. This is a separate redundant-write path; repeated writes are established, but their precise hardware flicker effect has not yet been measured.
- ParticleWaitAnimation.start already guards against restarting an active animation. Preserve its generation checks and write ordering rather than replacing the particle engine.
- OpenCode V2's plugin guide documents setup cleanup and an event stream for the connected server; it does not identify every received session event with the plugin's location automatically. No new snapshot API or event-scoping redesign is part of this change.

GitNexus for opencode-streamdeck-plugin was refreshed during investigation. CLI context confirms connect calls scheduleReconnect, which calls connect again. The analyzer reports incomplete flow enumeration and cross-language field gaps; current source and logs, not absent graph edges, ground the diagnosis.

## Goals / Non-Goals

**Goals:**
- Separate terminal source supersession from retryable transport failure.
- Make unchanged-status processing idempotent without suppressing initial or explicit rendering.
- Verify the full path from one reporting source to project and global keys with deterministic tests and a real display observation.

**Non-Goals:**
- Supporting simultaneous OpenCode instances for one project, merging their sessions, selecting leaders, or automatic failover between them.
- Changing the newer-source-wins rule, project-ID identity rules, or directory normalization.
- Debouncing BUSY/READY, holding BUSY after real completion, or masking genuine disconnects.
- Modifying status priority, session event meaning, fonts, layout, or particle timing.
- Migration of old key settings or implementation of configure-project-status-layout.

## Decisions

### 1. Terminal supersession for the current setup lifecycle

Use a dedicated WebSocket application close code (proposed 4001) for server-initiated source supersession, with a bounded human-readable reason. Share the constant through the existing shared transport/protocol boundary; do not change JSON frame schemas or the protocol version. Apply the signal to both directory and instance-ID source replacement, not ordinary disconnect or server shutdown.

For the current socket, the client records a terminal superseded state, cancels pending reconnect timers, clears its socket ownership, and logs one retirement outcome. connect and scheduleReconnect guard against disposed or superseded state. A fresh setup constructs a new bridge and is eligible to connect. There is no periodic probing or automatic fallback when the replacement later disappears.

Only callbacks belonging to the current socket may mutate connection state or schedule retries. Obsolete open/error/close callbacks are ignored for lifecycle mutation. Unknown or ordinary close codes remain retryable unless disposed. Keep existing bounded backoff and snapshot recovery for outages.

Alternatives: string matching on close reasons is fragile; treating every code-1000 closure as terminal breaks bridge restart recovery; increasing retry delay merely slows the ownership oscillation; multi-source aggregation violates the requested scope.

### 2. Subscriber-local effective-status change detection

Retain registry updates for every accepted event, including error expiry and request resolution. Cache the last effective status inside each subscribeToStatus closure, emit once at subscription, then only when that subscriber's computed status changes. This naturally isolates project subscriptions from unrelated projects while retaining correct global aggregate transitions.

Do not cache one registry-wide last value: scopes differ and new subscribers require their own initial delivery. Store the remembered status before invoking the listener to avoid reentrant duplicate notifications. Unsubscription discards its cache.

Alternative: suppressing only duplicate raw frames misses distinct events with the same effective status and may drop meaningful state needed for a later transition.

### 3. Per-key idempotent rendering, with explicit invalidation

Separate ordinary status notifications from explicit refresh calls. The renderer's status-update path tracks the last requested/completed presentation per key and coalesces duplicate requests, including duplicates received while an asynchronous render is pending. State and async version tracking must remain per key, not in the renderer's single global status field. Only successful current writes establish a completed cache entry; failures must allow a later retry and must not leave rejected work blocking subsequent writes.

renderStatus/renderCurrentStatus used by appearance or settings changes remain explicit refresh paths. Appearance must establish a fresh visible lifecycle; disappearance invalidates static as well as animated state so a reused action ID/object is not mistakenly considered rendered. Explicit refreshes must coexist with version/generation guards: an older queued image cannot overwrite a newer status or refresh.

Repeated BUSY notifications must not reset particle positions or timers. Animation frame writes remain expected and are not subject to static-image deduplication. When the separate layout change is implemented, presentation revision/name/layout belongs in its invalidation key; status equality alone cannot suppress a label change.

Alternative: an early return in the project action for identical status alone fails on reappearance and explicit presentation changes. Global image caching alone can couple independent keys.

### 4. Preserve real transitions and isolate residual event issues

Do not change how execution/status events map to READY/BUSY without evidence of a conflicting event sequence. Regression inputs include continuous busy/retry reports, genuine idle, attention resolution, errors, expiry, disconnect, and multiple sessions within the one supported instance. If single-instance hardware verification still shows BUSY/READY oscillation after reconnect churn is absent, capture ordered event types/session IDs and bridge transitions without payload content. A reproducible semantic event conflict must be resolved explicitly rather than adding an arbitrary delay or claiming the transport fix proves all oscillation is fixed.

### 5. Existing-spec boundary

The project-status main spec contains a multiple-connections scenario and existing global aggregation spans sources from different projects. Leave those clauses and regression tests intact; this change adds a single-instance stability contract, not a breaking removal of existing aggregation. Concurrent same-project instance behavior and any future tightening of that contract require the separate change requested by the user. Defensive source-retirement tests do not claim concurrent-instance support.

## Risks / Trade-offs

- [The newest accidental bridge load might lack earlier event-observed state] -> Keep current replacement semantics and supported snapshots; do not promise continuity across actual ownership handover. Verify stability once one source owns the project. Session snapshot expansion is not smuggled into this change.
- [A superseded lifecycle will not take over when its replacement disappears] -> Document deliberate terminal retirement until a fresh plugin setup; automatic failover belongs to the future multi-instance change.
- [Redraw suppression hides legitimate refreshes] -> Separate explicit refresh/invalidation from ordinary status notification and test reappearance, equal-status project changes, and shared global keys.
- [Async caching incorrectly suppresses retries or permits stale writes] -> Test pending duplicates, rejected image/title writes, disappearance, and rapid transitions with deferred promises.
- [Transport churn is not the only cause of observed activity changes] -> Record a real single-instance BUSY/READY event sequence if the acceptance test fails; do not hide real events with debouncing.
- [An old client ignores the new close signal] -> Verify both updated integrations together. Cross-version compatibility or rolling upgrades are not required by this planning scope.

## Migration Plan

No key-settings migration is required. Implement and test in a project tmp copy before replacing the live integration, following AGENTS.md. Deploy the OpenCode and Stream Deck bridge updates together, start with one OpenCode instance for each tested project, and observe idle and active states plus an ordinary bridge restart. Roll back the paired plugin builds if verification fails; no persistent transport state is added.
