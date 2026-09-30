# OpenCode Stream Deck status bridge

## OpenCode integration verification

This bridge targets the locally installed OpenCode **v2.0.18** plugin API:

- The configured `plugins` option accepts a local package directory. The bridge directory is an ESM package with `index.mjs` as its explicit `main` entry, so the configured absolute path `C:\\ws\\opencode-streamdeck-plugin\\opencode-plugin` resolves to the default plugin export.
- The default export is a V2 `Plugin.define` definition with the stable ID `de.lars-brandt.opencode.streamdeck-status`. Its `setup(ctx)` starts a cancellable `ctx.event.subscribe()` loop and returns cleanup that aborts the subscription and closes the local bridge socket.
- The plugin's generated V2 client supplies the startup `ctx.session.active()` map, `ctx.session.list()`, and the read-only `ctx.permission.request.list()` snapshot of outstanding requests. It subscribes to these event payloads:
	- `session.status`: `{ sessionID, status }`, where `status.type` is `idle`, `retry`, or `busy`.
	- `session.idle`: `{ sessionID }`.
	- `session.execution.failed`: `{ sessionID, error }`.
	- `permission.asked`: `{ id, sessionID, ... }`.
	- `permission.replied`: `{ sessionID, requestID, reply }`.

V2 event payloads are read from `event.data`. The bridge maps `permission.asked` directly to the protocol's `permission.asked` semantic state. It only reports events and never registers permission hooks or invokes an OpenCode command.

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

Release 1 is display-only. It does not approve or deny permissions, submit prompts, abort sessions, or focus an OpenCode session. The protocol reserves those command names for a future authenticated release; no shared secret or command handling exists yet.
