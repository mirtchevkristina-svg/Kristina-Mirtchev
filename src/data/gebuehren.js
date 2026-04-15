// Gerichtsgebühren (GGG) — vereinfachte Tarifstaffelung.
// Rechtsstand: 2025 (Werte sind Richtwerte — maßgeblich: aktueller Normtext GGG).
// Quelle: Gerichtsgebührengesetz, Anlage (TP 1, TP 2, TP 3, TP 9 ua).
//
// Die Staffel ist NICHT amtlich gepflegt. Für produktiven Einsatz müssen
// die aktuellen Beträge aus RIS/BGBl einzeln verifiziert und versioniert werden.

export const TARIFSTAND = '2025-01-01'

// TP 1 — Zivilprozess erste Instanz (Pauschalgebühr), Streitwertstaffel
function tp1(sw) {
  if (sw <= 150) return 25
  if (sw <= 300) return 51
  if (sw <= 700) return 73
  if (sw <= 2_000) return 111
  if (sw <= 3_500) return 174
  if (sw <= 7_000) return 317
  if (sw <= 35_000) return 771
  if (sw <= 70_000) return 1_505
  if (sw <= 140_000) return 3_011
  if (sw <= 210_000) return 4_519
  if (sw <= 350_000) return 7_532
  // Über 350.000: 1,2 % + fixe Komponente (vereinfacht)
  return Math.round(sw * 0.012 + 2_687)
}

// TP 2 — Berufung 1,5-fach ca.
function tp2(sw) { return Math.round(tp1(sw) * 1.5) }
// TP 3 — Revision 2-fach ca.
function tp3(sw) { return Math.round(tp1(sw) * 2) }

// TP 9 Mahnverfahren (Zahlungsbefehl): ca. 50% von TP1 bei geringen Streitwerten
function mahn(sw) { return Math.round(tp1(sw) * 0.5) }

// Außerstreitverfahren (sehr vereinfacht)
function aussg(sw) { return Math.round(tp1(sw) * 0.6) }

// Grundbuch Eintragung 1,1 % Bemessungsgrundlage
function grundbuchEintragung(bm) { return Math.round(bm * 0.011) }
// Grundbuch Eintragungsgebühr Pfandrecht 1,2 %
function grundbuchPfand(bm) { return Math.round(bm * 0.012) }
// Firmenbuch Neueintragung GmbH (vereinfacht)
function firmenbuchGmbH() { return 323 }

export const GEBUEHREN = [
  {
    id: 'tp1', label: 'Klage — Zivilprozess 1. Instanz (TP 1)', basis: 'streitwert',
    norm: 'TP 1 GGG', calc: (sw) => tp1(sw)
  },
  {
    id: 'tp2', label: 'Berufung (TP 2)', basis: 'streitwert',
    norm: 'TP 2 GGG', calc: (sw) => tp2(sw)
  },
  {
    id: 'tp3', label: 'Revision / Revisionsrekurs (TP 3)', basis: 'streitwert',
    norm: 'TP 3 GGG', calc: (sw) => tp3(sw)
  },
  {
    id: 'mahn', label: 'Mahnklage / Zahlungsbefehl-Antrag', basis: 'streitwert',
    norm: 'TP 1 / § 17 GGG', calc: (sw) => mahn(sw)
  },
  {
    id: 'aussg', label: 'Außerstreitverfahren (Antrag 1. Instanz)', basis: 'streitwert',
    norm: 'TP 12 GGG', calc: (sw) => aussg(sw)
  },
  {
    id: 'exantrag', label: 'Exekutionsantrag', basis: 'streitwert',
    norm: 'TP 4 GGG', calc: (sw) => Math.round(Math.max(24, sw * 0.005))
  },
  {
    id: 'grundbuch-eigentum', label: 'Grundbuch — Eigentumseintragung', basis: 'bm',
    norm: 'TP 9 GGG', calc: (bm) => grundbuchEintragung(bm),
    info: '1,1 % der Bemessungsgrundlage (i.d.R. Kaufpreis).'
  },
  {
    id: 'grundbuch-pfand', label: 'Grundbuch — Pfandrechtseintragung', basis: 'bm',
    norm: 'TP 9 GGG', calc: (bm) => grundbuchPfand(bm),
    info: '1,2 % des besicherten Betrags.'
  },
  {
    id: 'firmenbuch-gmbh', label: 'Firmenbuch — Neueintragung GmbH', basis: 'pauschal',
    norm: 'FBG / GGG', calc: () => firmenbuchGmbH(),
    info: 'Pauschalbetrag (zuzüglich Eintragungsgebühren pro Eintrag).'
  }
]

export function ervRabatt(amount) {
  // ERV-Einbringung: geringfügiger Abschlag (symbolisch).
  // Tatsächlich ERV-Zuschläge/-Reduktionen siehe § 31a GGG.
  return Math.max(0, Math.round(amount - 4))
}
