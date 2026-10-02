# OpenCode Stream Deck status bridge

## OpenCode integration verification

This bridge uses the OpenCode V2 plugin API. The locally running OpenCode is
currently **v2.0.18**; the bridge dependency supplies the compatible V2 client
types.

- The configured `plugins` option accepts a local package directory. The bridge directory is an ESM package with `index.mjs` as its explicit `main` entry, so the configured absolute path `C:\\ws\\opencode-streamdeck-plugin\\opencode-plugin` resolves to the default plugin export.
- The default export is a V2 `Plugin.define` definition with the stable ID `de.lars-brandt.opencode.streamdeck-status`. Its `setup(ctx)` starts a cancellable `ctx.event.subscribe()` loop and returns cleanup that aborts the subscription and closes the local bridge socket.
- The supported plugin context does not provide a session-list or active-session snapshot API. The bridge keeps session and question state only from events it observes after startup, and uses the read-only `ctx.permission.request.list()` snapshot for outstanding permissions. It subscribes to these event payloads:
	- `session.status`: `{ sessionID, status }`, where `status.type` is `idle`, `retry`, or `busy`.
	- `session.idle`: `{ sessionID }`.
	- `session.execution.failed`: `{ sessionID, error }`.
	- `session.compaction.failed`: `{ sessionID, reason, error }`, for both
		automatic and manual compaction.
	- `session.retry.scheduled`: `{ sessionID, attempt, ... }`, reported as
		working activity.
	- `permission.asked`: `{ id, sessionID, ... }`.
	- `permission.replied`: `{ sessionID, requestID, reply }`.
	- Legacy question events, when provided by an OpenCode release:
		`question.asked`, `question.replied`, and `question.rejected`.
	- Current interactive-form events used by OpenCode v2.0.19 for agent
		questions: `form.created` (`data.form.id`, `data.form.sessionID`),
		`form.replied` (`data.id`, `data.sessionID`), and `form.cancelled`
		(`data.id`, `data.sessionID`).

V2 event payloads are read from `event.data`. The bridge normalizes both
legacy question events and the current form-event transport into its question
protocol state, then clears that state when the question/form is answered,
rejected, or cancelled. The generated API exposes a permission-request
snapshot but no session-list or question-list endpoint. Consequently, sessions
and questions already present when the bridge starts cannot be reconstructed;
state observed during the plugin lifetime is retained across bridge reconnects.
It only reports events and never registers permission hooks or invokes an
OpenCode command.

An execution failure or compaction failure is reported immediately as `ERROR`,
but it is not a session state. Its indication lasts at most 15 seconds and is
cleared immediately by a newer local `BUSY`, `READY`, or attention event.

Either failure also ends the work last observed for that session, because no
idle event follows a failure. Without this correction, a chat that fails - for
example because its input exceeds the model context window, including a failed
compaction - would keep its key `BUSY` indefinitely. Once the indication
expires, the key shows the highest status that still applies: `READY` when
nothing else is running, or `BUSY` while another session continues working.
Other sessions, unanswered permission requests, and unanswered questions are
untouched by this recovery, and attention keeps its priority. A later working
or scheduled-retry event reports that session as working again. Retries alone
are working activity and never produce `ERROR`.

This covers failures OpenCode reports. A chat that stops without emitting any
failure, idle, or completion event is not detected; the bridge does not infer a
hang from elapsed time.

Reconnect snapshots are authoritative for the current observable sessions,
permissions, and questions; they replace the Stream Deck side's old state and
never replay historical failures or a failed session's obsolete working state.
Persistent status priority is `ATTENTION`, then `BUSY`, then `READY`, then
`OFFLINE`.

## Configuration and security

Add the absolute path to this repository's `opencode-plugin` directory to the global OpenCode configuration (`~/.config/opencode/opencode.jsonc`; on this Windows installation, `C:\Users\Lars.Brandt\.config\opencode\opencode.jsonc`):

```jsonc
{
	"plugins": [
		// Keep any existing plugin entries here.
		"C:\\ws\\opencode-streamdeck-plugin\\opencode-plugin"
	]
}
```

Start a new OpenCode instance after saving the configuration. `opencode debug config` should show the configured directory, and the plugin will connect to the Stream Deck endpoint automatically. The Stream Deck plugin exposes `ws://127.0.0.1:20666` only, and the bridge reconnects with capped exponential backoff when that endpoint is unavailable.

