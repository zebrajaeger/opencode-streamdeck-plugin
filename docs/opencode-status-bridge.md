# OpenCode Stream Deck status bridge

## OpenCode integration verification

This bridge uses the OpenCode V2 plugin API. The locally running OpenCode is
currently **v2.0.19**; the bridge dependency supplies the compatible V2 client
types.

- The configured `plugins` option accepts a local package directory. The bridge directory is an ESM package with `index.mjs` as its explicit `main` entry, so the configured absolute path `C:\\ws\\opencode-streamdeck-plugin\\opencode-plugin` resolves to the default plugin export.
- The default export is a V2 `Plugin.define` definition with the stable ID `de.lars-brandt.opencode.streamdeck-status`. Its `setup(ctx)` starts a cancellable `ctx.event.subscribe()` loop and returns cleanup that aborts the subscription and closes the local bridge socket.
- The plugin's generated V2 client supplies the startup `ctx.session.active()` map, `ctx.session.list()`, and the read-only `ctx.permission.request.list()` snapshot of outstanding requests. It subscribes to these event payloads:
	- `session.status`: `{ sessionID, status }`, where `status.type` is `idle`, `retry`, or `busy`.
	- `session.idle`: `{ sessionID }`.
	- `session.execution.failed`: `{ sessionID, error }`.
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
snapshot but no question-list endpoint, so questions already awaiting an
answer when the plugin starts cannot be recovered; questions observed during
the plugin lifetime are retained across bridge reconnects. It only reports
events and never registers permission hooks or invokes an OpenCode command.

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

## Duplicate plugin-load diagnosis

The Stream Deck bridge accepts one active status source for each exact OpenCode
project directory. If OpenCode loads this plugin more than once for the same
directory, the newest connection replaces the previous source: the earlier
socket is closed and its sessions and unanswered permissions no longer affect
the Stream Deck status. A bridge connection without a directory remains
independent and is identified by its instance ID for compatibility with older
clients.

Connections for different directory strings remain independent contributors.
Their combined Stream Deck status uses the existing priority order: unanswered
permissions or unanswered agent questions take precedence over errors, errors
over busy sessions, and busy sessions over ready sources.

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
