import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { VERJAEHRUNG } from '../data/verjaehrung.js'
import { formatDateAT } from '../utils/dateCalc.js'
import { useMode } from '../contexts/ModeContext.jsx'

export default function Verjaehrung() {
  const { mode } = useMode()
  const [id, setId] = useState(VERJAEHRUNG[0].id)
  const [entstehung, setEntstehung] = useState(() => new Date().toISOString().slice(0, 10))
  const [kenntnis, setKenntnis] = useState('')

  const reg = VERJAEHRUNG.find(v => v.id === id)

  const result = useMemo(() => {
    if (!reg) return null
    const base = reg.from === 'kenntnis' && kenntnis
      ? new Date(kenntnis + 'T00:00:00')
      : new Date(entstehung + 'T00:00:00')
    const end = new Date(base)
    end.setFullYear(end.getFullYear() + reg.years)
    let absolute
    if (reg.yearsLong) {
      absolute = new Date(entstehung + 'T00:00:00')
      absolute.setFullYear(absolute.getFullYear() + reg.yearsLong)
    }
    const today = new Date(); today.setHours(0,0,0,0)
    const mid = new Date(end); mid.setHours(0,0,0,0)
    const daysLeft = Math.round((mid - today) / 86400000)
    return { end, absolute, daysLeft }
  }, [reg, entstehung, kenntnis])

  return (
    <div>
      <PageHeader
        title="Verjährungsrechner"
        laie="Wann verjährt meine Forderung? Tragen Sie Anspruchsart und Datum ein."
        jurist="Berechnung nach ABGB, UGB und Sondergesetzen. Hemmung/Unterbrechung im Einzelfall."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Anspruchsart</label>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {VERJAEHRUNG.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            {reg?.norm && <p className="hint">Rechtsgrundlage: {reg.norm}</p>}
            {reg?.note && <p className="hint italic">{reg.note}</p>}
          </div>

          <div className="field">
            <label>Entstehung des Anspruchs</label>
            <input type="date" value={entstehung} onChange={(e) => setEntstehung(e.target.value)} />
          </div>

          {reg?.from === 'kenntnis' && (
            <div className="field">
              <label>Kenntnis von Schaden und Schädiger</label>
              <input type="date" value={kenntnis} onChange={(e) => setKenntnis(e.target.value)} />
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mt-0">Ergebnis</h2>
          {result && (
            <>
              <div className="text-center py-4">
                <div className="text-sm text-justiz-600">Voraussichtlicher Verjährungseintritt</div>
                <div className="text-3xl font-serif font-bold text-justiz-800 mt-1">
                  {formatDateAT(result.end)}
                </div>
                <div className={`inline-flex mt-3 px-3 py-1 rounded-full font-semibold ${
                  result.daysLeft < 0
                    ? 'bg-black text-white'
                    : result.daysLeft < 90
                      ? 'bg-red-600 text-white'
                      : result.daysLeft < 365
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                }`}>
                  {result.daysLeft < 0
                    ? `${Math.abs(result.daysLeft)} Tage vergangen`
                    : `noch ${result.daysLeft} Tage`}
                </div>
              </div>
              {result.absolute && (
                <div className="info">
                  Absolute Höchstfrist (30 Jahre): {formatDateAT(result.absolute)}
                </div>
              )}
            </>
          )}

          {mode === 'laie' && (
            <div className="warn mt-4">
              Nach Ablauf der Verjährungsfrist können Sie Ihren Anspruch
              vor Gericht nicht mehr durchsetzen, wenn sich die
              Gegenseite auf Verjährung beruft. Hemmung (z.B. Vergleichsgespräche
              gem. § 1494 ABGB) oder Unterbrechung (Anerkenntnis, Klage)
              verschieben das Datum.
            </div>
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
