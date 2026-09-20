# Umsetzungsplan

**Stand:** 20.09.2026
**Grundlage:** `docs/AUDIT_IST_ZUSTAND.md`, `CLAUDE.md`, `docs/LEGAL_OPEN_QUESTIONS.md`, `docs/VERBESSERUNGSVORSCHLAEGE.md`
**Nicht berücksichtigt:** `docs/BRIEFING.md` liegt weiterhin nicht vor. Fachliche Vorgaben aus dem Briefing können in einzelnen Paketen zu Abweichungen führen.

---

## 0. Vorbemerkung: welche Codebasis

Es existieren zwei Stände:

| | Replit-App „Forderungsportal" | GitHub-Repo, Branch `claude/code-audit-roadmap-l7age2` |
|---|---|---|
| Frontend, Designsystem | vorhanden | fehlt |
| Clerk, Stripe, Objektspeicher | angebunden | fehlt |
| Dokumentenkette mit Virenprüfung | vorhanden, sorgfältig | fehlt |
| KI-Vorprüfung | vorhanden, datensparsam | fehlt |
| Datenbank, Migrationen | vorhanden (6 Tabellen) | fehlt |
| Money-Library | fehlt | fertig, 40 Tests |
| Versionierte Rechtsparameter | fehlt | fertig, 35 Tests |
| Zustandsmaschine | fehlt | fertig, 35 Tests |
| Audit, PII-Redaktion | nur für Dokumente | fertig, 12 Tests |

**Entscheidung: die Replit-App ist das Produkt.** Die fünf Fundament-Pakete werden als `lib/*`-Pakete dorthin portiert.

Begründung: Die Pakete sind reines TypeScript ohne Laufzeitabhängigkeiten und ohne Datenbankzugriff — sie lassen sich ohne Anpassung in den bestehenden pnpm-Workspace einhängen. Der umgekehrte Weg hieße, Frontend, Designsystem, Clerk-Anbindung, Stripe-Anbindung und die Dokumentenkette neu zu bauen; das ist der größere und riskantere Teil, und die Dokumentenkette ist ausweislich des Audits der beste Teil des bestehenden Systems.

Das GitHub-Repo bleibt der Ort für die Dokumentation (`docs/`) und für die Fundament-Pakete als Referenzstand mit laufenden Tests.

---

## 1. Warum die Reihenfolge von der Nummerierung des Auftrags abweicht

Der Kickoff-Prompt ordnet nach Architektur. Diese Roadmap ordnet nach Schaden, der heute entsteht — die Paketnamen bleiben unverändert, damit die Bezüge lesbar bleiben.

Zwei Verschiebungen:

1. **B1/B2 (Webhook, idempotente Aktivierung) vor den Rest von Phase A.** Begründung: Befund S-01. Es gibt heute genau einen Pfad, auf dem ein bezahlter Auftrag aktiviert wird, und der hängt daran, dass ein Browser zurückkommt. Das ist der einzige Befund, bei dem laufend Geld ohne Gegenleistung eingezogen wird. Alles andere ist fehlende Funktion, nicht laufender Schaden.

2. **A2 (Money) vor C1 (Tabellen).** Begründung: Befund S-12. Die Datenbank kennt heute keine einzige Betragsspalte. Das ist ein Glücksfall — es ist noch nichts falsch persistiert. Wird C1 vor A2 gebaut, wandert der Gleitkomma-Fehler in jede neue Tabelle und muss später migriert werden.

**Phase 0** fasst die Sofortmaßnahmen zusammen, die keine Architekturentscheidung brauchen.

---

## Legende

- **Status:** `offen` · `bereit` (Vorarbeit liegt im GitHub-Repo) · `blockiert` (wartet auf eine Rechtsfrage)
- **LEGAL-REVIEW:** blockiert die *Produktivschaltung* des Pakets, nicht dessen Bau. Ein Paket mit offener Rechtsfrage wird mit `DEMO_ONLY`-Konfiguration gebaut und getestet.

---

# Phase 0 — Sofortmaßnahmen

## 0.1 Aktivierung idempotent machen

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Ein bezahlter Auftrag wird genau einmal aktiviert, auch bei doppeltem Aufruf, Neustart oder zwei Prozessen.

**Dateien.** `artifacts/api-server/src/routes/account.ts` (Bestätigungsroute), `artifacts/api-server/src/routes/collections.ts` (`activatePaidClaim`).

