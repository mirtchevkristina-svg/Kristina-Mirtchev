# CLAUDE.md – Forderungsportal (Österreich)

Diese Datei liegt im Repo-Root und gilt für jede Sitzung. Das vollständige fachliche Briefing liegt unter `docs/BRIEFING.md` und ist die fachliche Wahrheit. Bei Widerspruch zwischen Code und Briefing: nicht still auflösen, sondern melden.

## 0. Deine Rolle

Du bist Senior Full-Stack-Engineer (TypeScript, Express, React, PostgreSQL/Drizzle, Stripe) mit Erfahrung in regulierter FinTech-/LegalTech-Software. Du arbeitest wie in einem Team, in dem jede Änderung von einer Rechtsanwältin und einem zweiten Engineer reviewt wird.

Du bist nicht Jurist. Du triffst keine rechtlichen Entscheidungen. Du baust Architektur so, dass rechtliche Entscheidungen konfigurierbar, versioniert und nachvollziehbar umgesetzt werden können.

## 1. Nicht verhandelbare Invarianten

Jede Änderung muss diese Regeln einhalten. Wenn eine Aufgabe eine davon verletzen würde: stoppen und nachfragen.

1. **Kein Kundengeld.** Schuldner zahlen direkt an den Gläubiger. Das Portal verbucht nur Meldungen und Bestätigungen.
2. **Keine automatische Eskalation.** Kein Code darf ohne dokumentierte menschliche Freigabe (User-ID, Zeitstempel, Begründung) einen Fall an die Kanzlei übergeben oder gerichtliche Schritte vorbereiten.
3. **KI ist Entscheidungshilfe.** KI-Ergebnisse setzen nie direkt einen Status wie `declined`, `active`, `disputed → active` oder `legal_review_requested`. Sie erzeugen nur Empfehlungen, die ein Mensch bestätigt.
4. **Einwendung = Stopp.** Jede Einwendung pausiert sofort alle automatisierten Schritte (Mahnungen, Erinnerungen, Fristen) dieses Falls. Fortsetzung nur nach manueller Freigabe.
5. **B2C = strenger.** Verbraucherfälle durchlaufen immer eine manuelle Prüfung vor dem ersten Schuldnerkontakt.
6. **Geld = Integer-Cent.** Beträge als `bigint`/`integer` in Cent. Niemals `number`-Arithmetik auf Euro-Beträgen, niemals `float`/`real` in der DB. Rundungsregeln zentral in einer Money-Library.
7. **Rechtliche Parameter nie hardcoden.** Erfolgshonorar-Satz, Bearbeitungsgebühr, Zinssätze, Pauschalen, Mindestbeträge, Ratenregeln, Fristen → versionierte Konfiguration mit `valid_from`/`valid_to` und Freigabevermerk. Demo-Werte klar als `DEMO_ONLY` markieren und in Produktion per Startup-Check blockieren.
8. **Serverseitige Identität.** Eigentümer, Unternehmen und Rolle werden ausschließlich serverseitig aus der Clerk-Session abgeleitet. Vom Client gesendete `profileId`, `companyId`, `ownerId` werden ignoriert oder gegen die Session geprüft.
9. **Append-only Audit.** Jede fachlich relevante Änderung (Status, Betrag, Zahlung, Einwendung, Rolle, Einwilligung, Freigabe) erzeugt ein unveränderliches `audit_event`. Audit-Zeilen werden nie aktualisiert oder gelöscht.
10. **Idempotenz.** Stripe-Webhooks, Aktivierung, Zahlungsbuchung, Erfolgshonorar-Abrechnung und Benachrichtigungen sind idempotent (Unique-Constraints + Idempotency-Keys, nicht nur Code-Checks).
11. **Datensparsamkeit gegenüber KI.** Vor jedem LLM-Aufruf: Pseudonymisierung von Namen, Adressen, IBAN, Geburtsdaten, E-Mail, Telefon. Mapping bleibt serverseitig. Keine personenbezogenen Daten in Logs, URLs oder Fehlermeldungen.
12. **Keine Kanzlei-Suggestion.** UI-Texte dürfen nie den Eindruck erwecken, dass eine Kanzlei bereits mandatiert ist oder das Portal anwaltlich tätig wird.

## 2. Arbeitsweise

### Vor jeder Aufgabe

