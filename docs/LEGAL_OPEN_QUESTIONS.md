# Offene Rechtsfragen

Jeder Eintrag ist eine Stelle, an der eine fachliche oder rechtliche Vorgabe fehlt und der
Code deshalb bewusst keine Entscheidung trifft. Die IDs werden im Quelltext als
`// LEGAL-REVIEW: L-xx` und in der Konfiguration im Feld `legalReview` referenziert.

**Status:** `offen` = blockiert Produktivbetrieb · `geklärt` = Vorgabe liegt vor, Umsetzung folgt ·
`umgesetzt` = im Code abgebildet und freigegeben

| ID | Thema | Status | Blockiert |
|---|---|---|---|
| L-01 | Gewerbeberechtigung Inkassoinstitut | offen | Launch insgesamt |
| L-02 | Anlastung der Portalkosten beim Schuldner | offen | Betragsaufstellung, Texte |
| L-03 | Höhe und Staffel der Auftragsgebühr | offen | Checkout |
| L-04 | Erfolgshonorar: Satz, Bemessungsgrundlage, USt | offen | Abrechnung |
| L-05 | Verzugszinsen und Basiszinssatz-Quelle | offen | Zinsberechnung |
| L-06 | Zinstage-Konvention | offen | Zinsberechnung |
| L-07 | Anrechnungsreihenfolge einer Zahlung | offen | Zahlungsverbuchung |
| L-08 | Ratenbedingungen und VKrG | offen | Ratenworkflow |
| L-09 | Fristen und Mahnstufen | offen | Jobsteuerung |
| L-10 | Verjährungswarnung | offen | Hinweisfunktion |
| L-11 | Rolle der Kanzlei, Standesrecht | offen | Kanzleiübergabe, Aussenauftritt |
| L-12 | Aufbewahrung und Löschung | offen | Löschkonzept |
| L-13 | Höchstsätze netto oder brutto | offen | Gebührenberechnung |
| L-14 | Gesamtdeckel: Verschiebung zwischen Posten | offen | Gebührenberechnung |
| L-15 | Feststellung eines 40 %-Sonderfalls | offen | Erfolgshonorar |
| L-16 | Zustimmungsfiktion bei Zahlungsbestätigung | offen | Rechnungsauslösung |

---

## L-01 — Gewerbeberechtigung für Inkassoinstitute

**Kontext.** Für die Einziehung fremder Forderungen ist eine Gewerbeberechtigung für
Inkassoinstitute erforderlich (§ 118 Abs 1 GewO). Inkassoinstitute dürfen weder gerichtlich
eintreiben noch sich Forderungen abtreten lassen (Abs 2). [RIS-verifiziert]

Die außergerichtliche Bearbeitung mit Zahlungsaufforderungen, Fristsetzung und
Ratenverhandlung im Namen des Gläubigers dürfte „Einziehung fremder Forderungen" sein, auch
wenn das Geld direkt an den Gläubiger fließt. Das „kein Kundengeld"-Design löst die
Gewerbefrage nach hiesiger Einschätzung **nicht**. [Inferenz]

**Betroffen.** Das gesamte Produkt.

**Technische Optionen.**
1. Betreiber hat eigene Gewerbeberechtigung → kein Änderungsbedarf am Ablauf.
2. Kooperation mit einem berechtigten Inkassoinstitut → das Portal wird Software, das
   Institut tritt nach außen auf; Datenmodell braucht einen Mandanten „Inkassoinstitut" und
   eine Trennung zwischen Portalbetreiber und Auftreten nach außen.
3. Reines Software-Werkzeug, der Gläubiger mahnt selbst → alle Anschreiben werden im Namen
   des Gläubigers erzeugt und von ihm versendet; das Portal darf nicht „im Auftrag"
   kommunizieren. Betrifft Texte, Absenderlogik, AGB.

**Blockiert bis zur Klärung.** Jede produktive Schuldnerkommunikation.

---

## L-02 — Werden Portalkosten dem Schuldner angelastet?