**Änderung.** Die Bedingung `order.status !== "paid"` wandert aus dem JavaScript in die `WHERE`-Klausel des `UPDATE`. Die Zahl der betroffenen Zeilen entscheidet, ob die Folgeschritte laufen. Alles in einer Transaktion.

**Migrationen.** Keine.

**Tests.**
- Zwei gleichzeitige Bestätigungsaufrufe für denselben Auftrag → genau eine Aktivierung, ein Satz Dokument-Audit-Einträge.
- Aufruf nach bereits erfolgter Aktivierung → unverändert, keine zweite Fallanlage.
- Aufruf durch ein fremdes Profil → 404, kein Hinweis auf die Existenz des Auftrags.

**Akzeptanzkriterien.** Die Sperre liegt in der Datenbank, nicht im Arbeitsspeicher. `activatedOrderIds` ist entfernt. Kein Pfad legt einen Fall an, ohne dass die Auftragszeile im selben Vorgang auf `paid` gesetzt wurde.

## 0.2 Fest verdrahtete Fall-ID im Schuldnerportal entfernen

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Eine Portalaktion wirkt nur auf den Fall, zu dem der Falllink gehört.

**Dateien.** `artifacts/api-server/src/routes/collections.ts`, Portal-Aktionsroute.

**Änderung.** Der Fall wird aus dem Token aufgelöst, nicht aus der Konstanten `"clm-1048"`.

**Tests.** Einwendung über Falllink A verändert Fall B nicht. Unbekannter Token → 404.

**Akzeptanzkriterien.** Keine Fall-ID steht mehr als Literal im Routencode.

## 0.3 `demoCode` aus dem API-Vertrag entfernen

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Der Bestätigungscode wird nie an den Client ausgeliefert.

**Dateien.** `lib/api-spec/openapi.yaml` (`PortalVerificationChallenge`), danach Codegen, danach `collections.ts`.

**Begründung.** Das Feld ist ein Pflichtfeld des Vertrags. Würde nur die Implementierung geändert, erzeugt der Codegen es weiter und die nächste Implementierung füllt es wieder.

**Tests.** Die Antwort der Code-Anforderung enthält kein Feld, aus dem sich der Code ableiten lässt. Ein Vertragstest schlägt fehl, falls `demoCode` wieder auftaucht.

**Akzeptanzkriterien.** Weder Vertrag noch Antwort kennen den Code. Für die Entwicklung wird er ausschließlich in den Server-Log geschrieben, nie in eine HTTP-Antwort.

## 0.4 Eingabewerte aus Validierungsfehlern entfernen

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Weder Log noch Antwortkörper enthalten Eingabewerte des Nutzers.

**Dateien.** alle Routen mit `parsed.error.message`.

**Änderung.** Statt der Zod-Meldung wird eine Liste der betroffenen Feldpfade ohne Werte ausgegeben. Zentrale Hilfsfunktion, damit es nicht je Route abweicht.

**Tests.** Eine ungültige E-Mail-Adresse taucht weder im Log noch in der Antwort auf.

## 0.5 CORS und Sicherheits-Header

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Nur die eigenen Domänen dürfen die API aus dem Browser ansprechen.

**Dateien.** `artifacts/api-server/src/app.ts`.

**Tests.** Anfrage mit fremder Herkunft wird abgewiesen; die eigene Domäne funktioniert weiter.

## 0.6 Die beiden Middleware-Verzeichnisse zusammenführen

**Status:** offen · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Es gibt genau einen Ort für Middleware, damit keine Schutzfunktion doppelt gepflegt wird.

---

# Phase B (vorgezogen) — Zahlungsfluss Plattformgebühr

## B1 Stripe-Webhook

**Status:** offen · **Abhängigkeiten:** 0.1 · **LEGAL-REVIEW:** keine

**Ziel.** Die Aktivierung hängt nicht mehr daran, dass ein Browser zurückkommt.

**Dateien.** `artifacts/api-server/src/app.ts` (Einhängereihenfolge), neue Route `routes/stripe-webhook.ts`, `lib/stripeConnector.ts`.

**Wichtig zur Reihenfolge.** `express.json()` liegt heute global vor allen Routen. Die Webhook-Route braucht den unveränderten Rohtext und muss deshalb **davor** eingehängt werden. Wird sie in den bestehenden `/api`-Router gehängt, scheitert die Signaturprüfung — und zwar nicht sichtbar, sondern als dauerhafter Fehlschlag.

**Migrationen.** Neue Tabelle `stripe_events`: `event_id` als Primärschlüssel oder mit Eindeutigkeit, `type`, `payload`, `received_at`, `processed_at`, `processing_error`.