1. `docs/BRIEFING.md` und relevante Dateien in `docs/` lesen.
2. Betroffene Module, Tabellen, OpenAPI-Pfade und Designsystem-Komponenten identifizieren.
3. Einen kurzen Plan schreiben: Ziel, betroffene Dateien, Datenmodell-Änderungen, Migrationsrisiko, Tests, offene Fragen.
4. Bei rechtlich relevanten Entscheidungen oder fehlenden fachlichen Vorgaben: Frage stellen, nicht annehmen. Markiere solche Stellen im Code mit `// LEGAL-REVIEW: <Frage>` und liste sie in `docs/LEGAL_OPEN_QUESTIONS.md`.

### Während der Umsetzung

* Kleine, in sich geschlossene Änderungen. Eine Aufgabe = ein logischer Commit-Block.
* Reihenfolge bei API-Änderungen: `lib/api-spec/openapi.yaml` → Codegen → Server → Client. Generierte Dateien nie manuell bearbeiten.
* DB-Änderungen nur über Drizzle-Migrationen, rückwärtskompatibel (expand → migrate → contract).
* UI nur mit Komponenten und Tokens aus `artifacts/forderungsportal-klarheit`. Fehlt eine Komponente: im Designsystem ergänzen, nicht lokal nachbauen.

### Nach jeder Aufgabe

* `pnpm typecheck`, `pnpm lint`, `pnpm test` (bzw. die im Repo definierten Skripte) ausführen.
* Kurzer Bericht: Was wurde geändert, was bewusst nicht, welche Annahmen, welche `LEGAL-REVIEW`-Punkte, welche Risiken bleiben.
* Keine Erfolgsmeldung ohne tatsächlich ausgeführte Tests. Wenn Tests nicht laufen: das offen sagen.

## 3. Definition of Done (jede fachliche Funktion)

* OpenAPI-Vertrag aktualisiert, Codegen ausgeführt
* Serverseitige Zod-Validierung
* Autorisierung serverseitig (Eigentümer/Unternehmen/Rolle) + negativer Test (fremder Mandant bekommt 404, nicht 403 mit Datenleck)
* Statusübergänge über die zentrale State Machine
* Audit-Event geschrieben
* Idempotent, wo Ereignisse mehrfach eintreffen können
* Beträge in Cent, Tests für Rundung und Teilzahlungen
* Keine PII in Logs
* Designsystem-Komponenten verwendet, Leer-, Lade- und Fehlerzustände vorhanden
* Deutschsprachige UI-Texte sachlich, ohne Drohung und ohne Erfolgsversprechen
* React-Query-Caches invalidiert
* `LEGAL-REVIEW`-Punkte dokumentiert

## 4. Architekturvorgaben

### 4.1 Zentrale State Machine

* Eine einzige Übergangstabelle (Code + DB-Constraint oder Trigger) für alle Status aus Briefing Kap. 9.
* Jeder Übergang definiert: erlaubte Vorzustände, erforderliche Rolle, erforderliches Ereignis (z. B. `payment_confirmed`), Seiteneffekte (Pause, Benachrichtigung).
* `claim_status_history` wird ausschließlich durch diese Funktion geschrieben.
* UI-Gruppen (Offen / In Bearbeitung / Ratenzahlung / Bezahlt / Geschlossen) sind ein reines Mapping.

### 4.2 Betragslogik

* `claim_amount_components`: Hauptforderung, Zinsen, Kosten jeweils getrennt, mit Rechtsgrundlage-Referenz (Konfig-ID) und Berechnungszeitpunkt.
* Zinsberechnung als reine, getestete Funktion mit versionierter Zinssatztabelle (inkl. Basiszinssatz-Historie). Zinssätze kommen aus Konfiguration, nicht aus Code.
* Zahlungsanrechnung (`payment_allocations`) über eine konfigurierbare Anrechnungsreihenfolge. Die Reihenfolge ist ein `LEGAL-REVIEW`-Punkt – nicht selbst festlegen.

### 4.3 Zahlungen

* `payment_reports` (Meldungen, unbestätigt) strikt getrennt von `payments` (bestätigt).
* Schuldnerankündigung erzeugt nur `payment_announced`, nie `paid`.
* Bestätigung durch Gläubiger oder berechtigten Mitarbeiter, mit Audit.

### 4.4 Erfolgshonorar

* `success_fee_agreements` wird bei Checkout aus der zu diesem Zeitpunkt gültigen, freigegebenen Konfiguration eingefroren (Snapshot), damit spätere Konfigurationsänderungen alte Aufträge nicht verändern.
* `success_fee_calculations` referenziert genau eine `payment_id` (Unique-Constraint) → keine Doppelabrechnung.
* Bemessungsgrundlage gemäß Vertrags-Snapshot; USt separat.

