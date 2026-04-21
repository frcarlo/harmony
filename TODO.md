# HArmony — TODO

## Offen

## Ideen / Nice-to-have

- [ ] **Migration auf Vuetify 4** — Vuetify 4 ist seit Feb 2026 stabil (MD3, CSS Layers, Elevation 0–5). Eigener Branch, `eslint-plugin-vuetify` für automatisches Flaggen der Breaking Changes nutzen

- [x] **Lock-Widget Redesign** — Aktuelles Design zu klobig (großer State-Button + separater "Tür Öffnen"-Button). Ziel: kompakteres Layout, State und Aktion besser integriert, weniger vertikaler Platz
- [ ] **LockWidget Garagentor nacharbeiten** — Mismatch zwischen Lock-State-Label und Sensor-Icon (Offen/Geschlossen); Garagentor-Verhalten: bei laufendem Motor stoppt ein Klick, beim nächsten Klick schließt es — Widget sollte das abbilden können
- [ ] **Cover-Dial2-Widget Redesign** — Großer Kreis-Dial nimmt zu viel Platz ein, Steuerknöpfe (↑ □ ↓) wirken verloren. Ziel: moderneres kompakteres Layout, bessere Proportionen zwischen Steuerung und Statusanzeige
- [ ] **Kalender-Widget v2 mit Vuetify Calendar** — Zweite Kalender-Karte auf Basis der Vuetify `v-calendar`-Komponente (Monats-/Wochen-Ansicht) statt der aktuellen Termin-Liste
- [x] **Raumkarte: Aktive Hintergrundfarbe bei Licht an** — Aktiv-Farbe in der Widget-Konfiguration setzen; glass-aware semi-transparent
- [x] **Raumkarte: Langer Klick öffnet Klima-Detail** — 500ms Long-Press öffnet EntityDetailDialog für das konfigurierte Klimagerät

## Erledigt

- [x] Label-Filter in Status-Bar-Gruppen (inkl. Device-Labels)
- [x] Status-Bar-Widget mit Gruppen (domain/area/label Filter)
- [x] Music Assistant Suche (Tabs: Tracks/Alben/Künstler/Playlists/Radio)
- [x] Edit-Modus Toggle (standardmäßig aus, Toolbar + Profil-Menü)
- [x] Dashboard Loading-Spinner bis WS verbunden
- [x] compose.yml aus Git entfernt → compose.example.yml
- [x] Transparenter Hintergrund für Widgets
- [x] Border-Fix Status-Bar (kein Border by default)
- [x] Glass-Effekt für Dialoge (dialog-glass)
- [x] Device-Labels für Entity-Filter berücksichtigt
- [x] Cover-Steuerung in Gruppen-Detail (↑ Stop ↓)