## Logging

The bridge writes structured JSON logs with [Pino](https://getpino.io/) to its own file, avoiding interference with OpenCode's internally managed log:

```text
~/.local/share/opencode/log/streamdeck-status-bridge.log
```

On this Windows installation, that resolves to:

```text
C:\Users\Lars.Brandt\.local\share\opencode\log\streamdeck-status-bridge.log
```

Follow the bridge log in PowerShell while reproducing an issue:

```powershell
Get-Content "$HOME\.local\share\opencode\log\streamdeck-status-bridge.log" -Wait
```

It records plugin lifecycle records with `instanceID` and `directory`, along with outbound bridge message types and errors that were previously intentionally swallowed to keep status reporting non-disruptive. It does not log bridge-frame payloads.

## Project-specific Stream Deck keys

Alongside **OpenCode Status**, the plugin provides **OpenCode Project Status**.
Add this action to a Stream Deck key and enter the exact OpenCode project ID in
its property inspector. The project ID is the value OpenCode reports as
`context.location.project.id` when the local bridge connects; it is included in
the bridge's `hello` handshake and can be found in the local OpenCode project
metadata or by inspecting that connection with OpenCode tooling.

The configured key aggregates only connections that report that exact ID. It
displays `OFFLINE` until an ID is saved and whenever that project has no active
bridge connection. A project key never includes sessions, permission requests,
or transient errors from another project. The existing **OpenCode Status** key
remains the aggregate of every connected local bridge, including older bridges
that do not provide a project ID.

## Status backgrounds

Both **OpenCode Status** and **OpenCode Project Status** show calm green spatial
plasma waves throughout `READY` (refreshed every 150 ms over a repeating
12-second cycle). The existing blue particle network runs during `BUSY` (one
frame every 180 ms). During `ATTENTION`, an orange radial halo smoothly pulses
over a 2.4-second cycle, refreshed every 100 ms. It continues for the full
attention state, including multiple pending permission requests or agent
questions, until the last outstanding request is resolved. If work is still
running, particles resume; otherwise the applicable green `READY` plasma or
static `ERROR` or `OFFLINE` presentation takes over.

The status glyph and text stay steady throughout every background animation. Project
name/status overlays and their configured layout are composed on every frame;
the global action retains its native title behavior. Project A's attention
animates A's key and the global key; unaffected ready project B keeps its own
plasma phase.

Each visible animated key has its own lifecycle. Duplicate reports do not reset
the animation or rewrite unchanged titles. Presentation refreshes retain the
current effect phase; disappearing keys release their timers and reappearing
keys immediately render the current status. Failed image writes do not prevent
later frames or transitions. Slow already-issued writes are allowed to settle
before the latest presentation; queued obsolete frames are suppressed.

These backgrounds add no settings, runtime dependencies, protocol commands,
audio, or interactions. Both actions remain display-only; aggregation and
permission/question lifecycles are unchanged.

## Duplicate plugin-load diagnosis

The Stream Deck bridge accepts one active status source for each exact OpenCode
project directory. If OpenCode loads this plugin more than once for the same
directory, the newest connection replaces the previous source: the earlier
socket is closed and its sessions and unanswered permissions no longer affect
the Stream Deck status. A bridge connection without a directory remains
independent and is identified by its instance ID for compatibility with older
clients.

Connections for different directory strings remain independent contributors.
Their combined Stream Deck status gives unanswered permissions or unanswered
agent questions priority over busy sessions and ready sources. A transient
failure is displayed only until it expires or a newer live state supersedes it.

To investigate repeated OpenCode plugin setup for one directory, follow the
local bridge log above and look for the plugin messages `Setting up Stream Deck
status bridge` and `Disposing Stream Deck status bridge setup`. Each carries
the `instanceID` and `directory` fields. The Stream Deck plugin logs matching
source ownership changes as `OpenCode status bridge lifecycle` records with
`action: "source.registered"` or `action: "source.replaced"`; the latter also
contains `directory`, `previousInstanceID`, and `instanceID`. A replacement
record identifies which newer source became authoritative without exposing
OpenCode event payloads.

Release 1 is display-only. It does not approve or deny permissions, submit prompts, abort sessions, or focus an OpenCode session. The protocol reserves those command names for a future authenticated release; no shared secret or command handling exists yet.