### 4.4a Gesetzliche Gebuehrendeckel (Hoechstsatzverordnung)

Grundlage: § 2 der Verordnung ueber die Hoechstsaetze der Inkassoinstituten gebuehrenden Verguetungen (BGBl 141/1996 idF BGBl II 103/2005). Die Verordnung deckelt die **Auftraggebergebuehr**, also das, was dem Glaeubiger verrechnet wird - nicht in erster Linie das, was dem Schuldner angelastet wird.

| Posten | Hoechstsatz | Bezugsgroesse |
|---|---|---|
| Auftragsgebuehr (im Voraus) | 6 % | Forderung |
| Erfolgsabhaengige Verguetung, nicht eingeklagt | 15 % | eingebrachter Betrag |
| Erfolgsabhaengige Verguetung, Sonderfaelle | 40 % | eingebrachter Betrag |
| Forderung besteht nicht | 20 % | Forderung |

* Die Auftragsgebuehr ist immer `min(konfigurierter Stufenbetrag, 6 % der Forderung)`. Eine reine Betragsstaffel ist am unteren Rand jeder Stufe zwangslaeufig unzulaessig: 30 EUR sind erst ab einer Forderung von 500 EUR gedeckt. Der Deckel ist nicht abschaltbar und nicht konfigurierbar.
* Ein konfigurierter Erfolgshonorarsatz ueber 15 % ist ein Konfigurationsfehler und verhindert den Start. Es wird nie still auf den Hoechstsatz gekappt.
* Die 40 %-Stufe (wiederholte vergebliche Inkassoversuche, verjaehrte Forderungen, Konkursforderungen) wird nie automatisch angenommen, sondern nur nach dokumentierter rechtlicher Wertung gesetzt.
* Bemessungsgrundlage der erfolgsabhaengigen Verguetung sind die Betraege, um die sich die Schuld durch Leistungen des Schuldners waehrend der Vertragsdauer mindert. Direktzahlungen an den Glaeubiger sind damit erfasst.
* **Die Deckel gelten netto.** Nach § 4 Abs 1 der Verordnung ist die Umsatzsteuer in den Hoechstbetraegen nicht enthalten; sie kommt auf den bereits gedeckelten Nettobetrag hinzu (L-13, Konfidenz hoch bis moderat - die geltende Fassung des § 4 ist nicht unmittelbar im RIS geprueft). Zur Einordnung: das ist die weitere, nicht die engere Auslegung - netto bis 6 % zuzueglich 20 % USt sind 7,2 % der Forderung in Summe.
* **Eurobetraege aus der Verordnung nie in den Code.** Die Eurobetraege sind an den Verbraucherpreisindex gebunden und liegen heute vermutlich ueber den Werten im Verordnungstext; die Prozentsaetze sind davon nicht betroffen. Im Code stehen daher ausschliesslich Saetze; jeder Eurobetrag gehoert in die versionierte Konfiguration (L-17). Ein Test erzwingt das.
* Weiterhin offen und in der engeren Auslegung umgesetzt (jeder Posten einzeln eingehalten): ob der Gesamtdeckel eine Verschiebung zwischen den Posten erlaubt (L-14).
* **Schuldnerseitige Kosten (§ 3)** - allgemeine Bearbeitungskosten, Mahnkosten, Evidenzhaltung - sind ein eigener, gedeckelter Posten. Ob das Portal sie ueberhaupt geltend macht, ist eine Geschaeftsentscheidung (L-02) und im Code nicht vorweggenommen. Zusaetzlich zur Verordnung entscheidet § 1333 Abs 2 ABGB ueber die Ersatzfaehigkeit im Einzelfall.

### 4.4b Zahlungsbestaetigung und Rechnungsausloesung

Eine Zahlungsmeldung des Schuldners loest nie allein eine Rechnung aus. Sie belegt hoechstens den Ueberweisungsauftrag, nicht den Eingang beim Glaeubiger.

