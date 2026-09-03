'use strict';
// Fälle mit Bewertungsraster auf vier Dimensionen (Kapitel 5).
// STATUS: Entwurf, eigenständig verfasst. Vor Verkauf durch den Kursgeber freigeben.
//
// rubric: Anker je Dimension. Ein Anker ist entweder ein String oder ein Array
// gleichwertiger Formulierungen (Synonyme, Abkürzungen).

module.exports = [
  {
    id: 'c-z-vertrag-1',
    topic_id: 'z-vertrag',
    title: 'Der zurückgezogene Laptop',
    minutes: 12,
    status: 'entwurf',
    facts: `Anna sieht im Schaufenster eines Elektrohändlers einen Laptop mit dem Preisschild "EUR 799". Sie betritt das Geschäft und erklärt dem Verkäufer, sie nehme genau dieses Gerät. Der Verkäufer antwortet: "Gern, ich hole ihn aus dem Lager." Nach fünf Minuten kommt er zurück und sagt, das Preisschild sei falsch gewesen, das Gerät koste EUR 1.099; zu EUR 799 verkaufe er nicht.

Anna besteht auf Lieferung zu EUR 799.`,
    question: 'Ist zwischen Anna und dem Händler ein Kaufvertrag über EUR 799 zustande gekommen? Prüfen Sie im Gutachtenstil.',
    rubric: {
      minWords: 120,
      issue: [
        ['kaufvertrag', 'vertrag zustande'],
        ['angebot', 'antrag'],
        ['annahme']
      ],
      regel: [
        ['einladung zum anbieten', 'invitatio', 'aufforderung zur anbotstellung'],
        ['bindungswille', 'rechtsbindungswille', 'bindungsabsicht'],
        ['übereinstimmende willenserklärungen', 'konsens']
      ],
      subsumtion: [
        ['schaufenster', 'auslage', 'preisschild'],
        ['anna gibt das angebot ab', 'annas erklärung ist das angebot', 'anna stellt den antrag'],
        ['ich hole ihn aus dem lager', 'erklärung des verkäufers', 'antwort des verkäufers']
      ],
      ergebnis: [
        ['kein vertrag', 'nicht zustande gekommen', 'vertrag verneint', 'kein anspruch']
      ]
    }
  },

  {
    id: 'c-s-notwehr-1',
    topic_id: 's-rechtswidrigkeit',
    title: 'Der Schlag nach dem Schlag',
    minutes: 14,
    status: 'entwurf',
    facts: `B geht nachts durch einen Park. C tritt ihm in den Weg und holt mit der Faust aus. B weicht aus und stößt C so kräftig zurück, dass dieser zu Boden geht und liegen bleibt. C rührt sich nicht mehr und stöhnt.

B ist wütend und tritt dem am Boden liegenden C noch einmal gegen den Oberschenkel. C erleidet dadurch eine Prellung.`,
    question: 'Beurteilen Sie die Strafbarkeit des B hinsichtlich des Tritts gegen den am Boden liegenden C. Prüfen Sie im Gutachtenstil.',
    rubric: {
      minWords: 130,
      issue: [
        ['körperverletzung', 'verletzung am körper'],
        ['rechtfertigung', 'notwehr'],
        ['tritt gegen den liegenden', 'zweite handlung', 'nachtreten']
      ],
      regel: [
        ['tatbestand', 'tatbestandsmäßig'],
        ['notwehrlage', 'gegenwärtiger angriff'],
        ['rechtswidriger angriff'],
        ['verteidigungswille']
      ],
      subsumtion: [
        ['angriff war beendet', 'kein gegenwärtiger angriff mehr', 'angriff bereits abgewehrt'],
        ['c lag am boden', 'c war wehrlos', 'c konnte nicht mehr angreifen'],
        ['vergeltung', 'rache', 'keine verteidigung']
      ],
      ergebnis: [
        ['nicht gerechtfertigt', 'keine notwehr', 'strafbar', 'rechtswidrig']
      ]
    }
  },

  {
    id: 'c-m-auslegung-1',
    topic_id: 'm-auslegung',
    title: 'Fahrzeuge im Park',
    minutes: 12,
    status: 'entwurf',
    facts: `Eine Gemeindeverordnung bestimmt: "Das Befahren der Parkanlage mit Fahrzeugen ist verboten." Die Erläuterungen zur Verordnung nennen als Anlass eine Serie von Unfällen mit Mopeds und Kleinlastwagen.

D fährt mit einem elektrischen Rollstuhl durch den Park. Die Behörde will ihn bestrafen. E schiebt einen Kinderwagen, F fährt mit einem E-Scooter.`,
    question: 'Wie ist der Begriff "Fahrzeug" auszulegen? Erarbeiten Sie das Ergebnis für D, E und F unter Anwendung der Auslegungsmethoden.',
    rubric: {
      minWords: 140,
      issue: [
        ['auslegung des begriffs fahrzeug', 'was ist ein fahrzeug', 'reichweite des verbots']
      ],
      regel: [
        ['wortinterpretation', 'wortlaut', 'wortsinn'],
        ['systematische auslegung', 'systematik'],
        ['historische auslegung', 'materialien', 'erläuterungen'],
        ['teleologische auslegung', 'zweck', 'normzweck']
      ],
      subsumtion: [
        ['möglicher wortsinn', 'wortlautgrenze', 'grenze des wortlauts'],
        ['schutz der fußgänger', 'gefahrenabwehr', 'sicherheit im park'],
        ['rollstuhl', 'kinderwagen', 'scooter'],
        ['teleologische reduktion', 'einschränkende auslegung', 'restriktive auslegung']
      ],
      ergebnis: [
        ['ergebnis', 'im ergebnis', 'somit ist']
      ]
    }
  },

  {
    id: 'c-o-grundrechte-1',
    topic_id: 'o-grundrechte',
    title: 'Das Versammlungsverbot am Ring',
    minutes: 14,
    status: 'entwurf',
    facts: `Eine Behörde untersagt eine angemeldete Demonstration auf einer stark befahrenen Ringstraße zur Hauptverkehrszeit vollständig. Begründung: Es drohten erhebliche Verkehrsbehinderungen. Die Veranstalterin hätte die Versammlung auch auf einem nahegelegenen Platz abhalten können, was die Behörde nicht geprüft hat.`,
    question: 'Prüfen Sie, ob die Untersagung in ein Grundrecht eingreift und ob der Eingriff gerechtfertigt ist.',
    rubric: {
      minWords: 130,
      issue: [
        ['versammlungsfreiheit', 'grundrecht auf versammlung'],
        ['eingriff']
      ],
      regel: [
        ['schutzbereich'],
        ['gesetzliche grundlage', 'gesetzesvorbehalt'],
        ['legitimes ziel', 'öffentliche ordnung', 'öffentliche sicherheit'],
        ['verhältnismäßigkeit']
      ],
      subsumtion: [
        ['geeignet', 'eignung'],
        ['erforderlich', 'gelinderes mittel', 'milderes mittel'],
        ['angemessen', 'abwägung', 'adäquanz'],
        ['vollständige untersagung', 'gänzliches verbot', 'auflage statt verbot']
      ],
      ergebnis: [
        ['nicht erforderlich', 'unverhältnismäßig', 'nicht gerechtfertigt', 'grundrechtswidrig']
      ]
    }
  }
];
