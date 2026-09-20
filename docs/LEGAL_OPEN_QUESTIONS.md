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
| L-13 | Höchstsätze netto oder brutto | **geklärt** (netto) | — |
| L-14 | Gesamtdeckel: Verschiebung zwischen Posten | offen | Gebührenberechnung |
| L-15 | Feststellung eines 40 %-Sonderfalls | offen | Erfolgshonorar |
| L-16 | Zustimmungsfiktion bei Zahlungsbestätigung | offen | Rechnungsauslösung |
| L-17 | Indexanpassung der Eurobeträge | offen | jeder Eurobetrag aus der Verordnung |
| L-18 | Preismodell: wer trägt die Kosten | **entschieden** (Hybrid) | — |
| L-19 | Gebührentabellen GGG und RATG | offen | Prozesskostenrechner |

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

> **Ergänzung 20.09.2026.** § 3 der Verordnung regelt eine eigene Schuldnergebühr.
> Beispiele laut Text, **vor Indexanpassung** (siehe L-17): allgemeine Bearbeitungskosten
> bei Forderungen über 727 € bis zu 8 %; erste Mahnung über 727 € bis zu 50,87 €; zweite
> und weitere Mahnungen bis zu 58,14 €, dieselben Sätze für Ratenzahlungs- und
> Vergleichsvereinbarungen; Evidenzhaltung über 364 € bis zu 20,35 € je angefangenem
> Vierteljahr. [RIS-verifiziert für den Verordnungstext]
>
> Genau darüber finanzieren sich mehrere Mitbewerber, die für den Gläubiger kostenlos
> auftreten (siehe L-18). Ob diese Kosten im Einzelfall ersatzfähig sind, richtet sich
> zusätzlich nach § 1333 Abs 2 ABGB, also nach der Angemessenheit. [Gesetz/TD, hoch]

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

> **Ergänzung 20.09.2026, aus der RL-BA der RAK Wien.** Einschränkung: das gelesene
> Dokument trägt den Stand 10.05.2011; heute gilt nach Trainingsdatenlage die RL-BA 2015,
> der Inhalt kann sich geändert haben.
>
> - **Für Rechtsanwaltsanwärter:** Eine nebenberufliche Tätigkeit bedarf der Zustimmung des
>   Rechtsanwalts. Die Kammer kann zusätzlich ihre eigene Zustimmung verlangen, darf sie
>   aber nur versagen, wenn die Ausbildung beeinträchtigt wird.
> - **Für die Kanzlei:** Unzulässig ist das Anbieten oder Gewähren von Vorteilen für
>   Mandatszuführungen. Eine Provision darf ein Rechtsanwalt **ausnahmslos** nicht
>   vereinbaren.
>
> **Folge [Inferenz, moderat]:** Zwischen der Betreibergesellschaft und der
> Kooperationskanzlei darf für übergebene Fälle **weder Geld noch ein sonstiger Vorteil
> fließen, in keine Richtung**. Die Kanzlei wird ausschließlich aufgrund eines direkten
> Mandats des Gläubigers tätig.

**Technische Vorgabe unabhängig davon.** Keine Datenübermittlung an die Kanzlei vor
ausdrücklicher Freigabe durch den Gläubiger; getrennte Datenräume; keine UI-Formulierung, die
ein bestehendes Mandat suggeriert.

**Zusätzliche technische Vorgabe aus der Ergänzung.** Das Datenmodell bildet **keine**
Zahlungs-, Provisions- oder Vergütungsbeziehung zwischen Portalbetreiber und Kanzlei ab —
auch nicht als optionales Feld, auch nicht als Null-Betrag. Eine Übergabe erzeugt einen
Mandatsvorgang beim Gläubiger, keine Abrechnungsposition zwischen den beiden Gesellschaften.
Die Eskalation im Zustandsmodell ist bereits so gebaut: sie erzeugt eine dokumentierte
Freigabe und einen Export, aber keinen Zahlungsvorgang.

**Offen.** Ob die RL-BA 2015 diese Punkte unverändert enthält. Ob eine nebenberufliche
Beteiligung der Kammer anzuzeigen oder von ihr zu genehmigen ist.

**Blockiert.** Nennung des Kanzleinamens im Produktivbetrieb; jede Gestaltung, bei der
Erfolgshonorar-Erlöse mittelbar der Kanzlei zufließen.

---

## L-12 — Aufbewahrung und Löschung

**Offen.** Aufbewahrungsfristen je Datenart, Umgang mit Dokumenten des Schuldners, Zeitpunkt
der Anonymisierung, Behandlung offener Ansprüche.

**Bekannt.** Eigene Buchhaltungsunterlagen des Portals sieben Jahre (§ 132 BAO).
[Gesetz/TD, hoch]

