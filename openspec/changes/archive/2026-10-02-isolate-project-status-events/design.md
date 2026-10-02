## Context

See proposal.md for motivation and the project-status-indicator delta for the observable contract. Acceptance uses two unrelated project IDs, with one OpenCode instance per project, not duplicate instances of one project.

Read-only findings in this repository:
- Plugin setup consumes context.event.subscribe. handleEvent forwards every recognized session/request event and updates local maps without an ownership check. The handshake always identifies context.location.project.id.
- StatusBridgeServer associates frames with that handshake; StatusRegistry.projectStatus filters by the resulting instance projectID. This is correct downstream filtering but cannot repair a foreign session mislabeled by the producer.
- captureSnapshot admits every permission from context.permission.request.list without verifying its session, and sendSnapshot republishes every retained session/request.
- V2 documentation explicitly says ctx.location is the plugin instance's location, not the location of all accessible sessions/events. Event subscription covers the connected server's public stream.
- Installed types expose context.session.get({ sessionID }) returning SessionInfo directly, including projectID. SessionCreated and SessionMoved carry data.projectID; execution events generally carry only data.sessionID. Event location is optional and supplies directory/workspace, not an authoritative project ID. Forms carry session identity on creation; resolutions can be correlated with admitted request IDs, including legacy question events.
- Existing tests reject access to the entire session domain. That restriction is too broad: supported metadata lookup differs from unsupported session listing/status snapshots.
- There is an existing API-shape discrepancy: the bridge calls permission.request.list and the installed client has it, but the installed plugin PermissionDomain exposes only list/get/reply. Preserve recovery when the capability is available, but do not depend on an undocumented plugin method or add session enumeration to replace it.

GitNexus context in opencode-streamdeck-plugin confirms consumeEvents -> handleEvent and subscribeProject -> projectStatus -> calculateStatus. The index was refreshed in the earlier investigation; only planning files have been added since. Its lower-bound receiver/dispatch coverage is not proof that other consumers are absent. Source and installed API types ground the proposal; no mixed-project live trace has yet confirmed that this explains every observed display change.

References: https://opencode.ai/v2/docs/build/plugins (Context, Sessions, Events), installed @opencode/plugin 2.0.18 and @opencode/client promise declarations.

## Goals / Non-Goals

**Goals:**
- Make every retained and forwarded contribution belong to the reporting project's authoritative identity.
- Admit valid own-project events even when their location is absent; safely reject foreign or unresolved ownership.
- Preserve ordering, disposal safety, request cleanup, and existing global status semantics.

**Non-Goals:**
- Filtering by active UI tab, directory equality, parent session, or session-ID syntax.
- Same-project instance coordination, broader startup session enumeration, historical error recovery, or automatic state discovery on session transfer.
- Redraw suppression, BUSY debouncing, new layout/settings, or server/protocol redesign.

## Decisions

### 1. Resolve authoritative membership at the producer boundary

Introduce one project-membership boundary used before every recognized state mutation and send. Compare authoritative session projectID with the bridge's handshake project ID. Use explicit data.projectID on session.created/session.moved; otherwise read context.session.get({ sessionID }) and validate the returned id/projectID. Do not treat event.location as sufficient ownership evidence. Include all session execution/status/idle/error and permission/question/form creation paths.

Keep current membership records for cleanup and snapshot admission, not as a permanent shortcut for future session-bearing events: re-read metadata for those events so missed movement notifications cannot indefinitely retain stale ownership. A request-only resolution can use an already admitted request's session association. Avoid permanent negative caching so a transient lookup failure can recover on a later event. Failures or malformed/missing identity skip that event without changing existing local state, logging only bounded identifiers/reason, not prompts or full metadata.

Alternative: filter only on directory/location. It misses events lacking location, conflates directory with project identity, and conflicts with the main Project identity isolation requirement. Changing registry filtering cannot fix producer misattribution.

### 2. Serialize reporting work and bound lookup latency

Make handleEvent awaitable and have consumeEvents await each recognized event's admission and processing. Use a single reporting-work queue shared by direct event handling and snapshot refresh, so callers cannot accidentally race busy/idle updates. Irrelevant event types require no lookup. Catch failures per item so one bad event cannot terminate the stream or poison the queue.

Each metadata lookup uses a finite timeout (proposed 2 seconds) with supported request cancellation where available. A late response cannot publish after timeout or disposal. Scope an AbortController/generation to plugin lifetime and check it after every await. This bounds head-of-line delay without unordered fire-and-forget writes. Snapshot sending on a new socket waits for an admission-checked snapshot rather than racing an unfinished refresh; existing socket-ownership guards must prevent results from publishing to obsolete connections.