**Tests.**
- Gültige Signatur → verarbeitet.
- Verfälschter Rohtext → abgewiesen, keine Verarbeitung.
- Fehlende Signatur → abgewiesen.
- Zweimal dasselbe Ereignis → genau eine Verarbeitung, zweiter Aufruf antwortet trotzdem mit 200 (sonst wiederholt Stripe endlos).
- Ereignis zu einem unbekannten Auftrag → protokolliert, kein Absturz.
- Ereignis trifft ein, während die Browser-Rückkehr läuft → genau eine Aktivierung.

**Akzeptanzkriterien.** Die Browser-Rückkehr ruft dieselbe idempotente Funktion auf wie der Webhook und hat keinen eigenen Aktivierungspfad mehr.

## B2 Idempotente Aktivierung in einer Transaktion

**Status:** offen · **Abhängigkeiten:** B1, C1 · **LEGAL-REVIEW:** keine

**Ziel.** Auftrag, Fall, Dokumentenzuordnung, Aktenzeichen, erster Job und Benachrichtigung entstehen gemeinsam oder gar nicht.

**Dateien.** neuer Anwendungsdienst `artifacts/api-server/src/services/activation.ts`.

**Migrationen.** Aktenzeichen aus einer Datenbanksequenz, nicht aus der Länge eines Arrays. Eindeutigkeit auf dem Aktenzeichen.

**Tests.**
- Vollständiger Durchlauf legt alles an.
- Fehler beim Dokumentzugriff → nichts ist angelegt.
- Zwei gleichzeitige Aktivierungen → ein Fall, ein Aktenzeichen.
- Aktenzeichen bleiben über einen Neustart hinweg eindeutig.

**Akzeptanzkriterien.** `FR-JJJJ-NNNN` wird nie zweimal vergeben.

## B3 Preisregel pro Fall

**Status:** blockiert · **Abhängigkeiten:** A2, A5 · **LEGAL-REVIEW:** **L-03**

**Ziel.** Die Gebühr hängt vom Forderungsbetrag ab und hält den gesetzlichen Deckel ein.

**Begründung.** Befund S-02. Heute gibt es ein einziges Angebot mit festem Preis. § 2 der Höchstsatzverordnung deckelt die Auftragsgebühr mit 6 % der Forderung; 30 € sind erst ab 500 € Forderung gedeckt.

**Dateien.** `account.ts` Angebots- und Checkout-Route; portierte `computeOrderFee()`.

**Vorarbeit.** Im GitHub-Repo fertig: `computeOrderFee()` liefert `min(Stufenbetrag, 6 %)`, mit 17 Tests einschließlich des Falls „200 € Forderung → höchstens 12 €".

**Migrationen.** `orders` erhält Spalten für den tatsächlich verrechneten Betrag, den Steuersatz und die ID der verwendeten Konfigurationsversion. Heute wird der verrechnete Betrag nirgends festgehalten (Befund S-13) — das ist auch für die Buchhaltung ein Mangel.

**Tests.** Für jede Stufe: unterer Rand, oberer Rand, Übergang. Kein Fall verletzt den Deckel. Die Stripe Price ID passt zum berechneten Betrag.

**Akzeptanzkriterien.** Kein Checkout ohne hinterlegte Konfigurationsversion. Der Deckel ist nicht abschaltbar.

## B4 Einwilligungsprotokoll

**Status:** offen · **Abhängigkeiten:** A3 · **LEGAL-REVIEW:** **L-16**, Textfreigabe

**Ziel.** Jede Zustimmung ist nachweisbar, auch Jahre später.

**Begründung.** Die sechs Zustimmungsfelder werden heute geprüft, aber nicht gespeichert.

**Migrationen.** Neue Tabelle `consent_records`: Profil, Auftrag, Art der Zustimmung, AGB-Version, gerenderter Textstand oder dessen Hash, Zeitstempel, IP-Hash, Benutzeragent.

**Tests.** Nach dem Checkout existiert je Zustimmung genau ein Eintrag. Der Eintrag ist nicht änderbar. Keine Klartext-IP.

**Akzeptanzkriterien.** Der zum Zeitpunkt der Zustimmung gültige Text ist rekonstruierbar.

---

# Phase A — Fundament

## A1 Serverseitige Identität und Mandantentrennung

**Status:** teilweise umgesetzt · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Kein Zugriff auf fremde Daten, erzwungen an einer Stelle statt in jeder Route.