**Kontext.** Ob Auftragsgebühr und Erfolgshonorar vom Schuldner als Betreibungskosten
zurückgefordert werden, bestimmt Betragsaufstellung, Schuldnertexte und Rechtsgrundlagen-
verweise. Maßstab wäre § 1333 Abs 2 ABGB (Angemessenheit und Zweckmäßigkeit).

**Betroffen.** `claim_amount_components`, Schuldnerportal-Aufstellung, Anschreiben.

**Technische Optionen.**
1. Nein → `cost_recovery.chargePlatformFeeToDebtor = false`. Die Aufstellung gegenüber dem
   Schuldner enthält nur Hauptforderung, Zinsen und allfällige gesetzliche Pauschalen.
2. Ja → eigene Komponente `platform_costs` mit Rechtsgrundlage-Referenz; zusätzlich ist zu
   prüfen, wie sich das zur Höchstsatzverordnung verhält.

**Derzeit im Code.** Beide Schalter stehen auf `false` (Demo). Das ist die konservative
Variante, keine Entscheidung.

---

## L-03 — Höhe und Staffel der Auftragsgebühr

**Kontext.** Der gesetzliche Deckel steht fest: höchstens 6 % der Forderung (§ 2 der
Verordnung BGBl 141/1996 idF BGBl II 103/2005). Daraus folgt, dass 30 € erst ab einer
Forderung von 500 € gedeckt sind. Offen ist, welche Beträge innerhalb dieses Rahmens
tatsächlich verrechnet werden.

**Betroffen.** `platform_fee`, `computeOrderFee()`, Checkout, Stripe Price IDs.

**Technische Optionen.** Feste Staffel, lineare Prozentgebühr oder Mischform — in jedem Fall
gedeckelt. Die Deckelung ist bereits implementiert und nicht abschaltbar.

**Blockiert.** Anlage der Stripe-Preise, Produktivbetrieb des Checkouts.

---

## L-04 — Erfolgshonorar: Satz, Bemessungsgrundlage, Umsatzsteuer

**Kontext.** Der Deckel von 15 % des eingebrachten Betrages bei nicht eingeklagten
Forderungen ist RIS-verifiziert und im Code als harte Obergrenze validiert. Offen sind:

1. Der tatsächliche Satz innerhalb des Deckels.
2. Ob sich der Satz nur auf die getilgte Hauptforderung oder auf die gesamte Zahlung bezieht
   (`basis: 'principal_only' | 'all_components'`).
3. Der Umsatzsteuersatz und der Rundungsmodus für die Steuer.
4. Ob es einen Mindestbetrag je Abrechnung gibt.

**Betroffen.** `success_fee`, `success_fee_agreements` (Vertrags-Snapshot bei Checkout),
`success_fee_calculations`.

**Hinweis.** Direktzahlungen an den Gläubiger sind von der Bemessungsgrundlage erfasst, weil
diese auf die Minderung der Schuld durch Leistungen des Schuldners abstellt. [Inferenz]

---

## L-05 — Verzugszinsen und Basiszinssatz

**Kontext.** Für Verbrauchergeschäfte und für unternehmerische Geldforderungen gelten
unterschiedliche Regime (§ 1000 ABGB bzw. § 456 UGB). Die konkreten Sätze sind bewusst
**nicht** aus dem Gedächtnis eingetragen (CLAUDE.md 6).

**Offen.**
1. Anzusetzende Sätze je Fallgruppe.
2. Verbindliche Quelle und Aktualisierungsprozess für die Basiszinssatz-Historie.
3. Ab welchem Tag Verzug angenommen wird und wer das feststellt.

**Betroffen.** `default_interest`, `base_rate_table`, Zinsberechnung, Betragsaufstellung.

**Derzeit im Code.** Beide Sätze stehen auf `0`, die Basiszinssatz-Tabelle ist leer. Damit
wird sichtbar nichts berechnet, statt einen falschen Wert zu erzeugen.

---

## L-06 — Zinstage-Konvention