Alternative: independently resolving every event is faster but allows a slow busy lookup to overwrite later idle. Permanent positive caching is cheaper but may misattribute a session after a move. Initial correctness takes priority over optimizing lookup volume.

### 3. Correlate only admitted requests and handle ownership loss

Retain requestID -> sessionID associations only after successful local admission. For permission replies, question replies/rejections, and form replies/cancellations, require a matching admitted request; if sessionID is supplied, check consistency and current membership before forwarding. Unknown foreign resolutions are no-ops, including no forwarded frames. Session-less resolutions use the admitted association and verified ownership, checking current metadata where available; established ownership is sufficient to remove a known deleted session's local contributions when its metadata no longer exists.

On explicit session.moved, process its data.projectID before generic foreign-event rejection: if the session leaves this project, remove its retained status and associated requests and publish an authoritative local snapshot to remove their registry contributions. A same-project directory move retains membership. A later successful lookup revealing changed ownership performs the same cleanup. On session.deleted, clear previously owned contributions and membership even if lookup would now return not found. Foreign deletion does not emit a snapshot or affect unrelated local sessions.

The registry error indication is transient and instance-wide rather than session-specific. Continue its existing expiry/replacement behavior; snapshot-based removal retains existing snapshot semantics (including error clearing). This change does not redesign that global error mechanism or restore unobserved destination activity.

Alternative: merely rejecting future foreign events leaves an earlier BUSY/request contribution stuck in the old project's snapshot.

### 4. Filter snapshot admission and publication

At initialization and on reconnect, rebuild the supported available permission snapshot using ownership checks for every entry. Feature-detect the currently used permission.request.list capability; if unavailable, skip that source with a bounded diagnostic and retain verified event-observed state. Do not call context.permission.list without its required sessionID, invent session.list/status APIs, or expand the plugin's declared API. When request listing fails, do not erase previously verified requests solely because of that failure.

Revalidate retained session/request ownership before publishing a reconnect snapshot; exclude unresolved entries from that publication, but do not treat transient resolution failure as proof of reassignment. Update membership/cleanup only on authoritative evidence. Failed execution remains a live-only error frame and never enters the reconnect sessions map. Newly established sockets receive hello first and then the filtered snapshot. Work observed during recovery is queued in order, preserving the next genuine transition. Disposal aborts refresh/lookup work without affecting OpenCode.

Alternative: filtering only live sends allows unfiltered initial permissions or polluted reconnect state to reintroduce cross-project attention/activity.

### 5. Preserve existing contracts and independent changes

The modified identity requirement retains all existing handshake and missing-project scenarios and adds producer verification; it does not make the server infer ownership from session IDs. Keep status precedence and global aggregation tests unchanged. A global key is expected to become BUSY when either project works; only the unrelated project-specific key must remain in its own state.

This change is independently applicable. stabilize-project-status-display also changes connection lifecycle and snapshot recovery in index.mjs; later implementation must combine their guards without replacing one change's behavior. configure-project-status-layout concerns presentation only. No planning artifact in either change is altered here.

## Risks / Trade-offs

- [Lookup failure temporarily omits genuine own-project reports] -> Reject uncertain attribution, bound failures, log non-content diagnostics, and allow later events/snapshot recovery to retry; do not falsely assign state.
- [Per-event metadata reads add latency under a mixed server stream] -> Resolve only relevant events, bound latency and cancel on cleanup; optimize later only with equivalent move/order tests.
- [Session metadata changes between event generation and lookup] -> Treat current authoritative ownership as the admission boundary; explicit created/moved/deleted events and ordered processing provide lifecycle corrections. Do not replay historical foreign activity under a new project.
- [Undocumented permission snapshot API varies by runtime] -> Guard capability availability and preserve event-observed recovery; test both shapes rather than expanding scope to dependency migration.
- [Actual keys are configured to the same project ID or a global action] -> Real verification records action type and distinct selected project IDs; do not change selector identity heuristically to disguise misconfiguration.
- [Ownership cleanup sends a snapshot which clears transient error] -> Retain the existing protocol behavior and test/document it; do not introduce a silent protocol change.

## Migration Plan

No persistent settings or data migration. During later apply, follow AGENTS.md: implement/test in a project tmp copy, then replace live integration files as atomically as practical. Reload the reporting plugin so previously polluted in-memory maps are discarded; reconnect clears registry state. Verify two distinct project-specific keys and the global key while alternating activity between projects. Rollback is restoring the prior plugin build and reloading; no stored ownership cache is introduced.