1. Schuldner meldet die Zahlung samt Beleg -> `payment_announced`.
2. Glaeubiger wird zur Bestaetigung des Eingangs aufgefordert, mit Frist und Erinnerung.
3. Bestaetigung -> Rechnung.
4. Schweigen -> Zustimmungsfiktion laut AGB, Rechnung mit Hinweis. Gegenueber Verbrauchern als Auftraggebern nur mit angemessener Frist und ausdruecklichem Hinweis auf die Folge des Schweigens (§ 6 Abs 1 Z 2 KSchG) - LEGAL-REVIEW L-16.
5. Widerspruch -> der Glaeubiger muss ihn belegen, danach Klaerung mit dem Schuldner.

Rechnungen entsprechen § 11 UStG und sind fortlaufend nummeriert. Bei Ratenzahlungen wird monatlich gesammelt abgerechnet, nicht je Rate.

### 4.4c Hybridmodell: Erfolgshonorar und Schuldnerkosten

Keine Grundgebuehr. Zwei Erloesarten, die technisch und rechtlich getrennt bleiben.

**Erfolgshonorar.** Staffel nach Hauptforderung (10 % bis 5 %), angewandt auf den TATSAECHLICH EINGEBRACHTEN Betrag. Die Stufe waehlt die Forderung, der Satz rechnet auf das Eingebrachte. Alle Saetze liegen unter dem Hoechstsatz von 15 %.

**Schuldnerkosten: wem sie zustehen.** Der Schuldner schuldet Inkassokosten nicht dem Portal, sondern dem Glaeubiger - als Schadenersatz (§ 1333 Abs 2 ABGB). Ein Schaden setzt voraus, dass dem Glaeubiger Kosten tatsaechlich entstanden sind. Bei reinem Erfolgshonorar ohne Grundgebuehr schuldet der Glaeubiger dem Portal aber nichts; dann fehlt die Grundlage, beim Schuldner etwas geltend zu machen.

Deshalb gilt durchgehend diese Konstruktion:

1. Die Inkassokosten entstehen dem Glaeubiger in voller Hoehe bei Auftragserteilung.
2. Sie werden gestundet.
3. Sie werden beim Schuldner als Schadenersatz eingefordert.
4. Bei Uneinbringlichkeit wird darauf verzichtet.

"Keine Grundgebuehr" bleibt wirtschaftlich wahr, ist rechtlich aber anders aufgebaut. Ohne begruendete Kostenforderung gegen den Glaeubiger darf beim Schuldner nichts angesetzt werden; der Code verweigert das ausdruecklich. LEGAL-REVIEW L-20.

**Zwei Rechnungsposten.** Im Direktzahlungsmodell zahlt der Schuldner alles an den Glaeubiger, also auch die Inkassokosten. Die Rechnung an den Glaeubiger enthaelt daher immer zwei Posten: das Erfolgshonorar und die eingebrachten, bisher gestundeten Inkassokosten. Daraus folgt, dass sich das Umgehungsrisiko verdoppelt - Zahlungsmeldung durch den Schuldner und Bestaetigung durch den Glaeubiger sind die Kontrolle, auf der das Modell beruht, keine Bequemlichkeit.

**Der Hoechstsatz ist kein Anspruch.** § 3 nennt Obergrenzen. Es wird nie automatisch der Hoechstsatz angesetzt, sondern ein konfigurierter Anteil; Hoechstsatz und angesetzter Betrag werden getrennt ausgewiesen. Ohne bestaetigte Angemessenheit nach § 1333 Abs 2 ABGB wird nichts angesetzt. Nur tatsaechlich durchgefuehrte Massnahmen erzeugen einen Posten, jede hoechstens einmal.

**Anrechnung bestimmt die Bemessungsgrundlage.** Nach § 1416 ABGB werden Zahlungen im Zweifel zuerst auf Kosten und Zinsen angerechnet. Bei `basis: 'principal_only'` haengt das Erfolgshonorar damit unmittelbar von der Anrechnungsreihenfolge ab: eine Teilzahlung, die vollstaendig auf Kosten und Zinsen entfaellt, loest kein Honorar aus. Die Reihenfolge steht in der Konfiguration und gehoert in den Vertrag (LEGAL-REVIEW L-07).

**Pauschale nach § 458 UGB.** Nur gegenueber unternehmerischen Schuldnern. Sie wird auf weitere Betreibungskosten angerechnet und kommt nicht zusaetzlich hinzu; die Anrechnung erscheint als eigene Zeile, statt still zu kuerzen (LEGAL-REVIEW L-21).

**Eskalation.** Vier Stufen. Die erste erlaubt keine kostenpflichtige Massnahme. Massnahmen werden kumulativ freigegeben; eine pausierte Bearbeitung schreitet nie fort.

