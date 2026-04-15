import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { euro } from '../utils/format.js'
import { useMode } from '../contexts/ModeContext.jsx'

// Regelbedarf / Prozentsatzmethode für Kindesunterhalt in Österreich:
// 0–5 Jahre: 16 %, 6–9 Jahre: 18 %, 10–14 Jahre: 20 %, 15+ Jahre: 22 %
// Abzüge: je weiterem unterhaltsberechtigten Kind ca. 1 Prozentpunkt,
// je Ehegatten ca. 0–3 Prozentpunkte.
// Luxusgrenze: i.d.R. 2–3-facher Regelbedarf.
// Quelle: ständige Rechtsprechung des OGH, ABGB §§ 231 ff.

const AGE_BANDS = [
  { min: 0, max: 5, pct: 16, label: '0–5 Jahre' },
  { min: 6, max: 9, pct: 18, label: '6–9 Jahre' },
  { min: 10, max: 14, pct: 20, label: '10–14 Jahre' },
  { min: 15, max: 30, pct: 22, label: '15+ Jahre' }
]

function bandFor(age) {
  return AGE_BANDS.find(b => age >= b.min && age <= b.max) ?? AGE_BANDS[AGE_BANDS.length - 1]
}

export default function Unterhalt() {
  const { mode } = useMode()
  const [netto, setNetto] = useState(2800)
  const [alter, setAlter] = useState(8)
  const [weitereKinder, setWeitereKinder] = useState(0)
  const [ehegatte, setEhegatte] = useState(false)
  const [eigEink, setEigEink] = useState(0)
  const [sonderbedarf, setSonderbedarf] = useState(0)

  const kind = useMemo(() => {
    const band = bandFor(Number(alter))
    let pct = band.pct
    pct -= weitereKinder * 1
    if (ehegatte) pct -= 2
    pct = Math.max(0, pct)
    const betrag = Math.round((netto * pct) / 100)
    // Anspannung / Eigeneinkommen-Berücksichtigung: vereinfacht lineare Reduktion
    const reduziert = Math.max(0, betrag - Math.round((eigEink || 0) * 0.3))
    return { band, pct, betrag, reduziert }
  }, [netto, alter, weitereKinder, ehegatte, eigEink])

  const ehegatte_richtwert = useMemo(() => {
    // Aufstockungsunterhalt: ca. 40 % des Familieneinkommens minus Eigeneinkommen (sehr grob).
    // Reiner Richtwert — tatsächliche Berechnung individuell.
    const familien = netto
    const idealBedarf = Math.round(familien * 0.4 - (eigEink || 0))
    return Math.max(0, idealBedarf)
  }, [netto, eigEink])

  return (
    <div>
      <PageHeader
        title="Unterhaltsrechner"
        laie="Wie viel Unterhalt steht dem Kind zu? Die App berechnet einen Richtwert."
        jurist="Prozentsatzmethode der OGH-Rechtsprechung. Luxusgrenze und Anspannungsgrundsatz sind im Einzelfall zu prüfen."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Netto-Einkommen Unterhaltspflichtige:r / Monat in €</label>
            <input type="number" min={0} value={netto}
              onChange={(e) => setNetto(Number(e.target.value))} />
            <p className="hint">Durchschnittliches Nettoeinkommen inkl. 13./14. Gehalt — pro Monat.</p>
          </div>
          <div className="field">
            <label>Alter des Kindes (Jahre)</label>
            <input type="number" min={0} max={30} value={alter}
              onChange={(e) => setAlter(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Weitere unterhaltsberechtigte Kinder</label>
            <input type="number" min={0} max={10} value={weitereKinder}
              onChange={(e) => setWeitereKinder(Number(e.target.value))} />
          </div>
          <div className="field">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ehegatte}
                onChange={(e) => setEhegatte(e.target.checked)} />
              <span>Zusätzlich unterhaltsberechtigte:r Ehegatte:in</span>
            </label>
          </div>
          <div className="field">
            <label>Eigenes Einkommen des Kindes / der berechtigten Person in €</label>
            <input type="number" min={0} value={eigEink}
              onChange={(e) => setEigEink(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Sonderbedarf (z.B. Zahnspange, Nachhilfe) in €</label>
            <input type="number" min={0} value={sonderbedarf}
              onChange={(e) => setSonderbedarf(Number(e.target.value))} />
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Richtwerte</h2>
          <div className="rounded-xl border border-gold-400 bg-gold-400/10 p-4 text-center">
            <div className="text-sm text-justiz-600">Kindesunterhalt (Richtwert / Monat)</div>
            <div className="text-4xl font-serif font-bold text-justiz-800 mt-1">
              {euro(kind.reduziert + Number(sonderbedarf || 0))}
            </div>
            <div className="text-xs text-justiz-500 mt-1">
              {kind.band.label} · Prozentsatz: {kind.pct}&nbsp;% · Grundwert: {euro(kind.betrag)}
            </div>
          </div>

          {ehegatte && (
            <div className="rounded-xl border border-justiz-200 bg-justiz-50 p-4 text-center mt-4">
              <div className="text-sm text-justiz-600">Ehegattenunterhalt (Richtwert)</div>
              <div className="text-2xl font-serif font-bold text-justiz-800 mt-1">
                {euro(ehegatte_richtwert)}
              </div>
              <div className="text-xs text-justiz-500 mt-1">
                ca. 40 % des Familieneinkommens − Eigeneinkommen (vereinfacht)
              </div>
            </div>
          )}

          <div className="warn mt-4 text-sm">
            <strong>Kurzbegründung:</strong>{' '}
            Kindesunterhalt nach Prozentsatzmethode (OGH-Judikatur): altersbezogener
            Prozentsatz vom Nettoeinkommen, reduziert um 1&nbsp;Prozentpunkt je weiterem
            unterhaltsberechtigten Kind und um ca. 2&nbsp;Prozentpunkte bei zusätzlich
            unterhaltsberechtigter:m Ehegatten. Eigeneinkommen des Kindes wird teilweise
            angerechnet. Luxusgrenze und Anspannungsgrundsatz können abweichen.
          </div>

          {mode === 'laie' && (
            <div className="info mt-3">
              Das Ergebnis ist ein <em>Richtwert</em>. Im Streitfall entscheidet das
              Pflegschaftsgericht. Die Kinder- und Jugendhilfe (Jugendamt) unterstützt
              kostenlos bei Kindesunterhalt.
            </div>
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
