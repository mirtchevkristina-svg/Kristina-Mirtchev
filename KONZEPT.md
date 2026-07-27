# WESTTOR LEX — Internes Kanzlei-Dashboard
### Master-Konzept & technische Dokumentation

Ein internes Kommunikations- und Kollaborationsportal für die Kanzlei
**WESTTOR Hehenberger LEX Rechtsanwalt GmbH** (Wien). Es bündelt Videochat,
Team-Chat, gemeinsame Projekte, einen geteilten Terminkalender, eine Pinnwand
und die Erstellung von Honorarnoten im Kanzlei-Layout in **einer** Anwendung.

---

## 1. Zielbild

> Ein digitaler Kanzlei-Arbeitsplatz: Jedes Teammitglied meldet sich mit seiner
> Kanzlei-E-Mail-Adresse an und ist damit Teil des internen Teams. Von dort aus
> lässt sich alles Wesentliche der internen Zusammenarbeit erledigen —
> kommunizieren, Akten/Projekte führen, Termine koordinieren, Ankündigungen
> teilen und Honorarnoten erstellen.

**Designprinzip:** reduziert, editorial, elegant — angelehnt an das
Erscheinungsbild internationaler Wirtschaftskanzleien (Freshfields, Linklaters).
Tiefes Kanzlei-Navy, warmes Creme (abgestimmt auf das Logo), klassische
Serifen-Typografie (Cormorant Garamond), **keine bunten Icons oder Symbole**.

---

## 2. Funktionsumfang

| Modul | Beschreibung |
|---|---|
| **Anmeldung** | Login mit Kanzlei-E-Mail-Adresse. Wer sich anmeldet, wird automatisch Teammitglied. Domain-Beschränkung (`@westtorlex.com`) konfigurierbar. |
| **Übersicht** | Dashboard mit Kennzahlen, nächsten Terminen, offenen Fristen und den neuesten Pinnwand-Beiträgen. |
| **Pinnwand** | Announcements, Fragen und Ereignisse posten; zustimmen, kommentieren, anheften. |
| **Projekte** | Jedes Mitglied kann Projekte/Akten eröffnen und darin **Fristen, Cases, Aufgaben, Notizen, einzelne Dokumente und ganze Ordner** (inkl. Unterordner) verwalten. |
| **Terminkalender** | Gemeinsamer Monatskalender; jeder kann Termine eintragen, optional einem Projekt zuordnen. |
| **Honorarnoten** | Erstellung im exakten Kanzlei-Layout (Logo, Stammdaten, Leistungstabelle, automatische USt- und Summenberechnung, Bankverbindung) — druckbar / als PDF. |
| **Chat** | Gemeinsamer Team-Chat **und** Direktnachrichten zwischen Mitgliedern, in Echtzeit, mit Tipp-Anzeige. |
| **Videokonferenz** | Videobesprechungen (Jitsi-Einbettung); benannte Räume zum Teilen. |
| **Team** | Mitgliederübersicht mit Online-Status; Direktnachricht starten. |

---

## 3. Technische Architektur

```
Browser (Single-Page-App)                    Node.js-Server
┌───────────────────────────┐                ┌────────────────────────────┐
│ React + htm (ohne Build)  │   REST / JSON  │ Express (API + statische    │
│ Socket.IO-Client (Echtzeit)│ ◀────────────▶ │ Auslieferung des Frontends) │
│ Views: Dashboard, Chat,   │   WebSocket    │ Socket.IO (Chat, Präsenz)   │
│ Projekte, Kalender, …     │ ◀────────────▶ │ Multer (Datei-/Ordner-Upload)│
└───────────────────────────┘                │ JSON-Datei-Speicher (data/) │
                                             └────────────────────────────┘
```

- **Kein Build-Schritt nötig.** Das Frontend nutzt React + `htm` über ein
  Import-Map (ESM via CDN). Damit startet die App auf Replit sofort mit
  `npm install && npm start`.
- **Backend:** ein einziger Express-Server (`server/index.js`), der zugleich
  die API bereitstellt, die statischen Dateien ausliefert und Socket.IO betreibt.
- **Persistenz:** schlanker JSON-Datei-Speicher (`server/store.js`,
  Daten in `data/db.json`) — **keine nativen Abhängigkeiten**, läuft überall.
  Für den Produktivbetrieb leicht gegen eine echte Datenbank austauschbar
  (siehe Abschnitt 7).
- **Echtzeit:** Socket.IO verteilt neue Chat-Nachrichten, Pinnwand-, Kalender-
  und Projekt-Änderungen sofort an alle angemeldeten Clients; Präsenz (online/offline).

