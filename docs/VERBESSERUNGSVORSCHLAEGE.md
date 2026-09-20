# Forderungsportal – Verbesserungsvorschläge aus allen Perspektiven

**Legende Grundlage:** [RIS-verifiziert] im Rahmen dieser Analyse im RIS/Primärquelle nachgesehen · [Gesetz/TD] Rechtslage aus Trainingsdaten, nicht heute verifiziert · [Inferenz] eigene Schlussfolgerung · [Schätzung]
**Konfidenz:** H hoch · M moderat · N niedrig

> **Vorbemerkung:** Das Briefing wurde nur bis Kap. 21 („Informationen zum sofortigen Leistungsbeginn …") angezeigt, der Rest war abgeschnitten. Aussagen zu späteren Kapiteln (vorhandene Umsetzung, offene Arbeiten) können daher nicht getroffen werden. Keine der rechtlichen Aussagen ist ein Gutachten; Stand der Rechtslage laut Wissen bis ca. Mai 2026, nur § 118 GewO heute nachgeprüft.

---

## 1. Rechtliche Perspektive (höchste Priorität – kann das Modell tragen oder kippen)

### 1.1 Gewerbeberechtigung Inkassoinstitut – im Briefing nicht adressiert

* **Fakt:** Für die Einziehung fremder Forderungen ist eine Gewerbeberechtigung für Inkassoinstitute erforderlich (§ 118 Abs 1 GewO). Inkassoinstitute dürfen weder gerichtlich eintreiben noch sich Forderungen abtreten lassen (Abs 2). [RIS-verifiziert, H]
* **Inferenz:** Die im Briefing beschriebene „außergerichtliche Bearbeitung" mit Zahlungsaufforderungen, Fristsetzung und Ratenverhandlung im Namen des Gläubigers dürfte „Einziehung fremder Forderungen" sein – auch wenn das Geld direkt an den Gläubiger fließt. Das „kein Kundengeld"-Design löst die Gewerbefrage nach dieser Einschätzung nicht. [Inferenz, M-H]
* **Konsequenz:** Vor Launch klären: Betreiber mit Gewerbeberechtigung (eigene oder Kooperation mit berechtigtem Inkassoinstitut) oder Modell als reines Software-Tool, bei dem der Gläubiger selbst mahnt (dann aber keine Kommunikation „im Auftrag"). Das bestimmt Architektur, Texte und AGB grundlegend.

### 1.2 Schadenersatzforderungen privater Gläubiger – Konflikt mit § 118 Abs 3 GewO

* **Fakt:** Inkassoinstitute dürfen außervertragliche Schadenersatzforderungen (§ 1295 ABGB) nur einziehen, wenn sie unbestritten sind. [RIS-verifiziert, H]
* Das Briefing (3.2) nennt „Schadenersatzansprüche" als zulässige Forderungsart. **Empfehlung:** Forderungsgrund-Typ im Datenmodell; deliktische Schadenersatzforderungen bei Bestreitung automatisch aus der Portalbearbeitung nehmen. [Inferenz, M-H]

### 1.3 Gebührendeckel nach der Höchstsatzverordnung — KORRIGIERT

> **Korrektur vom 20.09.2026.** Die ursprüngliche Fassung dieses Abschnitts nahm an, die
> Höchstsatzverordnung betreffe vor allem das, was dem *Schuldner* als Betreibungskosten
> angelastet werden darf. **Das war falsch.** § 2 der Verordnung (im RIS nachgelesen)
> deckelt ausdrücklich die **Auftraggebergebühr** — also genau das, was das Portal dem
> **Gläubiger** verrechnet. Der Abschnitt ist deshalb vollständig ersetzt.

**Grundlage:** § 2 der Verordnung über die Höchstsätze der Inkassoinstituten gebührenden
Vergütungen (BGBl 141/1996 idF BGBl II 103/2005). [RIS-verifiziert, H]

#### Die vier maßgeblichen Deckel

| Posten | Höchstsatz | Bezugsgröße |
|---|---|---|
| Auftragsgebühr (im Voraus) | **6 %** | Forderung |
| Erfolgsabhängige Vergütung, nicht eingeklagt | **15 %** | eingebrachter Betrag |
| Erfolgsabhängige Vergütung, Sonderfälle | **40 %** | eingebrachter Betrag |
| Forderung stellt sich als nicht bestehend heraus | **20 %** | Forderung |

Die 40 %-Stufe gilt nur für: wiederholte vergebliche Inkassoversuche, verjährte Forderungen,
Konkursforderungen. [RIS-verifiziert, H]

#### Konsequenzen für das Produkt

1. **15 % Erfolgshonorar liegen exakt am Deckel.** Es gibt keinen Spielraum nach oben.
   Technisch ist der Satz deshalb nicht nur konfigurierbar, sondern wird gegen die
   Obergrenze validiert; eine höhere Konfiguration ist ein Startfehler, kein stilles Kappen.
2. **Die 30 € sind erst ab einer Forderung von 500 € gedeckt.** Bei 200 € Forderung wären
   höchstens 12 € zulässig. Die Gebühr ist daher `min(Stufenbetrag, 6 % der Forderung)` —
   eine reine Betragsstaffel ohne diese Deckelung ist am unteren Rand jeder Stufe
   zwangsläufig unzulässig. Damit ist die offene Frage aus Briefing Kap. 6.3 beantwortet.
3. **Direktzahlungen sind erfasst.** Bemessungsgrundlage sind die Beträge, um die sich die
   Schuld durch Leistungen des Schuldners während der Vertragsdauer mindert. Daraus folgt,
   dass die 15 % auch bei Direktzahlung an den Gläubiger anfallen. [Inferenz, M-H] Das
   stützt das Modell „kein Kundengeld" ausdrücklich.
4. **Die 20 %-Regel bei nicht bestehender Forderung** ist ein vertraglicher Hebel gegen
   Gläubiger, die unberechtigte Forderungen einreichen. Ob genutzt, ist eine geschäftliche
   Entscheidung; im Verbraucherbereich vorher prüfen lassen.

#### Weiterhin offen

- **L-13:** Sind die Prozentsätze netto oder brutto zu verstehen?
- **L-14:** Erlaubt der Gesamtdeckel („Summe der Höchstsätze") eine Verschiebung zwischen den
  Posten? Bis zur Klärung wird jeder Posten **einzeln** eingehalten — die strengere Auslegung.
- **L-15:** Wer stellt nach welchen Kriterien fest, dass ein 40 %-Sonderfall vorliegt? Das
  wird nie automatisch angenommen.

#### Unberührt bleibt

**B2B-Hebel § 458 UGB:** 40 € Pauschalentschädigung für Betreibungskosten im unternehmerischen
Verkehr. [Gesetz/TD, H] Kann dem Gläubiger helfen, die Portalgebühr wirtschaftlich zu
kompensieren (Anrechnung auf weitere Betreibungskosten beachten — [Gesetz/TD, M]).

---

### 1.3a Zahlungsbestätigung: Schuldnermeldung allein trägt keine Rechnung

Der Ablauf „Schuldner bestätigt → automatisch Rechnung, außer der Gläubiger widerspricht"
ist in der Grundidee richtig, als alleiniger Auslöser aber zu schwach. [Inferenz, H]

- Die Bestätigung des Schuldners belegt höchstens den Überweisungsauftrag, nicht den Eingang
  beim Gläubiger. Sie kann falsch oder gefälscht sein, oder das Geld ging an die falsche IBAN.
- Rechnungen auf unbestätigter Basis erzeugen Streit und Gutschriften — das kostet Vertrauen.

**Empfohlener Ablauf:**

1. Schuldner meldet die Zahlung und lädt einen Beleg hoch → Status `payment_announced`.
2. Gläubiger wird aufgefordert, den Eingang von € X zu bestätigen — mit Frist (z. B. 14 Tage)
   und Erinnerung.
3. Bestätigt er, wird die Rechnung erstellt.
4. Schweigt er, gilt die Zahlung per AGB als bestätigt (Zustimmungsfiktion), Rechnung mit Hinweis.
5. Widerspricht er, muss er den Widerspruch belegen (z. B. Kontoauszugsausschnitt). Damit sinkt
   der Anreiz, Zahlungen wahrheitswidrig abzustreiten. Danach Klärung mit dem Schuldner.

**Rechtliche Punkte dazu** [Gesetz/TD, nicht verifiziert]:

- Bei **Verbrauchern als Auftraggebern** ist eine Zustimmungsfiktion nach § 6 Abs 1 Z 2 KSchG
  nur wirksam, wenn die Frist angemessen ist und im Einzelfall ausdrücklich auf die Folge des
  Schweigens hingewiesen wird. [H]
- Rechnungen müssen § 11 UStG entsprechen und fortlaufend nummeriert sein. [H]
- Bei Ratenzahlungen empfiehlt sich eine monatliche Sammelrechnung statt einer Rechnung pro
  Rate. Das ist eine UX-Empfehlung, keine Rechtsfrage.

Siehe **L-16** in docs/LEGAL_OPEN_QUESTIONS.md.

### 1.4 Verzugszinsen

* § 1000 Abs 1 ABGB 4 % p.a.; § 456 UGB 9,2 Prozentpunkte über Basiszinssatz bei unternehmerischen Geldforderungen (verschuldeter Verzug). [Gesetz/TD, H] → genau deshalb Zinslogik mit versionierter Basiszinssatz-Tabelle, nicht im Code.

### 1.5 Verjährung – größte stille Haftungsfalle

* Für viele Entgeltforderungen 3 Jahre (§ 1486 ABGB). [Gesetz/TD, H]
* Außergerichtliche Mahnungen unterbrechen die Verjährung in Österreich **nicht**; Unterbrechung u. a. durch Anerkenntnis oder gehörig fortgesetzte Klage (§ 1497 ABGB). [Gesetz/TD, H]
* **Produkt-Konsequenz:** Ein Portal, das monatelang mahnt, kann den Gläubiger in die Verjährung laufen lassen. Pflicht-Feature: Verjährungswarnung (z. B. 6/3/1 Monat vorher) mit Hinweis auf gerichtliche Schritte. Konkrete Frist pro Fall nur als Hinweis, nicht als verbindliche Berechnung (Beginn/Hemmung sind Einzelfallfragen). [Inferenz, H]
* **Zusatznutzen:** Ratenanfrage oder Zahlungsankündigung des Schuldners kann ein Anerkenntnis sein [Gesetz/TD, M] → solche Erklärungen revisionssicher mit Zeitstempel und Wortlaut speichern; das ist für die spätere Klage wertvoll.

### 1.6 Insolvenzprüfung vor Kontaktaufnahme

* Während eines Insolvenzverfahrens ist Einzelrechtsverfolgung weitgehend gesperrt; Forderungen sind anzumelden (IO, u. a. §§ 10, 102 ff). [Gesetz/TD, M-H]
* **Feature:** Vor erstem Kontakt und periodisch Abgleich mit der Ediktsdatei (Insolvenzdatei); Treffer → Fall pausieren, Gläubiger auf Forderungsanmeldung hinweisen. Ob es eine offizielle maschinelle Schnittstelle gibt: unbekannt – ggf. manueller Prüfschritt.

### 1.7 Verbraucher als Auftraggeber (nicht nur als Schuldner)

* Das Briefing unterscheidet B2B/B2C nur auf Schuldnerseite. Private Gläubiger sind selbst Verbraucher gegenüber dem Portal.
* **FAGG:** Rücktrittsrecht bei Fernabsatz, Erfordernis des ausdrücklichen Verlangens bei vorzeitigem Leistungsbeginn, ggf. anteiliges Entgelt. [Gesetz/TD, H für Grundsatz, M für Detailfolgen]
* **Datenmodell:** `creditor_is_consumer` als eigenes Feld; eigener Checkout-Pfad mit Belehrung und Einwilligungsprotokoll.

### 1.8 Ratenvereinbarungen mit Verbrauchern

* Entgeltlicher Zahlungsaufschub kann in den Anwendungsbereich des VKrG fallen. [Gesetz/TD, N-M] → Ratenpläne mit Zinsen/Gebühren gegenüber Verbrauchern vor Produktivbetrieb prüfen lassen; technisch Ratenpläne zunächst nur zinsfrei oder mit freigegebener Vorlage zulassen.

### 1.9 Standesrecht – Rolle von WESTTOR

* Da die Kanzlei öffentlich genannt wird und (laut Briefing) mit dem Portal kooperiert: Provisions-/Vermittlungsverbote, Werberegeln, Verschwiegenheit und Interessenkollision nach RAO und RL-BA 2015 prüfen, insbesondere wenn die Kanzlei oder Personen der Kanzlei am Portal wirtschaftlich beteiligt sind. [Gesetz/TD, M – konkrete Paragraphen nicht verifiziert]
* **Quota-litis-Verbot** (§ 879 Abs 2 Z 2 ABGB) trifft Rechtsanwälte; wenn Erfolgshonorar-Erlöse des Portals mittelbar der Kanzlei zufließen, wird das relevant. [Gesetz/TD + Inferenz, M]
* **Technisch:** Keine Datenübermittlung an die Kanzlei vor ausdrücklicher Freigabe durch den Gläubiger; getrennte Datenräume.

### 1.10 Datenschutz

* Schuldner erhält beim ersten Kontakt die Informationen nach Art 14 DSGVO (Daten nicht bei ihm erhoben). [Gesetz/TD, H] → als Pflichtbaustein jeder ersten Zahlungsaufforderung.
* Auftragsverarbeitungsverträge und Drittlandtransfers für Clerk, Stripe, Anthropic, Object Storage, E-Mail-Dienst. [Gesetz/TD, H]
* Datenschutz-Folgenabschätzung wahrscheinlich angezeigt (systematische Verarbeitung von Schuldnerdaten + KI). [Inferenz, M]

### 1.11 EU AI Act

* Kreditwürdigkeitsprüfung natürlicher Personen ist ein Hochrisiko-Anwendungsfall (Anhang III). [Gesetz/TD, H]
* **Inferenz:** Solange die KI die Forderung und Dokumentenlage bewertet und nicht die Zahlungsfähigkeit des Schuldners, dürfte das nicht darunterfallen. [Inferenz, M] → **Design-Regel: kein Schuldner-Scoring, keine Bonitätsprognose.** Anwendungszeitpunkte einzelner Pflichten können sich durch laufende EU-Änderungsvorhaben verschoben haben – aktuell prüfen.

---

## 2. Geschäftsmodell-Perspektive

1. **Anreizproblem Erfolgshonorar:** Das Geld fließt direkt an den Gläubiger; der Gläubiger hat einen finanziellen Anreiz, Zahlungen nicht zu melden. [Inferenz, H] Gegenmaßnahmen: Schuldner kann im Portal „bezahlt am … über …" melden → automatische Abgleichsaufgabe beim Gläubiger; Pflichtbestätigung beim Abschluss; optionaler Kontoauszugsimport (camt.053); vertragliche Auskunfts- und Prüfrechte.
2. **30 € vorab als Hürde bei kleinen Forderungen:** Staffelung nach Forderungsbetrag oder Volumenpakete für Unternehmen mit vielen Fällen. [Inferenz, M]
3. **Positionierung:** Etablierte Anbieter in Österreich (z. B. KSV1870, AKV, Intrum, Creditreform) [TD, M] finanzieren sich wesentlich über Schuldnerkosten. Ein transparentes, gläubigerfinanziertes, schuldnerschonendes Modell ist ein glaubwürdiges Differenzierungsmerkmal – deckt sich mit der Designrichtung. [Inferenz, M]
4. **Wiederkehrende Kunden:** B2B-Kunden mit 20+ Fällen/Jahr brauchen CSV-/Buchhaltungsimport (in Österreich verbreitet u. a. BMD, RZL [TD, M]) – sonst bleibt es bei Einzelfällen.

---

## 3. Gläubiger-Perspektive (UX)

* **Onboarding in 5 Minuten:** Rechnung als PDF hochladen → KI extrahiert Betrag, Datum, Rechnungsnummer, Schuldner → Nutzer bestätigt nur. Größter Hebel für Conversion. [Inferenz, M-H]
* **„Nächster Schritt" statt Status:** Jede Akte zeigt oben eine Handlungsaufforderung („Einwendung prüfen bis 12.10.") statt technischer Stati.
* **Entscheidungsvorlagen:** Bei Ratenanfrage/Vergleich: Vorschlag, Restbetrag, Gesamtdauer, Vergleich zu Klagekosten-Richtwert – mit Ja/Nein/Gegenvorschlag in einem Klick.
* **Kanzlei-Übergabe als Entscheidung, nicht als Upsell:** Transparente Kostenhinweise, klare Aussage, dass die Kanzlei eigenständig über Annahme entscheidet.
* **Export:** Aktenauszug als PDF (Timeline, Beträge, Dokumente) – nützlich für Steuerberater und Kanzlei.

---

## 4. Schuldner-Perspektive (entscheidend für Einbringungsquote)

* **Mobile first:** Schuldner öffnen Zahlungsaufforderungen überwiegend am Smartphone. [Schätzung, M]
* **Zahlen in 30 Sekunden:** EPC-QR-Code (SEPA) mit IBAN, Betrag, strukturierter Referenz → Banking-App scannt. Plus „IBAN kopieren".
* **Würdevoller Ton:** Sachlich, keine Drohkulisse, klare Optionen (zahlen / Raten / bestreiten). Leichtes Bestreiten reduziert Beschwerden und erhöht die Glaubwürdigkeit gegenüber Konsumentenschutz. [Inferenz, M]
* **Mehrsprachigkeit:** Neben Deutsch zumindest Englisch; weitere Sprachen nach Nutzungsdaten. [Inferenz, M]
* **Transparente Aufstellung:** Hauptforderung, Zinsen (mit Zeitraum und Satz), Kosten (mit Rechtsgrundlage), bereits bezahlt, offen.
* **Hinweis auf Schuldnerberatung** bei Verbrauchern – signalisiert Seriosität. [Inferenz, M]

---

## 5. Technische Perspektive (über das Briefing hinaus)

1. **Statusmodell entflechten:** Ein einziges Enum mit 25 Zuständen wird brüchig, weil Zustände parallel auftreten (z. B. aktiver Ratenplan und Teil-Einwendung). Besser orthogonale Dimensionen: `lifecycle` (draft … closed), `payment_state` (none/partial/paid), `dispute_state` (none/objection/disputed/resolved), `paused` (bool + Grund), `escalation_state`. [Inferenz, H]
2. **Interne Back-Office-Rolle fehlt:** Das Rollenmodell deckt nur Unternehmensrollen ab. Manuelle Prüfung, B2C-Freigabe und Einwendungsbearbeitung durch Portal-Mitarbeiter brauchen eigenes RBAC (Sachbearbeiter, Supervisor, 4-Augen-Freigabe), getrennte Admin-App oder zumindest getrennter Routenbereich. [Inferenz, H]
3. **Event-Log als Wahrheit:** `claim_events` append-only, Projektionen (Salden, Dashboard) daraus ableiten → Rekonstruktion jedes Aktenstands zu jedem Zeitpunkt.
4. **Versionierte Vorlagen und Rechtstexte:** Jede gesendete Nachricht speichert Vorlagen-ID + Version + gerenderten Inhalt (Beweissicherung).
5. **Österreichischer Fristenkalender:** Feiertage, Wochenenden, Zustellfiktion – als eigene Library mit Tests.
6. **Zahlungsabgleich ohne eigene Lizenz:** camt.053-/CSV-Import vom Gläubiger statt eigenem Kontozugriff (PSD2-Kontoinformationsdienst wäre konzessionspflichtig bzw. nur über lizenzierte Anbieter). [Gesetz/TD, M]
7. **Mahnklage-Vorbereitung:** Strukturierter Export der Daten, die die Kanzlei für eine Mahnklage im Elektronischen Rechtsverkehr braucht – spart der Kanzlei Erfassungsaufwand. Konkretes Datenformat mit der Kanzlei abstimmen. [Inferenz, M]
8. **Sicherheit:** Upload-Malware-Scan, signierte kurzlebige Download-URLs, CSP, Pen-Test vor Launch, Secrets-Rotation.
9. **KI-Qualität messbar machen:** Evaluationsset mit 30–50 anonymisierten Fällen; jede Prompt-Änderung gegen das Set laufen lassen. [Schätzung für Größe, N-M]

---

## 6. Compliance- und Betriebsperspektive

* **Beschwerdemanagement:** Eigener Kanal für Schuldnerbeschwerden mit Fristen und Protokoll.
* **Aufbewahrung:** Eigene Buchhaltungsunterlagen des Portals 7 Jahre (§ 132 BAO) [Gesetz/TD, H]; Fallakten nach Löschkonzept mit Sperrvermerk statt physischer Löschung, solange Ansprüche offen sind.
* **Missbrauchsschutz:** Plausibilitätsprüfung gegen Scheinforderungen (z. B. Belästigung von Ex-Partnern über „private Darlehen"); Identitätsprüfung des Gläubigers bei B2C-Schuldnern. [Inferenz, M-H]
* **Incident-Response-Plan** für Datenpannen (72-Stunden-Meldepflicht Art 33 DSGVO). [Gesetz/TD, H]

---

## 6a. Marktbefund: ein Teil des Wettbewerbs ist für den Gläubiger kostenlos

*Ergänzung 20.09.2026. Recherche der Auftraggeberin, nicht eigenständig verifiziert.*

Mehrere österreichische Anbieter treten gegenüber dem Gläubiger kosten- und risikofrei auf
und finanzieren sich über die schuldnerseitigen Kosten nach § 3 der Höchstsatzverordnung.
Ein Anbieter nimmt dabei ausdrücklich auch Privatpersonen als Auftraggeber an; ein
etablierter Anbieter verrechnet dagegen eine Auftragsgebühr und nimmt nur Unternehmen.

**Folge [Inferenz, M-H]:** „30 € vorab plus 15 %" ist für den Gläubiger teurer als ein Teil
des Marktes. Es braucht entweder ein tragfähiges Gegenargument — ein transparenter,
schuldnerschonender Ansatz ist eines, deckt sich mit der Designrichtung und ist gegenüber
Konsumentenschutz und Aufsicht gut vertretbar — oder eine Änderung des Modells.

Die drei technischen Optionen und was sie jeweils erfordern, stehen in
docs/LEGAL_OPEN_QUESTIONS.md unter **L-18**. Das ist eine Geschäftsentscheidung, keine
Rechtsfrage; der Code nimmt sie nicht vorweg.

## 6b. Geldwäscherecht: vermutlich nicht betroffen

Nach der Darstellung des Wirtschaftsministeriums sind nur bestimmte Gewerbe erfasst, etwa
Büroservice, Handel, Immobilienmakler und Unternehmensberater. Inkassoinstitute waren in
der eingesehenen Liste nicht erkennbar; die Liste war allerdings abgeschnitten.
[Recherche der Auftraggeberin, moderate Konfidenz]

**Bis zur Klärung keine technische Konsequenz.** Sollte sich das ändern, wären
Identifizierungs- und Aufzeichnungspflichten gegenüber dem Auftraggeber betroffen — das
Profil erhebt heute bereits Name, Anschrift, IBAN und bei Unternehmen die Firmenbuch- und
UID-Nummer, was eine brauchbare Grundlage wäre.

## 6c. Noch nicht geklärt

- Aktueller Volltext der Inkassoinstitute-Verordnung in der Fassung 2008 — das RIS
  blockiert den automatischen Zugriff.
- § 4 der Höchstsatzverordnung im geltenden Wortlaut: nur indirekt belegt (siehe L-13).
- Pflicht zur Vermögensschaden-Haftpflichtversicherung und die Standesregeln für
  Inkassoinstitute im Volltext: nicht recherchiert.

---

## 7. Top 10 – Reihenfolge nach Hebelwirkung

1. Gewerbefrage § 118 GewO klären (Existenzfrage)
2. Preismodell entscheiden (L-18) — bestimmt Preisregel, Schuldnertexte und Positionierung
3. Verjährungswarnung + Anerkenntnis-Dokumentation
4. Insolvenzcheck vor Kontakt
5. Statusmodell entflechten + Back-Office-RBAC
6. Stripe-Webhook + idempotente Aktivierung
7. Schuldnerportal: sicherer Zugang, QR-Zahlung, einfaches Bestreiten
8. Zahlungsmeldung durch Schuldner als Kontrolle gegen nicht gemeldete Direktzahlungen
9. Rechnungs-PDF-Extraktion beim Onboarding
10. Standesrechtliche Klärung der Kanzleirolle, bevor der Name live geht
