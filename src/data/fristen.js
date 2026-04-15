// Katalog österreichischer Verfahrensfristen (Auswahl, stark vereinfacht).
// Quellen: ZPO, AußStrG, StPO, VwGVG, VwGG, VfGG, IO, EO, ASGG, BAO, MRG, VStG.
// Rechtsstand: 2025 (bei Abweichungen maßgeblich: aktueller Normtext im RIS).

export const RECHTSSTAND = '2025-01-01'

/**
 * amount+unit = Frist.
 * ferienHemmung: Fristlauf durch Gerichtsferien §222 ZPO gehemmt (nur Zivil/Außerstreit).
 * vertretungszwang: anwaltlicher/qualifizierter Vertretungszwang.
 */
export const FRISTEN = [
  // ---- Zivilverfahren ----
  {
    id: 'zpo-klagebeantwortung',
    category: 'Zivilverfahren',
    label: 'Klagebeantwortung',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    vertretungszwang: 'ab € 5.000 Streitwert (RA-Pflicht)',
    norm: '§ 230 Abs 1 ZPO',
    note: 'Frist beginnt mit Zustellung der Klage samt Auftrag zur Klagebeantwortung.'
  },
  {
    id: 'zpo-einspruch-zb',
    category: 'Zivilverfahren',
    label: 'Einspruch gegen Zahlungsbefehl (Mahnverfahren)',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 248 Abs 2 ZPO',
    note: 'Bei nicht erhobenem Einspruch wird der Zahlungsbefehl vollstreckbar.'
  },
  {
    id: 'zpo-berufung',
    category: 'Zivilverfahren',
    label: 'Berufung gegen Urteil',
    amount: 4, unit: 'weeks',
    ferienHemmung: true,
    vertretungszwang: 'Ja, anwaltliche Unterfertigung',
    norm: '§ 464 ZPO',
    note: 'Fristlauf ist in Gerichtsferien (§ 222 ZPO) gehemmt.'
  },
  {
    id: 'zpo-rekurs',
    category: 'Zivilverfahren',
    label: 'Rekurs gegen Beschluss',
    amount: 14, unit: 'days',
    ferienHemmung: true,
    norm: '§ 521 ZPO'
  },
  {
    id: 'zpo-revisionsrekurs',
    category: 'Zivilverfahren',
    label: 'Revisionsrekurs',
    amount: 14, unit: 'days',
    ferienHemmung: true,
    vertretungszwang: 'Ja',
    norm: '§ 521a ZPO'
  },
  {
    id: 'zpo-revision',
    category: 'Zivilverfahren',
    label: 'Revision',
    amount: 4, unit: 'weeks',
    ferienHemmung: true,
    vertretungszwang: 'Ja',
    norm: '§ 505 ZPO'
  },
  {
    id: 'zpo-wiedereinsetzung',
    category: 'Zivilverfahren',
    label: 'Wiedereinsetzungsantrag',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 148 ZPO',
    note: 'Ab Wegfall des Hindernisses; binnen 3 Monaten absolut (§ 149 ZPO).'
  },
  {
    id: 'zpo-wiederaufnahme',
    category: 'Zivilverfahren',
    label: 'Wiederaufnahmsklage',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    norm: '§§ 534 f ZPO'
  },

  // ---- Außerstreitverfahren ----
  {
    id: 'aussg-rekurs',
    category: 'Außerstreitverfahren',
    label: 'Rekurs',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 46 AußStrG'
  },
  {
    id: 'aussg-revisionsrekurs',
    category: 'Außerstreitverfahren',
    label: 'Revisionsrekurs',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    vertretungszwang: 'Ja',
    norm: '§ 65 AußStrG'
  },

  // ---- Strafverfahren ----
  {
    id: 'stpo-einspruch-strafverfuegung',
    category: 'Strafverfahren',
    label: 'Einspruch gegen Strafverfügung',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 491 StPO'
  },
  {
    id: 'stpo-beschwerde',
    category: 'Strafverfahren',
    label: 'Beschwerde',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 88 StPO'
  },
  {
    id: 'stpo-nichtigkeit',
    category: 'Strafverfahren',
    label: 'Nichtigkeitsbeschwerde',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    vertretungszwang: 'Ja',
    norm: '§ 285 StPO',
    note: 'Anmeldung binnen 3 Tagen (§ 284 StPO), Ausführung binnen 4 Wochen.'
  },
  {
    id: 'stpo-berufung',
    category: 'Strafverfahren',
    label: 'Berufung (Strafsachen)',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 294 StPO'
  },

  // ---- Verwaltungsverfahren ----
  {
    id: 'vwgvg-beschwerde',
    category: 'Verwaltungsverfahren',
    label: 'Bescheidbeschwerde an das Verwaltungsgericht',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 7 Abs 4 VwGVG'
  },
  {
    id: 'vwgh-revision',
    category: 'Verwaltungsverfahren',
    label: 'Revision an den VwGH',
    amount: 6, unit: 'weeks',
    ferienHemmung: false,
    vertretungszwang: 'Ja',
    norm: '§ 26 VwGG'
  },
  {
    id: 'vfgh-beschwerde',
    category: 'Verwaltungsverfahren',
    label: 'Beschwerde an den VfGH',
    amount: 6, unit: 'weeks',
    ferienHemmung: false,
    vertretungszwang: 'Ja',
    norm: '§ 82 VfGG'
  },

  // ---- Verwaltungsstrafverfahren ----
  {
    id: 'vstg-einspruch-strafverfuegung',
    category: 'Verwaltungsstrafverfahren',
    label: 'Einspruch gegen Strafverfügung (VStG)',
    amount: 2, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 49 VStG'
  },
  {
    id: 'vstg-beschwerde',
    category: 'Verwaltungsstrafverfahren',
    label: 'Beschwerde gegen Straferkenntnis',
    amount: 4, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 7 VwGVG'
  },

  // ---- Abgabenverfahren ----
  {
    id: 'bao-beschwerde',
    category: 'Abgabenverfahren',
    label: 'Bescheidbeschwerde (BAO)',
    amount: 1, unit: 'months',
    ferienHemmung: false,
    norm: '§ 245 BAO'
  },
  {
    id: 'bao-vorlageantrag',
    category: 'Abgabenverfahren',
    label: 'Vorlageantrag',
    amount: 1, unit: 'months',
    ferienHemmung: false,
    norm: '§ 264 BAO'
  },
  {
    id: 'bao-revision',
    category: 'Abgabenverfahren',
    label: 'Revision (VwGH) gegen BFG-Entscheidung',
    amount: 6, unit: 'weeks',
    ferienHemmung: false,
    vertretungszwang: 'Ja',
    norm: '§ 26 VwGG'
  },

  // ---- Insolvenz ----
  {
    id: 'io-rekurs',
    category: 'Insolvenzverfahren',
    label: 'Rekurs im Insolvenzverfahren',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 176 IO'
  },
  {
    id: 'io-forderungsanmeldung',
    category: 'Insolvenzverfahren',
    label: 'Forderungsanmeldung (bis Prüfungstagsatzung)',
    amount: 0, unit: 'days',
    manualEnd: true,
    norm: '§ 102 IO',
    note: 'Nicht kalendarisch fix — richtet sich nach der Prüfungstagsatzung im Edikt.'
  },

  // ---- Exekution ----
  {
    id: 'eo-rekurs',
    category: 'Exekutionsverfahren',
    label: 'Rekurs in der Exekution',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 65 EO'
  },
  {
    id: 'eo-widerspruch-ev',
    category: 'Exekutionsverfahren',
    label: 'Widerspruch gegen einstweilige Verfügung',
    amount: 14, unit: 'days',
    ferienHemmung: false,
    norm: '§ 397 EO'
  },

  // ---- ASG / ArbG ----
  {
    id: 'asg-berufung',
    category: 'Arbeits- und Sozialgerichtsbarkeit',
    label: 'Berufung in ASG-Sachen',
    amount: 4, unit: 'weeks',
    ferienHemmung: true,
    norm: '§ 39 ASGG iVm § 464 ZPO'
  },
  {
    id: 'asg-kuendigungsanfechtung',
    category: 'Arbeits- und Sozialgerichtsbarkeit',
    label: 'Kündigungs-/Entlassungsanfechtung',
    amount: 2, unit: 'weeks',
    ferienHemmung: false,
    norm: '§ 105 Abs 4 ArbVG',
    note: 'Ab Zugang der Kündigung bzw. nach Stellungnahme des Betriebsrats.'
  }
]

export const ZUSTELLARTEN = [
  { id: 'eigenhaendig', label: 'Eigenhändige Zustellung (RSa)' },
  { id: 'zuhanden', label: 'Zustellung zu eigenen Handen (RSb)' },
  { id: 'normal', label: 'Normale Zustellung (ohne RS)' },
  { id: 'erv', label: 'Elektronisch (ERV)' },
  { id: 'hinterlegung', label: 'Hinterlegung (Gelber Zettel)' }
]
