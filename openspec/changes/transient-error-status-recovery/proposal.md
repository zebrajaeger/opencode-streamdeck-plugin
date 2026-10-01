## Why

Ein `session.execution.failed` wird derzeit als dauerhafter Session-Zustand gespeichert. Wenn kein späteres Ereignis genau diese Session aktualisiert, bleibt die globale Stream-Deck-Anzeige bei `ERROR`, obwohl OpenCode wieder arbeitsfähig ist; zusätzlich verhindert eine nicht unterstützte Snapshot-Abfrage eine verlässliche Wiederherstellung nach Reconnects.

## What Changes

- `ERROR` wird zu einem sichtbaren, aber zeitlich begrenzten Ereignis statt eines dauerhaft aggregierten Session-Zustands.
- Ein Fehler wird sofort angezeigt, läuft nach 15 Sekunden ohne neueres Live-Ereignis ab und wird durch nachfolgendes `BUSY`, `READY` oder `ATTENTION` sofort ersetzt.
- Der dauerhafte globale Live-Status wird aus `ATTENTION > BUSY > READY > OFFLINE` abgeleitet.
- Reconnect-Snapshots ersetzen den bekannten Live-Zustand einer Instanz vollständig und enthalten keine historischen Fehler.
- Die Start-/Reconnect-Snapshot-Erfassung wird auf eine mit der installierten OpenCode-Plugin-API 2.0.18 kompatible Quelle umgestellt.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `opencode-status-indicator`: Fehleranzeige, Statuspriorität und Reconnect-Wiederherstellung so ändern, dass vergangene Ausführungsfehler die globale Live-Anzeige nicht dauerhaft festhalten.

## Impact

- Betrifft die Statusaggregation in `shared/status-registry.mjs`, die OpenCode-Event- und Snapshot-Verarbeitung in `opencode-plugin/index.mjs`, das lokale Bridge-Protokoll sowie Registry-, Bridge-Server- und Plugin-Tests.
- Die Änderung bleibt lokal und rein anzeigend; sie ergänzt keine Stream-Deck-Steuerung von OpenCode.
- Die GitNexus-Analyse für `StatusRegistry` zeigt direkte Auswirkungen auf `StatusBridgeServer` sowie Registry- und Bridge-Server-Tests; der aktuelle Index liegt drei Commits hinter `HEAD` und muss vor der Implementierung aktualisiert werden.