**Technische Vorgabe.** Soft-Delete mit Sperrvermerk statt physischer Löschung, solange
Ansprüche offen sind. Audit-Daten werden nie gelöscht.

---

## L-13 — Höchstsätze netto oder brutto? · **geklärt: netto**

**Ergebnis.** Nach § 4 Abs 1 der Verordnung ist die Umsatzsteuer in den Höchstbeträgen **nicht enthalten**. Die Deckel gelten für den Nettobetrag; die Umsatzsteuer kommt zulässig hinzu.

**Konfidenz: hoch bis moderat.** Belegt über eine Sekundärquelle, die die Verordnung zitiert, und über den Urtext von 1996. Die heute geltende Fassung des § 4 wurde nicht unmittelbar im RIS abgerufen. Vor Produktivschaltung bitte im Volltext bestätigen.

**Rechenbeispiel.** 15 % auf 6.000 € sind 900 € netto, zuzüglich 20 % Umsatzsteuer 180 €, in Summe 1.080 €.

**Korrektur einer früheren Aussage.** Eine frühere Fassung dieser Datei und von `CLAUDE.md` bezeichnete „Deckel auf netto" als die *strengere* Auslegung. Das ist verkehrt herum: netto bis 6 % zuzüglich Umsatzsteuer ergeben 7,2 % der Forderung in Summe, während ein Deckel auf den Bruttobetrag nur 5 % netto zugelassen hätte. Das Verhalten im Code war bereits richtig, die Begründung war falsch.

**Im Code.** `computeOrderFee()` liefert Netto, Steuer und Brutto getrennt. Der Deckel wird auf den Nettobetrag angewandt, der Steuersatz kommt aus der Konfiguration und wird nie angenommen.

---

## L-14 — Gesamtdeckel: Verschiebung zwischen den Posten?

**Kontext.** Ob sich die „Summe der Höchstsätze" so auslegen lässt, dass zwischen
Auftragsgebühr und Erfolgshonorar verschoben werden darf, ist hier nicht geklärt.

**Derzeit im Code.** Jeder Posten wird **einzeln** eingehalten — hier ist das
tatsächlich die engere Auslegung. Eine Verschiebung ist nicht implementiert.

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


---

## L-17 — Indexanpassung der Eurobeträge

**Kontext.** Die Eurobeträge der Höchstsatzverordnung sind an den Verbraucherpreisindex
gebunden. Die heute geltenden Beträge liegen daher vermutlich über den im Verordnungstext
genannten Werten. [Inferenz, moderat] Die **Prozentsätze sind davon nicht betroffen.**

**Offen.**
1. Welche Indexbasis und welcher Anpassungsmechanismus gelten genau?
2. Wer prüft die Anpassung, und in welchem Rhythmus?
3. Gibt es eine amtliche Verlautbarung der jeweils geltenden Beträge?

**Betroffen.** Jeder schuldnerseitige Kostenposten aus § 3 (siehe L-02), sobald er
umgesetzt wird.

**Technische Vorgabe, unabhängig von der Klärung.** In `caps.ts` steht **kein einziger
Eurobetrag** — ausschließlich Sätze. Jeder Eurobetrag aus der Verordnung gehört in die
versionierte Konfiguration mit Gültigkeitszeitraum, damit eine Indexanpassung eine neue
Version erzeugt und historische Berechnungen unverändert bleiben. Ein Test erzwingt, dass
jede numerische Konstante in `caps.ts` ein Satz ist.

---

## L-18 — Preismodell: wer trägt die Kosten

**Kontext.** Mehrere österreichische Mitbewerber treten gegenüber dem Gläubiger
**kosten- und risikofrei** auf und finanzieren sich über die schuldnerseitigen Kosten des
§ 3:

- Ein Anbieter wirbt ausdrücklich mit Kosten- und Risikofreiheit für den Gläubiger; bei
  Uneinbringlichkeit fallen keine Kosten an. Nimmt auch Privatpersonen als Auftraggeber.
- Ein weiterer stundet die Inkassokosten dem Auftraggeber, fordert sie beim Schuldner ein
  und verzichtet bei Uneinbringlichkeit darauf; Erfolgsprovision nur bei eingeklagten,
  verjährten oder Auslandsforderungen.
- Ein etablierter Anbieter verrechnet bei Übergabe eine Auftragsgebühr und nimmt nur
  Unternehmen als Auftraggeber.

[Recherche der Auftraggeberin, nicht eigenständig verifiziert]

**Folge.** Ein Modell „30 € vorab plus 15 % Erfolgshonorar" ist für den Gläubiger teurer
als ein Teil des Marktes. [Inferenz, moderat bis hoch]