**Bestand laut Audit.** Die Identität kommt bereits serverseitig aus Clerk; ein vom Client übernommenes `profileId` wurde nicht gefunden. Die Filterung liegt aber in jeder Route einzeln — eine vergessene Bedingung fällt nicht auf.

**Dateien.** neuer Repository-Layer, der `profileId` aus dem Anfragekontext erzwingt; Umstellung aller Fallabfragen darauf.

**Migrationen.** Fremdschlüssel nachziehen (Befund S-13). Optional Row-Level Security als zweite Sicherung.

**Tests.** Für **jeden** Endpunkt mit Fallbezug ein Test: fremder Mandant erhält 404, nicht 403 und keinen Hinweis auf die Existenz. Ein Test, der fehlschlägt, sobald eine Abfrage am Repository-Layer vorbeigeht.

**Akzeptanzkriterien.** Eine Fallabfrage ohne Mandantenbedingung ist nicht mehr formulierbar, ohne dass ein Test bricht.

## A2 Money-Library

**Status:** **bereit** — im GitHub-Repo fertig, 40 Tests · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** keine

**Ziel.** Beträge sind ganzzahlige Cent, Rundung ist zentral und benannt.

**Umfang der Vorarbeit.** Parsen des österreichischen Formats, vier Rundungsmodi, Basispunkt-Rechnung ohne Gleitkomma, verlustfreie Aufteilung für Raten und Anrechnung, Wasserfall-Anrechnung, österreichische Formatierung.

**Offene Arbeit.** Portierung; Umstellung des API-Vertrags von `number` auf Cent-Zeichenkette; Anpassung des Frontends.

**Migrationen.** Heute existiert keine Betragsspalte — es ist nichts zu migrieren. Genau deshalb steht dieses Paket vor C1.

**Tests.** Vorhanden. Zusätzlich Vertragstests, dass kein Betragsfeld mehr `number` ist.

**Akzeptanzkriterien.** Kein `number` als Betrag in Vertrag, Datenbank oder Anwendungscode.

## A3 Audit

**Status:** **bereit** — Modul im GitHub-Repo fertig · **Abhängigkeiten:** A1 · **LEGAL-REVIEW:** keine

**Ziel.** Jede fachlich relevante Änderung erzeugt einen unveränderlichen Eintrag.

**Bestand.** `document_audit_events` existiert und ist ein gutes Vorbild — aber nur für Dokumente.

**Migrationen.** Tabelle `audit_events`. **Änderungs- und Löschschutz per Datenbank-Trigger**, nicht nur per Konvention: die Anwendung bietet zwar nur Anhängen an, aber ein Trigger hält das auch gegen direkten Datenbankzugriff.

**Tests.** Ein `UPDATE` auf `audit_events` schlägt auf Datenbankebene fehl, ebenso ein `DELETE`. Jeder Zustandswechsel erzeugt genau einen Eintrag. Kein Eintrag enthält PII.

## A4 Zustandsmaschine und Statushistorie

**Status:** **bereit** — im GitHub-Repo fertig, 35 Tests · **Abhängigkeiten:** A3 · **LEGAL-REVIEW:** Abgleich mit Briefing Kap. 9

**Ziel.** Status sind kein Freitext mehr, und jeder Übergang ist geprüft und protokolliert.

**Bestand laut Audit.** Status sind deutsche Zeichenketten, die direkt zugewiesen werden.

**Abweichung vom Auftrag, bewusst.** Statt eines Enums mit vielen Werten orthogonale Dimensionen: Lebenszyklus, Zahlungsstand, Einwendungsstand, Ratenstand, Eskalationsstand, Pausegründe. Begründung: diese Zustände treten gleichzeitig auf — ein Fall kann zugleich einen laufenden Ratenplan, eine Teilzahlung und eine offene Einwendung haben. Ein flaches Enum müsste dafür Kombinationswerte erfinden. Die UI-Gruppen bleiben als reines Mapping erhalten.

**Offen.** Abgleich der Zustände mit Briefing Kap. 9, sobald das Briefing vorliegt.

**Migrationen.** `claim_status_history`, ausschließlich durch die Übergangsfunktion beschrieben.

**Tests.** Vorhanden, unter anderem: KI kann keinen Status setzen; Einwendung pausiert alles; Fortsetzen erst nach Entscheidung über die Einwendung; ein zweiter Pausegrund verhindert das Fortsetzen; Eskalation nur mit dokumentierter Freigabe; Zahlungsmeldung ändert den Zahlungsstand nicht.

## A5 Versionierte Rechtsparameter

