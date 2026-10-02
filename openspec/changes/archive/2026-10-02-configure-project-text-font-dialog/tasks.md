## 1. Integration und Datenvertrag

- [x] 1.1 Vor der Umsetzung den finalen Stand von `redesign-property-inspector` mit dem Inspector abgleichen und dessen uncommittete Änderungen erhalten; verifizieren, dass Projektwahl, Abschnitte und Settings-Writer nach Integration unverändert arbeiten.
- [x] 1.2 Für `normalizeProjectPresentation` additive Fontfelder mit sicheren Default-/Validierungsregeln und Typdeklarationen ergänzen; mit Tests für alte Größen, fehlende/ungültige Attribute sowie unabhängige Name-/Status-Werte verifizieren.

## 2. Schrift-Dialog im Property Inspector

- [x] 2.1 Die zwei Größen-Selects in `project-status.html` durch zwei eindeutige Schrift-Dialog-Auslöser und einen gemeinsamen Dialog für Familie, Größe, Stil, Unterstreichung und Farbe ersetzen; per DOM-Test Verfügbarkeit und Beschriftungen der Felder sowie Tastaturbedienbarkeit prüfen.
- [x] 2.2 In `project-status-inspector.mjs` den Dialog mit dem richtigen Textzustand öffnen, Änderungen als Entwurf halten und nur beim Anwenden über den vorhandenen WebSocket einmal speichern; mit Inspector-Tests Abbrechen, Wiederöffnen, Settings-Erhalt und Unabhängigkeit beider Fonts prüfen.
- [x] 2.4 Den Größen-Dropdown im Schrift-Dialog durch einen horizontalen Regler (16–28 px, 1-px-Schritte) mit Live-Wertanzeige ersetzen und die gemeinsame Größenvalidierung erweitern; mit Inspector-, Normalisierungs- und Renderer-Tests für Zwischenwerte, Abbrechen, Anwenden und unabhängige Texte prüfen.
- [ ] 2.3 Dialog und Auslöser an bestehende Hell-/Dunkel-Themes und Fokusführung anschließen; im Stream-Deck-Inspector beide Themes und Escape/Abbrechen/Anwenden manuell überprüfen.

## 3. Rendering und Verifikation

- [x] 3.1 In `project-status-image.mjs` die validierten Fontattribute je SVG-Text einsetzen und das konservative Abschneiden für angebotene Familien/Stile ergänzen; SVG-Tests für Defaults, Varianten, lange Namen und fehlerhafte Settings bestehen lassen.
- [x] 3.2 Renderer-Tests für alle statischen Zustände und BUSY/READY/ATTENTION-Frames mit unabhängigen Font-Einstellungen ausbauen; verifizieren, dass Refreshes ohne Statuswechsel wirken, alte Frames nicht zurückschreiben und die globale Status-Aktion unverändert bleibt.
- [ ] 3.3 Die Projekt-Tests und den Typecheck gemäß `streamdeck-plugin/package.json` ausführen und im Stream-Deck-Qt-Renderer Schriftarten, Farben und Ellipsen in statischen wie animierten Zuständen manuell prüfen; Testergebnisse und verbleibende Plattformabweichungen dokumentieren.
