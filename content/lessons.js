'use strict';
// Master-Lektionen.
//
// STATUS: Alle Lektionen sind PLATZHALTER im Status "entwurf". Sie sind
// eigenständig verfasst und stützen sich auf keine fremden Skripten, Folien
// oder Übungsbücher (Kapitel 13: Urheberrecht). Sie ersetzen NICHT die
// fachliche Produktion durch den Kursgeber, sondern zeigen die Datenstruktur
// und lassen die Engine laufen. Vor jedem Verkauf: durch geprüftes Material
// ersetzen und Status auf "geprüft" setzen.

const L = (id, topic_id, title, minutes, ord, body, audio_script) =>
  ({ id, topic_id, title, minutes, ord, body, audio_script, status: 'entwurf' });

module.exports = [
  L('l-m-rechtsquellen', 'm-rechtsquellen', 'Woher das Recht kommt', 9, 10, `
## Worum es geht
Eine Rechtsordnung ist kein Haufen gleichrangiger Sätze, sondern ein geordneter Aufbau. Wer eine Norm anwenden will, muss zuerst wissen, welchen Rang sie hat und wer sie erlassen durfte.

## Der Stufenbau
Die österreichische Rechtsordnung wird üblicherweise als Stufenbau nach der rechtlichen Bedingtheit beschrieben: Jede Norm verdankt ihre Geltung einer höherrangigen Norm.

1. **Bundesverfassungsrecht** - B-VG und weitere Verfassungsbestimmungen
2. **Einfaches Bundesgesetz** und **Landesverfassungs-/Landesgesetz** im jeweiligen Zuständigkeitsbereich
3. **Verordnung** - generelle Norm der Verwaltung, nur auf gesetzlicher Grundlage
4. **Bescheid und Urteil** - individuelle Normen für den Einzelfall

## Was daraus folgt
- Eine Verordnung ohne gesetzliche Deckung ist gesetzwidrig, auch wenn sie inhaltlich sinnvoll erscheint.
- Ein Gesetz, das der Verfassung widerspricht, bleibt so lange anwendbar, bis der Verfassungsgerichtshof es aufhebt. Die Prüfungsfrage lautet also nicht nur "ist es rechtswidrig", sondern auch "wer darf das feststellen".
- Unionsrecht steht neben diesem Aufbau und hat im Kollisionsfall Anwendungsvorrang - es verdrängt die nationale Norm im Einzelfall, hebt sie aber nicht auf.

## Typische Prüfungsfalle
Anwendungsvorrang und Aufhebung werden verwechselt. Anwendungsvorrang heißt: das nationale Recht bleibt im Rechtsbestand, wird aber im konkreten Fall nicht angewendet.
`.trim(), 'Stell dir die Rechtsordnung als Haus vor. Ganz oben die Verfassung, darunter die Gesetze, darunter die Verordnungen, ganz unten Bescheid und Urteil. Jede Etage trägt nur, weil die darüber sie trägt. Merk dir vor allem einen Unterschied: Unionsrecht hebt österreichisches Recht nicht auf, es verdrängt es nur im konkreten Fall.'),

  L('l-m-auslegung', 'm-auslegung', 'Die vier Auslegungsmethoden', 10, 11, `
## Worum es geht
Gesetzestexte sind sprachlich fast nie eindeutig. Auslegung ist das Handwerk, mit dem aus einem Text eine anwendbare Regel wird.

## Die klassischen Methoden
| Methode | Frage | Grenze |
|---|---|---|
| Wortinterpretation | Was bedeuten die Wörter im allgemeinen oder im Fachsprachgebrauch? | Der mögliche Wortsinn ist die äußere Grenze jeder Auslegung |
| Systematische Auslegung | Wo steht die Norm, wie fügt sie sich in ihr Umfeld? | Setzt einen widerspruchsfreien Gesetzgeber voraus |
| Historische Auslegung | Was wollte der Gesetzgeber, was sagen die Materialien? | Der Wille altert; alte Materialien binden nicht unbegrenzt |
| Teleologische Auslegung | Welchen Zweck verfolgt die Norm heute? | Darf nicht zur freien Rechtsschöpfung werden |

## Reihenfolge
Man beginnt beim Wortlaut, weil er die Grenze markiert, und arbeitet sich zum Zweck vor. Die Methoden stehen aber nicht in einer starren Rangordnung - sie sind Argumente, die man gegeneinander abwägt und in der Lösung offenlegt.

## Was in der Klausur zählt
Nicht die Nennung der vier Namen, sondern die Anwendung: Welche Lesart trägt der Wortlaut noch? Welche passt zum Zweck? Wenn zwei Ergebnisse vertretbar sind, gehört die Entscheidung begründet - nicht behauptet.
`.trim(), 'Vier Methoden, eine Reihenfolge. Erstens Wortlaut, er ist die Grenze. Zweitens System, wo steht die Norm. Drittens Geschichte, was wollte der Gesetzgeber. Viertens Zweck, wozu dient die Norm heute. In der Klausur zählt nicht, dass du die vier Namen kennst, sondern dass du sie am Fall gegeneinander abwägst.'),

  L('l-m-lueckenschluss', 'm-lueckenschluss', 'Analogie und Umkehrschluss', 9, 12, `
## Worum es geht
Manchmal passt keine Norm auf den Fall. Dann stellt sich die Frage, ob das ein Versehen des Gesetzgebers war oder seine Entscheidung.

## Die Lücke
Eine Analogie setzt eine **planwidrige** Unvollständigkeit voraus. Planwidrig heißt: Der Gesetzgeber wollte den Fall regeln, hat ihn aber übersehen. Fehlt die Planwidrigkeit, liegt kein Regelungsversehen vor, sondern beredtes Schweigen.

## Die beiden Schlüsse
- **Analogieschluss**: Der ungeregelte Fall ist dem geregelten in den wesentlichen Wertungen ähnlich, also wird die Regel erstreckt.
- **Umkehrschluss (argumentum e contrario)**: Gerade weil der Gesetzgeber nur den einen Fall genannt hat, soll für den anderen das Gegenteil gelten.

Beide Schlüsse setzen an derselben Beobachtung an - eine Norm nennt Fall A, nicht Fall B - und kommen zum entgegengesetzten Ergebnis. Welcher richtig ist, entscheidet nicht die Logik, sondern die Wertung: Trägt der Zweck der Norm den ungeregelten Fall mit?

## Grenze im Strafrecht
Im Strafrecht ist die Analogie zulasten des Täters unzulässig. Das folgt aus dem Grundsatz "keine Strafe ohne Gesetz". Wer im Strafrecht eine Strafbarkeitslücke durch Analogie schließt, hat den Fall falsch gelöst.
`.trim(), 'Analogie und Umkehrschluss starten am selben Punkt: das Gesetz nennt Fall A, aber nicht Fall B. Die Analogie sagt, das war ein Versehen, wir dehnen die Regel aus. Der Umkehrschluss sagt, das war Absicht, also gilt das Gegenteil. Was stimmt, entscheidet der Zweck der Norm. Und merk dir die harte Grenze: im Strafrecht keine Analogie zulasten des Täters.'),

  L('l-m-subsumtion', 'm-subsumtion', 'Subsumtion und Gutachtenstil', 11, 13, `
## Worum es geht
Subsumtion heißt: einen Lebenssachverhalt unter die Merkmale einer Norm bringen. Das ist die Tätigkeit, die in der Klausur bewertet wird.

## Die vier Schritte
1. **Obersatz** - Wer will was von wem woraus? "X könnte gegen Y einen Anspruch auf ... aus ... haben."
2. **Definition** - Was verlangt das Tatbestandsmerkmal?
3. **Subsumtion** - Liegt dieses Merkmal im Sachverhalt vor? Hier wird argumentiert, hier fällt die Punktevergabe.
4. **Ergebnis** - Die Antwort auf den Obersatz, nicht mehr.

## Gutachtenstil gegen Urteilsstil
Der Gutachtenstil beginnt mit der Frage und endet beim Ergebnis: "Fraglich ist, ob ... Dazu müsste ... Das ist hier der Fall, weil ... Somit ...". Der Urteilsstil dreht das um und beginnt mit dem Ergebnis. In der Klausur ist der Gutachtenstil zu verwenden, weil nur er den Gedankengang sichtbar macht - und bewertet wird der Gedankengang, nicht das Ergebnis.

## Der häufigste Fehler
Unproblematische Merkmale werden ausführlich abgehandelt, das eigentliche Problem in einem Halbsatz. Wer die Zeit falsch verteilt, verliert Punkte, obwohl er alles weiss. Faustregel: Was unstreitig ist, wird festgestellt. Was streitig ist, wird diskutiert.
`.trim(), 'Vier Schritte. Obersatz: wer will was von wem woraus. Definition: was verlangt das Merkmal. Subsumtion: liegt es im Sachverhalt vor, und warum. Ergebnis: die Antwort auf den Obersatz. Der Gutachtenstil beginnt mit fraglich ist und endet mit somit. Und der wichtigste Tipp: was unstreitig ist, wird nur festgestellt. Diskutiert wird nur das Problem.'),

  L('l-m-geltung', 'm-geltung', 'Wann und wo eine Norm gilt', 7, 14, `
## Worum es geht
Eine Norm gilt nicht immer und überall. Vier Geltungsbereiche sind zu unterscheiden: zeitlich, räumlich, persönlich und sachlich.

## Zeitlicher Geltungsbereich
Regelmäßig tritt ein Gesetz nach Kundmachung in Kraft. Rückwirkung ist im Zivilrecht nicht generell verboten, im Strafrecht dagegen streng begrenzt: Eine Tat kann nur bestraft werden, wenn sie zur Tatzeit strafbar war. Ein später erlassenes günstigeres Strafgesetz kommt dem Täter dagegen zugute.

## Derogation
Fällt eine ältere Norm mit einer jüngeren zusammen, gelten zwei Regeln:
- *lex posterior derogat legi priori* - die spätere Norm verdrängt die frühere
- *lex specialis derogat legi generali* - die speziellere verdrängt die allgemeinere

Diese Regeln greifen nur bei gleichrangigen Normen. Zwischen den Stufen entscheidet der Rang: *lex superior derogat legi inferiori*.

## Prüfungsfalle
Die drei lateinischen Regeln werden gerne aufgezählt, aber falsch kombiniert. Ein späteres einfaches Gesetz verdrängt kein Verfassungsrecht - der Rang geht vor der Zeit.
`.trim(), 'Vier Geltungsbereiche: zeitlich, räumlich, persönlich, sachlich. Drei Kollisionsregeln: die spätere Norm verdrängt die frühere, die speziellere die allgemeinere, die höhere die niedrigere. Und die Falle: der Rang geht immer vor der Zeit. Ein neues einfaches Gesetz schlägt keine alte Verfassungsbestimmung.'),

  L('l-z-privatautonomie', 'z-privatautonomie', 'Was Privatrecht ausmacht', 8, 20, `
## Worum es geht
Privatrecht regelt Beziehungen zwischen gleichgeordneten Rechtssubjekten. Öffentliches Recht regelt das Verhältnis zwischen Hoheitsträger und Rechtsunterworfenem - dort besteht ein Über- und Unterordnungsverhältnis.

## Privatautonomie
Der Grundsatz lautet: Jede Person gestaltet ihre Rechtsverhältnisse selbst. Daraus folgen
- **Abschlussfreiheit** - ob und mit wem ein Vertrag geschlossen wird
- **Inhaltsfreiheit** - was vereinbart wird
- **Formfreiheit** - grundsätzlich ohne vorgeschriebene Form

## Die Grenzen
Privatautonomie ist nicht schrankenlos. Sie endet an zwingendem Recht, an den guten Sitten und an gesetzlichen Verboten. Ein besonders wichtiger Fall ist der Schutz strukturell unterlegener Vertragspartner - Verbraucherinnen, Mieter, Arbeitnehmerinnen. Dort wird zwingendes Recht zum Ausgleich einer Verhandlungsasymmetrie eingesetzt.

## Nachgiebiges und zwingendes Recht
Nachgiebiges (dispositives) Recht gilt nur, wenn die Parteien nichts anderes vereinbaren - es ist ein Ersatzprogramm. Zwingendes Recht lässt sich nicht abbedingen. Die Unterscheidung ist in der Klausur oft der entscheidende Zwischenschritt.
`.trim(), 'Privatrecht heißt: zwei Gleichgeordnete regeln ihre Sache selbst. Das nennt man Privatautonomie, mit drei Freiheiten - ob, was und in welcher Form. Die Grenzen sind zwingendes Recht, gesetzliche Verbote und die guten Sitten. Und merk dir den Unterschied: dispositives Recht gilt nur, wenn ihr nichts anderes vereinbart. Zwingendes Recht gilt immer.'),

  L('l-z-rechtssubjekte', 'z-rechtssubjekte', 'Wer Träger von Rechten ist', 8, 21, `
## Worum es geht
Nicht jeder, der handelt, kann sich auch wirksam binden. Drei Fähigkeiten sind zu trennen.

## Rechtsfähigkeit
Die Fähigkeit, Träger von Rechten und Pflichten zu sein. Natürliche Personen erlangen sie mit der Geburt; das bereits gezeugte Kind wird unter bestimmten Voraussetzungen bereits vorher berücksichtigt. Sie endet mit dem Tod. Auch juristische Personen sind rechtsfähig.

## Handlungs- und Geschäftsfähigkeit
Die Fähigkeit, durch eigenes Verhalten Rechtswirkungen herbeizuführen. Sie ist altersabhängig abgestuft:
- **Unmündige Minderjährige** (bis 14) können nur ganz begrenzt handeln - etwa geringfügige Geschäfte des täglichen Lebens.
- **Mündige Minderjährige** (14 bis 18) können über eigenes Einkommen in gewissen Grenzen verfügen und sind deliktsfähig.
- Mit **18** tritt volle Geschäftsfähigkeit ein.

## Warum das für dieses Produkt zählt
Ein relevanter Teil der Erstsemestrigen ist noch nicht 18. Das ist keine akademische Frage: Es betrifft Vertragsschluss, Einwilligung in die Datenverarbeitung und Werbeansprache.

## Deliktsfähigkeit
Die Fähigkeit, für rechtswidriges Verhalten einzustehen. Sie folgt eigenen Regeln und fällt nicht mit der Geschäftsfähigkeit zusammen.
`.trim(), 'Drei Fähigkeiten, die man nicht verwechseln darf. Rechtsfähigkeit: du kannst Rechte haben, ab Geburt. Geschäftsfähigkeit: du kannst dich selbst binden, abgestuft nach Alter, voll ab achtzehn. Deliktsfähigkeit: du haftest für dein Verhalten, eigene Regeln. In der Klausur wird fast immer die zweite gefragt.'),

  L('l-z-rechtsgeschaeft', 'z-rechtsgeschaeft', 'Willenserklärung und Rechtsgeschäft', 9, 22, `
## Worum es geht
Das Rechtsgeschäft ist das Werkzeug der Privatautonomie. Sein Baustein ist die Willenserklärung.

## Aufbau der Willenserklärung
- **Innerer Tatbestand**: Handlungswille, Erklärungsbewusstsein, Geschäftswille
- **Äußerer Tatbestand**: die nach außen erkennbare Erklärung, ausdrücklich oder schlüssig

Schweigen ist grundsätzlich keine Erklärung. Wer schweigt, sagt rechtlich nichts - Ausnahmen brauchen eine besondere Grundlage.

## Auslegung von Erklärungen
Maßgeblich ist nicht, was die Erklärende dachte, sondern wie ein redlicher Erklärungsempfänger die Erklärung verstehen durfte. Das schützt das Vertrauen des Empfängers - und ist der Grund, warum der Irrtum eine eigene Rechtsfigur braucht.

## Willensmängel
Weichen Wille und Erklärung auseinander, kommen Irrtum, List oder Drohung in Betracht. Nicht jeder Irrtum befreit: Das Gesetz wiegt den Schutz der Irrenden gegen das Vertrauen der Gegenseite ab. Ein Motivirrtum ist bei entgeltlichen Geschäften grundsätzlich unbeachtlich.

## Einteilungen
Ein- und zweiseitige, entgeltliche und unentgeltliche, Verpflichtungs- und Verfügungsgeschäfte. Die letzte Unterscheidung trägt später das gesamte Sachenrecht.
`.trim(), 'Eine Willenserklärung hat eine Innenseite und eine Außenseite. Innen: Handlungswille, Erklärungsbewusstsein, Geschäftswille. Außen: was der andere sehen kann. Und der wichtigste Satz: maßgeblich ist nicht, was du dir gedacht hast, sondern wie ein redlicher Empfänger dich verstehen durfte. Genau deshalb gibt es das Irrtumsrecht.'),

  L('l-z-vertrag', 'z-vertrag', 'Wie ein Vertrag zustande kommt', 9, 23, `
## Worum es geht
Ein Vertrag entsteht durch zwei übereinstimmende Willenserklärungen: Angebot und Annahme.

## Das Angebot
Ein Angebot muss inhaltlich hinreichend bestimmt sein und den Bindungswillen erkennen lassen. Fehlt eines von beidem, liegt nur eine Einladung zum Anbieten vor. Das Schaufenster, der Katalog und die Website sind typischerweise noch kein Angebot - sonst wäre jede Händlerin verpflichtet, an jede Kundin zu liefern, auch wenn der Vorrat erschöpft ist.

## Die Annahme
Die Annahme muss rechtzeitig und inhaltlich deckungsgleich erfolgen. Eine Annahme unter Änderungen ist keine Annahme, sondern ein neues Angebot.

## Konsens und Dissens
Stimmen die Erklärungen inhaltlich überein, liegt Konsens vor. Weichen sie ab, ohne dass es jemand bemerkt, spricht man von verstecktem Dissens - ein Vertrag kommt dann in diesem Punkt nicht zustande.

## Der digitale Fall
Beim Kauf digitaler Inhalte im Fernabsatz treten weitere Pflichten hinzu: Informationspflichten vor Vertragsschluss und ein Rücktrittsrecht. Bei digitalen Inhalten kann das Rücktrittsrecht vorzeitig erlöschen - aber nur, wenn die Verbraucherin ausdrücklich dem vorzeitigen Beginn zugestimmt und ihre Kenntnis vom Verlust des Rücktrittsrechts bestätigt hat. Fehlt eine dieser Erklärungen, bleibt das Rücktrittsrecht bestehen.
`.trim(), 'Vertrag gleich Angebot plus Annahme. Das Angebot muss bestimmt sein und Bindungswillen zeigen - deshalb ist ein Schaufenster noch kein Angebot. Die Annahme muss deckungsgleich sein, sonst ist sie ein neues Angebot. Und für alles Digitale: das Rücktrittsrecht erlischt nur, wenn die Kundin ausdrücklich zugestimmt hat und wusste, dass sie es verliert.'),

  L('l-z-schadenersatz', 'z-schadenersatz', 'Schadenersatz in vier Fragen', 9, 24, `
## Worum es geht
Wer einen Schaden erlitten hat, bekommt ihn nicht automatisch ersetzt. Vier Voraussetzungen sind zu prüfen - in dieser Reihenfolge.

## 1. Schaden
Jeder Nachteil an Vermögen, Rechten oder der Person. Zu unterscheiden sind positiver Schaden und entgangener Gewinn; der Umfang des Ersatzes hängt vom Verschuldensgrad ab.

## 2. Kausalität
Ohne die Handlung wäre der Schaden nicht eingetreten (Äquivalenz). Weil diese Formel zu weit führt, wird sie durch Adäquanz und den Schutzzweck der Norm begrenzt: Ersetzt wird nur, was die verletzte Norm verhindern wollte.

## 3. Rechtswidrigkeit
Verstoß gegen ein Gebot, ein Verbot oder gegen die gebotene Sorgfalt. Rechtfertigungsgründe wie Notwehr oder Einwilligung schließen sie aus.

## 4. Verschulden
Vorsatz oder Fahrlässigkeit. Der Sorgfaltsmaßstab ist grundsätzlich objektiv: Es kommt darauf an, was von einer durchschnittlich sorgfältigen Person in dieser Lage zu erwarten war, nicht auf die persönliche Überzeugung.

## Merksatz
Fehlt eine der vier Voraussetzungen, ist die Prüfung zu Ende. Das ist zugleich die häufigste Fehlerquelle: Es wird munter weitergepruft, obwohl schon die Kausalität verneint wurde.
`.trim(), 'Vier Fragen, in dieser Reihenfolge. Erstens: gibt es einen Schaden. Zweitens: war die Handlung kausal, begrenzt durch Adäquanz und Schutzzweck. Drittens: war sie rechtswidrig. Viertens: trifft den Schädiger ein Verschulden. Und der wichtigste Punkt: fällt eine Voraussetzung weg, ist die Prüfung zu Ende. Nicht weiterprüfen.'),

  L('l-o-baugesetze', 'o-baugesetze', 'Die Baugesetze der Bundesverfassung', 9, 30, `
## Worum es geht
Die österreichische Bundesverfassung ruht auf mehreren tragenden Prinzipien. Sie werden Baugesetze genannt, weil ihre Beseitigung die Verfassung als Ganzes verändern würde.

## Die Prinzipien
- **Demokratisches Prinzip** - das Recht geht vom Volk aus, ausgeuebt vor allem über gewählte Organe
- **Republikanisches Prinzip** - gewähltes, verantwortliches und zeitlich begrenztes Staatsoberhaupt
- **Bundesstaatliches Prinzip** - Verteilung der Zuständigkeiten zwischen Bund und Ländern
- **Rechtsstaatliches Prinzip** - alle staatliche Verwaltung auf gesetzlicher Grundlage, verbunden mit Rechtsschutz
- **Gewaltentrennendes Prinzip** - Trennung von Gesetzgebung, Verwaltung und Gerichtsbarkeit
- **Liberales Prinzip** - Grundrechte als Schranke staatlicher Macht

## Warum sie besonders sind
Eine Gesamtänderung der Bundesverfassung ist an ein zusätzliches Verfahren gebunden: Sie erfordert neben dem qualifizierten Beschluss im Nationalrat zwingend eine Volksabstimmung. Wird eine Gesamtänderung ohne Volksabstimmung beschlossen, ist das ein Verfassungsverstoß, den der Verfassungsgerichtshof aufgreifen kann.

## Prüfungsfalle
Die Baugesetze stehen nicht als Liste in einem einzigen Artikel. Sie werden aus der Verfassung als Ganzes erschlossen - genau das macht sie zu einem beliebten Prüfungsthema.
`.trim(), 'Sechs tragende Prinzipien: demokratisch, republikanisch, bundesstaatlich, rechtsstaatlich, gewaltentrennend, liberal. Sie heißen Baugesetze, weil das Haus einstürzt, wenn du eines herausnimmst. Ihre Änderung ist eine Gesamtänderung und braucht zwingend eine Volksabstimmung. Und Achtung: sie stehen nirgends als fertige Liste im Gesetz.'),

  L('l-o-gesetzgebung', 'o-gesetzgebung', 'Wie ein Bundesgesetz entsteht', 8, 31, `
## Worum es geht
Der Weg vom Vorschlag zum Gesetz ist ein Verfahren mit festen Stationen. Wer eine Station übersieht, hat das Gesetz nicht erklärt.

## Die Stationen
1. **Initiative** - Regierungsvorlage, Initiativantrag aus dem Nationalrat, Antrag des Bundesrates oder Volksbegehren
2. **Behandlung im Nationalrat** - Ausschuss, Beratung, Beschluss
3. **Mitwirkung des Bundesrates** - je nach Materie Einspruchsrecht oder Zustimmungsrecht
4. **Beurkundung durch den Bundespräsidenten** - Prüfung des verfassungsmäßigen Zustandekommens
5. **Gegenzeichnung** durch den Bundeskanzler
6. **Kundmachung im Bundesgesetzblatt** - erst damit wird das Gesetz wirksam

## Der Bundesrat
Er ist die Länderkammer. In der Regel steht ihm ein aufschiebendes Einspruchsrecht zu: Der Nationalrat kann den Einspruch durch einen Beharrungsbeschluss überwinden. In bestimmten Fällen, die Länderinteressen besonders berühren, braucht es dagegen seine Zustimmung.

## Prüfungsfalle
Die Kundmachung ist kein Formalakt am Rande, sondern Wirksamkeitsvoraussetzung. Ein beschlossenes, aber nicht kundgemachtes Gesetz gilt nicht.
`.trim(), 'Sechs Stationen: Initiative, Nationalrat, Bundesrat, Beurkundung, Gegenzeichnung, Kundmachung. Der Bundesrat hat meistens nur ein aufschiebendes Einspruchsrecht, das der Nationalrat mit einem Beharrungsbeschluss überwindet. Und vergiss die letzte Station nicht: ohne Kundmachung im Bundesgesetzblatt gilt gar nichts.'),

  L('l-o-grundrechte', 'o-grundrechte', 'Grundrechte prüfen', 9, 32, `
## Worum es geht
Grundrechte binden den Staat. Ihre Prüfung folgt einem festen Schema, das in der Klausur wichtiger ist als das Auswendiglernen einzelner Artikel.

## Das Prüfschema
1. **Schutzbereich** - Ist das Verhalten überhaupt vom Grundrecht erfasst?
2. **Eingriff** - Verkürzt eine staatliche Maßnahme diesen Schutzbereich?
3. **Rechtfertigung** - Gibt es eine gesetzliche Grundlage, verfolgt sie ein legitimes Ziel, und ist der Eingriff verhältnismäßig?

## Verhältnismäßigkeit
Sie zerfällt in drei Schritte: geeignet, erforderlich (kein gleich wirksames milderes Mittel) und angemessen im engeren Sinn (Abwägung). Die meisten Punkte liegen im dritten Schritt, weil dort tatsächlich argumentiert werden muss.

## Zwei Quellen
Grundrechte finden sich in Österreich nicht in einem einzigen Katalog. Sie stammen unter anderem aus dem Staatsgrundgesetz 1867, der Europäischen Menschenrechtskonvention, die in Österreich im Verfassungsrang steht, und weiteren Verfassungsbestimmungen. Hinzu tritt die Grundrechtecharta der Union im Anwendungsbereich des Unionsrechts.

## Prüfungsfalle
Ein Grundrecht wird bejaht oder verneint, ohne den Schutzbereich zu bestimmen. Ohne Schutzbereich gibt es keinen Eingriff - und ohne Eingriff keine Rechtfertigungsfrage.
`.trim(), 'Drei Schritte: Schutzbereich, Eingriff, Rechtfertigung. Und die Rechtfertigung hat selbst drei Schritte: geeignet, erforderlich, angemessen. Die Punkte holst du dir bei der Angemessenheit, weil du dort wirklich abwägen musst. Merk dir auch: Österreich hat keinen einzigen Grundrechtskatalog, sondern mehrere Quellen, darunter die EMRK im Verfassungsrang.'),

  L('l-o-verwaltung', 'o-verwaltung', 'Wie die Verwaltung handelt', 8, 33, `
## Worum es geht
Verwaltung handelt nicht beliebig, sondern in bestimmten Rechtsformen. Welche Form vorliegt, entscheidet darüber, wie man sich wehrt.

## Die Handlungsformen
- **Verordnung** - generelle Norm, richtet sich an einen unbestimmten Personenkreis
- **Bescheid** - individuelle, hoheitliche Erledigung gegenüber bestimmten Personen
- **Akt unmittelbarer Befehls- und Zwangsgewalt** - der faktische Zugriff ohne vorangehendes Verfahren
- **Privatwirtschaftsverwaltung** - der Staat handelt wie ein Privater, etwa beim Ankauf von Büromaterial

## Das Legalitätsprinzip
Die gesamte staatliche Verwaltung darf nur auf Grundlage der Gesetze ausgeuebt werden. Je schwerer der Eingriff, desto bestimmter muss die gesetzliche Grundlage sein.

## Der Bescheid
Er braucht Bezeichnung der Behörde, Spruch, Begründung und Rechtsmittelbelehrung. Der Spruch ist der Kern: nur er wird rechtskräftig.

## Prüfungsfalle
Verordnung und Bescheid werden nach dem Adressatenkreis unterschieden, nicht nach dem Namen des Dokuments. Entscheidend ist, ob die Erledigung individuell oder generell wirkt.
`.trim(), 'Vier Handlungsformen: Verordnung, Bescheid, unmittelbare Befehls- und Zwangsgewalt, und Privatwirtschaftsverwaltung. Der Unterschied zwischen Verordnung und Bescheid liegt nicht im Namen, sondern im Adressatenkreis: generell oder individuell. Und über allem steht das Legalitätsprinzip - Verwaltung nur auf Grundlage der Gesetze.'),

  L('l-o-rechtsschutz', 'o-rechtsschutz', 'Die drei Höchstgerichte', 8, 34, `
## Worum es geht
Österreich kennt drei Höchstgerichte mit klar getrennten Aufgaben. Die Zuordnung ist eine typische Einstiegsfrage.

## Verfassungsgerichtshof
Prüft Gesetze auf ihre Verfassungsmäßigkeit und Verordnungen auf ihre Gesetzmäßigkeit, entscheidet über Kompetenzkonflikte und über Beschwerden wegen Verletzung verfassungsgesetzlich gewährleisteter Rechte. Nur er kann ein Gesetz aufheben - eine Wirkung, die man als negative Gesetzgebung beschreibt.

## Verwaltungsgerichtshof
Prüft Entscheidungen der Verwaltungsgerichte auf ihre Rechtmäßigkeit. Er sichert die einheitliche Anwendung des Verwaltungsrechts.

## Oberster Gerichtshof
Letzte Instanz in Zivil- und Strafsachen.

## Der Instanzenzug in der Verwaltung
Gegen einen Bescheid geht es zunächst an ein Verwaltungsgericht - je nach Materie an ein Landesverwaltungsgericht oder an das Bundesverwaltungsgericht. Erst danach kommen Revision an den Verwaltungsgerichtshof oder Beschwerde an den Verfassungsgerichtshof in Betracht.

## Prüfungsfalle
Der Verfassungsgerichtshof ist keine allgemeine Superinstanz. Er prüft nicht jede Rechtswidrigkeit, sondern die Verletzung verfassungsgesetzlich gewährleisteter Rechte und die Anwendung rechtswidriger genereller Normen.
`.trim(), 'Drei Höchstgerichte. Der Verfassungsgerichtshof prüft Normen und Grundrechte und ist der einzige, der ein Gesetz aufheben kann. Der Verwaltungsgerichtshof sichert die einheitliche Anwendung des Verwaltungsrechts. Der Oberste Gerichtshof ist letzte Instanz in Zivil- und Strafsachen. Und nein, der Verfassungsgerichtshof ist keine Superinstanz für alles.'),

  L('l-s-aufbau', 's-aufbau', 'Der dreistufige Deliktsaufbau', 9, 40, `
## Worum es geht
Die Strafbarkeitsprüfung folgt einer festen Reihenfolge. Wer sie durchbricht, produziert Fehler, die auffallen.

## Die drei Stufen
1. **Tatbestandsmäßigkeit** - erfuellt das Verhalten die Merkmale eines Straftatbestands, objektiv und subjektiv?
2. **Rechtswidrigkeit** - fehlt ein Rechtfertigungsgrund wie Notwehr oder rechtfertigender Notstand?
3. **Schuld** - ist dem Täter das Verhalten persönlich vorwerfbar? Hier stehen Zurechnungsfähigkeit, Unrechtsbewusstsein und Entschuldigungsgründe.

## Warum die Reihenfolge zwingend ist
Jede Stufe setzt die vorherige voraus. Über Notwehr zu diskutieren, bevor der Tatbestand bejaht wurde, ist logisch sinnlos - es gibt dann nichts zu rechtfertigen.

## Objektiv vor subjektiv
Innerhalb des Tatbestands wird zuerst der objektive Teil geprüft (Handlung, Erfolg, Kausalität, objektive Zurechnung), dann der subjektive (Vorsatz und allfällige weitere Absichten). Der Vorsatz muss sich auf alle objektiven Merkmale beziehen - fehlt er zu einem Merkmal, liegt ein Tatbildirrtum vor und der Vorsatz entfällt.

## Nach der Prüfung
Erst wenn alle drei Stufen bejaht sind, folgen Fragen der Strafbarkeit im Einzelnen: Versuch, Beteiligung, Konkurrenzen.
`.trim(), 'Drei Stufen, immer in dieser Reihenfolge: Tatbestand, Rechtswidrigkeit, Schuld. Innerhalb des Tatbestands erst objektiv, dann subjektiv. Wer über Notwehr redet, bevor der Tatbestand steht, diskutiert über nichts. Und merk dir: der Vorsatz muss sich auf alle objektiven Merkmale beziehen.'),

  L('l-s-tatbestand', 's-tatbestand', 'Kausalität und objektive Zurechnung', 8, 41, `
## Worum es geht
Zwischen Handlung und Erfolg muss ein Zusammenhang bestehen. Die reine Ursächlichkeit reicht dafür nicht aus.

## Kausalität
Nach der Bedingungsformel ist jede Bedingung ursächlich, die nicht hinweggedacht werden kann, ohne dass der Erfolg entfiele. Die Formel ist bewusst weit - sie erfasst auch die Eltern des Täters.

## Objektive Zurechnung
Deshalb wird die Kausalität normativ eingegrenzt. Zugerechnet wird ein Erfolg nur, wenn die Handlung eine rechtlich missbilligte Gefahr geschaffen hat und sich gerade diese Gefahr im Erfolg verwirklicht hat. Nicht zugerechnet werden daher
- erlaubte Risiken des Alltags
- atypische Kausalverläufe
- Erfolge außerhalb des Schutzzwecks der verletzten Norm

## Unterlassen
Beim unechten Unterlassungsdelikt tritt eine zusätzliche Voraussetzung hinzu: eine Garantenstellung, also eine besondere rechtliche Pflicht, den Erfolg abzuwenden. Ohne sie ist ein Untätigbleiben strafrechtlich nicht wie ein Tun zu behandeln.

## Prüfungsfalle
Kausalität und Zurechnung werden vermengt. Sauber ist: Zuerst feststellen, dass die Handlung ursächlich war. Dann fragen, ob der Erfolg dem Täter auch zuzurechnen ist.
`.trim(), 'Erst Kausalität, dann Zurechnung. Kausal ist alles, was man nicht wegdenken kann, ohne dass der Erfolg entfällt - das ist absichtlich sehr weit. Deshalb kommt danach die objektive Zurechnung: rechtlich missbilligte Gefahr geschaffen, und genau diese Gefahr hat sich verwirklicht. Beim Unterlassen brauchst du zusätzlich eine Garantenstellung.'),

  L('l-s-rechtswidrigkeit', 's-rechtswidrigkeit', 'Notwehr und Notstand', 8, 42, `
## Worum es geht
Ein tatbestandsmäßiges Verhalten ist regelmäßig rechtswidrig - es sei denn, ein Rechtfertigungsgrund greift.

## Notwehr
Voraussetzungen:
- **Notwehrlage**: gegenwärtiger oder unmittelbar drohender rechtswidriger Angriff auf ein notwehrfähiges Gut
- **Notwehrhandlung**: Verteidigung, die zur Abwehr notwendig ist - also das mildeste unter den gleich wirksamen Mitteln
- **Verteidigungswille**

Die Notwehr endet, wenn der Angriff endet. Wer nach dem Ende des Angriffs zuschlägt, übt Vergeltung, nicht Verteidigung.

## Grenze der Angemessenheit
Die Verteidigung darf nicht in einem groben Missverhältnis zum drohenden Nachteil stehen. Bei ganz geringfügigen Angriffen ist eine schwere Verletzung des Angreifers daher nicht gerechtfertigt.

## Notstand
Beim rechtfertigenden Notstand wird ein Rechtsgut auf Kosten eines anderen gerettet. Anders als bei der Notwehr trifft es hier einen Unbeteiligten - deshalb ist eine echte Interessenabwägung erforderlich, und das gerettete Interesse muss das geopferte deutlich überwiegen.

## Prüfungsfalle
Notwehr gegen einen rechtmäßigen Angriff gibt es nicht. Fehlt die Rechtswidrigkeit des Angriffs, ist die Notwehrlage zu verneinen - und die Prüfung endet dort.
`.trim(), 'Notwehr braucht drei Dinge: eine Notwehrlage, also einen gegenwärtigen rechtswidrigen Angriff, eine notwendige Verteidigung, also das mildeste gleich wirksame Mittel, und den Verteidigungswillen. Wichtig: Notwehr endet mit dem Angriff. Und beim Notstand triffst du einen Unbeteiligten, deshalb brauchst du dort eine echte Abwägung.'),

  L('l-s-schuld', 's-schuld', 'Schuld, Vorsatz und Fahrlässigkeit', 9, 43, `
## Worum es geht
Auf der dritten Stufe geht es nicht mehr um die Tat, sondern um die Person: Kann ihr das Verhalten persönlich vorgeworfen werden?

## Elemente der Schuld
- **Zurechnungsfähigkeit** - fehlt etwa bei schwerer seelischer Störung oder unterhalb der Strafmündigkeit
- **Unrechtsbewusstsein** - der Täter erkennt, dass sein Verhalten Unrecht ist
- **Zumutbarkeit rechtmäßigen Verhaltens** - entfällt bei Entschuldigungsgründen

## Vorsatz
Vorsatz verlangt Wissen und Wollen der Verwirklichung des Tatbildes. Er reicht von der Absicht bis zum bedingten Vorsatz, bei dem der Täter den Erfolg ernstlich für möglich hält und sich damit abfindet.

## Fahrlässigkeit
Fahrlässig handelt, wer die gebotene Sorgfalt außer Acht lässt, zu der er nach den Umständen verpflichtet und nach seinen geistigen und körperlichen Verhältnissen befähigt ist. Anders als im Zivilrecht wird also auch auf die persönliche Befähigung abgestellt.

## Die entscheidende Grenze
Zwischen bedingtem Vorsatz und bewusster Fahrlässigkeit verläuft die schwierigste Linie des Allgemeinen Teils. Beide halten den Erfolg für möglich. Der bedingt Vorsätzliche findet sich damit ab, der bewusst Fahrlässige vertraut darauf, dass es gutgeht. In der Klausur muss diese Abgrenzung am Sachverhalt begründet werden, nicht behauptet.
`.trim(), 'Schuld heißt: kann man es der Person persönlich vorwerfen. Drei Elemente: zurechnungsfähig, Unrechtsbewusstsein, Zumutbarkeit. Vorsatz ist Wissen und Wollen. Und die schwierigste Grenze im ganzen Allgemeinen Teil: bedingter Vorsatz gegen bewusste Fahrlässigkeit. Beide halten den Erfolg für möglich. Der eine findet sich damit ab, der andere vertraut darauf, dass nichts passiert.'),

  L('l-s-versuch', 's-versuch', 'Versuch und Beteiligung', 8, 44, `
## Worum es geht
Nicht jede Straftat wird vollendet, und nicht jede wird von einer Person allein begangen.

## Versuch
Strafbar ist der Versuch, wenn der Täter seinen Entschluss, die Tat auszuführen, durch eine der Ausführung unmittelbar vorangehende Handlung betätigt. Bloße Vorbereitungshandlungen sind grundsätzlich straflos - die Abgrenzung ist der Kern jeder Versuchsfrage.

## Rücktritt
Wer die Ausführung freiwillig aufgibt oder den Erfolg abwendet, wird wegen des Versuchs nicht bestraft. Entscheidend ist die Freiwilligkeit: Wer aufhört, weil die Polizei kommt, tritt nicht freiwillig zurück.

## Beteiligung
Das österreichische Strafrecht folgt einem Einheitstäterbegriff: Wer die Tat ausführt, wer einen anderen dazu bestimmt und wer sonst zur Ausführung beiträgt, ist jeweils Täter. Die Unterschiede in der Mitwirkung wirken sich bei der Strafbemessung aus, nicht bei der Frage der Täterschaft.

## Prüfungsfalle
Der Einheitstäterbegriff wird oft mit der deutschen Unterscheidung von Täterschaft und Teilnahme vermischt. Wer in der Klausur Anstiftung und Beihilfe als eigene Kategorien der Strafbarkeit aufführt, arbeitet mit dem falschen System.
`.trim(), 'Versuch beginnt, wo die Vorbereitung endet - bei der Handlung, die der Ausführung unmittelbar vorangeht. Rücktritt hilft nur, wenn er freiwillig ist. Und beim Beteiligungssystem der wichtigste Satz: Österreich kennt den Einheitstäterbegriff. Ausführen, bestimmen, beitragen - alle drei sind Täter.'),

  L('l-g-rechtsbegriff', 'g-rechtsbegriff', 'Recht, Moral und Zwang', 7, 50, `
## Worum es geht
Was unterscheidet eine Rechtsnorm von einer moralischen oder gesellschaftlichen Regel?

## Merkmale des Rechts
Rechtsnormen sind generell, sie werden in einem geregelten Verfahren erzeugt und ihre Einhaltung wird organisiert erzwungen. Der Zwang ist dabei nicht das Wesen des Rechts, sondern seine Absicherung.

## Recht und Moral
Zwei Grundpositionen stehen einander gegenüber:
- Der **Rechtspositivismus** trennt Geltung und Inhalt: Eine Norm gilt, weil sie ordnungsgemäß erzeugt wurde, nicht weil sie gerecht ist.
- **Naturrechtliche Positionen** halten dagegen, dass extremes Unrecht nicht Recht sein kann.

Beide Positionen haben ernstzunehmende Gründe, und die Auseinandersetzung ist nach den Erfahrungen des 20. Jahrhunderts keine akademische Spielerei. In der Klausur ist beides darzustellen; eine der beiden Positionen als "richtig" zu präsentieren, verfehlt die Aufgabe.

## Funktionen des Rechts
Ordnung, Konfliktlösung, Gestaltung, Machtbegrenzung. Die letzte Funktion ist die jüngste und die anspruchsvollste: Recht bindet auch den, der es erlässt.
`.trim(), 'Was macht Recht zu Recht? Es ist generell, es entsteht in einem geregelten Verfahren, und seine Einhaltung wird organisiert erzwungen. Der große Streit lautet: Gilt eine Norm, weil sie ordentlich erzeugt wurde, oder nur, wenn sie nicht extrem ungerecht ist. Positivismus gegen Naturrecht. In der Klausur stellst du beide Seiten dar.'),

  L('l-g-roemisch', 'g-roemisch', 'Römisches Recht und Rezeption', 7, 51, `
## Worum es geht
Das österreichische Privatrecht steht in einer langen Linie, die im römischen Recht beginnt.

## Die Quellen
Unter Kaiser Justinian wurde im 6. Jahrhundert eine umfassende Sammlung geschaffen, die später als Corpus Iuris Civilis bezeichnet wurde. Sie besteht im Kern aus den Digesten (Juristenschriften), dem Codex (Kaiserkonstitutionen) und den Institutionen (einem Lehrbuch mit Gesetzeskraft).

## Wiederentdeckung und Rezeption
Ab dem 11. Jahrhundert wurde dieser Bestand an oberitalienischen Universitäten wissenschaftlich bearbeitet. Die Glossatoren erschlossen die Texte durch Randbemerkungen, die Kommentatoren machten sie für die Praxis nutzbar. Über die gelehrten Juristen gelangte das römische Recht in die europäische Rechtspraxis - dieser Vorgang wird Rezeption genannt.

## Was geblieben ist
Nicht die einzelnen Regeln, sondern die Begriffe und die Denkform: Vertrag, Eigentum, Besitz, Anspruch, die Trennung von Verpflichtung und Verfügung. Wer heute ein Rechtsgeschäft prüfen kann, arbeitet mit einem Werkzeugkasten römischen Ursprungs.

## Prüfungsfalle
Rezeption bedeutet nicht, dass römisches Recht in Österreich gegolten hätte. Übernommen wurde die wissenschaftliche Bearbeitung, nicht der Gesetzesbefehl.
`.trim(), 'Justinian lässt im sechsten Jahrhundert das römische Recht sammeln - später Corpus Iuris Civilis genannt. Ab dem elften Jahrhundert bearbeiten es die Glossatoren und Kommentatoren in Oberitalien wissenschaftlich. Über die gelehrten Juristen kommt es in die Praxis, das nennt man Rezeption. Geblieben sind nicht die Regeln, sondern die Begriffe: Vertrag, Eigentum, Besitz, Anspruch.'),

  L('l-g-abgb', 'g-abgb', 'Die Kodifikationsidee und das ABGB', 7, 52, `
## Worum es geht
Das Allgemeine bürgerliche Gesetzbuch trat 1812 in Kraft und gilt - vielfach geändert - bis heute. Es ist eines der ältesten in Geltung stehenden Zivilgesetzbücher Europas.

## Die Idee der Kodifikation
Eine Kodifikation will ein Rechtsgebiet planvoll, vollständig und aus einem Guss regeln. Sie löst das zersplitterte Nebeneinander von Gewohnheitsrecht, Partikularrechten und gelehrtem Recht ab. Der Gedanke stammt aus der Aufklärung: Recht soll erkennbar, allgemein und für alle gleich sein.

## Merkmale des ABGB
Knappe, bewusst allgemein gehaltene Sprache, ein Aufbau nach Personen-, Sachen- und gemeinsamen Bestimmungen, und ein hoher Anteil an Generalklauseln. Gerade diese Offenheit erklärt seine Langlebigkeit: Die Gerichte konnten es weiterentwickeln, ohne dass der Text ständig geändert werden musste.

## Anpassung über die Zeit
Die drei Teilnovellen zwischen 1914 und 1916 modernisierten große Bereiche. Später kamen Familien-, Konsumenten- und Schadenersatzreformen hinzu - und in jüngerer Zeit vor allem unionsrechtlich veranlasste Änderungen.

## Prüfungsfalle
"Seit 1812 unverändert" ist falsch. Der Text von 1812 ist der Kern; das geltende ABGB ist das Ergebnis von zweihundert Jahren Überarbeitung und Rechtsprechung.
`.trim(), 'Das ABGB tritt 1812 in Kraft und gilt bis heute. Die Kodifikationsidee kommt aus der Aufklärung: ein Rechtsgebiet vollständig, planvoll und für alle gleich regeln. Das ABGB ist knapp formuliert und arbeitet mit Generalklauseln - genau deshalb hat es zweihundert Jahre überlebt. Aber Achtung: unverändert ist es nicht, die Teilnovellen ab 1914 haben viel umgebaut.')
];
