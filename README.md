# Austrian Legal Tools

Interaktive Rechtstools für Österreich — Fristenrechner, Gebührenrechner,
Zuständigkeitsfinder, Rechtsmittel-Wegweiser, Verjährungs- und Unterhaltsrechner,
Verfahrenshilfe-Check, Situationsberater und KI-gestützter Dokument-Scanner.

> **Wichtig:** Dieses Tool liefert eine rechtliche Ersteinschätzung und
> ersetzt keine individuelle Rechtsberatung. Alle Angaben ohne Gewähr.

## Features

- **Modul 0 — Dokument-Scanner:** Foto eines Schreibens hochladen, KI-Analyse
  (Claude-API) erkennt Dokumenttyp, Frist, Aktenzeichen, Dringlichkeit.
- **Modul 1 — Fristenrechner:** Berufung, Einspruch, Beschwerde &amp; Co.
  nach ZPO / AußStrG / StPO / VwGVG / BAO, inkl. Gerichtsferien-Hemmung und
  ICS-Kalenderexport.
- **Modul 2 — Gebührenrechner:** Gerichtsgebühren nach GGG (Streitwertstaffel,
  Grundbuch, Firmenbuch, Exekution).
- **Modul 3 — Zuständigkeitsfinder:** Sachliche Zuordnung nach Rechtsgebiet
  und Streitwert; Verlinkung zur amtlichen Gerichtssuche.
- **Modul 4 — Prozesskostenrisiko:** Best-/Worst-Case mit RATG-Modellierung
  und Erwartungswert je Erfolgswahrscheinlichkeit.
- **Modul 5 — Rechtsmittel-Wegweiser:** Welches Rechtsmittel gegen welche
  Entscheidung? Frist, Gericht, Form.
- **Modul 6 — Verjährungsrechner:** ABGB, UGB, Sondergesetze.
- **Modul 7 — Verfahrenshilfe-Check:** Schnellprüfung dem Grunde nach.
- **Modul 8 — Situationsberater:** „Was tun wenn …“ — 12 Alltagssituationen.
- **Modul 9 — Unterhaltsrechner:** Kindes- und Ehegattenunterhalt (Richtwert).

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- React Router
- Claude API (Anthropic)
- PWA (Service Worker, Manifest)

## Entwicklung

```bash
npm install
cp .env.example .env     # Claude-API konfigurieren
npm run dev              # http://localhost:5173
```

### Claude-API-Konfiguration

Modul 0 (Dokument-Scanner) ruft die Claude Messages-API auf. Zwei Varianten:

1. **Backend-Proxy (empfohlen):** Setzen Sie `VITE_SCANNER_PROXY_URL` auf
   einen Endpoint, der das Payload an `https://api.anthropic.com/v1/messages`
   weiterleitet. Der API-Key bleibt serverseitig.
2. **Direktaufruf (nur Entwicklung):** Setzen Sie `VITE_ANTHROPIC_API_KEY`.
   Der Key wird in das JS-Bundle gebundled — **nicht für Produktion**.

Beispiel-Proxy (Node/Express):

```js
app.post('/api/scan', async (req, res) => {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  })
  res.status(r.status).send(await r.text())
})
```

## Build

```bash
npm run build
npm run preview
```

## Rechtliche Hinweise

- Die Fristen-, Gebühren- und Zuständigkeitsdaten sind **vereinfachte**
  Modellierungen zum Rechtsstand 2025. Maßgeblich ist der aktuelle Normtext
  im [RIS](https://www.ris.bka.gv.at).
- Für die konkrete Zuordnung eines Gerichts verwenden Sie die amtliche
  [Gerichtssuche](https://justiz.gv.at/gerichte/gerichtssuche.781.de.html).
- Für anwaltliche Vertretung: [Rechtsanwaltsverzeichnis ÖRAK](https://www.oerak.at/buergerservice/servicecorner/rechtsanwalt-finden/).
- Die Dokument-Scanner-Analyse durch Claude ist keine Rechtsberatung und kein
  Ersatz für die Prüfung des Dokuments durch eine Rechtsanwältin / einen
  Rechtsanwalt.

## Lizenz / Verantwortlichkeit

Proof-of-Concept. Vor produktivem Einsatz müssen alle Normdaten
(Fristen, Tarife, Zuständigkeiten) durch fachkundige Prüfung verifiziert
und versioniert werden.
