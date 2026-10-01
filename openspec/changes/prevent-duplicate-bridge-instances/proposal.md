## Why

OpenCode lädt die Status-Bridge in der beobachteten Sitzung mehrfach nahezu gleichzeitig. Jede Plugin-Ladung erzeugt derzeit eine neue zufällige Instanz-ID und Verbindung, wodurch dieselben OpenCode-Ereignisse mehrfach an Stream Deck geliefert werden. Die Bridge muss doppelte Quellen für denselben Projektordner zuverlässig zusammenführen, ohne echte Instanzen für andere Projektordner zu verlieren.

## What Changes

- Das Bridge-Protokoll identifiziert eine Statusquelle zusätzlich zu ihrer flüchtigen Instanz-ID durch den Projektordner.
- Der Stream-Deck-Bridge-Server akzeptiert höchstens eine aktive Statusquelle pro Projektordner; eine neuere Verbindung für denselben Ordner ersetzt die vorherige Quelle und deren Status.
- Die Bridge protokolliert genug Identitäts- und Ersetzungsinformationen, um Mehrfachladungen von echten, getrennten Projektinstanzen unterscheiden zu können.
- Tests decken die Ersetzung doppelter Verbindungen für denselben Ordner sowie die parallele Behandlung verschiedener Ordner ab.
- Die Dokumentation erklärt die Ordner-basierte Deduplizierung und die Diagnose über das Bridge-Log.

## Capabilities

### New Capabilities
- `opencode-bridge-instance-deduplication`: Ensures that a single project directory contributes status through at most one active OpenCode bridge connection.

### Modified Capabilities
- `opencode-status-indicator`: The persistent local bridge identifies and aggregates OpenCode sources by project directory so duplicate plugin loads do not create duplicate contributing instances.

## Impact

- `opencode-plugin/index.mjs` will attach stable source identity information to its hello handshake and improve lifecycle logging.
- `streamdeck-plugin/src/status-bridge-server.mjs` and `shared/status-registry.mjs` will reconcile replaced sources and remove their stale state.
- The bridge protocol types/parsing, bridge-server tests, and status-bridge documentation will be updated.
- The behavior remains local-only and read-only; no OpenCode command or permission behavior changes.
