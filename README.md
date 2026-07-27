# WESTTOR LEX — Internes Kanzlei-Dashboard

Internes Kommunikations- und Kollaborationsportal für die Kanzlei
**WESTTOR Hehenberger LEX Rechtsanwalt GmbH**.

Videochat · Team-Chat & Direktnachrichten · gemeinsame Projekte (Fristen, Cases,
Dokumente & ganze Ordner) · geteilter Terminkalender · Pinnwand · Honorarnoten
im Kanzlei-Layout.

> **Ausführliches Konzept & Architektur:** siehe [`KONZEPT.md`](./KONZEPT.md)

---

## Schnellstart

### Auf Replit
1. Repository importieren (**Create Repl → Import from GitHub**).
2. **Run** klicken — Replit führt `npm install && npm start` aus.
3. Web-Vorschau öffnen und mit einer E-Mail anmelden.

### Lokal
```bash
npm install
npm start
# → http://localhost:3000
```

## Anmeldung
- **Demo-Modus** (Standard, `DEMO_LOGIN=true`): jede E-Mail-Adresse wird akzeptiert
  — praktisch zum Ausprobieren. Die erste angemeldete Person wird Administrator.
- **Echtbetrieb**: `DEMO_LOGIN=false` setzen und `FIRM_EMAIL_DOMAINS=westtorlex.com`
  → nur Kanzlei-Adressen können sich anmelden.

## Konfiguration (Umgebungsvariablen)
| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `3000` | Serverport |
| `FIRM_EMAIL_DOMAINS` | `westtorlex.com` | erlaubte Anmelde-Domains (Komma-getrennt) |
| `DEMO_LOGIN` | `true` | `false` für die Beschränkung auf Kanzlei-Adressen |

## Technik (Kurzfassung)
- **Frontend:** React + `htm` über Import-Map — **kein Build-Schritt**.
- **Backend:** Node.js/Express + Socket.IO (Echtzeit) + Multer (Uploads).
- **Speicher:** JSON-Datei (`data/`) — keine nativen Abhängigkeiten.

## Anpassen
- **Logo:** `public/assets/logo.png` ersetzen.
- **Farben/Schrift:** `:root` in `public/css/styles.css`.
- **Honorarnote-Stammdaten/Bank:** `DEFAULT_SETTINGS` in `server/index.js`.
