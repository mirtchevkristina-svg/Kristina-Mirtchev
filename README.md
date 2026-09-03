# SUBSUMO

Adaptive, mobile-first Prüfungsvorbereitung für die StEOP am Juridicum Wien.
Lauffähige Umsetzung des Business Case v2 — als Replit-Projekt ohne Build-Schritt.

> **Arbeitstitel.** Der Name ist markenrechtlich ungeprüft (Kapitel 18 des Business Case).
> Vor Marke, Domain und Außenkommunikation recherchieren.

---

## In 30 Sekunden starten

Auf Replit: **Run** drücken. Der Setup-Schritt installiert und befüllt die Datenbank.

Lokal:

```bash
npm install
npm run seed      # Content in die Datenbank laden
npm start         # http://localhost:3000
npm run smoke     # 60 End-to-End-Prüfungen gegen einen frisch gestarteten Server
```

Backoffice unter `/admin`, Token aus `.env` (Vorlage: `.env.example`).

---

## Was gebaut ist

Der Umfang folgt der Empfehlung aus Kapitel 15: **Für den 2. Oktober 2026 geht nur der
kostenlose Diagnostic live.** Der Rest ist die Produktionsstrecke darunter, damit der
Jänner-Zyklus nicht bei null anfängt.

| Bereich | Stand |
|---|---|
| Diagnostic (25 Fragen, kein Konto, Wischbedienung, Ergebniskarte 9:16, Warteliste) | vollständig |
| Mastery je Thema, zeitlicher Verfall, Wiederholungsplanung (SM-2 verkürzt) | vollständig |
| Tagesplan aus Prüftermin, verfügbaren Minuten, Mastery und Fehlerprofil | vollständig |
| Freemium-Paywall exakt am Tagesplan, erster Block frei | vollständig |
| Preisstaffel (Frühbucher/Regulär/Endspurt), PASS/PRO, Lerngruppenpreis, FAGG-Nachweis | vollständig |
| Falltraining mit Bewertung auf vier Dimensionen | vollständig, Verfahren mit Vorbehalt (siehe unten) |
| Review-Backoffice, Sachfehlermeldungen, Kennzahlen aus Kapitel 17, Deckungsbeitragsrechnung | vollständig |
| PWA: installierbar, offline-fähig, Ein-Code-für-alle-Geräte | vollständig |
| Zahlungsanbieter | **nicht angebunden** — `PAYMENT_PROVIDER=mock` |
| E-Mail-Versand des Anmeldelinks | **nicht angebunden** — Link steht in der Serverkonsole |
| KI-Tutor | **bewusst abgeschaltet** — steht laut Kapitel 16 am Ende der Roadmap |
| Mock Exams, vorproduzierte Hörfassungen, Sperrbildschirm-Widget | offen |

---

## Die drei Entscheidungen, die der Code trifft

**Progressive Web App statt Store-App.** Keine Store-Provision von 15 bis 30 Prozent auf
einen Durchschnittserlös von rund EUR 57, keine Freigabezyklen in der heißen Phase vor der
Prüfung, ein Code für alle Geräte (Kapitel 6).

**Kein Framework, kein Build-Schritt.** `npm install && npm start` genügt. Bei einem
Zweipersonenteam ist das der Unterschied zwischen liefern und nicht liefern.

**SQLite statt Datenbankdienst.** Die adressierbare Kohorte liegt bei 1.700 Personen pro
Jahrgang. Eine Datei reicht dafür bei weitem und kostet nichts. Der Zugriff liegt gekapselt
in `server/db.js`; ein Wechsel auf Postgres berührt keine Fachlogik.

---

## Aufbau

```
server/
  index.js            Server, Sicherheitskopfzeilen, Ratenbegrenzung, statische Auslieferung
  config.js           Termine, Preisstaffel, Schwellen — alle Zahlen aus dem Business Case
  db.js               SQLite-Schema
  lib/
    mastery.js        Mastery je Thema (Elo-Prinzip mit Ratekorrektur und Verfall)
    scheduler.js      Wiederholungsplanung und Tagesplanbau
    readiness.js      Readiness-Score (ausdrücklich unkalibriert, siehe unten)
    casescore.js      Fall-Scoring auf vier Dimensionen
    pricing.js        Preisstaffel, Gruppenpreis, Verkaufstermine
    content.js        Zugriffsschicht mit Freigabesperre
    auth.js           Sitzungen, Zugangsprüfung
    analytics.js      Ereignisse und Kennzahlen aus Kapitel 17
    payments.js       Platzhalter für die Zahlungsanbindung
  routes/             diagnostic, auth, learn, checkout, admin, meta
content/              Themen, Lektionen, Fragen, Fälle (Platzhalter, siehe unten)
public/               PWA: App-Shell, Frontend, Service Worker, Backoffice, Ergebniskarte
scripts/              seed, icons, smoke
```

---

