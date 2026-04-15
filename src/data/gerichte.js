// Gerichtsarten und grobe Zuständigkeitsregeln.
// Für die konkrete Zuordnung eines Bezirksgerichts nach PLZ/Adresse:
// justiz.gv.at/gerichte/gerichtssuche — hier nur Typebene.

export const GERICHTSTYPEN = {
  BG: 'Bezirksgericht',
  LG: 'Landesgericht',
  HG: 'Handelsgericht Wien',
  ASG: 'Arbeits- und Sozialgericht',
  OLG: 'Oberlandesgericht',
  OGH: 'Oberster Gerichtshof',
  LVwG: 'Landesverwaltungsgericht',
  BVwG: 'Bundesverwaltungsgericht',
  BFG: 'Bundesfinanzgericht',
  VwGH: 'Verwaltungsgerichtshof',
  VfGH: 'Verfassungsgerichtshof'
}

// Schwellen / Grenzwerte (stark vereinfacht)
export const WERTGRENZEN = {
  // Sachliche Zuständigkeit BG/LG in Zivilsachen: 15.000 € (§ 49 JN, Stand 2024+)
  bg_lg: 15_000,
  // Zulassungs-Streitwert Revision (§ 502 ZPO) — im Einzelfall prüfen
  revision: 5_000
}

export const RECHTSGEBIETE = [
  {
    id: 'zivil-geld',
    label: 'Zivilrechtliche Geldforderung',
    rule: ({ streitwert }) => {
      if (streitwert <= WERTGRENZEN.bg_lg) return 'BG'
      return 'LG'
    },
    hint: 'Streitwert bis € 15.000 → Bezirksgericht, darüber → Landesgericht.',
    norm: '§ 49, § 50 JN'
  },
  {
    id: 'miet-wohnung',
    label: 'Mietsache (Wohnung)',
    rule: () => 'BG',
    hint: 'Mietrechtliche Angelegenheiten sind unabhängig vom Streitwert beim BG des gelegenen Orts.',
    norm: '§ 49 Abs 2 Z 5 JN, § 83 JN'
  },
  {
    id: 'familie-unterhalt',
    label: 'Familie / Unterhalt / Obsorge',
    rule: () => 'BG',
    hint: 'Außerstreitsachen — zuständig ist das BG des Aufenthalts des Kindes / gem. AußStrG.',
    norm: 'AußStrG, § 114a JN'
  },
  {
    id: 'arbeitsrecht',
    label: 'Arbeitsrechtsstreit',
    rule: () => 'ASG',
    hint: 'Arbeitsrechtsstreitigkeiten: Arbeits- und Sozialgericht (in Wien eigenes Gericht, sonst LG).',
    norm: '§§ 50 ff ASGG'
  },
  {
    id: 'handelssache-wien',
    label: 'Handelssache in Wien',
    rule: ({ streitwert }) => streitwert <= WERTGRENZEN.bg_lg ? 'BG' : 'HG',
    hint: 'Ab € 15.000 ist in Wien das Handelsgericht Wien sachlich zuständig.',
    norm: '§ 51 JN'
  },
  {
    id: 'strafsache',
    label: 'Strafsache',
    rule: ({ strafdrohung }) => (strafdrohung === 'hoch' ? 'LG' : 'BG'),
    hint: 'Bei Strafdrohung über 1 Jahr i.d.R. Landesgericht, darunter Bezirksgericht.',
    norm: '§§ 30 f StPO'
  },
  {
    id: 'verwaltung',
    label: 'Verwaltungsbescheid anfechten',
    rule: ({ bundesbehoerde }) => (bundesbehoerde ? 'BVwG' : 'LVwG'),
    hint: 'Bundesbehörden → BVwG, Landesbehörden → LVwG des jeweiligen Bundeslandes.',
    norm: 'Art 130 B-VG, VwGVG'
  },
  {
    id: 'abgaben',
    label: 'Abgabenbescheid (Finanzamt)',
    rule: () => 'BFG',
    hint: 'Nach Beschwerde und Beschwerdevorentscheidung Vorlageantrag an das Bundesfinanzgericht.',
    norm: 'BAO, BFGG'
  },
  {
    id: 'verwstrafe',
    label: 'Verwaltungsstrafe (Strafzettel etc.)',
    rule: () => 'LVwG',
    hint: 'Nach Einspruch/Beschwerde gegen Strafverfügung oder Straferkenntnis entscheidet das LVwG.',
    norm: 'VStG, VwGVG'
  },
  {
    id: 'insolvenz',
    label: 'Insolvenzverfahren (Privat/Unternehmen)',
    rule: ({ unternehmer }) => (unternehmer ? 'LG' : 'BG'),
    hint: 'Schuldenregulierungsverfahren natürlicher Personen → BG; Unternehmensinsolvenz → LG.',
    norm: 'IO'
  }
]

export const GERICHTSSUCHE_URL =
  'https://justiz.gv.at/gerichte/gerichtssuche.781.de.html'
export const ANWALTSSUCHE_URL =
  'https://www.oerak.at/buergerservice/servicecorner/rechtsanwalt-finden/'