**Das ist keine Rechtsfrage, sondern eine Geschäftsentscheidung.** Sie wird hier geführt,
weil sie die Preisregel, die Schuldnertexte, die Betragsaufstellung und die Positionierung
bestimmt — und weil sie mit dem schuldnerschonenden Ansatz des Briefings in Spannung steht.

**Technische Optionen.**

1. **Gläubiger zahlt (heutiges Modell).** Auftragsgebühr gedeckelt mit 6 %, Erfolgshonorar
   bis 15 %, schuldnerseitige Kosten bleiben aus. `cost_recovery` bleibt auf `false`.
   Bereits umgesetzt und getestet.
2. **Schuldner trägt die Kosten.** Auftragsgebühr entfällt oder wird gestundet;
   schuldnerseitige Kosten nach § 3 werden geltend gemacht. Erfordert: eigene
   Betragskomponente mit Rechtsgrundlage-Verweis, Indexpflege (L-17), Angemessenheits-
   prüfung nach § 1333 Abs 2 ABGB je Fall, und deutlich andere Schuldnertexte.
   Widerspricht dem schuldnerschonenden Ansatz.
3. **Mischform.** Auftragsgebühr wird dem Gläubiger gestundet und nur bei Erfolg fällig;
   keine schuldnerseitigen Kosten. Erfordert eine Ausfallkalkulation und ein
   Stundungsmodell im Auftragsdatensatz.

**Was bis zur Entscheidung blockiert ist.** B3 (Preisregel) kann gebaut, aber nicht
produktiv geschaltet werden. Die Schuldnertexte aus G3 hängen unmittelbar daran.


---

## L-19 — Gebührentabellen für die Prozesskostenschätzung

**Kontext.** Der Prozesskostenrechner soll dem Gläubiger vor der Entscheidung über eine
gerichtliche Durchsetzung eine Größenordnung zeigen. Dafür braucht er zwei Tabellen aus
**getrennten Regimen**:

1. **Gerichtsgebühren nach dem GGG**, gestaffelt nach Streitwert. Keine Umsatzsteuer.
2. **Rechtsanwaltskosten nach dem RATG**, als Anhaltswert. Zuzüglich Umsatzsteuer.

**Offen.**
1. Die Tabellenwerte selbst, jeweils mit Fundstelle und Stand.
2. Wie das Kostenrisiko der Gegenseite angesetzt wird — heute als Anteil der eigenen
   Kosten, was nur eine grobe Näherung ist.
3. Ob Einheitssatz, Streitgenossenzuschlag und ERV-Zuschlag in die Schätzung einfließen
   sollen oder ob das die Schätzung überfrachtet.
4. Ob der Rechner nach Verfahrensart unterscheiden soll (Mahnklage gegenüber streitigem
   Verfahren).

**Betroffen.** `litigation_cost_estimate`, `estimateLitigationCosts()`.

**Derzeit im Code.** Die Tabellen sind **leer**. Die Funktion liefert deshalb bewusst
kein Ergebnis, sondern gibt zurück, dass die Grundlagen fehlen — eine Zahl ohne Grundlage
wäre schlechter als keine Zahl. Jede Ausgabe, auch die Absage, trägt den Pflichthinweis,
dass es sich um eine unverbindliche Schätzung handelt und die verbindliche
Honorarvereinbarung ausschließlich zwischen Gläubiger und Kanzlei zustande kommt.

**Blockiert.** Die Anzeige des Rechners gegenüber Gläubigern.

---

## L-18 — Preismodell · **entschieden: Hybridmodell**

**Entscheidung vom 20.09.2026.** Keine Grundgebühr. Erfolgshonorar vom Gläubiger,
gestaffelt nach Forderungshöhe von 10 % bis 5 %, angewandt auf den tatsächlich
eingebrachten Betrag. Zusätzlich werden gegenüber dem Schuldner die tatsächlich
zulässigen und ersatzfähigen Kosten nach § 3 geltend gemacht.

**Im Code umgesetzt.** Beide Erlösarten sind technisch vollständig getrennt; das
Honorarmodul kennt die Schuldnerkosten nicht und umgekehrt. Die Staffel liegt
durchgehend unter dem Höchstsatz von 15 %.

**Was dabei offen bleibt.**

1. **L-01 wird durch diese Entscheidung wichtiger, nicht unwichtiger.** Schuldnerseitige
   Kosten nach § 3 geltend zu machen setzt voraus, als Inkassoinstitut aufzutreten. Die
   Gewerbefrage ist damit nicht mehr nur eine Formfrage, sondern Voraussetzung eines
   Erlösbestandteils.
2. **L-17** — ohne geprüften Indexstand sind die Beträge nach § 3 nicht belastbar.
3. Die konkreten Anteile, mit denen das Portal unter den Höchstsätzen bleibt, sind eine
   Geschäftsentscheidung und stehen als Demo-Werte in der Konfiguration.