## Vier Dinge, die vor dem ersten Verkauf zu erledigen sind

**1. Der Content ist ein Platzhalter.**
23 Lektionen, 65 Fragen und 4 Fälle sind eigenständig verfasst, damit die Engine läuft und
die Datenstruktur sichtbar wird. Sie stützen sich auf keine fremden Skripten, Folien oder
Prüfungsangaben (Kapitel 13, Urheberrecht) — sie sind aber **fachlich nicht freigegeben**
und teilweise vereinfacht. Sie sind durch geprüftes Material des Kursgebers zu ersetzen.

Der Code lässt das nicht stillschweigend durchgehen: Jedes Lernobjekt trägt Status, Version,
Prüfer und Quelle. Solange ungeprüfte Objekte ausgeliefert werden, zeigt die App einen
Warnbanner. Mit `CONTENT_ALLOW_UNREVIEWED=false` wird nur noch Freigegebenes ausgespielt —
**dieser Schalter gehört vor dem ersten Verkauf umgelegt.** Die Freigabe erfolgt im
Backoffice und verlangt einen namentlich benannten Prüfer; ohne Namen keine Freigabe, weil
das Versprechen „KI-erstellt, anwaltlich geprüft" sonst leer ist.

**2. Der Readiness-Score ist keine Prognose.**
Er ist ein internes Fortschrittsmaß und wird von der API mit `kalibriert: false` und einem
verbindlichen Anzeigehinweis ausgeliefert. Erst wenn genügend freiwillig gemeldete
Prüfungsergebnisse vorliegen (Zielwert Kapitel 17: mindestens 50), lässt er sich kalibrieren.
Bis dahin darf er nirgends als Bestehenswahrscheinlichkeit dargestellt werden.

**3. Das Fall-Scoring prüft Vollständigkeit, nicht Richtigkeit.**
`lib/casescore.js` ist deterministisches Anker-Matching gegen ein vom Prüfer gepflegtes
Bewertungsraster, ergänzt um Formmarker des Gutachtenstils. Es erkennt, ob die erwarteten
Punkte vorkommen — nicht, ob richtig argumentiert wurde. Deshalb wird es der Nutzerin als
Selbstkontrolle ausgewiesen und fließt nur gedämpft in die Mastery ein. Eine echte Bewertung
braucht menschliches Review oder ein evaluiertes Sprachmodell.

**4. Rechtstexte, Zahlung und Versand fehlen.**
Impressum, AGB, Widerrufsbelehrung und Datenschutzerklärung unter `/api/rechtstexte` sind
als `platzhalter: true` gekennzeichnet. Der FAGG-Mechanismus ist dagegen implementiert: Ohne
ausdrückliche Zustimmung zum vorzeitigen Beginn **und** bestätigte Kenntnis vom Erlöschen des
Rücktrittsrechts wird kein Zugang freigeschaltet; beide Erklärungen werden mit Wortlaut und
Zeitstempel zur Bestellung protokolliert.

---

## Was der Code bewusst nicht tut

Die Ausschlussliste aus Kapitel 7 ist eingehalten: kein Abo mit automatischer Verlängerung,
keine Lootboxen oder Zufallselemente, keine künstlichen Verknappungszähler, keine
öffentlichen Bestenlisten mit Klarnamen. Die Bestehens-Rückkehr ist ausschließlich als
Zugangsverlängerung ausgeführt und nirgends als Erfolgsversprechen formuliert (Kapitel 13,
UWG).

Datenseitig: keine IP-Adressen und keine User-Agents im Ereignisprotokoll, nur eine
Positivliste erlaubter Ereignisnamen, geteilte Ergebniskarten enthalten ausschließlich
aggregierte Prozentwerte, Kontolöschung kaskadiert über alle Lerndaten.

---

## Konfiguration

Alle Schalter stehen in `.env.example`. Die wichtigsten:

| Variable | Standard | Bedeutung |
|---|---|---|
| `CONTENT_ALLOW_UNREVIEWED` | `true` | Auf `false` setzen, bevor verkauft wird |
| `PAYMENT_PROVIDER` | `mock` | `mock` legt Bestellungen an, ohne Geld zu bewegen |
| `AI_TUTOR_ENABLED` | `false` | KI-Tutor, mit hartem Kostenlimit je Nutzer |
| `SESSION_SECRET` | Platzhalter | Vor Launch ändern |
| `ADMIN_TOKEN` | Platzhalter | Zugang zum Backoffice |

Termine, Preisstufen und Schwellen stehen in `server/config.js` — an einer Stelle, nicht
über den Code verteilt.

---

## Hinweis zur Schreibweise

Der Quelltext (Bezeichner, CSS-Klassen, JSON-Schlüssel, Fehlercodes) ist bewusst
umlautfrei; die Oberfläche und der Content sind es nicht. Wer einen Schlüssel umbenennt,
muss ihn im Frontend mitziehen.
