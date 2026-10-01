## Why

Die bestehende Stream-Deck-Statusaktion zeigt `BUSY` nur als statisches Symbol. Bei länger laufenden OpenCode-Operationen ist dadurch nicht unmittelbar erkennbar, ob der Status noch aktiv verarbeitet wird oder unverändert hängen geblieben ist.

Eine ruhige, animierte Netzwerkdarstellung macht den laufenden Zustand auf der betroffenen Stream-Deck-Taste sichtbar, ohne die OpenCode-Verarbeitung oder die lokale Status-Bridge zu beeinflussen.

## What Changes

- Ergänzt die globale OpenCode-Statusaktion um eine dynamisch erzeugte Particle-Network-Warteanimation für den aggregierten Status `BUSY`.
- Erzeugt SVG-Frames mit bewegten Punkten und distanzabhängigen Verbindungslinien und setzt sie als Stream-Deck-Tastenbild.
- Kapselt Partikelzustand, Frame-Intervall, Rendering sowie Start/Stopp und Timer-Aufräumen in einer wiederverwendbaren Animationskomponente pro Action-Instanz.
- Startet die Animation für jede sichtbare Taste bei `BUSY` und stoppt sie bei allen anderen Statuswerten oder wenn die Taste entfernt wird; anschließend wird das reguläre Statusbild wiederhergestellt.
- Macht die anfänglichen Darstellungs- und Leistungsparameter zentral anpassbar, ohne eine Benutzerkonfiguration einzuführen.

## Capabilities

### New Capabilities
- `particle-wait-animation`: Dynamische, unabhängige und aufräumbare Particle-Network-Anzeige für aktive Stream-Deck-Tasten.

### Modified Capabilities
- `opencode-status-indicator`: Die Anzeige des bestehenden aggregierten `BUSY`-Status erhält eine laufende visuelle Warteanimation und stellt bei Statuswechseln wieder das reguläre Statusbild dar.

## Impact

- Betroffen ist die Darstellung in `streamdeck-plugin/src/actions/opencode-status.ts`, einschließlich der Statusaktualisierung und der Lifecycle-Behandlung sichtbarer Tasten.
- Neu hinzu kommt eine eigenständige TypeScript-Komponente für die SVG-basierte Animation und zugehörige, deterministische Tests für Zustands- und Aufräumverhalten.
- `streamdeck-plugin/src/plugin.ts` und der lokale WebSocket-Bridge-/Status-Registry-Vertrag bleiben unverändert; sie liefern weiterhin lediglich den aggregierten Status.
- Die Stream-Deck-API wird weiterhin über `KeyAction.setImage()` mit Data-URI-SVGs genutzt. Es werden keine GIF-, Video- oder zusätzlichen Laufzeitabhängigkeiten eingeführt.
