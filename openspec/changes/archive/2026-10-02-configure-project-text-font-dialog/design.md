## Context

Siehe `proposal.md` – Why und die Delta-Spezifikation unter `specs/project-status-indicator/spec.md`. Im aktuellen Projektstatus-Inspector gibt es `sdpi-select` für `name-font-size` und `status-font-size`; `project-status-inspector.mjs` speichert deren `valuechange` über den bestehenden WebSocket. `project-presentation.mjs` normalisiert die zwei Größen (16/20/24/28, Standard 20) für Inspector und Runtime. `project-status-image.mjs` setzt SVG-Text mit fester Arial-Familie und weißer Farbe zusammen und kürzt anhand einer Arial-Näherung. `StatusActionRenderer` komponiert jedes Frame aus der aktuellen Projektpräsentation und schützt seinen Schreibpfad bereits mit Versionsmarkern. Der native Titel ist im Projekt-Manifest deaktiviert.

Die parallele Änderung `redesign-property-inspector` bearbeitet genau diesen Inspector und ist noch nicht abgeschlossen; ihre uncommitteten Dateien dürfen nicht ersetzt werden. Elgatos [Manifest-Referenz](https://docs.elgato.com/streamdeck/sdk/references/manifest) dokumentiert Familie, Größe, Stil, Unterstreichung und Farbe für den nativen Titel, jedoch keinen in einen Property Inspector einbettbaren Titel-Schriftdialog. Der Benutzer hat deshalb einen eigenen Dialog für beide SVG-Texte gewählt.

## Goals / Non-Goals

**Goals:**
- Ein gemeinsames Dialog-Muster für Name und Status ohne zweites Settings- oder WebSocket-System.
- Bestehende Größen und Default-Darstellung exakt erhalten, wenn neue Werte fehlen.
- Einheitliche, sichere Normalisierung vor Anzeige im Inspector und Erzeugung von SVG-Attributen.

**Non-Goals:**
- Den Stream-Deck-Titel reaktivieren oder dessen Einstellungen automatisch übernehmen.
- Exakte Pixelgleichheit mit dem nativen, nicht einbettbaren Dialog oder gleichzeitige Änderung der globalen Status-Aktion.

## Decisions

**Eigener lokaler Dialog mit Entwurf und explizitem Anwenden.** Zwei beschriftete Schaltflächen öffnen denselben Inspector-internen Dialog jeweils mit den effektiven Werten für Name bzw. Status. Die Felder bieten eine endliche Liste gängiger Schriftfamilien (inkl. Arial), einen horizontalen Größenregler von 16 bis 28 px in 1-px-Schritten mit unmittelbar aktualisierter Wertanzeige, vier Stilvarianten, Unterstreichung und einen hexadezimalen Farbwähler. Anwenden speichert genau einmal über das bestehende `save()`-Verfahren; Abbrechen/Schließen verwirft den Entwurf. Der Dialog bleibt per Tastatur erreichbar (Fokus beim Öffnen, Rückgabe des Fokus beim Schließen) und übernimmt die bestehende Inspector-Optik beider Themes. Alternative: den nativen Titel-Dialog oder die automatische `sdpi-components`-Settingsbindung verwenden – beides passt nicht zur unabhängigen SVG-Textgestaltung bzw. würde konkurrierende Settings-Writer erzeugen.

**Additive flache Settings plus eine gemeinsame Normalisierung.** `nameFontSize` und `statusFontSize` bleiben numerisch und unverändert; gültig sind ganzzahlige Werte von 16 bis 28, bisherige Werte eingeschlossen. Neue Felder `nameFontFamily`, `nameFontStyle`, `nameFontUnderline`, `nameFontColor` sowie analoge `statusFont*` werden unabhängig gespeichert; ein Style ist `Regular`, `Bold`, `Italic` oder `Bold Italic`. Fehlende oder unzulässige Werte fallen auf Arial, Regular, false und `#FFFFFF` zurück, so dass bestehende Schlüssel gleich aussehen. Familien kommen nur aus der angebotenen Whitelist, Farben nur aus validierten `#RRGGBB`-Werten; vor der SVG-Interpolation werden alle Textinhalte weiter escaped. Bestehende Settings inklusive unbekannter Felder bleiben beim Speichern erhalten. Alternative: verschachtelte Font-Objekte statt additiver Felder – verworfen, weil die Größen dann doppelt repräsentiert oder migriert werden müssten.

**SVG-Komposition bleibt Quelle für beide Texte.** `projectStatusImage` erhält normalisierte Font-Attribute je Text, bildet `font-weight`, `font-style`, `text-decoration`, `fill` und `font-family` sicher ab und hält bestehende Positionen und Textregionen ein. Die Breitenabschätzung berücksichtigt für unterschiedliche Familien/Stile konservative Reserven oder kürzt vorsichtiger; sie skaliert die Schrift niemals zum Einpassen. `StatusActionRenderer` verwendet unverändert seine Refresh-/Versionslogik, sodass Konfigurationsänderungen auch auf animierten Frames sichtbar werden. Alternative: native `setTitle`-Schicht – kann nicht gleichzeitig beide unabhängigen Texte an frei gewählten Positionen rendern.

## Risks / Trade-offs

- Unterschiedliche Schriftmetriken und Plattform-Fallbacks können lange Wörter trotz Näherung aus der Region hinausragen lassen → konservative Breitenbegrenzung, Tests für lange Namen in allen angebotenen Familien/Stilen und manuelle Verifikation im Stream-Deck-Qt-Renderer.
- SVG-Schrift-/Farbwerte könnten bei ungeprüften Settings fehlerhaftes Markup oder unlesbaren Text erzeugen → Whitelist, strikte Farbprüfung, Escaping und konsistente Defaults im Inspector wie in der Runtime; dunkle Farbe ist eine ausdrückliche Benutzerwahl.
- Dialog- und Theme-Styling könnte durch die parallel laufende Inspector-Umgestaltung kollidieren → erst auf deren finalem Stand integrieren; alle fremden uncommitteten Änderungen erhalten und fokussierte Inspector-Interaktionstests ergänzen.
- Mehrere Schriftänderungen während einer Animation könnten veraltete Frames zeigen → bestehende Versions-/Schreibqueue testen und nur bei einem tatsächlich belegten Fehler ändern.

## Migration Plan

Keine Datenmigration: Alte Größen bleiben gespeichert und werden unverändert interpretiert. Neue Felder werden erst bei Anwendung einer Dialogänderung geschrieben. Beim Zurückrollen werden die zusätzlichen Settings von der alten Runtime ignoriert; alte Größen bleiben verwendbar. Vor der Umsetzung die noch laufende Inspector-Änderung abschließen oder konfliktfrei integrieren.
