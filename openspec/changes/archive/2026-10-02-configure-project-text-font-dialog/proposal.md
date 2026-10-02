## Why

Name und Status des Projekt-Keys lassen sich derzeit nur über je vier Schriftgrößen einstellen. Der native Stream-Deck-Titeldialog bietet weitere Schriftoptionen, ist aber für die beiden selbst gezeichneten SVG-Texte nicht als wiederverwendbares Standard-Widget dokumentiert. Beide Beschriftungen sollen dieselbe Art von Schriftkonfiguration erhalten, ohne den nativen Titel einzuschalten.

## What Changes

- Ersetze die beiden Schriftgrößen-Auswahllisten im Projektstatus-Inspector durch je einen eigenen Schrift-Dialog für Name und Status, angelehnt an die Optionen des nativen Titeldialogs: Familie, Größe, Stil (normal/fett/kursiv/fett-kursiv), Unterstreichung und Farbe.
- Speichere die Einstellungen unabhängig je Projekt-Key und Text; bestehende `nameFontSize`- und `statusFontSize`-Werte bleiben gültig und werden im Dialog wiederhergestellt.
- Wende alle gewählten Attribute auf die SVG-Texte in statischen Bildern und Animationsframes an; begrenze lange Texte weiterhin auf ihre jeweilige Region.
- Der native Titel und die globale Status-Aktion bleiben unverändert. Keine Breaking-Änderung an vorhandenen Settings.

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `project-status-indicator`: Schriftkonfiguration, Persistenz und Darstellung der getrennten Name-/Status-Beschriftungen erweitern.

## Impact

- Projektstatus-Inspector (`project-status.html`, `project-status-inspector.mjs`), gemeinsame Präsentations-Normalisierung (`project-presentation.mjs`) und SVG-Komposition (`project-status-image.mjs`) samt zugehörigen Tests.
- Additive Action-Settings für die zusätzlichen Schriftattribute; bestehende gespeicherte Schriftgrößen und Projektzuordnung bleiben erhalten.
- Die laufende Änderung `redesign-property-inspector` gestaltet dieselben Inspector-Dateien um; die Umsetzung muss auf deren finalem Stand aufbauen, nicht ihre offenen Änderungen überschreiben.