**Kontext.** ACT/365, ACT/360 und 30E/360 liefern unterschiedliche Ergebnisse. Die Wahl ist
fachlich festzulegen und wirkt sich auf jeden ausgewiesenen Zinsbetrag aus.

**Betroffen.** `default_interest.dayCountConvention`, Zinsfunktion, Tests.

---

## L-07 — Anrechnungsreihenfolge einer Zahlung

**Kontext.** In welcher Reihenfolge eine Teilzahlung auf Kosten, Zinsen und Hauptforderung
angerechnet wird, bestimmt die Restschuld und damit auch das Erfolgshonorar. Maßstab wäre
§ 1416 ABGB sowie eine allfällige abweichende Vereinbarung.

**Offen.**
1. Die Reihenfolge selbst.
2. Ob der Schuldner bei der Zahlung eine abweichende Widmung bestimmen darf.
3. Ob gegenüber Verbrauchern eine andere Reihenfolge gilt als gegenüber Unternehmen.

**Betroffen.** `allocation_order`, `payment_allocations`, `allocateWaterfall()`.

**Derzeit im Code.** Die Wasserfall-Funktion ist implementiert und getestet, legt die
Reihenfolge aber ausdrücklich **nicht** selbst fest — sie kommt als Parameter aus der
Konfiguration.

---

## L-08 — Ratenbedingungen und VKrG

**Kontext.** Ein entgeltlicher Zahlungsaufschub kann in den Anwendungsbereich des VKrG
fallen. [Gesetz/TD, geringe bis moderate Konfidenz]

**Offen.** Mindestrate, Höchstlaufzeit, Zulässigkeit von Zinsen oder Gebühren gegenüber
Verbrauchern, Anzahl versäumter Raten bis zum Scheitern des Plans, Form der Vereinbarung.

**Betroffen.** `installment_rules`, Ratenworkflow, Schuldnerportal.

**Vorschlag bis zur Klärung.** Ratenpläne gegenüber Verbrauchern nur zinsfrei zulassen
(`interestAllowedForConsumers = false`, so bereits gesetzt). Mehrkosten einer Ratenzahlung
müssen vor Zustimmung transparent ausgewiesen werden.

---

## L-09 — Fristen und Mahnstufen

**Offen.** Zahlungsfrist der ersten Aufforderung, Abstände der Erinnerungen, Frist für die
Beantwortung einer Einwendung, Umgang mit Feiertagen und Wochenenden, Zustellfiktion.

**Betroffen.** `deadlines`, geplante Jobs, Fristenkalender.

---

## L-10 — Verjährungswarnung

**Kontext.** Für viele Entgeltforderungen gilt eine dreijährige Frist (§ 1486 ABGB).
Außergerichtliche Mahnungen unterbrechen die Verjährung in Österreich **nicht**; eine
Unterbrechung tritt unter anderem durch Anerkenntnis oder gehörig fortgesetzte Klage ein
(§ 1497 ABGB). [Gesetz/TD, hohe Konfidenz]

Ein Portal, das monatelang mahnt, kann den Gläubiger daher in die Verjährung laufen lassen.

**Offen.** Ob das Portal überhaupt einen Fristenhinweis geben soll, mit welchen Vorlaufzeiten,
und mit welchem Haftungsvorbehalt.

**Technische Vorgabe unabhängig davon.** Die Berechnung bleibt ein unverbindlicher Hinweis;
Beginn und Hemmung sind Einzelfragen und werden nicht automatisch ermittelt. Zahlungs-
ankündigungen und Ratenanfragen des Schuldners können ein Anerkenntnis darstellen
[Gesetz/TD, moderat] und werden deshalb revisionssicher mit Zeitstempel und Wortlaut
gespeichert.

---

## L-11 — Rolle der Kanzlei und Standesrecht

**Kontext.** Wird eine Kanzlei öffentlich genannt und kooperiert sie mit dem Portal, sind
Provisions- und Vermittlungsverbote, Werberegeln, Verschwiegenheit und Interessenkollision
nach RAO und RL-BA 2015 zu prüfen — insbesondere bei wirtschaftlicher Beteiligung. Ebenso das
Quota-litis-Verbot (§ 879 Abs 2 Z 2 ABGB), wenn Erfolgshonorar-Erlöse mittelbar der Kanzlei
zufließen. [Gesetz/TD, moderat; Paragraphen nicht verifiziert]