**Status:** **bereit** — im GitHub-Repo fertig, 35 Tests · **Abhängigkeiten:** keine · **LEGAL-REVIEW:** **L-02 bis L-16**

**Ziel.** Kein rechtlicher Parameter steht im Code, und kein Demo-Wert wird in Produktion wirksam.

**Bestand laut Audit.** Zinssatz `10.73`, Geltungsdatum, Rechtsgrundlage als Zeichenkette, Mindestforderung, Mindestrate, Höchstzahl der Raten, Gerichtskosten, Aufbewahrungsfrist — alles fest im Routencode, ohne Kennzeichnung.

**Umfang der Vorarbeit.** Gültigkeitszeitraum, Freigabevermerk, Status `DEMO_ONLY`/`APPROVED`/`SUPERSEDED`, Auflösung nach Zeitpunkt und nach Versions-ID, Startup-Check, gesetzliche Deckel als nicht abschaltbare Prüfung.

**Offene Arbeit.** Portierung; Überführung der Werte aus 4.1 des Audits in die Konfiguration; Betriebsansicht der noch offenen Demo-Werte.

**Tests.** Vorhanden. Zusätzlich: ein Start mit Produktionskennzeichen und Demo-Werten schlägt fehl und benennt jeden betroffenen Parameter samt offener Rechtsfrage.

**Akzeptanzkriterien.** Jede Berechnung speichert die ID der verwendeten Konfigurationsversion mit, sodass historische Beträge rekonstruierbar bleiben.

---

# Phase C — Persistente Forderungsakte

## C1 Tabellen

**Status:** offen · **Abhängigkeiten:** A1, A2, A3, A4 · **LEGAL-REVIEW:** keine für die Struktur

**Ziel.** Die Forderungsakte verlässt den Arbeitsspeicher.

**Begründung.** Der zentrale strukturelle Befund des Audits.

**Migrationen.** `claims`, `claim_parties`, `claim_amount_components`, `claim_events`, `claim_assignments`. Beträge als `bigint` in Cent. Jede Betragskomponente trägt die ID der Konfigurationsversion und den Berechnungszeitpunkt. Vorgehen erweitern → migrieren → verengen.

**Tests.** Ein Fall überlebt einen Neustart. Aktenzeichen sind eindeutig. Cross-Tenant-Zugriff scheitert. Die Summe der Komponenten entspricht dem Gesamtbetrag, auf den Cent genau.

## C2 Forderungsregister

**Status:** offen · **Abhängigkeiten:** C1

**Ziel.** Suche, Filter und Seitenblätterung **serverseitig**, nicht im Arbeitsspeicher.

**Tests.** Ergebnisse sind auf den Mandanten begrenzt. Blätterung ist stabil und überspringt keine Zeile. Suche findet keine fremden Fälle.

## C3 Aktendetail mit Zeitleiste

**Status:** offen · **Abhängigkeiten:** C1

**Ziel.** Die Zeitleiste kommt aus `claim_events` statt aus fünf fest eingetragenen Einträgen, die heute für jeden Fall identisch sind.

**Tests.** Die Zeitleiste enthält genau die Ereignisse dieses Falls, chronologisch, ohne Platzhalter.

## C4 Dashboard aus echten Daten

**Status:** offen · **Abhängigkeiten:** C1

**Ziel.** Kennzahlen werden berechnet, statt auf null gesetzt zu werden.

**Anmerkung.** Dass heute Nullwerte ausgeliefert werden, ist erkennbar eine bewusste Entscheidung gegen Fantasiezahlen. Sie wird durch echte Werte ersetzt, nicht durch die vorhandenen Demo-Zahlen.

**Tests.** Kennzahlen stimmen mit den Fällen des Mandanten überein. Ein Fall eines anderen Mandanten verändert sie nicht.

---

# Phase D — Schuldnerportal produktiv

## D1 Sicherer Zugang

**Status:** offen · **Abhängigkeiten:** C1, A3 · **LEGAL-REVIEW:** Text der Erstinformation nach Art 14 DSGVO

**Ziel.** Echter Zugang statt Vorführung.

**Begründung.** Befunde S-04, S-05, S-07.

**Migrationen.** `debtor_access_tokens`: nur der Hash des Tokens, Ablaufzeit, Verifizierungscode als Hash, Versuchszähler, Sperrzeitpunkt, Fallbezug.

**Änderung.** Token mit mindestens 128 Bit Zufall. Code wird zugestellt, nie ausgeliefert. Versuchsbegrenzung. Token wird nach der Prüfung aus der Adresszeile entfernt und nie protokolliert. **Auch das Lesen der Falldaten erfordert die Codebestätigung** — heute ist nur das Handeln geschützt.

