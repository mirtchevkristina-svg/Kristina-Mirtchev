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
