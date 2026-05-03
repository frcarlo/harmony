# HArmony — TODO

## Offen

- [ ] **Widget-Sichtbarkeit nach Gerät** — Widgets abhängig von Tablet, Handy oder Desktop ein-/ausblenden, damit Tablet-Dashboards schlanker werden können
- [ ] **Reconnect-Anzeige als dezenter Status** — Keine Spinner/Content-Wechsel bei Reconnect; stattdessen kleiner Statuspunkt oder Icon in der Toolbar
- [ ] **Performance-Modus Feinschliff** — Kamera-Snapshots im Performance-Modus langsamer aktualisieren, Clock-Sekunden automatisch ausblenden, weitere schwere Widgets entschärfen
- [ ] **Status-Bar Actions vereinheitlichen** — Klick, Doppelklick und Halten auch für Status-Bar-Einträge konfigurierbar machen
- [ ] **Quick Edit im Dashboard** — Langer Klick auf ein Widget öffnet direkt die Konfiguration, ohne erst in den Edit-Modus zu wechseln
- [ ] **Auto-Icons und Auto-Labels nach Entity-Typ** — Fenster, Türen, Bewegung, Batterie, Updates, Geräteklassen usw. automatisch passend darstellen
- [ ] **Batterie-/Problem-Übersicht** — Widget oder Status-Bar-Gruppe für niedrige Batterien, offline Geräte, offene Fenster/Türen, verfügbare Updates und Fehlerzustände
- [ ] **Adaptive Themes** — Automatisch hell/dunkel/dim nach Tageszeit, Sonnenstand oder Dashboard-Einstellung wechseln
- [ ] **Kiosk-Modus Feinschliff** — Optional Wake-Lock/Fullscreen-freundlich machen und leichter wieder aus dem Kiosk-Modus herauskommen
- [ ] **Lazy Loading für schwere Widgets** — Kamera, Charts, Kalender und Detaildaten erst laden, wenn sichtbar oder geöffnet
- [ ] **Code-Splitting verbessern** — Große Nuxt/Vite-Chunks aufteilen, um Tablet-Startzeit und Cache-Verhalten zu verbessern
- [ ] **Store-Updates nach Dashboard filtern** — WebSocket-Entity-Updates nur für Entities verarbeiten, die im aktuellen Dashboard tatsächlich genutzt werden

## Ideen / Nice-to-have

- [ ] **Migration auf Vuetify 4** — Vuetify 4 ist seit Feb 2026 stabil (MD3, CSS Layers, Elevation 0–5). Eigener Branch, `eslint-plugin-vuetify` für automatisches Flaggen der Breaking Changes nutzen

- [x] **Lock-Widget Redesign** — Aktuelles Design zu klobig (großer State-Button + separater "Tür Öffnen"-Button). Ziel: kompakteres Layout, State und Aktion besser integriert, weniger vertikaler Platz
- [ ] **LockWidget Garagentor nacharbeiten** — Mismatch zwischen Lock-State-Label und Sensor-Icon (Offen/Geschlossen); Garagentor-Verhalten: bei laufendem Motor stoppt ein Klick, beim nächsten Klick schließt es — Widget sollte das abbilden können
- [x] **Cover-Dial2-Widget Redesign** — Großer Kreis-Dial nimmt zu viel Platz ein, Steuerknöpfe (↑ □ ↓) wirken verloren. Ziel: moderneres kompakteres Layout, bessere Proportionen zwischen Steuerung und Statusanzeige
- [x] **Kalender-Widget v2 mit Vuetify Calendar** — Zweite Kalender-Karte auf Basis der Vuetify `v-calendar`-Komponente (Monats-/Wochen-Ansicht) statt der aktuellen Termin-Liste
- [x] **Raumkarte: Aktive Hintergrundfarbe bei Licht an** — Aktiv-Farbe in der Widget-Konfiguration setzen; glass-aware semi-transparent
- [x] **Raumkarte: Langer Klick öffnet Klima-Detail** — 500ms Long-Press öffnet EntityDetailDialog für das konfigurierte Klimagerät

## Erledigt

- [x] **State-Übersetzung überall zentralisieren** — `useLocalizedEntityState` in SensorWidget, EntityDetailDialog, SensorDetailDialog, StatusBarGroupDetail, Raumkarten, Status-Bar und Notification-Popup nutzen
- [x] **Translations für HA-Zustände aus einer Quelle** — HA-State-Texte, Device-Class-Texte, HVAC-Modi, Cover-/Lock-States und Statuslabels zentral gepflegt
- [x] **Dashboard Performance-Modus** — Pro Gerät aktivierbar: Glass/Blur reduziert, Animationen aus, schwere Effekte reduziert
- [x] **Kiosk-Modus fürs Tablet** — Toolbar ausblendbar und Dashboard-only Ansicht aktivierbar
- [x] **Klick-Aktionen für Entity-Widgets vereinheitlichen** — Klick, Doppelklick und Halten zentral für Entity-Widgets mit Toggle, Details und Service Actions
- [x] **Custom Service Action** — Als zentrale Widget-Aktion beliebige Home-Assistant-Services ausführen können, inkl. optionaler Ziel-Entity und JSON-Service-Daten
- [x] **Raumkarte erweitern** — Mehrere Lichter/Gruppen, mehrere Sensoren kompakt und Fenster/Türen automatisch als Status anzeigen
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
