# HArmony — TODO

## Offen

### Bugs / Quick Wins

- [x] **`console.log` aus `dashboard.ts` entfernen** — Zwei Debug-Logs in Produktion; zweite Meldung sagt fälschlich "layout" obwohl config geloggt wird
- [x] **Hardcodierte deutsche Strings in `dashboard/[id].vue`** — `toast.success('Widget gespeichert')` / `toast.error('Speichern fehlgeschlagen')` → i18n-Keys
- [x] **Falsches Event in `DashboardCard.vue`** — Clone und SetGlobalDefault emittieren `'deleted'` statt `'updated'`; funktioniert nur zufällig weil der Parent `loadDashboards` beim `deleted`-Event aufruft

### UX-Verbesserungen

- [x] **Unsaved-Changes-Warning im Edit-Modus** — Kein Hinweis wenn man Edit-Modus verlässt oder navigiert ohne zu speichern → `onBeforeRouteLeave` Guard
- [x] **Unavailable-Entity-Indicator im Edit-Modus** — Widgets die auf nicht-existente/unavailable Entities zeigen werden nicht markiert → Badge oder gedimmter Overlay

### Features

- [ ] **Batterie-/Problem-Übersicht als Status-Bar-Gruppe** — Kompakte Status-Bar-Variante für niedrige Batterien, offline Geräte, offene Fenster/Türen, verfügbare Updates und Fehlerzustände
- [ ] **Adaptive Themes** — Automatisch hell/dunkel/dim nach Tageszeit, Sonnenstand oder Dashboard-Einstellung wechseln
- [ ] **Lazy Loading für schwere Widgets** — Kamera, Charts, Kalender und Detaildaten erst laden, wenn sichtbar oder geöffnet
- [ ] **Code-Splitting verbessern** — Große Nuxt/Vite-Chunks aufteilen, um Tablet-Startzeit und Cache-Verhalten zu verbessern

### Code Quality

- [ ] **`structuredClone` statt `JSON.parse(JSON.stringify(...))`** — Widget wird in `dashboard.ts` 3× tief geklont, `structuredClone` ist nativer und schneller
- [ ] **Widget-Domain-Registry zentralisieren** — Entity-Domain-Filter für den Picker sind in `WidgetConfigPanel` und `StatusBarEntryDialog` dupliziert
- [ ] **Teure `deep: true` Watch im WebSocket-Plugin** — Watched die gesamte Widgets-Array deep, obwohl Vue 3 Array-Referenzen selbst trackt → `deep: true` entfernen

## Ideen / Nice-to-have

- [ ] **Migration auf Vuetify 4** — Vuetify 4 ist seit Feb 2026 stabil (MD3, CSS Layers, Elevation 0–5). Eigener Branch, `eslint-plugin-vuetify` für automatisches Flaggen der Breaking Changes nutzen

- [x] **Lock-Widget Redesign** — Aktuelles Design zu klobig (großer State-Button + separater "Tür Öffnen"-Button). Ziel: kompakteres Layout, State und Aktion besser integriert, weniger vertikaler Platz
- [x] **Cover-Dial2-Widget Redesign** — Großer Kreis-Dial nimmt zu viel Platz ein, Steuerknöpfe (↑ □ ↓) wirken verloren. Ziel: moderneres kompakteres Layout, bessere Proportionen zwischen Steuerung und Statusanzeige
- [x] **Kalender-Widget v2 mit Vuetify Calendar** — Zweite Kalender-Karte auf Basis der Vuetify `v-calendar`-Komponente (Monats-/Wochen-Ansicht) statt der aktuellen Termin-Liste
- [x] **Raumkarte: Aktive Hintergrundfarbe bei Licht an** — Aktiv-Farbe in der Widget-Konfiguration setzen; glass-aware semi-transparent
- [x] **Raumkarte: Langer Klick öffnet Klima-Detail** — 500ms Long-Press öffnet EntityDetailDialog für das konfigurierte Klimagerät

## Erledigt

- [x] **Batterie-/Problem-Übersicht als Widget** — Erste Widget-Version erkennt niedrige Batterien, nicht verfügbare Entities, offene Türen/Fenster, Updates und Alarm-/Fehlerzustände
- [x] **Widget-Sichtbarkeit pro Gerät** — Pro Widget einstellen: sichtbar auf Desktop, Tablet und/oder Mobile, damit Tablet-Dashboards schlanker werden können
- [x] **Kiosk-Modus Feinschliff** — Optional Wake-Lock/Fullscreen-freundlich machen und leichter wieder aus dem Kiosk-Modus herauskommen
- [x] **Status-Bar Actions vereinheitlichen** — Klick, Doppelklick und Halten auch für Status-Bar-Einträge konfigurierbar machen
- [x] **Store-Updates nach Dashboard filtern** — WebSocket-Entity-Updates nur für Entities verarbeiten, die im aktuellen Dashboard tatsächlich genutzt werden
- [x] **Auto-Icons und Auto-Labels nach Entity-Typ** — Fenster, Türen, Bewegung, Batterie, Updates, Geräteklassen usw. automatisch passend darstellen
- [x] **Quick Edit im Dashboard** — Langer Klick auf ein Widget öffnet direkt die Konfiguration, ohne erst in den Edit-Modus zu wechseln
- [x] **State-Übersetzung überall zentralisieren** — `useLocalizedEntityState` in SensorWidget, EntityDetailDialog, SensorDetailDialog, StatusBarGroupDetail, Raumkarten, Status-Bar und Notification-Popup nutzen
- [x] **Translations für HA-Zustände aus einer Quelle** — HA-State-Texte, Device-Class-Texte, HVAC-Modi, Cover-/Lock-States und Statuslabels zentral gepflegt
- [x] **Reconnect-Anzeige als dezenter Status** — Reconnect wird als ruhiger Toolbar-Statuspunkt ohne Blink-Animation oder Textwechsel angezeigt
- [x] **Dashboard Performance-Modus** — Pro Gerät aktivierbar: Glass/Blur reduziert, Animationen aus, schwere Effekte reduziert
- [x] **Performance-Modus Feinschliff** — Kamera-Snapshots im Performance-Modus langsamer aktualisieren, Clock-Sekunden automatisch ausblenden, Wetter/Kalender-Ticks reduzieren und laufende Widget-Animationen entschärfen
- [x] **LockWidget Garagentor nacharbeiten** — Gate-State nutzt Türsensor für Offen/Geschlossen und Hauptbutton bleibt während Fahrt als Stop-Aktion bedienbar
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