**Tests.** Falscher Code sperrt nach n Versuchen. Abgelaufener Token wird abgewiesen. Der Token taucht in keinem Log auf. `/portal/demo` ist in Produktion abgeschaltet, erzwungen durch einen Startup-Check. Datenabruf ohne Codebestätigung scheitert.

## D2 Aktionen

**Status:** offen · **Abhängigkeiten:** D1, C1, A4

**Ziel.** Zahlung ankündigen, Ratenanfrage, Einwendung mit Upload, Nachricht, Kontaktkorrektur — mit echter Wirkung.

**Tests.** Jede Aktion erzeugt ein `claim_event` und einen Audit-Eintrag. Ein Upload durchläuft dieselbe Virenprüfung wie auf Gläubigerseite.

## D3 Einwendung pausiert die Automatisierung

**Status:** offen · **Abhängigkeiten:** D2, G1

**Ziel.** Invariante 4 ist nicht nur beschrieben, sondern durchgesetzt.

**Tests.** Nach einer Einwendung führt kein geplanter Job mehr aus. Ein Job, der vor der Einwendung eingeplant wurde, prüft **unmittelbar vor der Ausführung** erneut und bricht ab. Ein zweiter Pausegrund verhindert das Fortsetzen auch nach Zurückweisung der Einwendung.

## D4 EPC-QR-Code

**Status:** offen · **Abhängigkeiten:** C1, A2

**Ziel.** Zahlung in wenigen Sekunden per Banking-App.

**Tests.** Der erzeugte Datensatz entspricht dem EPC-Format. Betrag und Verwendungszweck stimmen mit der Akte überein. Fehlende oder ungültige Gläubiger-IBAN verhindert die Erzeugung, statt einen unbrauchbaren Code zu liefern.

---

# Phase E — Zahlungsabgleich und Raten

## E1 Zahlungsmeldung und Bestätigung

**Status:** offen · **Abhängigkeiten:** C1, A4 · **LEGAL-REVIEW:** **L-16**

**Ziel.** Meldungen und bestätigte Zahlungen sind strikt getrennt.

**Migrationen.** `payment_reports` und `payments` als getrennte Tabellen.

**Ablauf.** Meldung mit Beleg → Aufforderung an den Gläubiger mit Frist und Erinnerung → Bestätigung, Schweigen oder belegter Widerspruch. Die Zustimmungsfiktion bei Schweigen ist bis zur Klärung von L-16 abgeschaltet.

**Tests.** Eine Meldung setzt den Fall nie auf bezahlt. Nur eine Bestätigung erzeugt eine `payments`-Zeile. Doppelte Bestätigung erzeugt keine zweite Zahlung.

## E2 Anrechnung

**Status:** blockiert · **Abhängigkeiten:** E1, A2, A5 · **LEGAL-REVIEW:** **L-07**

**Ziel.** Eine Zahlung wird nachvollziehbar auf die Bestandteile angerechnet.

**Vorarbeit.** Die Wasserfall-Funktion ist gebaut und getestet — sie legt die Reihenfolge ausdrücklich **nicht** selbst fest.

**Tests.** Kein Cent geht bei einer Serie von Teilzahlungen verloren. Eine Überzahlung wird als solche ausgewiesen.

## E3 Ratenworkflow

**Status:** blockiert · **Abhängigkeiten:** E1, A4, A5 · **LEGAL-REVIEW:** **L-08**

**Ziel.** Anfrage → Entscheidung oder Gegenvorschlag → aktiver Plan → Einzelraten → Überfälligkeitshinweis.

**Anmerkung.** Die heute im Code stehenden Regeln (Mindestforderung 500, Mindestrate 100, höchstens 6 Raten) wandern in die Konfiguration. Mehrkosten sind vor der Zustimmung auszuweisen.

**Tests.** Ein aktiver Plan pausiert die Mahnstufen. Scheitert der Plan, laufen sie wieder an. Die Summe der Raten entspricht auf den Cent genau der Restforderung.

## E4 Abschluss-Dialog

**Status:** offen · **Abhängigkeiten:** C1

**Ziel.** Beim Abschluss bestätigt der Gläubiger ausdrücklich, ob Direktzahlungen eingegangen sind.

**Begründung.** Das Geld fließt direkt an den Gläubiger, der damit einen Anreiz hat, Zahlungen nicht zu melden.

---

# Phase F — Erfolgshonorar

