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

### 1.3 Gebührenlogik – Kap. 6.3 vermischt zwei Ebenen

* **Fakt:** Es gibt eine Verordnung über Höchstsätze der Inkassoinstituten gebührenden Vergütungen (BGBl 141/1996 idF BGBl II 103/2005); der Nationalrat hat 2020 eine Evaluierung verlangt. [Primärquelle Parlament gesehen, H] Ob sie seither geändert wurde: unbekannt – im RIS prüfen.
* **Inferenz:** Die Höchstsätze betreffen primär, was dem Schuldner als Betreibungskosten angelastet werden darf (Maßstab § 1333 Abs 2 ABGB), nicht die Gebühr, die der Gläubiger vertraglich an das Portal zahlt. [Gesetz/TD + Inferenz, M]
* **Kernfrage für das Produkt:** Sollen die 30 € (und das Erfolgshonorar) vom Schuldner als Betreibungskosten zurückgefordert werden? Wenn ja → Höchstsätze, Angemessenheit, B2C-Transparenz werden zentral. Wenn nein → Problem aus 6.3 ist deutlich kleiner. **Diese Entscheidung fehlt im Briefing.**
* **B2B-Hebel:** § 458 UGB – 40 € Pauschalentschädigung für Betreibungskosten im unternehmerischen Verkehr. [Gesetz/TD, H] Kann dem Gläubiger helfen, die Portalgebühr wirtschaftlich zu kompensieren (Anrechnung auf weitere Betreibungskosten beachten – [Gesetz/TD, M]).

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

## 7. Top 10 – Reihenfolge nach Hebelwirkung

1. Gewerbefrage § 118 GewO klären (Existenzfrage)
2. Entscheidung: Werden Portalkosten vom Schuldner zurückgefordert? (bestimmt Gebührenrecht, Texte, UI)
3. Verjährungswarnung + Anerkenntnis-Dokumentation
4. Insolvenzcheck vor Kontakt
5. Statusmodell entflechten + Back-Office-RBAC
6. Stripe-Webhook + idempotente Aktivierung
7. Schuldnerportal: sicherer Zugang, QR-Zahlung, einfaches Bestreiten
8. Zahlungsmeldung durch Schuldner als Kontrolle gegen nicht gemeldete Direktzahlungen
9. Rechnungs-PDF-Extraktion beim Onboarding
10. Standesrechtliche Klärung der Kanzleirolle, bevor der Name live geht