### Projektstruktur
```
├── server/
│   ├── index.js        # Express, alle API-Routen, Socket.IO, Uploads
│   └── store.js        # JSON-Datei-Persistenz
├── public/
│   ├── index.html      # Import-Map + Einstiegspunkt
│   ├── css/styles.css  # gesamtes Design (inkl. Druck-Layout Honorarnote)
│   ├── assets/logo.png # Kanzlei-Logo
│   └── js/
│       ├── app.js      # Login, Layout/Navigation, Routing
│       ├── api.js      # API-Client + Token-Verwaltung
│       ├── socket.js   # Socket.IO-Verbindung
│       ├── ui.js       # gemeinsame Komponenten (Avatar, Modal, Datum)
│       └── views/      # dashboard, pinboard, projects, calendar,
│                       #   honorar, chat, video, team
├── data/               # Laufzeitdaten (nicht versioniert)
├── uploads/            # hochgeladene Dateien (nicht versioniert)
├── .replit, replit.nix # Replit-Konfiguration
└── package.json
```

### Datenmodell (Kernobjekte)
- **users** — `{ id, email, name, role, color }`
- **projects** — `{ id, name, description, createdBy }`
- **projectItems** — `{ id, projectId, type: frist|case|aufgabe|notiz|dokument|ordner, title, content, dueDate, status, fileUrl | files[] }`
- **events** — `{ id, title, start, end, projectId, createdBy }`
- **announcements** — `{ id, type, title, text, likes[], comments[], pinned }`
- **messages** — `{ id, channel: 'team' | 'dm:<a>__<b>', authorId, text }`
- **honorarnotes** — `{ id, number, date, clientName, clientAddress, matter, aktenzeichen, rate, positions[], net, vat, gross, firm, bank }`
- **settings** — Kanzlei-Stammdaten & Bankverbindung für Honorarnoten

---

## 4. Start auf Replit

1. Repository in Replit importieren (**Create Repl → Import from GitHub**).
2. Auf **Run** klicken. Replit führt automatisch `npm install && npm start` aus.
3. Die Web-Vorschau öffnen — fertig. Anmeldung mit einer beliebigen E-Mail
   (Demo-Modus) oder mit einer Kanzlei-Adresse (Produktivmodus, siehe unten).

Lokal:
```bash
npm install
npm start        # http://localhost:3000
```

---

## 5. Konfiguration / Anpassung

Über Umgebungsvariablen (in Replit unter **Secrets**, lokal via `.env`):

| Variable | Standard | Wirkung |
|---|---|---|
| `PORT` | `3000` | Serverport (Replit setzt ihn automatisch) |
| `FIRM_EMAIL_DOMAINS` | `westtorlex.com` | Erlaubte Anmelde-Domains (Komma-getrennt) |
| `DEMO_LOGIN` | `true` | `true` = jede E-Mail erlaubt (Test); **für Echtbetrieb auf `false` setzen** |

**Weitere Anpassungen ohne Code-Kenntnisse:**
- **Logo:** `public/assets/logo.png` austauschen.
- **Farben/Typografie:** Variablen im Kopf von `public/css/styles.css` (`:root`).
- **Kanzlei-Stammdaten & Bankverbindung** der Honorarnote: Standardwerte in
  `server/index.js` (`DEFAULT_SETTINGS`) bzw. zur Laufzeit über den
  `PUT /api/settings`-Endpunkt.

---

## 6. Honorarnoten

Die Honorarnote wird **1:1 nach der Kanzlei-Vorlage** erzeugt:
Logo, Absenderblock, Datum, Empfänger, „HONORARNOTE N°…", Einleitungssatz,
Aktenzeichen, Leistungstabelle (Leistung · Mitarbeiter · Zeitaufwand · Betrag
netto), automatische Summen (Netto, 20 % USt, Gesamt) und Bankverbindung.
Ausgabe per Browser-Druck als PDF (eigenes Druck-Layout in `styles.css`).
Stundensatz, Positionen und Zeiten werden im Editor erfasst; Beträge und USt
werden automatisch berechnet.

---

## 7. Hinweise für den Produktivbetrieb (Empfehlungen)

Diese Version ist als sofort lauffähiger, funktionaler Prototyp konzipiert.
Für den echten Kanzleibetrieb — mit vertraulichen Mandatsdaten — empfehlen sich:

1. **Echte Authentifizierung:** Anbindung an Microsoft 365 / Azure AD (SSO) statt
   der aktuellen domain-geprüften Anmeldung; Sitzungen mit Ablauf.
2. **Datenbank:** Ablösung des JSON-Speichers durch PostgreSQL (auf Replit als
   Add-on verfügbar) für Mehrbenutzer-Sicherheit und Backups.
3. **Vertraulicher Videochat:** selbst gehostete Jitsi-Instanz statt des
   öffentlichen `meet.jit.si`.
4. **Dokumentenspeicher:** verschlüsselter Objektspeicher statt lokalem
   `uploads/`-Ordner; Zugriffsrechte je Projekt.
5. **Rollen & Rechte:** feingranulare Berechtigungen (Partner / Anwalt /
   Sekretariat), Mandantentrennung, Protokollierung.
6. **DSGVO/Verschwiegenheit:** Auftragsverarbeitungsverträge, Verschlüsselung
   at-rest/in-transit, Aufbewahrungs- und Löschkonzept.

Die modulare Struktur (klar getrennte API-Routen und Views) ist genau darauf
ausgelegt, diese Schritte nacheinander umzusetzen, ohne die App neu zu bauen.