## F1 Vertrags-Snapshot

**Status:** blockiert · **Abhängigkeiten:** B3, A5 · **LEGAL-REVIEW:** **L-04**

**Ziel.** Spätere Konfigurationsänderungen verändern alte Aufträge nicht.

**Migrationen.** `success_fee_agreements` mit eingefrorenen Werten zum Zeitpunkt des Checkouts.

## F2 Berechnung je bestätigter Zahlung

**Status:** blockiert · **Abhängigkeiten:** F1, E1, E2 · **LEGAL-REVIEW:** **L-04**, **L-13**, **L-15**

**Ziel.** Keine Doppelabrechnung, Umsatzsteuer getrennt ausgewiesen.

**Migrationen.** `success_fee_calculations` mit **Eindeutigkeit auf `payment_id`** — die Doppelabrechnung wird durch die Datenbank verhindert, nicht durch eine Prüfung im Code.

**Tests.** Zweimalige Verarbeitung derselben Zahlung erzeugt eine Berechnung. Der Satz überschreitet nie den gesetzlichen Deckel. Teilzahlungen summieren sich korrekt.

## F3 Rechnungserzeugung

**Status:** blockiert · **Abhängigkeiten:** F2 · **LEGAL-REVIEW:** § 11 UStG, L-16

**Ziel.** Fortlaufend nummerierte Rechnungen, die den formalen Anforderungen entsprechen.

**Anmerkung.** Bei Ratenzahlungen monatliche Sammelrechnung statt einer Rechnung je Rate.

---

# Phase G — Kommunikation und Jobs

## G1 Outbox und Worker

**Status:** offen · **Abhängigkeiten:** C1, A3

**Ziel.** Fachliche Änderung und Versandauftrag entstehen in derselben Transaktion.

**Tests.** Schlägt der Versand fehl, bleibt die fachliche Änderung bestehen und wird erneut versucht. Ein Eintrag wird nie zweimal versendet. Jeder Job prüft den aktuellen Zustand **vor** der Ausführung erneut.

## G2 Benachrichtigungseinstellungen

**Status:** offen · **Abhängigkeiten:** G1

## G3 Versionierte Schreibvorlagen

**Status:** blockiert · **Abhängigkeiten:** G1, A5 · **LEGAL-REVIEW:** Textfreigabe, getrennte B2B- und B2C-Fassungen

**Ziel.** Jede gesendete Nachricht speichert Vorlagen-ID, Version und den gerenderten Inhalt — Beweissicherung.

**Anmerkung.** Die Erstinformation nach Art 14 DSGVO ist Pflichtbestandteil der ersten Zahlungsaufforderung.

---

# Phase H — KI-Vorprüfung härten

## H1 Von der Ausschluss- zur Aufnahmeliste

**Status:** offen · **Abhängigkeiten:** keine

**Ziel.** Nur ausdrücklich freigegebene Felder verlassen den Server.

**Begründung.** Befund S-08. Die heutige Minimierung ist inhaltlich sehr gut, beruht aber auf einer Ausschlussliste: ein neues Feld mit Personenbezug fließt ohne weitere Änderung an das Modell.

**Tests.** Ein Test, der fehlschlägt, sobald ein Feld ohne ausdrückliche Freigabe in der Nutzlast landet. Ein Test über alle bekannten PII-Felder.

## H2 Zod-Validierung und Rückfallverhalten

**Status:** offen · **Abhängigkeiten:** keine

**Ziel.** Die Modellantwort wird mit Zod geprüft, einschließlich der Elementtypen innerhalb der Listen.

**Anmerkung.** Heute wird nur geprüft, ob eine Liste vorliegt, nicht, was darin steht. Bei einem Parsefehler antwortet der Server mit 502 — das fällt sicher aus, entspricht aber nicht der Vorgabe `manual_review` und hinterlässt keinen Nachweis des Versuchs.

## H3 Prompt-Versionierung und Evaluationsset

**Status:** offen · **Abhängigkeiten:** H2

**Ziel.** Jede Bewertung ist einer Prompt-Version zuordenbar.

**Anmerkung.** Heute wird nur die Modell-ID gespeichert. Da die Ergebnisse über den Eingabe-Hash zeitlich unbegrenzt wiederverwendet werden, kann eine Prompt-Änderung den Zwischenspeicher nicht entwerten — alte Ergebnisse werden weiter ausgeliefert.

**Tests.** Evaluationsset mit 30 bis 50 anonymisierten Fällen. Jede Prompt-Änderung läuft dagegen.

