# ADHS-Apps — zwei Ansätze

In diesem Repo liegen **zwei eigenständige Apps** mit bewusst gegensätzlicher Philosophie:

| App | Ordner | Idee | Gamification |
|---|---|---|---|
| **🐦 Kolibri** | `/` (Wurzel) | Freundliche All-in-one-App: Brain Dump, To-Dos, Kalender, Fokus-Timer | **Ja** — Punkte, Streaks, Konfetti |
| **① EINS** | `/eins/` | Eine *Entscheidungs*-App: zeigt dir nur **eine** Sache. Vier Bewegungen: Leeren · Ordnen · Eins · Los | **Nein** — bewusst ohne Punkte/Streaks/Konfetti |

> **Kolibri** öffnet sich im Repl standardmäßig (Wurzel). **EINS** erreichst du unter `.../eins/`.
> Details zu EINS: siehe [`eins/README` unten](#-eins--eine-entscheidungs-app).

---

# 🐦 Kolibri — deine ADHS-freundliche App

Eine ruhige, ablenkungsarme Web-App zum **Gedanken festhalten**, **To-Dos**, **Kalender** und **Fokussieren** — speziell für ADHS-Gehirne gebaut.

Läuft komplett im Browser, **ohne Login und ohne Server**. Alle Daten werden lokal im Browser gespeichert (`localStorage`).

---

## 💡 Konzept — warum "Kolibri"?

Klassische Produktivitäts-Apps überfordern ADHS-Gehirne oft: zu viele Felder, zu viele Optionen, zu viel auf einmal. Kolibri dreht das um und folgt 5 Prinzipien:

| Prinzip | Was das heißt |
|---|---|
| **1. Alles reinwerfen (Brain Dump)** | Ein großer Button ist immer erreichbar. Gedanke kommt → sofort rein, egal ob To-Do, Idee oder Termin. Sortieren kommt später. |
| **2. Immer nur EINE Sache** | Der Fokus-Modus zeigt genau *eine* Aufgabe. Kein überwältigender Berg, nur der nächste Schritt. |
| **3. Sofortige Belohnung** | Jede erledigte Aufgabe gibt Punkte, Konfetti und einen Streak-Zähler. Dopamin für dein Gehirn. |
| **4. Zeit sichtbar machen** | Ein Fokus-Timer (Pomodoro) macht die unsichtbare Zeit greifbar — gegen "Zeitblindheit". |
| **5. Ruhig statt reizüberflutet** | Sanfte Farben, viel Platz, keine grellen Benachrichtigungen. |

---

## ✨ Features

- **🧠 Brain Dump** — Gedanken in Sekunden festhalten, später in To-Dos oder Termine umwandeln
- **✅ To-Dos** — mit Priorität (⚡ jetzt / 🌱 später), Filter und "erledigt"-Belohnung
- **🎯 Fokus-Modus** — zeigt nur die eine wichtigste Aufgabe
- **⏱️ Fokus-Timer** — Pomodoro (25/5 Min), einstellbar
- **📅 Kalender** — einfache Terminübersicht pro Tag
- **🏆 Belohnungen** — Punkte, Tages-Streak und kleine Erfolge
- **🌙 Hell/Dunkel-Modus** und automatisches Speichern

---

## ▶️ Auf Replit starten

1. Erstelle auf [replit.com](https://replit.com) ein neues Repl (Template: **HTML, CSS, JS** oder importiere dieses GitHub-Repo).
2. Lade die Dateien `index.html`, `style.css`, `app.js` hoch (bzw. sie sind schon da).
3. Klick oben auf **Run** ▶️ — die App öffnet sich im Vorschaufenster.

> In diesem Repo liegt eine `.replit`-Datei bei, die Replit sagt, wie gestartet wird (kleiner Webserver auf Port 8000).

## 💻 Lokal starten

Einfach `index.html` im Browser öffnen — fertig. Oder mit einem Mini-Server:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

---

## 🗂️ Dateien

- `index.html` — Aufbau/Struktur der App
- `style.css` — das ruhige, ADHS-freundliche Design
- `app.js` — die gesamte Logik (Speichern, To-Dos, Timer, Kalender, Punkte)
- `.replit` — Startkonfiguration für Replit

---

## 🚀 Ideen für später

- Erinnerungen / Push-Benachrichtigungen
- Export/Import der Daten als Datei (Backup)
- Wiederkehrende Aufgaben & Gewohnheiten
- Synchronisierung zwischen Geräten (bräuchte dann ein Backend)

---

# ① EINS — eine Entscheidungs-App

> Ordner: `eins/` · aufrufen unter `.../eins/`

**Keine Produktivitäts-App. Eine Entscheidungs-App.** EINS geht davon aus, dass ADHS
nicht beim *Tun* bremst, sondern beim **Auswählen und Anfangen**. Statt Listen zu
verwalten, zeigt EINS dir **eine** Sache — jetzt.

## Die vier Bewegungen

1. **Leeren** — ein Feld, immer sichtbar, auf jedem Screen. Gedanke rein, fertig.
   Keine Kategorie, kein Datum, kein Pflichtfeld. (Spracheingabe, falls der Browser sie kann.)
2. **Ordnen** — als eigener Moment, einer nach dem anderen, vier Knöpfe:
   **Jetzt · Diese Woche · Irgendwann · Notiz.** „Irgendwann" ist schuldfrei.
3. **Eins** — eine Aufgabe groß im Bild, alles andere still. Die App hat schon gewählt;
   du kannst korrigieren („Andere"), musst aber nicht. **„Nicht heute" kostet nichts.**
4. **Los** — ein Ring, der sich leert. Zeit als Fläche, keine hochzählende Zahl.
   Danach: **ein Häkchen, kein Konfetti.** Und die nächste eine Sache.

## Was EINS bewusst *nicht* hat

Keine Streaks · keine Punkte/Level · kein Monatskalender (nur 7 Tage) ·
keine verschachtelten Projekte · keine Tags beim Erfassen · kein „überfällig"/rot.
Verpasstes wird **leiser**, nicht lauter.

## Fahrplan

- **v1 (fertig, dieser Stand):** Leeren · Ordnen · Eins · Los (Timer) · Woche · Suche.
  Läuft im Browser, Daten lokal (`localStorage`).
- **PWA (fertig):** installierbar aufs Homescreen, offline nutzbar (Service Worker,
  App-Icon, Manifest). Auf dem Handy im Browser öffnen → „Zum Startbildschirm hinzufügen".
- **v2 (geplant):** **„Zerleg das"** — ein Sprachmodell (Claude API) macht aus einer
  vagen Aufgabe einen lächerlich kleinen ersten Schritt. Plus: Eichung geschätzte vs.
  tatsächliche Zeit.
- **Später:** Kalender-Import, echte DB mit Sync.

## Dateien

- `eins/index.html` · `eins/style.css` · `eins/app.js`
- Design-System: Bodoni Moda / Karla / DM Mono, Signalfarbe `#E11D62` — aus dem Produktkonzept.
