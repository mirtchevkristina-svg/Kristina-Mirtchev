// Rechtsmittel-Wegweiser: Entscheidung → Rechtsmittel.

export const RECHTSMITTEL = [
  {
    id: 'urteil-zivil-1',
    from: 'Urteil erster Instanz (Zivilsache)',
    name: 'Berufung',
    frist: '4 Wochen',
    fristId: 'zpo-berufung',
    gericht: 'LG (gegen BG-Urteil) / OLG (gegen LG-Urteil)',
    vertretung: 'Ja — anwaltliche Unterfertigung (ab € 5.000)',
    norm: '§§ 461 ff ZPO',
    form: 'Schriftsatz mit Antrag, Berufungsgründen, Anfechtungserklärung.'
  },
  {
    id: 'beschluss-zivil',
    from: 'Beschluss (Zivilsache)',
    name: 'Rekurs',
    frist: '14 Tage',
    fristId: 'zpo-rekurs',
    gericht: 'OLG / LG als Rekursgericht',
    norm: '§§ 514 ff ZPO'
  },
  {
    id: 'zb-mahn',
    from: 'Zahlungsbefehl (Mahnverfahren)',
    name: 'Einspruch',
    frist: '4 Wochen',
    fristId: 'zpo-einspruch-zb',
    gericht: 'Zurück an Prozessgericht (ordentliches Verfahren)',
    vertretung: 'ab € 5.000',
    norm: '§ 248 ZPO',
    form: 'Formblatt oder Schriftsatz.'
  },
  {
    id: 'urteil-straf',
    from: 'Strafurteil (LG als Schöffen-/Geschworenengericht)',
    name: 'Nichtigkeitsbeschwerde + Berufung',
    frist: 'Anmeldung 3 Tage, Ausführung 4 Wochen',
    fristId: 'stpo-nichtigkeit',
    gericht: 'OGH (Nichtigkeit) / OLG (Berufung)',
    vertretung: 'Ja',
    norm: '§§ 280 ff StPO'
  },
  {
    id: 'strafverfuegung-stpo',
    from: 'Strafverfügung (StPO)',
    name: 'Einspruch',
    frist: '14 Tage',
    fristId: 'stpo-einspruch-strafverfuegung',
    norm: '§ 491 StPO'
  },
  {
    id: 'bescheid-verwaltung',
    from: 'Verwaltungsbescheid',
    name: 'Bescheidbeschwerde',
    frist: '4 Wochen',
    fristId: 'vwgvg-beschwerde',
    gericht: 'LVwG / BVwG',
    norm: '§ 7 VwGVG',
    form: 'Schriftlich, Begründung, Antrag, Unterschrift.'
  },
  {
    id: 'erkenntnis-vwg',
    from: 'Erkenntnis des Verwaltungsgerichts',
    name: 'Revision / Beschwerde',
    frist: '6 Wochen',
    fristId: 'vwgh-revision',
    gericht: 'VwGH / VfGH',
    vertretung: 'Ja',
    norm: '§ 26 VwGG, Art 144 B-VG'
  },
  {
    id: 'strafverfuegung-vstg',
    from: 'Strafverfügung (VStG, z.B. Strafzettel)',
    name: 'Einspruch',
    frist: '2 Wochen',
    fristId: 'vstg-einspruch-strafverfuegung',
    norm: '§ 49 VStG'
  },
  {
    id: 'straferkenntnis-vstg',
    from: 'Straferkenntnis (Verwaltungsstrafe)',
    name: 'Beschwerde',
    frist: '4 Wochen',
    fristId: 'vstg-beschwerde',
    gericht: 'LVwG',
    norm: '§ 7 VwGVG'
  },
  {
    id: 'abgabenbescheid',
    from: 'Abgabenbescheid (BAO)',
    name: 'Bescheidbeschwerde',
    frist: '1 Monat',
    fristId: 'bao-beschwerde',
    gericht: 'Abgabenbehörde / BFG',
    norm: '§ 245 BAO'
  }
]