## H4 Menschliche Übersteuerung

**Status:** offen · **Abhängigkeiten:** A3, Back-Office-Rollen

**Ziel.** Invariante 3 wird eingehalten.

**Begründung.** Befund S-09. Eine Empfehlung ungleich `accept` blockiert die Beauftragung hart, ohne dass ein Mensch das aufheben kann. Damit entscheidet faktisch das Modell.

**Tests.** Eine Übersteuerung erfordert eine Rolle, eine Begründung und erzeugt einen Audit-Eintrag. Ohne Übersteuerung bleibt die Sperre bestehen.

---

# Phase I — Kanzleiübergabe

## I1 Freigabe · I2 Aktenexport · I3 Übergabe nach Annahmebestätigung

**Status:** blockiert · **Abhängigkeiten:** C1, A3, A4 · **LEGAL-REVIEW:** **L-11**

**Ziel.** Keine Übermittlung ohne ausdrückliche, protokollierte Zustimmung des Gläubigers; Portal-Jobs enden mit der Annahme durch die Kanzlei.

**Anmerkung.** Die Zustandsmaschine setzt bereits durch: keine Eskalation ohne dokumentierte Freigabe mit Benutzer-ID und Begründung, keine Eskalation bei offener Einwendung, Stopp aller Jobs nach der Übergabe.

**Blockiert bis L-11 geklärt ist:** die Nennung des Kanzleinamens im Produktivbetrieb.

---

# Phase J — Betrieb

## J1 Logging, Monitoring, Health-Checks

**Status:** teilweise · **Abhängigkeiten:** 0.4

**Bestand.** Der Query-String wird bereits aus dem Log entfernt — eine gute Maßnahme, die erhalten bleibt.

## J2 Backups und Wiederherstellungstest

**Status:** offen

**Akzeptanzkriterien.** Eine Wiederherstellung wurde mindestens einmal tatsächlich durchgeführt, nicht nur eingerichtet.

## J3 Aufbewahrungs- und Löschkonzept

**Status:** blockiert · **LEGAL-REVIEW:** **L-12**

**Anmerkung.** Die heute fest im Code stehende Sieben-Jahres-Frist wandert in die Konfiguration. Soft-Delete mit Sperrvermerk statt physischer Löschung, solange Ansprüche offen sind. Audit-Daten werden nie gelöscht.

## J4 E2E-Tests der Kernflüsse

**Status:** offen · **Abhängigkeiten:** alle vorhergehenden

**Ziel.** Einreichung → Checkout → Aktivierung → Schuldnerzahlung → Erfolgshonorar → Abschluss, durchgehend.

---

# Übersicht der Blocker

| Rechtsfrage | Blockiert |
|---|---|
| **L-01** Gewerbeberechtigung | jede produktive Schuldnerkommunikation, also D1 bis D4 und G3 |
| **L-03** Gebührenhöhe | B3, damit auch der produktive Checkout |
| **L-04** Erfolgshonorar | F1, F2, F3 |
| **L-05/L-06** Zinsen | Zinsberechnung, damit die vollständige Betragsaufstellung |
| **L-07** Anrechnungsreihenfolge | E2, mittelbar F2 |
| **L-08** Ratenbedingungen | E3 |
| **L-11** Kanzleirolle | I1 bis I3, Außenauftritt |
| **L-12** Aufbewahrung | J3 |
| **L-16** Zustimmungsfiktion | automatische Rechnungsauslösung bei Schweigen in E1 |

**L-01 ist der einzige Blocker, der das Modell insgesamt betrifft.** Alle anderen lassen sich mit `DEMO_ONLY`-Konfiguration bauen und testen; der Startup-Check verhindert, dass sie unbemerkt produktiv werden.

---

# Vorschlag für die nächsten Schritte

Phase 0 hängt von keiner Rechtsfrage ab, ist klein und beseitigt den laufenden Schaden. Danach B1, weil dort heute Geld ohne Gegenleistung eingezogen wird.

1. **0.1 bis 0.6** — Sofortmaßnahmen, keine Architekturentscheidung nötig
2. **B1** — Webhook mit Rohtext, Signaturprüfung und `stripe_events`
3. **A2 portieren** — vor allen neuen Betragsspalten
4. **A5 portieren** — die Werte aus dem Routencode in die Konfiguration
5. **C1 mit A3 und A4** — die Akte in die Datenbank

Die Pakete 3 bis 5 sind im GitHub-Repo bereits gebaut und getestet; es geht um Portierung und Anschluss, nicht um Neubau.