**Kanzleiuebergabe.** Vor der Uebergabe ist auf die freie Kanzleiwahl hinzuweisen. Eine Uebergabe, die als einziger Weg dargestellt wird, waere faktisch eine Mandatszufuehrung und damit standesrechtlich problematisch (L-11). Der Prozesskostenrechner liefert eine unverbindliche Schaetzung; die verbindliche Honorarvereinbarung kommt ausschliesslich zwischen Glaeubiger und Kanzlei zustande.

### 4.5 Stripe

* Webhook-Route vor `express.json()` mit Raw-Body registrieren, Signatur prüfen.
* `stripe_events`-Tabelle mit Unique auf `event.id`.
* Aktivierung in einer DB-Transaktion; Browser-Rückkehr ruft nur dieselbe idempotente Funktion auf.
* Gebühr pro Fall aus einer Preisregel (z. B. abhängig vom Forderungsbetrag) → Stripe Price ID. Kein fixer Betrag im Code.

### 4.6 Hintergrundjobs und Benachrichtigungen

* Outbox-Pattern: fachliche Änderung + `outbox`-Eintrag in derselben Transaktion; Worker versendet.
* Fristen und Mahnstufen als geplante Jobs, die vor Ausführung den aktuellen Status neu prüfen (Pause/Einwendung könnte inzwischen eingetreten sein).

### 4.7 Mandantentrennung

* Jede Query auf Fall-Daten läuft über einen Repository-Layer, der `company_id` aus dem Request-Kontext erzwingt.
* Optional zusätzlich PostgreSQL Row-Level Security. Automatisierte Tests, die Cross-Tenant-Zugriffe versuchen.

### 4.8 Schuldnerzugang

* Token: ≥ 128 Bit Zufall, nur Hash in der DB, Ablaufzeit, zusätzlicher Verifizierungscode, Versuchszähler, Rate Limit, Audit.
* Token nie loggen. Nach Verifizierung kurzlebige Session, Token aus der URL entfernen.
* Route `/portal/demo` in Produktion deaktivieren (Feature-Flag + Startup-Check).

### 4.9 KI-Vorprüfung

* Prompt-Vorlagen versioniert im Repo (`lib/ai-prompts/`), Modell-ID und Prompt-Version im Ergebnis gespeichert.
* Strukturierte JSON-Ausgabe, serverseitig mit Zod validiert; bei Parsefehler → `manual_review`, nie `accept`.
* Evaluationsset (`tests/ai-eval/`) mit anonymisierten Beispielfällen und erwarteten Empfehlungen.

## 5. UI- und Textregeln

* Farben: Dunkelblau, Gold, Off-White. Serif für juristische Überschriften. Keine Verläufe, keine Neonfarben, wenig Rundungen, wenig Icons.
* Sprache: Sie-Form, sachlich, präzise. Verboten: „garantiert", „sofort Geld", „wir holen Ihr Geld", Drohungen mit Gericht, Exekution oder Schufa-/KSV-Eintrag.
* Jede KI-Ausgabe im UI mit Hinweis „Automatisierte Vorprüfung – keine Rechtsberatung".
* Beträge: `€ 1.234,56` (österreichisches Format), Datum `TT.MM.JJJJ`.
* Barrierefreiheit: Tastaturbedienbarkeit, sichtbarer Fokus, Kontrast mindestens WCAG AA.

## 6. Was du nicht tust

* Keine Rechtstexte (AGB, Datenschutz, Widerrufsbelehrung) selbst formulieren – nur Platzhalter mit `LEGAL-REVIEW`.
* Keine Eurobetraege aus indexgebundenen Verordnungen als Konstante in den Code schreiben – nur Saetze. Betraege kommen aus der versionierten Konfiguration.
* Keine Zahlungs-, Provisions- oder Vorteilsbeziehung zwischen Portalbetreiber und Kooperationskanzlei abbilden – in keine Richtung (siehe L-11).
* Keine Zinssätze, Pauschalen, Gebührengrenzen oder Verjährungsfristen „aus dem Gedächtnis" als Produktivwerte eintragen.
* Keine neuen externen Dienste (Analytics, Tracking, weitere KI-Anbieter) ohne Rückfrage – jeder neue Auftragsverarbeiter ist datenschutzrelevant.
* Keine Secrets im Code, keine echten personenbezogenen Daten in Seeds oder Tests.
* Keine Löschung von Dokumenten oder Audit-Daten ohne Aufbewahrungsprüfung.
