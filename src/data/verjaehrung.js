// Verjährungsfristen nach österreichischem Recht (Auswahl).
// Rechtsstand: 2025. Im Einzelfall Hemmung/Unterbrechung prüfen.

export const VERJAEHRUNG = [
  {
    id: 'kurze',
    label: 'Kurze Verjährung (z.B. Handwerker, Miete, Zinsen)',
    years: 3,
    from: 'objektiv',
    norm: '§ 1486 ABGB',
    note: 'Z.B. Lohn-, Honorar-, Miet- und Pachtzinsforderungen, Forderungen aus täglichem Geschäftsverkehr.'
  },
  {
    id: 'lange',
    label: 'Lange Verjährung (Regel)',
    years: 30,
    from: 'objektiv',
    norm: '§ 1478 ABGB',
    note: 'Allgemeine Verjährungsfrist, soweit keine kürzere gilt.'
  },
  {
    id: 'schadenersatz',
    label: 'Schadenersatz',
    years: 3,
    yearsLong: 30,
    from: 'kenntnis',
    norm: '§ 1489 ABGB',
    note: '3 Jahre ab Kenntnis von Schaden und Schädiger; absolut 30 Jahre ab schädigendem Verhalten.'
  },
  {
    id: 'gewaehrleistung-bewegl',
    label: 'Gewährleistung (bewegliche Sachen)',
    years: 2,
    from: 'uebergabe',
    norm: '§ 933 ABGB',
    note: 'Für unbewegliche Sachen 3 Jahre. Verbrauchergeschäfte: VGG beachten.'
  },
  {
    id: 'gewaehrleistung-unbewegl',
    label: 'Gewährleistung (unbewegliche Sachen)',
    years: 3,
    from: 'uebergabe',
    norm: '§ 933 ABGB'
  },
  {
    id: 'arbeitsentgelt',
    label: 'Arbeitslohn / Entgeltansprüche',
    years: 3,
    from: 'objektiv',
    norm: '§ 1486 Z 5 ABGB',
    note: 'Kollektivverträge können kürzere Verfallsfristen vorsehen.'
  },
  {
    id: 'wechsel-scheck',
    label: 'Wechsel / Scheck',
    years: 3,
    from: 'objektiv',
    norm: 'Art 70 WG'
  },
  {
    id: 'unterhalt-rueckstand',
    label: 'Unterhaltsrückstände',
    years: 3,
    from: 'objektiv',
    norm: '§ 1480 ABGB'
  },
  {
    id: 'strafverfahren-verfolgung',
    label: 'Strafverfolgungsverjährung (Richtwert)',
    years: 5,
    from: 'tat',
    norm: '§ 57 StGB',
    note: 'Stark abhängig von der Strafdrohung (1, 3, 5, 10, 20 Jahre).'
  }
]
