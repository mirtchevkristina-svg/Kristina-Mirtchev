# AT Legal Tools – Fristen-, Gebühren- & Zuständigkeitsrechner (Prototyp)

Web-App für österreichische Rechtspraxis: Berechnung von Rechtsmittel- und
Verfahrensfristen, Gerichtsgebühren und Zuständigkeiten in Zivil-, Straf-
und Verwaltungssachen.

> **Status:** Phase 1 – Fristenrechner Zivilverfahren (Prototyp).

## Setup

```bash
npm install
npm run dev        # startet Vite-Dev-Server
npm test           # führt Unit-Tests aus (Vitest)
npm run build      # Production-Build
```

## Architektur (High Level)

```
src/
  data/
    feiertage/       # österreichische Feiertage + verhandlungsfreie Zeit
    fristen/         # Verfahrensarten pro Rechtsgebiet (JSON, versioniert)
  logic/
    feiertagsLogik.ts   # Ostern, Feiertage, dies non, Gerichtsferien
    fristBerechnung.ts  # §§ 125, 126, 222 ZPO
  components/
    FristenRechner.tsx
  App.tsx, main.tsx
```

**Designprinzip:** Rechtsinhalte sind als JSON-Datensätze gepflegt
(versioniert über `stand`-Feld), damit Gesetzesnovellen ohne Code-Änderung
abgebildet werden können. Die Logik ist rein funktional und unit-testbar.

## Rechtsgrundlagen (Phase 1)

- **§ 125 ZPO** – Fristbeginn, Wochen-/Monatsfristen
- **§ 126 ZPO** – Sa/So/Feiertag am Fristende
- **§ 222 ZPO** – Verhandlungsfreie Zeit (15.07.–17.08., 24.12.–06.01.)
- **§ 903 ABGB** – Karfreitag als dies non
- **§ 7 ARG** – gesetzliche Feiertage

## Roadmap

- [ ] Phase 2: Straf- und Verwaltungsfristen (ohne Gerichtsferien-Hemmung)
- [ ] Phase 2: Gebührenrechner GGG (TP 1–3)
- [ ] Phase 3: Zuständigkeitsfinder (sachlich + örtlich)
- [ ] Phase 3: Rechtsmittelwegweiser (Entscheidungsbaum)
- [ ] Phase 4: RATG-Kostenrechner, ERV-Pflicht-Check, Verfahrenshilfe-Check
- [ ] ICS-Export, Mehrmandanten-Features

## Rechtlicher Hinweis

Dieses Tool ersetzt keine Rechtsberatung. Trotz sorgfältiger Umsetzung
wird für die Richtigkeit der Berechnungen keine Gewähr übernommen.
Maßgeblich sind stets die aktuellen gesetzlichen Bestimmungen (RIS) und
die Umstände des Einzelfalls.