**Technische Vorgabe unabhängig davon.** Keine Datenübermittlung an die Kanzlei vor
ausdrücklicher Freigabe durch den Gläubiger; getrennte Datenräume; keine UI-Formulierung, die
ein bestehendes Mandat suggeriert.

**Blockiert.** Nennung des Kanzleinamens im Produktivbetrieb.

---

## L-12 — Aufbewahrung und Löschung

**Offen.** Aufbewahrungsfristen je Datenart, Umgang mit Dokumenten des Schuldners, Zeitpunkt
der Anonymisierung, Behandlung offener Ansprüche.

**Bekannt.** Eigene Buchhaltungsunterlagen des Portals sieben Jahre (§ 132 BAO).
[Gesetz/TD, hoch]

**Technische Vorgabe.** Soft-Delete mit Sperrvermerk statt physischer Löschung, solange
Ansprüche offen sind. Audit-Daten werden nie gelöscht.

---

## L-13 — Höchstsätze netto oder brutto?

**Kontext.** § 2 der Höchstsatzverordnung nennt Prozentsätze, ohne dass hier geklärt ist, ob
sie sich auf Netto- oder Bruttobeträge beziehen.

**Auswirkung.** Bei 20 % Umsatzsteuer entscheidet die Auslegung über rund ein Sechstel des
zulässigen Betrags.

**Betroffen.** `computeOrderFee()`, Erfolgshonorar-Berechnung, `vatBasisPoints`.

**Derzeit im Code.** Der Deckel wird auf den Nettobetrag angewandt — die strengere Variante.

---

## L-14 — Gesamtdeckel: Verschiebung zwischen den Posten?

**Kontext.** Ob sich die „Summe der Höchstsätze" so auslegen lässt, dass zwischen
Auftragsgebühr und Erfolgshonorar verschoben werden darf, ist hier nicht geklärt.

**Derzeit im Code.** Jeder Posten wird **einzeln** eingehalten — die strengere Auslegung.
Eine Verschiebung ist nicht implementiert.

---

## L-15 — Feststellung eines 40 %-Sonderfalls

**Kontext.** Die erhöhte Stufe gilt nur nach wiederholten vergeblichen Inkassoversuchen, bei
verjährten Forderungen und bei Konkursforderungen.

**Offen.** Wer stellt das nach welchen Kriterien fest, und wie wird es dokumentiert?

**Technische Vorgabe.** Der Sonderfall wird nie automatisch angenommen. `specialCase`
ist ein ausdrücklich zu setzendes Feld mit Begründung und Audit-Eintrag.

---

## L-16 — Zustimmungsfiktion bei der Zahlungsbestätigung

**Kontext.** Vorgesehener Ablauf: Meldet der Schuldner eine Zahlung und schweigt der
Gläubiger trotz Frist und Erinnerung, gilt die Zahlung laut AGB als bestätigt und wird
abgerechnet.

**Offen.**
1. Ist die Frist angemessen, und wie lang?
2. Gegenüber Verbrauchern als Auftraggebern ist eine Zustimmungsfiktion nach
   § 6 Abs 1 Z 2 KSchG nur wirksam, wenn im Einzelfall ausdrücklich auf die Folge des
   Schweigens hingewiesen wird. [Gesetz/TD, hoch] Wie ist dieser Hinweis zu formulieren, und
   genügt eine Einblendung im Portal, oder ist eine eigene Nachricht nötig?
3. Welchen Beleg muss ein widersprechender Gläubiger vorlegen?

**Betroffen.** Zahlungsbestätigungs-Workflow, AGB-Version im Einwilligungsprotokoll,
Rechnungsauslösung.

**Blockiert.** Die automatische Rechnungsauslösung bei Schweigen. Die Bestätigung durch
aktives Handeln des Gläubigers ist davon nicht betroffen.
